> **AI-Generated Draft — Requires Human Review and QMS Integration**
>
> This document was produced by an AI system from source code and architectural notes. It is illustrative material for a Trinity Biotech presentation on AI-assisted regulatory documentation. **It has not been reviewed by qualified Regulatory Affairs personnel, has not been integrated into any QMS, and must not be used as evidence of design controls under ISO 13485, IEC 62304, or 21 CFR 820.**


| Field | Value |
|---|---|
| Document Title | Software Design Description |
| Document ID | TCG-REG-03 |
| Product | Trinity CGM Plus (presale demo) |
| Version | 0.1 (AI draft) |
| Generated | 2026-04-28 |
| Author | AI-assisted (Claude Opus 4.7) |
| Status | DRAFT — Pending Human Review |
| Software Safety Class | B |

## 1. Introduction

### 1.1 Purpose

This Software Design Description (SDD) realizes the requirements of [TCG-REG-02 SRS](02-software-requirements-specification.md) by decomposing the Trinity CGM Plus PWA into software items, defining their interfaces, and identifying the SOUP components on which they depend. It satisfies IEC 62304 §5.3 (Software architectural design). Detailed unit-level design (§5.4) is not required for Class B classification.

### 1.2 References

- [TCG-REG-01 Software Safety Classification](01-software-safety-classification.md)
- [TCG-REG-02 Software Requirements Specification](02-software-requirements-specification.md)
- [TCG-REG-04 Risk Analysis](04-risk-analysis.md)
- [TCG-REG-07 SBOM](07-sbom.cyclonedx.json)
- ARCHITECTURE.md (project repository)
- IEC 62304:2006/AMD 1:2015 §5.3

## 2. Architectural Overview

The system is decomposed into three deployment tiers:

| Tier | Technology | Software Items |
|---|---|---|
| Client | Browser / Chrome TWA | DES-CLI-01 through DES-CLI-07 |
| Server (edge) | Netlify Functions (Node 20+) | DES-SRV-01, DES-SRV-02 |
| External SOUP | BioT Demo2, WebAuthn platform authenticator, Netlify Blobs | See [SBOM](07-sbom.cyclonedx.json) |

```
                     ┌──────────────────────────────────┐
                     │     Trinity CGM Plus PWA Client  │
                     │     (index.html + sw.js)         │
                     │                                  │
   ┌───────┐         │  DES-CLI-01  Auth Gate UI        │
   │ User  │ tap →   │  DES-CLI-02  WebAuthn Client     │
   └───┬───┘         │  DES-CLI-03  Data Fetcher        │
       │             │  DES-CLI-04  Computation Module  │
       │             │  DES-CLI-05  Renderer            │
       │             │  DES-CLI-06  Service Worker      │
       │             │  DES-CLI-07  Tab Navigation      │
       │             └────┬──────────────┬──────────────┘
       │             HTTPS│              │HTTPS Bearer <token>
       │                  │              │
       │       ┌──────────▼─────────┐   ┌▼──────────────────┐
       │       │ DES-SRV-01 login   │   │ BioT Demo2 API    │
       │       │ DES-SRV-02 register│   │  (SOUP, Class B)  │
       │       │   + Netlify Blobs  │   └───────────────────┘
       │       └────────────────────┘
       │
       └──── Touch ID / Android biometric (platform authenticator, SOUP)
```

## 3. Software Item Hierarchy

### 3.1 Client Items (DES-CLI-*)

#### DES-CLI-01 — Auth Gate UI

**Location:** `index.html` lines ~580–640 (HTML), JS auth-gate handlers in script block.

**Responsibility:** Renders password input on cold launch, intercepts boot-up before any data-fetch-bearing screen is shown. Owns the visual transition from gate → app. Exposes `showAuthGate()`, `hideAuthGate()`, and orchestrates the first-launch fingerprint enrollment prompt.

**Realizes:** REQ-001, REQ-002, REQ-009.

**Interfaces:**
- Inputs: User keypress events on password field. WebAuthn capability detection result from DES-CLI-02.
- Outputs: Calls `secureLoginWithPassword(password, needsRegistration)` (DES-CLI-02) on submit.

#### DES-CLI-02 — WebAuthn Client Module

**Location:** `index.html` "Secure auth helpers" block.

