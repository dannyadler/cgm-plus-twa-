// /.netlify/functions/login
// Modes: password, webauthn, challenge
// Returns { token, role, patientId, apiBase, expiresAt } on success
// Password mode also returns { registrationChallenge, registrationNonce } if client signals needsRegistration

import { getStore } from '@netlify/blobs';
import {
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import crypto from 'node:crypto';

// ── helpers ──

// Dev-only fallbacks -- only active when running `netlify dev` locally.
// Production reads exclusively from Netlify dashboard env vars.
const DEV_DEFAULTS = process.env.NETLIFY_DEV === 'true' ? {
  APP_PASSWORD: 'Trinity2026',
  BIOT_API_BASE: 'https://api.dev.demo2.biot-med.com',
  BIOT_PATIENT_USER: 'daniel+olivia@biot-med.com',
  BIOT_PATIENT_PASS: 'Aa123456',
  BIOT_CLINICIAN_USER: 'daniel+nurse@biot-med.com',
  BIOT_CLINICIAN_PASS: 'Aa123456',
  BIOT_PATIENT_ID: '8ebf1dce-adbe-4306-a3d2-e020ce54f8c2',
  ALLOWED_ORIGIN: 'http://localhost:8888',
  WEBAUTHN_RP_ID: 'localhost',
  WEBAUTHN_RP_NAME: 'CGM Plus',
} : {};

function env(name) {
  const v = process.env[name] || DEV_DEFAULTS[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function cors(origin) {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };
}

function json(statusCode, body, origin) {
  return new Response(JSON.stringify(body), { status: statusCode, headers: cors(origin) });
}

// Constant-time string comparison
function timingSafeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    // Still do the comparison to avoid timing leak on length
    crypto.timingSafeEqual(bufA, Buffer.alloc(bufA.length));
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

// ── Rate limiting (best-effort via Netlify Blobs) ──

async function checkRateLimit(ip) {
  const store = getStore('rate-limits');
  const key = `pw-${ip.replace(/[^a-zA-Z0-9.:]/g, '_')}`;
  try {
    const raw = await store.get(key);
    if (raw) {
      const data = JSON.parse(raw);
      const age = Date.now() - data.windowStart;
      if (age < 60_000) {
        if (data.count >= 5) return false; // blocked
        data.count++;
        await store.set(key, JSON.stringify(data));
        return true;
      }
    }
  } catch { /* blob miss or parse error — allow */ }
  // New window
  await store.set(key, JSON.stringify({ windowStart: Date.now(), count: 1 }));
  return true;
}

// ── BioT login (patient-first, clinician fallback) ──

async function biotLogin(apiBase, patientUser, patientPass, clinicianUser, clinicianPass, patientId) {
  // Try patient first
  let role = 'patient';
  let token = await doBiotLogin(apiBase, patientUser, patientPass);
  if (token) {
    const canRead = await probeReadAccess(apiBase, token, patientId);
    if (canRead) return { token, role };
  }
  // Fallback to clinician
  role = 'clinician';
  token = await doBiotLogin(apiBase, clinicianUser, clinicianPass);
  if (!token) throw new Error('Both BioT logins failed');
  return { token, role };
}

async function doBiotLogin(apiBase, username, password) {
  try {
    const res = await fetch(`${apiBase}/ums/v2/users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.accessJwt?.token || null;
  } catch {
    return null;
  }
}

async function probeReadAccess(apiBase, token, patientId) {
  try {
    const sr = JSON.stringify({
      filter: { '_patient.id': { eq: patientId }, '_state': { eq: 'ACTIVE' } },
      limit: 1,
    });
    const url = `${apiBase}/device/v1/devices/usage-sessions?searchRequest=${encodeURIComponent(sr)}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    return res.ok;
  } catch {
    return false;
  }
}

// ── Signed nonce for registration chaining ──

function createRegistrationNonce() {
  const secret = env('APP_PASSWORD'); // reuse as HMAC key for simplicity
  const payload = JSON.stringify({ ts: Date.now(), purpose: 'webauthn-register' });
  const hmac = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return { nonce: Buffer.from(payload).toString('base64'), sig: hmac };
}

function verifyRegistrationNonce(nonce, sig, maxAgeMs = 300_000) {
  try {
    const secret = env('APP_PASSWORD');
    const payload = Buffer.from(nonce, 'base64').toString();
    const expectedSig = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    if (!timingSafeEqual(sig, expectedSig)) return false;
    const data = JSON.parse(payload);
    if (data.purpose !== 'webauthn-register') return false;
    if (Date.now() - data.ts > maxAgeMs) return false;
    return true;
  } catch {
    return false;
  }
}

// ── JWT expiry extraction ──

function getJwtExpiry(token) {
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    return payload.exp ? payload.exp * 1000 : Date.now() + 3600_000;
  } catch {
    return Date.now() + 3600_000; // default 1h
  }
}

// ── Handler ──

export default async function handler(req, context) {
  const allowedOrigin = env('ALLOWED_ORIGIN');

  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors(allowedOrigin) });
  }

  if (req.method !== 'POST') {
    return json(405, { error: 'Method not allowed' }, allowedOrigin);
  }

  try {
    const body = await req.json();
    const { mode } = body;

    const apiBase = env('BIOT_API_BASE');
    const patientId = env('BIOT_PATIENT_ID');
    const rpId = env('WEBAUTHN_RP_ID');
    const rpName = process.env.WEBAUTHN_RP_NAME || 'CGM Plus';

    // ── MODE: challenge ──
    if (mode === 'challenge') {
      const { credentialId } = body;
      if (!credentialId) return json(400, { error: 'credentialId required' }, allowedOrigin);

      const credStore = getStore('webauthn-credentials');
      const credRaw = await credStore.get(credentialId);
      if (!credRaw) return json(404, { error: 'Credential not found' }, allowedOrigin);

      const options = await generateAuthenticationOptions({
        rpID: rpId,
        allowCredentials: [{ id: credentialId, type: 'public-key' }],
        userVerification: 'required',
        timeout: 60_000,
      });

      // Store challenge temporarily for verification
      const challengeStore = getStore('webauthn-challenges');
      await challengeStore.set(credentialId, JSON.stringify({
        challenge: options.challenge,
        ts: Date.now(),
      }));

      return json(200, { options }, allowedOrigin);
    }

    // ── MODE: password ──
    if (mode === 'password') {
      const ip = context.ip || req.headers.get('x-forwarded-for') || 'unknown';
      const allowed = await checkRateLimit(ip);
      if (!allowed) return json(429, { error: 'Too many attempts. Try again in 1 minute.' }, allowedOrigin);

      const { appPassword, needsRegistration } = body;
      if (!appPassword) return json(400, { error: 'appPassword required' }, allowedOrigin);

      if (!timingSafeEqual(appPassword, env('APP_PASSWORD'))) {
        return json(401, { error: 'Wrong password' }, allowedOrigin);
      }

      // BioT login
      const biot = await biotLogin(
        apiBase,
        env('BIOT_PATIENT_USER'), env('BIOT_PATIENT_PASS'),
        env('BIOT_CLINICIAN_USER'), env('BIOT_CLINICIAN_PASS'),
        patientId,
      );

      const result = {
        token: biot.token,
        role: biot.role,
        patientId,
        apiBase,
        expiresAt: getJwtExpiry(biot.token),
      };

      // If client needs WebAuthn registration, include challenge + signed nonce
      if (needsRegistration) {
        const challenge = crypto.randomBytes(32).toString('base64url');
        const { nonce, sig } = createRegistrationNonce();

        // Store challenge for verification during registration
        const challengeStore = getStore('webauthn-challenges');
        await challengeStore.set(`reg-${nonce}`, JSON.stringify({
          challenge,
          ts: Date.now(),
        }));

        result.registrationChallenge = challenge;
        result.registrationNonce = nonce;
        result.registrationNonceSig = sig;
        result.rpId = rpId;
        result.rpName = rpName;
      }

      return json(200, result, allowedOrigin);
    }

    // ── MODE: webauthn ──
    if (mode === 'webauthn') {
      const { credentialId, assertion } = body;
      if (!credentialId || !assertion) return json(400, { error: 'credentialId and assertion required' }, allowedOrigin);

      // Look up stored credential
      const credStore = getStore('webauthn-credentials');
      const credRaw = await credStore.get(credentialId);
      if (!credRaw) return json(404, { error: 'Credential not found' }, allowedOrigin);
      const credential = JSON.parse(credRaw);

      // Get stored challenge
      const challengeStore = getStore('webauthn-challenges');
      const challengeRaw = await challengeStore.get(credentialId);
      if (!challengeRaw) return json(400, { error: 'No pending challenge' }, allowedOrigin);
      const { challenge, ts } = JSON.parse(challengeRaw);

      // Challenge expires after 5 minutes
      if (Date.now() - ts > 300_000) {
        return json(400, { error: 'Challenge expired' }, allowedOrigin);
      }

      // Verify assertion
      let verification;
      try {
        verification = await verifyAuthenticationResponse({
          response: assertion,
          expectedChallenge: challenge,
          expectedOrigin: allowedOrigin,
          expectedRPID: rpId,
          credential: {
            id: credentialId,
            publicKey: new Uint8Array(Buffer.from(credential.publicKey, 'base64')),
            counter: credential.counter,
          },
        });
      } catch (err) {
        console.error('WebAuthn verification error:', err);
        return json(401, { error: 'WebAuthn verification failed' }, allowedOrigin);
      }

      if (!verification.verified) {
        return json(401, { error: 'WebAuthn verification failed' }, allowedOrigin);
      }

      // Update counter
      credential.counter = verification.authenticationInfo.newCounter;
      await credStore.set(credentialId, JSON.stringify(credential));

      // Clean up challenge
      await challengeStore.delete(credentialId).catch(() => {});

      // BioT login
      const biot = await biotLogin(
        apiBase,
        env('BIOT_PATIENT_USER'), env('BIOT_PATIENT_PASS'),
        env('BIOT_CLINICIAN_USER'), env('BIOT_CLINICIAN_PASS'),
        patientId,
      );

      return json(200, {
        token: biot.token,
        role: biot.role,
        patientId,
        apiBase,
        expiresAt: getJwtExpiry(biot.token),
      }, allowedOrigin);
    }

    return json(400, { error: `Unknown mode: ${mode}` }, allowedOrigin);
  } catch (err) {
    console.error('Login function error:', err);
    return json(500, { error: 'Internal error' }, allowedOrigin);
  }
}

// (no custom config — Netlify auto-routes to /.netlify/functions/login)
