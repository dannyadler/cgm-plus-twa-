// /.netlify/functions/register-credential
// Validates attestation from WebAuthn registration and stores credential in Netlify Blobs.
// Requires a signed nonce from a recent password-mode login.

import { getStore } from '@netlify/blobs';
import { verifyRegistrationResponse } from '@simplewebauthn/server';
import crypto from 'node:crypto';

// Dev-only fallbacks -- only active when running `netlify dev` locally.
const DEV_DEFAULTS = process.env.NETLIFY_DEV === 'true' ? {
  APP_PASSWORD: 'Trinity2026',
  ALLOWED_ORIGIN: 'http://localhost:8888',
  WEBAUTHN_RP_ID: 'localhost',
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

// Verify the signed nonce from password login (same logic as login.mjs)
function verifyRegistrationNonce(nonce, sig, maxAgeMs = 300_000) {
  try {
    const secret = env('APP_PASSWORD');
    const payload = Buffer.from(nonce, 'base64').toString();
    const expectedSig = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    const bufA = Buffer.from(sig);
    const bufB = Buffer.from(expectedSig);
    if (bufA.length !== bufB.length) {
      crypto.timingSafeEqual(bufA, Buffer.alloc(bufA.length));
      return false;
    }
    if (!crypto.timingSafeEqual(bufA, bufB)) return false;
    const data = JSON.parse(payload);
    if (data.purpose !== 'webauthn-register') return false;
    if (Date.now() - data.ts > maxAgeMs) return false;
    return true;
  } catch {
    return false;
  }
}

export default async function handler(req) {
  const allowedOrigin = env('ALLOWED_ORIGIN');

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors(allowedOrigin) });
  }

  if (req.method !== 'POST') {
    return json(405, { error: 'Method not allowed' }, allowedOrigin);
  }

  try {
    const body = await req.json();
    const { attestation, nonce, nonceSig } = body;

    if (!attestation || !nonce || !nonceSig) {
      return json(400, { error: 'attestation, nonce, and nonceSig required' }, allowedOrigin);
    }

    // Verify the nonce came from a recent password login
    if (!verifyRegistrationNonce(nonce, nonceSig)) {
      return json(403, { error: 'Invalid or expired registration nonce' }, allowedOrigin);
    }

    // Retrieve the stored challenge
    const challengeStore = getStore('webauthn-challenges');
    const challengeRaw = await challengeStore.get(`reg-${nonce}`);
    if (!challengeRaw) {
      return json(400, { error: 'No pending registration challenge' }, allowedOrigin);
    }
    const { challenge } = JSON.parse(challengeRaw);

    const rpId = env('WEBAUTHN_RP_ID');

    // Verify the attestation
    let verification;
    try {
      verification = await verifyRegistrationResponse({
        response: attestation,
        expectedChallenge: challenge,
        expectedOrigin: allowedOrigin,
        expectedRPID: rpId,
        requireUserVerification: true,
      });
    } catch (err) {
      console.error('Registration verification error:', err);
      return json(400, { error: 'Registration verification failed' }, allowedOrigin);
    }

    if (!verification.verified || !verification.registrationInfo) {
      return json(400, { error: 'Registration verification failed' }, allowedOrigin);
    }

    const { credential } = verification.registrationInfo;

    // Store credential
    const credStore = getStore('webauthn-credentials');
    const credentialId = credential.id;
    await credStore.set(credentialId, JSON.stringify({
      publicKey: Buffer.from(credential.publicKey).toString('base64'),
      counter: credential.counter,
      registeredAt: new Date().toISOString(),
    }));

    // Clean up the challenge
    await challengeStore.delete(`reg-${nonce}`).catch(() => {});

    return json(200, { ok: true, credentialId }, allowedOrigin);
  } catch (err) {
    console.error('Register-credential error:', err);
    return json(500, { error: 'Internal error' }, allowedOrigin);
  }
}

// (no custom config — Netlify auto-routes to /.netlify/functions/register-credential)
