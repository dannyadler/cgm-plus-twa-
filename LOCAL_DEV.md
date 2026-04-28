# Local Development Guide

## One-time setup

```bash
cd trinity-cgm-plus-pwa
npm install
cp .env.example .env
```

Edit `.env` with real values (get them from the team's credential store or Netlify dashboard).

Install the Netlify CLI if you don't have it:

```bash
npm install -g netlify-cli
```

## Run locally

```bash
netlify dev
```

Open http://localhost:8888

## First-launch walkthrough

1. The app shows a password screen. Enter the `APP_PASSWORD` from your `.env` file.
2. After login, glucose data loads. A prompt asks "Enable fingerprint unlock?"
3. Click Enable. Mac Chrome uses Touch ID. Complete the biometric prompt.
4. Reload the page. The app should immediately show the Touch ID prompt (no password screen).
5. Complete the fingerprint. Data loads.

## Test fingerprint cancel

1. Reload the page. Touch ID prompt appears.
2. Click Cancel on the Touch ID dialog.
3. The app falls through to the password screen.

## Test logout

1. Long-press (1.5 seconds) on the "CGM Plus" title in the top nav bar.
2. Confirm sign-out.
3. Returns to password screen. Credential is cleared.

## Reset to test first-launch again

Clear localStorage in DevTools (Application > Local Storage > delete `cgm_webauthn_cred_id` and `cgm_webauthn_skipped`).

Or wipe the server-side credentials:

```bash
npm run reset-creds
```

Note: `reset-creds` requires `netlify dev` to be running in another terminal (blobs need the dev server).

Then reload the page.

## Toggle legacy flow

In `index.html`, find:

```js
const SECURE_AUTH_ENABLED = true;
```

Change to `false`. Reload. The app uses the old hardcoded-creds flow (no password gate, no fingerprint).

## Env vars reference

| Variable | Purpose |
|----------|---------|
| APP_PASSWORD | App unlock password |
| BIOT_API_BASE | BioT API URL |
| BIOT_PATIENT_USER | Patient login email |
| BIOT_PATIENT_PASS | Patient login password |
| BIOT_CLINICIAN_USER | Clinician login email |
| BIOT_CLINICIAN_PASS | Clinician login password |
| BIOT_PATIENT_ID | Patient UUID from BioT |
| ALLOWED_ORIGIN | CORS origin (http://localhost:8888 for local) |
| WEBAUTHN_RP_ID | WebAuthn relying party (localhost for local) |
| WEBAUTHN_RP_NAME | Display name (CGM Plus) |
