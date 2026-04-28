# Deploy to a New Netlify Site

## Prerequisites

The `node_modules` folder must be present so Netlify Functions have their dependencies. Either zip the folder including `node_modules`, or let Netlify build install them (see step 2).

## Step 1: Create the Netlify site

1. Go to https://app.netlify.com
2. Create a new site via drag-and-drop: zip the `trinity-cgm-plus-pwa` folder and drop it on the Netlify deploy page.
3. Note the generated site URL (e.g., `https://your-site-name.netlify.app`).

## Step 2: Set environment variables

Go to Site Settings > Environment Variables and add all of these:

| Variable | Value |
|----------|-------|
| APP_PASSWORD | (choose a strong app unlock password) |
| BIOT_API_BASE | (BioT API URL, e.g. https://api.dev.xxx.biot-med.com) |
| BIOT_PATIENT_USER | (patient login email) |
| BIOT_PATIENT_PASS | (patient login password) |
| BIOT_CLINICIAN_USER | (clinician login email) |
| BIOT_CLINICIAN_PASS | (clinician login password) |
| BIOT_PATIENT_ID | (patient UUID from BioT) |
| ALLOWED_ORIGIN | https://your-site-name.netlify.app |
| WEBAUTHN_RP_ID | your-site-name.netlify.app |
| WEBAUTHN_RP_NAME | CGM Plus |

Replace `your-site-name` with the actual Netlify subdomain.

## Step 3: Redeploy

After setting env vars, trigger a redeploy (Deploys > Trigger Deploy > Deploy site). Env vars are only read at function invocation time, but redeploying ensures everything is fresh.

## Step 4: Verify functions are deployed

Go to Functions in the Netlify dashboard. You should see:
- `login`
- `register-credential`

If they don't appear, check that `netlify.toml` has `functions = "netlify/functions"` and that the `netlify/functions/` directory is in the zip.

## Step 5: Smoke test

1. Open `https://your-site-name.netlify.app` in Chrome.
2. Password screen appears. Enter the APP_PASSWORD.
3. Glucose data loads.
4. Fingerprint prompt appears. Click Enable, complete biometric.
5. Reload. Fingerprint prompt immediately, no password.
6. Cancel fingerprint. Falls through to password screen.

## Important notes

- WebAuthn credentials registered on `localhost` won't transfer to the deployed site. First launch on the new URL is a fresh registration. This is expected.
- The `WEBAUTHN_RP_ID` must be the bare hostname (no `https://`, no port). Example: `your-site-name.netlify.app`.
- The `ALLOWED_ORIGIN` must include the protocol. Example: `https://your-site-name.netlify.app`.
- If you change the APP_PASSWORD, existing users just need to enter the new one on their next login.
- If you later set up a custom domain, update both `ALLOWED_ORIGIN` and `WEBAUTHN_RP_ID` to match. Users will need to re-register their fingerprint since the RP ID changed.

## Updating code after deploy

1. Make changes to `index.html` or other files.
2. Bump `CACHE_NAME` in `sw.js` (e.g., v17 to v18).
3. Zip and drop onto the site's Deploys page (or use `netlify deploy --prod`).
4. No APK rebuild needed if you have a TWA. The TWA loads the website.
