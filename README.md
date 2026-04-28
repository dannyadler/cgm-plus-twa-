# Trinity CGM Plus — Mobile Demo App

Single-page PWA that wraps the BioT Demo2 backend and runs on Android as a signed APK via PWABuilder's TWA (Trusted Web Activity).

Built for the Trinity Tech CGM Plus presale demo (Avinash) in April 2026. Serves as the reference implementation for future BioT mobile apps.

## What this app does

Five screens, all populated from live BioT API calls:

- **Home** — latest glucose in mmol/L, trend arrow, HR, activity, skin temp, "N hours ago" freshness
- **Health** — glucose trend chart (3h / 6h / 12h window selector)
- **Range** — Time in Range donut, stacked range bar, category percentages
- **Average** — 7-day glucose average with per-day bubbles (M–S)
- **More / Dashboard** — Time in Range donut, GMI, estimated A1C, CV, glucose trend chart with 1h / 3h / 6h / 12h / 24h selector

## File layout

```
trinity-cgm-plus-pwa/
├── index.html              Main app. HTML + CSS + all JS in one file.
├── manifest.json           PWA metadata (name, icons, theme color, display mode)
├── sw.js                   Service worker. Network-first for HTML, cache-first for static, never caches BioT API.
├── icon-192.png            192×192 app icon (any purpose)
├── icon-512.png            512×512 app icon (any purpose)
├── icon-512-maskable.png   512×512 maskable icon (Android adaptive)
├── gen_icons.py            Python PIL script to regenerate icons from brand colors
├── .well-known/
│   └── assetlinks.json     Digital Asset Links — removes TWA URL bar on Android
├── assetlinks.json         Duplicate at root (Netlify strips .well-known on zip drop)
├── netlify.toml            Redirect /.well-known/assetlinks.json to /assetlinks.json
├── DEPLOY.md               Original host + PWABuilder + sideload instructions
├── ARCHITECTURE.md         Design patterns, BioT integration details, extension guide
└── README.md               This file
```

## Live demo

- Hosted at: https://inquisitive-panda-a41165.netlify.app
- Backend: BioT Demo2 (https://api.dev.demo2.biot-med.com)
- Patient: Olivia (demo patient on Demo2)
- Auth: patient credentials first, clinician fallback for session read scope

## Deploy flow

On your Mac, from the Trinity Demo folder:

```bash
cd "/Users/daniel/Library/CloudStorage/GoogleDrive-daniel@biot-med.com/Shared drives/CRM/Trinity Biotech/Presale Planning/POC/Trinity Demo"
rm -f trinity-cgm-plus-pwa.zip
zip -r trinity-cgm-plus-pwa.zip trinity-cgm-plus-pwa
open https://app.netlify.com/sites/inquisitive-panda-a41165/deploys
```

Drag the zip onto the deploys page. Wait for "Published". TWA wrapper on the phone pulls fresh content on next launch. No APK rebuild needed.

Always bump `CACHE_NAME` in `sw.js` (`trinity-cgm-plus-vN` → `vN+1`) before redeploying. Otherwise old clients stay stuck on cached JS.

## Phone install (one-time, already done)

Signed APK installed on Daniel's phone. Package name: `app.netlify.inquisitive_panda_a41165.twa`. SHA256 fingerprint registered in assetlinks.json.

To reinstall on a new phone, regenerate APK via PWABuilder → Android → "Other Android" tab → sign on Mac with `zipalign` + `apksigner` using the keystore at `~/trinity-cgm-plus.keystore` (on Daniel's Mac).

## Performance profile

Cold load (clear storage → open): ~3–4s total
- Login 1.3s
- Session fetch 0.8s (parallel)
- Measurements 24h 2.7s (parallel)
- Week averages 3.8s (parallel, one-page-per-day)

Warm tab switches (within 5 min): instant (week data cached).

## Extending the app

See `ARCHITECTURE.md` for:
- Adding a new screen
- Adding a new BioT data source
- Swapping patient / environment
- Performance rules (why DESC sort matters)
- Auth pattern (patient → clinician fallback)
- Icon regeneration
- TWA URL-bar troubleshooting

## Reusable elsewhere

This app is the reference for the `biot-mobile-builder` skill. Any future BioT mobile demo should start by copying this folder and applying the patterns documented in `ARCHITECTURE.md`.
