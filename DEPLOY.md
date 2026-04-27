# Trinity CGM Plus — PWA to APK (Path 2)

This folder is a working Progressive Web App. You host it on HTTPS, then PWABuilder.com converts it to a signed APK you can sideload on your Android phone.

Total time: ~15 minutes.

## What's in this folder

- `index.html` — the demo app (live BioT data, 5 screens)
- `manifest.json` — PWA metadata (name, icons, theme color)
- `sw.js` — service worker (offline shell, never caches BioT API)
- `icon-192.png`, `icon-512.png`, `icon-512-maskable.png` — app icons

## Step 1: Host the folder on HTTPS

PWABuilder requires a public HTTPS URL. Pick one option.

### Option A — Vercel (fastest, drag-and-drop)

1. Go to https://vercel.com/new
2. Sign in (GitHub / email)
3. Click "Deploy" → "Import" → drag the `trinity-cgm-plus-pwa` folder into the upload box (or zip it first and drop the zip)
4. Project name: `trinity-cgm-plus` → Deploy
5. Copy the URL, e.g. `https://trinity-cgm-plus.vercel.app`

### Option B — Netlify Drop

1. Go to https://app.netlify.com/drop
2. Drag the `trinity-cgm-plus-pwa` folder onto the page
3. Copy the URL, e.g. `https://wondrous-llama-12345.netlify.app`

### Option C — GitHub Pages

1. Create a repo, push the folder contents to the root
2. Settings → Pages → Source: main branch → Save
3. URL: `https://<username>.github.io/<repo>/`

## Step 2: Validate the PWA

1. Open the URL on your phone's Chrome
2. Confirm the app loads and shows live glucose data
3. Chrome menu → "Install app" should be available (this proves the manifest + SW are valid)

If Chrome won't offer install, open DevTools on desktop → Application → Manifest, fix any errors there first.

## Step 3: Generate the APK

1. Go to https://www.pwabuilder.com
2. Paste your HTTPS URL, click "Start"
3. Wait for the score card. You want green checks on Manifest + Service Worker. Minor warnings are fine.
4. Click "Package For Stores" → "Android"
5. Choose **"Other Android"** (not Google Play) — this gives you a sideload-ready signed APK without needing a Play Developer account
6. Leave defaults. Download the ZIP.
7. Unzip. Use the `.apk` file (not the `.aab`).

## Step 4: Sideload on your phone

1. Email or AirDrop the `.apk` to your Android phone, or put it on Drive
2. Settings → Apps → Special app access → Install unknown apps → enable for your browser or file manager
3. Tap the APK → Install
4. Open "CGM Plus" from your launcher

## Step 5: First-run check

- Tap the Live banner to pull fresh data
- Confirm Home shows Olivia's latest glucose, HR, activity
- Tap Health → 3/6/12/24 hour filters change readings count
- Tap Range → stacked bar + 75% target copy
- Tap Average → 7-day bubbles render

## Troubleshooting

- **Blank screen in APK**: open Chrome DevTools → remote debug the device (`chrome://inspect`) → check console. Usually a manifest/SW path issue.
- **"App not installed"**: turn on "Install unknown apps" for the app that is opening the APK.
- **No data**: API token may have expired in the embedded demo. Regenerate and re-host.

## Notes

- The APK is signed by PWABuilder with a test key. Fine for demos and personal install. Not for Play Store distribution.
- Every code change requires: update the folder → redeploy → PWABuilder → new APK.
- Service worker version is `trinity-cgm-plus-v1`. Bump to `v2` in `sw.js` when you change the shell, so users get the new code.