**Responsibility:** Wraps `navigator.credentials.create()` and `navigator.credentials.get()`. Encodes/decodes ArrayBuffer ↔ base64url. Detects platform authenticator availability. Calls Netlify Functions `login` (modes: password, challenge, webauthn) and `register-credential`.

**Realizes:** REQ-003, REQ-005, REQ-009, REQ-060, REQ-061.

**Interfaces:**
- Inputs: App password (string), credential ID (base64url, from localStorage).
- Outputs: BioT token, role, patientId, apiBase, expiresAt — written to module-scoped variables consumed by DES-CLI-03.
- Exports: `secureLoginWithPassword`, `secureGetChallenge`, `secureLoginWithWebAuthn`, `secureRegisterCredential`, `webauthnSupported`, `applyLoginResult`.

#### DES-CLI-03 — Data Fetcher

**Location:** `index.html` `fetchMeasurements`, `fetchSession`, `loadWeekAverages`, `loadAll`.

**Responsibility:** Issues parallel `searchRequest`-encoded queries to BioT, applies the 1-hour-chunk DESC pattern, dedupes rows, sorts ASC, and returns merged datasets. Owns the 60-second `setInterval` refresh loop and the 5-minute week-data cache.

**Realizes:** REQ-010 through REQ-015, REQ-031 through REQ-033, REQ-050 through REQ-053.

**Interfaces:**
- Inputs: `token` (in-memory), `PATIENT_ID`, `API_BASE` (from DES-CLI-02 login result).
- Outputs: Arrays of measurement rows handed to DES-CLI-04 / DES-CLI-05.
- Error handling: 401 from any call → triggers DES-CLI-02 re-auth, retries the call once, then surfaces error via banner.

#### DES-CLI-04 — Computation Module

**Location:** `index.html` `toMmol`, `glucoseState`, `computeTrend`, `computeTIRFromReadings`, `resampleToBins`, `smoothBins`, `smoothPath`, `bubbleClass`, `latestNonNull`.

**Responsibility:** Pure functions. Unit conversion, glucose-state classification, time-in-range computation, trend rate, smoothing pipeline (5-min bin → triangular kernel × 2 → Catmull-Rom). No DOM, no fetch.

**Realizes:** REQ-020, REQ-022, REQ-024, REQ-025, REQ-028, REQ-029, REQ-080.

**Interfaces:**
- Pure: `(input) → output`. No global state read or written except for module-scoped constants.

**Class B note:** Because this module owns all glucose-value-affecting math, unit-test coverage of these functions is the highest-leverage verification activity. See [TCG-REG-05 STD](05-software-test-description.md) §3.1.

#### DES-CLI-05 — Renderer

**Location:** `index.html` `applyHome`, `applyDashboard`, `applyHealthFromReadings`, `applyRangeScreen`, `applyAverageScreen`, `drawChart`, `drawHealthChart`, `drawChartInto`.

**Responsibility:** Updates DOM nodes by ID with values from DES-CLI-04 outputs. Builds SVG chart paths. Sets background color class per glucose state. Updates "Updated HH:MM:SS" stamps.

**Realizes:** REQ-020, REQ-021, REQ-023, REQ-025, REQ-027, REQ-030, REQ-081, REQ-084, REQ-100, REQ-103.

**Interfaces:**
- Inputs: Reading arrays, session object, computed metrics, currently selected time window.
- Outputs: DOM mutations (text content, class names, SVG paths, inline styles).

#### DES-CLI-06 — Service Worker

**Location:** `sw.js`.

**Responsibility:** Network-first for HTML, cache-first for static assets, never-cache for BioT API and Netlify Functions. Owns `CACHE_NAME` versioning. Cleans up old caches on activation.

**Realizes:** REQ-034, REQ-035, REQ-036, REQ-070, REQ-071.

**Interfaces:**
- Inputs: `fetch` events from the registered scope.
- Outputs: Cached or networked responses.

#### DES-CLI-07 — Tab Navigation

**Location:** `index.html` `.tab` event listeners, `.pill` and `.hours-pill` listeners.

**Responsibility:** Switches `.screen.active` class. Re-renders chart on time-pill change from cached data without re-fetching.

**Realizes:** REQ-026, REQ-041.

### 3.2 Server Items (DES-SRV-*)

#### DES-SRV-01 — Login Function

**Location:** `netlify/functions/login.mjs`.

