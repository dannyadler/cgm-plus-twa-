> **AI-Generated Draft — Requires Human Review and QMS Integration**
>
> This document was produced by an AI system from source code and architectural notes. It is illustrative material for a Trinity Biotech presentation on AI-assisted regulatory documentation. **It has not been reviewed by qualified Regulatory Affairs personnel, has not been integrated into any QMS, and must not be used as evidence of design controls under ISO 13485, IEC 62304, or 21 CFR 820.**


| Field | Value |
|---|---|
| Document Title | Software Requirements Specification |
| Document ID | TCG-REG-02 |
| Product | Trinity CGM Plus (presale demo) |
| Version | 0.1 (AI draft) |
| Generated | 2026-04-28 |
| Author | AI-assisted (Claude Opus 4.7) |
| Status | DRAFT — Pending Human Review |
| Software Safety Class | B (per [TCG-REG-01](01-software-safety-classification.md)) |

## 1. Introduction

### 1.1 Purpose

This Software Requirements Specification (SRS) defines the functional, performance, interface, safety, security, and usability requirements for the Trinity CGM Plus presale demonstration application. It serves as the input to architectural design (TCG-REG-03), risk analysis (TCG-REG-04), and verification (TCG-REG-05).

### 1.2 Scope

The Software Item Under Specification (SIUS) consists of:

- The single-page Progressive Web App at `index.html`.
- The Netlify Functions in `netlify/functions/`.
- The service worker `sw.js`.
- The PWA manifest `manifest.json`.

External dependencies treated as black-box interfaces:

- BioT Demo2 backend API.
- WebAuthn platform authenticator (Touch ID, Android biometric, Windows Hello).
- Netlify Blobs persistent storage.
- Browser PWA / TWA runtime.

### 1.3 Definitions and Acronyms

| Term | Meaning |
|---|---|
| ABAC | Attribute-Based Access Control (BioT permission model) |
| BioT | The BioT Medical Solutions backend platform |
| CGM | Continuous Glucose Monitor |
| CV | Coefficient of Variation |
| DESC | Descending sort order |
| GMI | Glucose Management Indicator |
| mg/dL | Milligrams per deciliter (US glucose units) |
| mmol/L | Millimoles per liter (international glucose units) |
| PWA | Progressive Web App |
| PHI | Protected Health Information |
| RP | Relying Party (WebAuthn) |
| SOUP | Software Of Unknown Provenance |
| TIR | Time in Range |
| TWA | Trusted Web Activity (Android wrapper) |

### 1.4 References

- IEC 62304:2006/AMD 1:2015 §5.2 — Software requirements analysis
- IEEE 830-1998 — Recommended Practice for SRS
- IEC 62366-1:2015 — Application of usability engineering to medical devices
- TCG-REG-01 Software Safety Classification
- TCG-REG-04 Risk Analysis
- TCG-REG-08 Traceability Matrix
- ARCHITECTURE.md (project repository)

## 2. System Overview

The Trinity CGM Plus PWA is a single-screen mobile application that displays a logged-in patient's glucose telemetry on five tabbed views (Home, Health, Range, Average, Dashboard). It authenticates via app-level password and platform biometric, retrieves data from a BioT backend over HTTPS, applies derived computations (TIR, GMI, CV, smoothed trend), and refreshes once per minute.

```
┌────────────────────────────────────────────────────────────┐
│                   Browser / Chrome TWA                     │
│  ┌──────────────────────────────────────────────────────┐  │
│  │            Trinity CGM Plus PWA (index.html)         │  │
│  │  ┌────────────┐  ┌──────────────┐  ┌──────────────┐  │  │
│  │  │ Auth Gate  │→ │ Data Fetcher │→ │  Renderers   │  │  │
│  │  │ (WebAuthn) │  │ (parallel)   │  │ (5 screens)  │  │  │
│  │  └─────┬──────┘  └──────┬───────┘  └──────────────┘  │  │
│  └────────┼────────────────┼─────────────────────────────┘  │
└───────────┼────────────────┼────────────────────────────────┘
            │                │
       HTTPS│                │HTTPS  Authorization: Bearer <token>
            ▼                ▼
   ┌────────────────┐  ┌──────────────────────┐
   │ Netlify Functions │  BioT Demo2 Backend  │
   │ - login.mjs       │  - /ums/v2/users/login
   │ - register-cred   │  - /measurement/v2/measurements/raw
   │ + Netlify Blobs   │  - /device/v1/devices/usage-sessions
   └────────────────┘  └──────────────────────┘
```

