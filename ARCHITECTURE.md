# Trinity CGM Plus — Architecture & Extension Guide

Single-file PWA. Everything lives in `index.html` (HTML + CSS + vanilla JS). No build step, no framework, no bundler. This is deliberate — demos must be editable and deployable by one person in under a minute.

## Why single-file vanilla JS (not React)

- Zero build tooling. Edit → zip → drop on Netlify → done.
- No `npm install`, no `vite`, no webpack cache invalidation bugs.
- Entire app fits in one editor buffer. Easy to reason about for demos and for AI-assisted edits.
- PWA → TWA path works identically on Lovable/React apps, but React adds first-paint cost we don't need here.

If a future demo needs real app-store polish or shared component library, rewrite in React and use PWABuilder on the built output. The BioT integration patterns below transfer directly.

## Runtime architecture

```
index.html loads
     │
     ▼
register sw.js (service worker)
     │
     ▼
init() ──► login() ──► loadAll(24) ──► setInterval(loadAll, 60_000)
                           │
            ┌──────────────┼──────────────┐
            ▼              ▼              ▼
      fetchMeasurements  fetchSession  loadWeekAverages
      (DESC, parallel    (single call)  (7 parallel
       6h chunks)                        one-page queries,
                                         5min cache)
            │              │              │
            └──────────────┼──────────────┘
                           ▼
                    Promise.all → apply* renderers
                           │
       ┌────────┬──────────┼──────────┬─────────┐
       ▼        ▼          ▼          ▼         ▼
    applyHome  drawChart  applyRange applyAvg  applyDashboard
```

## BioT integration patterns

### 1. Authentication: patient-first, clinician fallback

```js
async function login() {
  const patientToken = await doLogin(PATIENT_CRED, 'patient');
  if (patientToken && await probeReadAccess(patientToken)) {
    token = patientToken; authRole = 'patient'; return;
  }
  // Patient token often lacks session read scope. Fall back silently.
  const clinToken = await doLogin(CLINICIAN_CRED, 'clinician');
  if (!clinToken) throw new Error('Both logins failed');
  token = clinToken; authRole = 'clinician';
}
```

**Why:** BioT's ABAC model often restricts patient tokens from reading the `usage-sessions` endpoint. We try patient first (correct persona for a patient app) and fall back to clinician silently so the demo never shows an auth error.

**Do not** expose the clinician fallback in UI. The screen still says "Olivia" — the user never knows which token made the call.

### 2. Measurement fetching: DESC + parallel chunks

**The wrong way (kills demos):**
```js
// Sequential ASC pagination — 3s per page × 15 pages = 45s for 24h. UNUSABLE.
let cursor = fromIso;
for (let page = 0; page < 20; page++) {
  const rows = await fetchPage(cursor, toIso, 'ASC');
  if (!rows.length) break;
  cursor = rows[rows.length - 1].timestamp + 1ms;
}
```

**The right way:**
```js
// DESC sort. One page for ≤6h windows. Parallel 6h chunks for longer windows.
if (hours <= 6) {
  rowsLists = [await fetchChunk(fromIso, toIso)];  // single call, ~2s
} else {
  const chunks = [];
  for (let h = 0; h < hours; h += 6) {
    chunks.push(fetchChunk(hMinusChunk, hNow));  // 6h each
  }
  rowsLists = await Promise.all(chunks);  // 4 calls in parallel = ~2-3s total
}
// Dedupe by timestamp + field presence, then sort ASC for charting.
```

**Why:** BioT Timestream queries have ~2-3s fixed latency regardless of rows returned. Sequential pagination stacks latency linearly. Parallel chunking flattens it to the slowest single call.

**Row shape quirk:** one timestamp = ~5 rows (one per field: glucose, hr, hrv, skinTemp, activity). So `limit=100` returns ~20 glucose readings. Dedupe carefully.

### 3. Week averages: one parallel call per day, cached 5 min

```js
const WEEK_CACHE_MS = 5 * 60 * 1000;
let cachedWeekReadings = null;
let cachedWeekAt = 0;

async function loadWeekAverages() {
  // 7 parallel calls, one per calendar day, limit=100 each.
  const promises = [];
  for (let i = 0; i <= 6; i++) promises.push(fetchDay(i));
  const results = await Promise.all(promises);
  cachedWeekReadings = results;
  cachedWeekAt = Date.now();
  return results;
}

// In loadAll:
const weekPromise = (cachedWeekReadings && (Date.now() - cachedWeekAt) < WEEK_CACHE_MS)
  ? Promise.resolve(cachedWeekReadings)
  : loadWeekAverages();
```

**Why:** Week data rarely changes mid-demo. Caching 5 minutes makes tab switches instant and cuts polling cost.

### 4. Field names (Demo2 ground truth)

Use exactly these keys on measurement rows:
- `glucose` (mg/dL integer)
- `hr` (NOT `heartRate` — the BioT template uses the short name)
- `hrv` (ms)
- `skinTemp` (°C)
- `activity` (steps, bigint)

Filter format:
```json
{ "filter": {
    "_patient.id": { "eq": "<patient-uuid>" },
    "timestamp": { "from": "<iso>", "to": "<iso>" }
  },
  "limit": 100,
  "sort": [{ "field": "timestamp", "order": "DESC" }]
}
```

### 5. Session state

```js
// Active wear session for the current patient.
{ filter: { '_patient.id': { eq: PATIENT_ID }, '_state': { eq: 'ACTIVE' } }, limit: 1 }
```