**Responsibility:** Three modes:

1. **`mode: 'password'`** — Validates `appPassword` constant-time against `APP_PASSWORD` env var. On match, performs the BioT patient-first / clinician-fallback login, returns `{ token, role, patientId, apiBase, expiresAt }`. May also return a registration challenge + signed nonce if `needsRegistration: true`.
2. **`mode: 'challenge'`** — Returns a fresh WebAuthn `PublicKeyCredentialRequestOptions` for the supplied `credentialId` (looked up in Netlify Blobs).
3. **`mode: 'webauthn'`** — Verifies the WebAuthn assertion using `@simplewebauthn/server` against the stored public key. On success, performs BioT login server-side and returns the same token shape as password mode.

**Realizes:** REQ-002, REQ-006, REQ-007, REQ-062, REQ-091, REQ-092, REQ-093.

**Interfaces:**
- Inputs: HTTP POST JSON body. Env vars `APP_PASSWORD`, `BIOT_*`, `ALLOWED_ORIGIN`, `WEBAUTHN_RP_ID`, `WEBAUTHN_RP_NAME`.
- Outputs: HTTP JSON response.
- Side effects: Reads/writes Netlify Blobs (rate-limit counters, registered credentials).

#### DES-SRV-02 — Register Credential Function

**Location:** `netlify/functions/register-credential.mjs`.

**Responsibility:** Validates the WebAuthn registration attestation using `@simplewebauthn/server`, checks the signed nonce returned earlier from password-mode login, and persists `credentialId → { publicKey, counter, registeredAt }` to Netlify Blobs.

**Realizes:** REQ-003, REQ-062.

**Interfaces:**
- Inputs: `{ credentialId, attestation, nonce, nonceSig }`.
- Outputs: `{ ok: true }` or 4xx error.

## 4. Trust Boundaries

```
┌─────────────────────────────────────────────────────────────┐
│ TRUST BOUNDARY 1: Browser process                           │
│  Untrusted: any data received from network                  │
│  Trusted: in-memory token (not persisted)                   │
│  Sensitive: WebAuthn credential ID (localStorage)           │
└─────────────────────────────────────────────────────────────┘
                           ↑↓ HTTPS, CORS-restricted
┌─────────────────────────────────────────────────────────────┐
│ TRUST BOUNDARY 2: Netlify Function (per-invocation isolated)│
│  Trusted: env-var-supplied secrets                          │
│  Sensitive: Netlify Blobs storage                           │
│  Outbound: HTTPS to BioT (using stored creds)               │
└─────────────────────────────────────────────────────────────┘
                           ↑↓ HTTPS Bearer
┌─────────────────────────────────────────────────────────────┐
│ TRUST BOUNDARY 3: BioT Demo2 backend (SOUP)                 │
│  Out of scope; owned by BioT Medical Solutions              │
└─────────────────────────────────────────────────────────────┘
```

The single highest-value design decision is: **BioT credentials never cross the boundary into the browser.** Only ephemeral BioT access tokens cross, and only after the user has authenticated to the Netlify Function tier.

## 5. Data Dictionary (selected)

### 5.1 BioT measurement row (consumed)

| Field | Type | Units | Notes |
|---|---|---|---|
| `_id` | UUID | — | Row identity |
| `_patient.id` | UUID | — | Filter key |
| `timestamp` | ISO 8601 | UTC | Sort/filter key |
| `glucose` | integer | mg/dL | Convert via DES-CLI-04 `toMmol` |
| `hr` | integer | bpm | **Not** `heartRate` |
| `hrv` | integer | ms | Currently unused in display |
| `skinTemp` | float | °C | |
| `activity` | bigint | steps | Cumulative-vs-delta semantics: see RISK-08 |

### 5.2 BioT login response (consumed)

```json
{ "accessJwt": { "token": "eyJ..." } }
```

### 5.3 Login Function response (produced)

```json
{
  "token": "eyJ...",
  "role": "patient" | "clinician",
  "patientId": "uuid",
  "apiBase": "https://api.dev.demo2.biot-med.com",
  "expiresAt": 1714326000000,
  "nonce": "base64url",     // password mode + needsRegistration only
  "nonceSig": "base64url",  // password mode + needsRegistration only
  "registrationOptions": {} // password mode + needsRegistration only
}
```