## 3. Functional Requirements

### 3.1 Authentication and Session Management

| ID | Requirement | Priority | Verification |
|---|---|---|---|
| REQ-001 | The application **shall** prevent any data fetch from the BioT backend until the user has successfully authenticated. | High | TST-001 |
| REQ-002 | The application **shall** authenticate users via an app-level password validated server-side by the `login` Netlify Function. | High | TST-002 |
| REQ-003 | The application **shall** support fingerprint / biometric unlock on subsequent launches via WebAuthn platform authenticator. | Medium | TST-003 |
| REQ-004 | The application **shall not** store BioT credentials in any client-accessible storage (localStorage, sessionStorage, IndexedDB, cookies, JS source). | High | TST-004 |
| REQ-005 | The application **shall not** store the BioT access token persistently; it shall reside only in JavaScript memory for the duration of the session. | High | TST-005 |
| REQ-006 | The application **shall** retrigger authentication when any BioT API call returns HTTP 401 and retry the call once with the refreshed token. | Medium | TST-006 |
| REQ-007 | The application **shall** rate-limit password attempts to no more than 5 per IP address per 60 seconds. | Medium | TST-007 |
| REQ-008 | The application **shall** allow the user to sign out via long-press on the app title, clearing the WebAuthn credential ID and in-memory token. | Low | TST-008 |
| REQ-009 | The application **shall** fall back gracefully to password authentication if WebAuthn is unsupported or no platform authenticator is available. | High | TST-009 |

### 3.2 Data Retrieval

| ID | Requirement | Priority | Verification |
|---|---|---|---|
| REQ-010 | The application **shall** retrieve glucose, heart rate, HRV, skin temperature, and activity measurements for the logged-in patient from `/measurement/v2/measurements/raw` over the last 24 hours on each refresh cycle. | High | TST-010 |
| REQ-011 | The application **shall** issue measurement queries with `sort: [{ field: 'timestamp', order: 'DESC' }]` to avoid sequential pagination latency. | High | TST-011 |
| REQ-012 | The application **shall** issue measurement queries in 1-hour parallel chunks via `Promise.all` to flatten cumulative API latency. | High | TST-012 |
| REQ-013 | The application **shall** retrieve the active device usage session for the logged-in patient via `/device/v1/devices/usage-sessions` filtered by `_state = ACTIVE`. | Medium | TST-013 |
| REQ-014 | The application **shall** retrieve weekly per-day glucose averages via 7 parallel queries (one per calendar day) with results cached for 5 minutes. | Medium | TST-014 |
| REQ-015 | The application **shall** dedupe rows returned by BioT by `(timestamp, field-presence-bitmask)` before downstream consumption. | Medium | TST-015 |

### 3.3 Display and Computation

| ID | Requirement | Priority | Verification |
|---|---|---|---|
| REQ-020 | The application **shall** display the most recent glucose reading on the Home screen, converted to mmol/L using the divisor 18.0182. | High | TST-020 |
| REQ-021 | The application **shall** display a "time ago" string indicating the freshness of the latest reading (e.g., "5 min ago"). | High | TST-021 |
| REQ-022 | The application **shall** display a trend arrow and trend text derived from the rate of change of the latest two glucose readings. | Medium | TST-022 |
| REQ-023 | The application **shall** display latest heart rate, total daily activity (steps), and latest skin temperature on the Home screen. | Medium | TST-023 |
| REQ-024 | The application **shall** compute Time in Range percentages for five categories (very low <3.0, low <3.9, target 3.9–10.0, high <13.9, very high ≥13.9 mmol/L) from the displayed time window. | High | TST-024 |
| REQ-025 | The application **shall** display a smoothed glucose trend chart on the Health and Dashboard screens using bin-resampled, weighted-moving-average smoothed, Catmull-Rom-interpolated SVG paths. | Medium | TST-025 |
| REQ-026 | The application **shall** display the user-selectable time window (1h, 3h, 6h, 12h, 24h on Dashboard; 3h, 6h, 12h on Health) and update the chart and TIR computations within 200 ms of selection from the cached 24-hour dataset (no re-fetch). | Medium | TST-026 |
| REQ-027 | The application **shall** display the 7-day glucose average and per-day average bubbles (M–S) on the Average screen. | Medium | TST-027 |
| REQ-028 | The application **shall** compute and display Glucose Management Indicator (GMI) using the formula `3.31 + 0.02392 × mean_mg_dL`. | Medium | TST-028 |
| REQ-029 | The application **shall** compute and display Coefficient of Variation (CV) as `(σ / μ) × 100` over the displayed window. | Medium | TST-029 |
| REQ-030 | The application **shall** display a phone-background color cue corresponding to glucose state: cream (normal), peach (low/critical-low), orange (high/critical-high). | Low | TST-030 |