Session document includes pre-computed TIR fields when the backend plugin has run: `timeInRange`, `timeAboveRange`, `timeBelowRange`, `timeAboveRangeHigh`, `timeBelowRangeCritical`. If those are missing, compute from raw readings via `computeTIRFromReadings()`.

## Service worker rules

`sw.js` enforces:

- **Network-first for HTML** → redeploys ship instantly. Stale cache is fallback only on offline.
- **Cache-first for static** (icons, manifest) → zero-cost on warm loads.
- **Never cache BioT API** (`biot-med.com`) → always fresh telemetry.

**Always bump `CACHE_NAME`** on every deploy. Current: `trinity-cgm-plus-v8`. The activate handler deletes old caches, so no cruft piles up.

## TWA URL bar removal

Android shows the URL bar at the top of TWA apps unless you prove domain ownership via Digital Asset Links:

1. Extract SHA256 fingerprint from the signing keystore:
   ```bash
   keytool -list -v -keystore trinity-cgm-plus.keystore -alias trinity-cgm-plus
   ```
2. Paste the fingerprint into `assetlinks.json` (both at root and `.well-known/`).
3. Netlify strips hidden `.well-known/` folders on zip drop. Workaround: duplicate the file at root and add this redirect in `netlify.toml`:
   ```toml
   [[redirects]]
     from = "/.well-known/assetlinks.json"
     to = "/assetlinks.json"
     status = 200
     force = true
   ```
4. Verify the URL returns JSON (not a 404 HTML page) before launching the TWA.

## Extending the app

### Add a new screen (e.g., HRV Insights)

1. Add tab button in `.bottom-nav`:
   ```html
   <button class="tab" data-screen="hrv">HRV</button>
   ```
2. Add screen div in `.phone`:
   ```html
   <div class="screen" id="hrv">
     <!-- your markup -->
     <div id="hrvLastUpdated" class="muted small"></div>
   </div>
   ```
3. Add to `SCREEN_TITLES` map.
4. In `loadAll()`, after readings arrive, compute HRV stats and call a new `applyHRV(readings)` renderer. Reuse the existing `readings` array — no new API call needed.
5. Update the HRV "Updated HH:MM:SS" stamp alongside the others.

### Add a new BioT data source

1. Write a new fetcher following the DESC + parallel chunks pattern. Never add sequential ASC pagination.
2. Add it to `Promise.all` in `loadAll`.
3. Cache aggressively if the data changes slowly (pattern: 5-minute TTL like `cachedWeekReadings`).
4. Test with Demo2 `measurements/raw` endpoint first. Plugins and generic entities use different URLs — see Postman collection.

### Swap patient or environment

Top of the script block:
```js
const API_BASE = 'https://api.dev.demo2.biot-med.com';
const PATIENT_ID = 'c2d9...';  // Olivia on Demo2
const PATIENT_CRED = { username: 'daniel+olivia@biot-med.com', password: '...' };
const CLINICIAN_CRED = { username: 'daniel+nurse@biot-med.com', password: '...' };
```

For a different customer environment, change `API_BASE`, `PATIENT_ID`, and credentials. Nothing else. All paths are relative to `API_BASE`.

### Regenerate icons

```bash
cd trinity-cgm-plus-pwa
python3 gen_icons.py
```

Colors in `gen_icons.py`:
- `BG` cream `#FFF8F0` (BioT brand)
- `ACCENT` coral `#D97757`
- `DARK` deep brown `#3E2723`

Change these for a different customer brand. Regenerate all three (192, 512, 512-maskable). Maskable keeps content in the central 80% safe zone for Android adaptive icons.

### Diagnostic mode

The hidden `<div id="log">` exists for debug. To surface it during development, change `display:none` to the floating overlay style (see git history for exact CSS). The `log()` function already mirrors to `console.log` with a `[CGM]` prefix, so `chrome://inspect` remote debug works without any HTML changes.

Timings are written with a `[timing] stepName: Nms` format. Grep for `[timing]` in console output to see per-step latency.

## Anti-patterns we burned on

1. **Sequential ASC pagination** — 45+ second loads. Always DESC + parallel.
2. **Service worker cache-first for HTML** — redeploys never reach the app. Always network-first for HTML.
3. **Not bumping CACHE_NAME** — users stay on old JS. Always bump.
4. **Duplicate `let` declarations** — entire JS fails to parse, banner sticks on static HTML text, no error to the user. Always run `node -e "new Function(fs.readFileSync(...))"` after edits.
5. **Relying on patient token for everything** — session endpoint often requires clinician scope. Always have a fallback.
6. **Expecting BioT template field names to match convention** — it's `hr` not `heartRate`. Always pull the actual template before coding.
7. **Hiding dot-folders on macOS Finder zip** — `.well-known/` gets stripped. Always zip via Terminal (`zip -r ...`), not Finder right-click.
8. **Short default time window on sparse demo data** — 6h window shows nothing if last reading is 10h ago. Default to 24h for demos.

## What lives where

| Concern | Lines in index.html (approx) |
|---|---|
| Styles | 1–250 |
| HTML structure | 250–520 |
| Globals, logging, banner | 520–565 |
| Auth (login, probe) | 565–615 |
| Data fetchers (measurements, session) | 615–675 |
| Computation (mmol, TIR, GMI, CV, trend, AGP) | 675–920 |
| Week averages | 960–1005 |
| Render functions (applyHome, applyRange, applyAvg, applyDashboard, applyHealth) | 1005–1185 |
| loadAll orchestrator | 1186–1250 |
| init, pill handlers, banner tap, SW register | 1250–1350 |

Line ranges drift as the app grows — grep for the function name when navigating.