### 5.4 Persisted state (Netlify Blobs)

| Store | Key | Value |
|---|---|---|
| `webauthn-credentials` | `<credentialId>` | `{ publicKey, counter, registeredAt }` |
| `rate-limit` | `<sourceIp>` | `{ attempts, windowStart }` (60-second TTL) |

### 5.5 Persisted state (browser localStorage)

| Key | Value |
|---|---|
| `cgm_webauthn_cred_id` | base64url credential ID |
| `cgm_webauthn_skipped` | `"1"` if user declined fingerprint |

## 6. Dynamic Behavior

### 6.1 Cold launch sequence (first run, secure auth path)

```
1. Browser loads index.html
2. DES-CLI-06 service worker registers (no-blocking)
3. SECURE_AUTH_ENABLED check → DES-CLI-01 shows password gate
4. User submits password
5. DES-CLI-02 → POST /login {mode:'password', needsRegistration:true}
6. DES-SRV-01 validates, performs BioT login, returns token + reg challenge
7. DES-CLI-02 stores token in JS memory (NOT localStorage)
8. DES-CLI-03 begins loadAll cycle (parallel measurements, session, week)
9. DES-CLI-05 renders home, range, average, dashboard, health screens
10. DES-CLI-01 prompts "Enable fingerprint?"
11. User accepts → navigator.credentials.create() → POST /register-credential
12. DES-SRV-02 verifies attestation, persists to Netlify Blobs
13. DES-CLI-02 stores credentialId in localStorage
14. setInterval(loadAll, 60_000)
```

### 6.2 Warm launch sequence (credential present)

```
1. Browser loads index.html
2. DES-CLI-01 detects credential ID in localStorage
3. DES-CLI-02 → POST /login {mode:'challenge', credentialId}
4. DES-SRV-01 returns PublicKeyCredentialRequestOptions
5. DES-CLI-02 → navigator.credentials.get() — TouchID / fingerprint prompt
6. On success → POST /login {mode:'webauthn', credentialId, assertion}
7. DES-SRV-01 verifies assertion, performs BioT login, returns token
8. DES-CLI-03 begins loadAll cycle
9. setInterval(loadAll, 60_000)
```

### 6.3 Token-expiry retry sequence

```
loadAll → fetchMeasurements → 401
       → re-trigger DES-CLI-02 unlock (silent fingerprint or fall to password)
       → fresh token applied
       → retry the failed call once
       → if 401 again, banner = "Connection error", do NOT cascade retries
```

## 7. SOUP Components

Per IEC 62304 §5.3.3 and §8.1.2:

| SOUP | Source | Version | Class | Hazards from SOUP failure | Mitigation |
|---|---|---|---|---|---|
| @simplewebauthn/server | npm, MIT | 13.1.1 | B | Bypass of WebAuthn auth → unauthorized access | Defense in depth: app password is independent layer |
| @netlify/blobs | npm, MIT | 8.1.0 | B | Loss of credential storage → user must re-register | Acceptable; non-safety-critical |
| BioT Demo2 backend | BioT Medical Solutions | live | B | Wrong glucose data returned | Out of scope; relies on BioT's own QMS |
| WebAuthn platform authenticator | Browser/OS | platform | B | Authenticator failure | Fall back to password (REQ-009) |
| Netlify Functions runtime | Netlify | live | B | Function unavailable | App displays error banner; no harm to user |

A formal SOUP qualification record is required per IEC 62304 §8.1.2 before any productized release. **Not present in this DHF.**

## 8. Open Items for Human Reviewer

1. The HRV field is fetched and deduped but not displayed. Either drop the fetch or design a display path.
2. `loadHealthScreen` is unreachable code in the current codebase. Either wire it up or remove it.
3. The `fetchMeasurements(hours, limit=100)` parameter `limit` is ignored by the function body, which hardcodes 100. Either honor or remove.
4. `tirPeriod` element is set twice in `loadAll`, second write reverts user-selected window to "Last 24h". Bug to fix; trace also into TST-026.
5. The `computeTrend` function uses raw consecutive readings rather than smoothed ones. See RISK-09.
6. Activity sum semantics (cumulative vs delta) are not formally documented anywhere. See RISK-08.

---

*Generated by AI in approximately 4 minutes. Equivalent manual effort: 3–5 person-days.*