### 3.4 Refresh and Caching

| ID | Requirement | Priority | Verification |
|---|---|---|---|
| REQ-031 | The application **shall** refresh all displayed data every 60 seconds while the page is active. | High | TST-031 |
| REQ-032 | The application **shall** cache the 24-hour glucose dataset in memory between refresh cycles for instant time-pill-driven re-rendering. | Medium | TST-032 |
| REQ-033 | The application **shall** cache weekly average data for 5 minutes to minimize redundant API calls. | Medium | TST-033 |
| REQ-034 | The service worker **shall** apply network-first caching for HTML and cache-first for static assets (icons, manifest). | High | TST-034 |
| REQ-035 | The service worker **shall** never cache requests to `*.biot-med.com` or `/.netlify/functions/*`. | High | TST-035 |
| REQ-036 | The service worker **shall** delete stale caches on activation matching any name other than the current `CACHE_NAME`. | High | TST-036 |

## 4. Performance Requirements

| ID | Requirement | Priority | Verification |
|---|---|---|---|
| REQ-040 | Cold launch from clean storage to first glucose value displayed **shall** complete within 6 seconds on a 4G LTE connection. | Medium | TST-040 |
| REQ-041 | Time pill selection **shall** redraw the chart within 200 ms (warm cache). | Medium | TST-041 |
| REQ-042 | Foreground refresh cycle (60-second tick) **shall** complete within 4 seconds end-to-end on a 4G LTE connection. | Medium | TST-042 |
| REQ-043 | The PWA bundle (`index.html`, `sw.js`, `manifest.json`, three icons) **shall** total no more than 200 KB compressed. | Low | TST-043 |

## 5. Interface Requirements

### 5.1 BioT Backend

| ID | Requirement | Priority | Verification |
|---|---|---|---|
| REQ-050 | All BioT API requests **shall** include `Authorization: Bearer <token>`. | High | TST-050 |
| REQ-051 | The application **shall** parse the BioT login response shape `{ accessJwt: { token } }`. | High | TST-051 |
| REQ-052 | Search requests **shall** be encoded as `searchRequest=<URI-encoded JSON>`. | High | TST-052 |
| REQ-053 | The application **shall** consume the field names `glucose`, `hr`, `hrv`, `skinTemp`, `activity` (not `heartRate`) on measurement rows, per the Demo2 BioT template. | High | TST-053 |

### 5.2 WebAuthn Authenticator

| ID | Requirement | Priority | Verification |
|---|---|---|---|
| REQ-060 | The application **shall** request `authenticatorAttachment: 'platform'` to ensure registration uses a device-bound authenticator (no roaming keys). | High | TST-060 |
| REQ-061 | The application **shall** require `userVerification: 'required'` for both registration and assertion. | High | TST-061 |
| REQ-062 | The application **shall** perform server-side WebAuthn assertion verification using `@simplewebauthn/server`. | High | TST-062 |

### 5.3 Service Worker

| ID | Requirement | Priority | Verification |
|---|---|---|---|
| REQ-070 | The application **shall** register `sw.js` on the `load` event of the main page. | High | TST-070 |
| REQ-071 | The service worker `CACHE_NAME` **shall** be bumped on every release to invalidate stale clients. | High | TST-071 (manual) |

## 6. Safety Requirements

| ID | Requirement | Priority | Verification |
|---|---|---|---|
| REQ-080 | Glucose unit conversion (mg/dL → mmol/L) **shall** use the divisor 18.0182 with no rounding before division. | High | TST-080 |
| REQ-081 | The application **shall** display "--" rather than a numeric value when no glucose reading is available within the displayed window. | High | TST-081 |
| REQ-082 | The application **shall** display a `time ago` indicator that becomes increasingly visually salient (e.g., warning color) when the latest reading is older than 30 minutes. *[Future enhancement — not implemented in v0.1]* | Medium | Future |
| REQ-083 | The application **shall not** present projected or extrapolated glucose values; only measured values from BioT shall be displayed. | High | TST-083 |
| REQ-084 | The on-screen "Updated HH:MM:SS" stamp **shall** reflect the time the data was rendered, not the timestamp of the underlying reading. | High | TST-084 |

## 7. Security Requirements

| ID | Requirement | Priority | Verification |
|---|---|---|---|
| REQ-090 | All network communication **shall** use TLS 1.2 or higher. | High | TST-090 |
| REQ-091 | The Netlify Function `login` **shall** validate the app password using a constant-time string comparison. | High | TST-091 |
| REQ-092 | The Netlify Function `login` **shall** read BioT credentials only from environment variables, not from any code, configuration file, or request payload. | High | TST-092 |
| REQ-093 | The Netlify Function CORS policy **shall** restrict `Access-Control-Allow-Origin` to a single configured value (no wildcard, no list). | High | TST-093 |
| REQ-094 | The application **shall** emit no console output or log message containing the BioT access token. | Medium | TST-094 |
| REQ-095 | WebAuthn credentials registered for one origin **shall not** be usable from a different origin (enforced by browser; verified by test). | High | TST-095 |

## 8. Usability Requirements (IEC 62366-1)

| ID | Requirement | Priority | Verification |
|---|---|---|---|
| REQ-100 | The Home screen **shall** present the latest glucose value as the largest type element, occupying at least 30% of viewport height in portrait mode. | Medium | TST-100 |
| REQ-101 | Tap targets in the bottom navigation **shall** be no smaller than 44 × 44 px (WCAG 2.1 AA). | Medium | TST-101 |
| REQ-102 | The connection status banner **shall** auto-hide after 2 seconds on success and remain visible indefinitely on error. | Low | TST-102 |
| REQ-103 | Color combinations used to indicate glucose state **shall** maintain a contrast ratio of at least 4.5:1 against background per WCAG 2.1 AA for any text overlay. | Medium | TST-103 |

## 9. Constraints

| ID | Constraint | Rationale |
|---|---|---|
| CON-01 | Single HTML file. No build step, no framework. | Editor-friendly for one-person demo deploys. |
| CON-02 | Vanilla JavaScript only on the client. | Avoids React first-paint cost; not needed for demo polish level. |
| CON-03 | Server-side runtime: Netlify Functions (Node 20+). | Free tier sufficient for demo traffic. |
| CON-04 | All BioT credentials live exclusively in Netlify environment variables. | Required by security architecture (REQ-092). |

## 10. Verification Approach Summary

| Verification Type | Target Requirements | Mechanism |
|---|---|---|
| Static analysis | All security and parsing requirements | Parse check + ESLint (see TCG-REG-05) |
| Unit tests | Pure functions (computations, conversions) | Node.js test runner (see TCG-REG-05) |
| Integration tests | Netlify Functions login + register flows | Mocked BioT, real WebAuthn primitives |
| End-to-end tests | User-visible flows | Playwright against deployed Netlify preview |
| Manual smoke | First-launch UX, biometric prompt UX | Documented checklist (LOCAL_DEV.md, DEPLOY_NEW_SITE.md) |

## 11. Open Items for Human Reviewer

1. REQ-082 (stale-data warning) is marked Future. RA review should determine whether this should be a release-blocking requirement for any productized version.
2. The application performs no input validation on glucose values returned by BioT (e.g., does not reject physiologically impossible values). This is acceptable for the demo on the assumption BioT validates upstream, but a productized version should add a defensive bounds check.
3. The `computeTrend` function uses only the last two raw readings; this is noisy with high-frequency simulator data. A production requirement would specify a smoothed-window slope. See [TCG-REG-04 Risk Analysis](04-risk-analysis.md), RISK-09.
4. Localization: all units, labels, and date formats are en-US implicit. Internationalization requirements are deferred.

---

*Generated by AI in approximately 4 minutes from source code review. Equivalent manual effort: estimated 3–5 person-days.*
