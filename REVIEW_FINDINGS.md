# Trinity CGM Plus PWA — Security, Bug & Regulatory Review

**Date:** 2026-04-29
**Reviewer:** Daniel Adler / Claude Opus 4.6
**Scope:** index.html, login.mjs, register-credential.mjs, sw.js, gen_icons.py, ARCHITECTURE.md, README.md
**Context:** Patient-facing CGM demo app on BioT platform, IEC 62304 / IEC 14971 compliance target

---

## Findings (sorted by severity)

> **2026-04-29 UPDATE:** Cross-referenced against the `regulatory/` directory added via VS Code.
> Findings #1, #2, #3, #8, #24 are now RESOLVED. #10, #17, #18 are PARTIALLY ADDRESSED.
> Remaining open items: 17 findings, ~35h estimated effort.

### CRITICAL

| # | Category | Finding | Status | Recommended Fix | Effort |
|---|----------|---------|--------|-----------------|--------|
| 1 | Regulatory | **No SRS document.** | **RESOLVED.** `regulatory/02-software-requirements-specification.md` exists with 67 REQ-IDs. | Verify coverage against current codebase. | 1h (review) |
| 2 | Regulatory | **No STD document.** | **RESOLVED.** `regulatory/05-software-test-description.md` exists with 35 test cases. CI runs them on every push. | Verify test coverage against current codebase. | 1h (review) |
| 3 | Regulatory | **No risk analysis (IEC 14971).** | **RESOLVED.** `regulatory/04-risk-analysis.md` exists with 18 identified risks, severity/probability scoring, and risk controls. | Review severity calibration with clinical input. | 2h (clinical review) |
| 4 | Regulatory | **No input validation on glucose values.** `toMmol(mgdl)` divides by 18.0182 with no guard against null, undefined, negative, NaN, or extremely large values. If BioT returns corrupt data, the app will display NaN or nonsensical numbers on a patient-facing screen. For a CGM app, this is a patient safety risk. | **OPEN.** | Add a `safeToMmol()` wrapper that returns null for non-finite or out-of-physiological-range values (e.g., < 0 or > 500 mg/dL). Filter nulls before display. | 2h |

### HIGH

| # | Category | Finding | Recommended Fix | Effort |
|---|----------|---------|-----------------|--------|
| 5 | Security | **BioT JWT returned directly to browser.** The login function returns the raw BioT access token. A compromised browser (XSS, extension, shared device) can make arbitrary BioT API calls until the token expires. The serverless function acts as a token vending machine, not a proxy. | For demo: acceptable. For production: proxy all BioT calls through Netlify Functions, never expose the token to the client. Document this as a known demo limitation. | 16h (proxy), 0.5h (document) |
| 6 | Security | **Interval stacking in secureInitApp.** `setInterval(() => loadAll(), 60000)` is called every time `secureInitApp()` runs. If auth refreshes and re-calls `secureInitApp`, a new interval stacks on top of the old one. After N refreshes, `loadAll()` fires N times per minute, hammering the BioT API. The same pattern exists in the legacy path (line 1773). | Store the interval ID in a module-level variable. Clear it before setting a new one: `if (_pollInterval) clearInterval(_pollInterval); _pollInterval = setInterval(...)`. | 0.5h |
| 7 | Security | **Error message leaks internal details.** Line 337 of login.mjs returns `err.message` directly in the 500 response: `json(500, { error: err.message || 'Internal error' })`. This can expose stack traces, env var names, or BioT error details to the client. Same pattern in register-credential.mjs line 126. | Return a generic \"Internal error\" message. Log the real error server-side only. | 0.5h |
| 8 | Regulatory | **No SOUP (Software of Unknown Provenance) list.** | **RESOLVED.** `regulatory/07-sbom.cyclonedx.json` (CycloneDX SBOM) + SOUP table in `regulatory/06-cybersecurity-assessment.md`. CI regenerates SBOM on every push. | Verify SBOM completeness. | 0.5h (review) |
| 9 | Regulatory | **No User Manual.** IEC 62366 and MDR require user-facing documentation for medical software. The app has no help screen, no onboarding, and logout is hidden behind a long-press gesture. | Run `biot-dhf-generator:generate-manual`. Should cover: login, fingerprint setup, reading glucose values, understanding urgency labels, data refresh behavior. | 4h |
| 10 | Regulatory | **TIR calculation has no documented accuracy validation.** `computeTIRFromReadings()` bins raw readings into glucose ranges and computes percentages. Row-weighted, not time-weighted. | **PARTIALLY ADDRESSED.** `lib/computation.mjs` documents the limitation (RISK-07). Unit tests verify logic. Risk analysis flags it as known gap with proposed RCM-13. Still needs time-weighted implementation. | 2h (implement time-weighted TIR) |

### MEDIUM

| # | Category | Finding | Recommended Fix | Effort |
|---|----------|---------|-----------------|--------|
| 11 | Security | **HMAC signing key reuses APP_PASSWORD.** `createRegistrationNonce()` uses `env('APP_PASSWORD')` as the HMAC key. If the app password is weak or leaked, the signing key is also compromised. These are two distinct security functions (user authentication vs. cryptographic signing). | Add a separate `HMAC_SECRET` env var. Generate with `openssl rand -hex 32`. | 1h |
| 12 | Security | **Rate limiting is best-effort.** Uses Netlify Blobs with a 5-attempt/60s window per IP. Bypassed by distributed IPs, blob store latency/errors (silently caught on line 79), or concurrent requests that read before the counter increments (TOCTOU race). | For demo: acceptable. For production: use Netlify's built-in rate limiting or a proper store with atomic increments. Document the limitation. | 0.5h (document), 4h (fix) |
| 13 | Security | **Challenge store has no TTL cleanup.** WebAuthn challenges in Netlify Blobs are created on every `challenge` and `password+needsRegistration` request. Only deleted on successful verification. Abandoned challenges accumulate forever. | Add a scheduled cleanup function (Netlify Scheduled Function) that purges challenges older than 5 minutes. Or set TTL metadata if Netlify Blobs supports it. | 2h |
| 14 | Security | **refreshToken() race condition.** The `_authInProgress` flag prevents re-entry, but the WebAuthn prompt is asynchronous. If two 401 responses trigger `refreshToken()` near-simultaneously, the second call returns `false` immediately, causing that request to fail silently instead of retrying after auth completes. | Use a promise-based lock: the first caller creates a pending promise, subsequent callers await it. When auth completes, resolve the shared promise. | 1.5h |
| 15 | Bug | **ARCHITECTURE.md is stale.** References old credential constants (`PATIENT_CRED`, `CLINICIAN_CRED`), old login flow (`login()` instead of secure auth gate), old CACHE_NAME (`v8` vs actual `v17`), and does not mention the Netlify Functions auth subsystem, WebAuthn, or the password gate. | Rewrite sections 1 (Authentication) and the service worker section. Add a new section covering the serverless auth architecture. | 2h |
| 16 | Bug | **README.md references old Netlify site.** Points to `inquisitive-panda-a41165.netlify.app` and old deploy flow (zip drag). Does not mention the new secure auth pattern, env vars, or `npm install` requirement. | Update Live Demo URL, deploy instructions, and add auth/env var documentation. | 1h |
| 17 | Regulatory | **No software architecture document for auth subsystem.** ARCHITECTURE.md covers the data pipeline but not the serverless auth flow (login.mjs, register-credential.mjs, Netlify Blobs stores, WebAuthn ceremony). IEC 62304 requires software architecture documentation proportional to the safety class. | Add auth architecture section to ARCHITECTURE.md covering: auth modes, credential storage, challenge flow, token lifecycle, rate limiting. | 2h |
| 18 | Regulatory | **Glucose thresholds hardcoded without clinical justification.** `glucoseState()` uses 3.0/3.9/10.0/13.9 mmol/L. These align with international consensus (ADA/ATTD), but there is no documented reference. The \"Act now\" messages at critical thresholds could be interpreted as clinical advice. | Add a comment block citing the source (e.g., Battelino et al. 2019, Diabetes Care). Document in the risk analysis that these are informational, not prescriptive. Add a disclaimer in the app. | 1h |

### LOW

| # | Category | Finding | Recommended Fix | Effort |
|---|----------|---------|-----------------|--------|
| 19 | Security | **DEV_DEFAULTS contain hardcoded credentials.** Gated by `NETLIFY_DEV === 'true'` so production is safe. Risk: someone forks the repo and deploys without understanding the gate, or `NETLIFY_DEV` is set unexpectedly. The credentials (`Trinity2026`, `Aa123456`) are visible in source. | Move dev defaults to a `.env.local` file excluded from git. Or add a startup log warning when DEV_DEFAULTS are active. | 1h |
| 20 | Security | **No CSRF protection on login endpoint.** Mitigated by CORS (`Access-Control-Allow-Origin` set to a specific origin) and POST-only. No cookies are used, so standard CSRF vectors don't apply. Acceptable for current architecture. | No action needed for demo. Document the mitigation in the architecture doc. | 0.5h |
| 21 | Bug | **CACHE_NAME bump has no automated check.** `sw.js` uses `trinity-cgm-plus-v17`. Forgetting to bump causes users to stay on stale JS. No CI check or build-time version injection exists. | Add a deploy checklist item, or inject the version from `package.json` version field at build time. Even a pre-deploy grep script would help. | 1h |
| 22 | Bug | **gen_icons.py has hardcoded sandbox path.** Line 10: `OUT = \"/sessions/stoic-wonderful-einstein/mnt/Trinity Demo/trinity-cgm-plus-pwa\"`. Will fail on any other machine. | Use `os.path.dirname(os.path.abspath(__file__))` to derive the output path relative to the script location. | 0.5h |
| 23 | UX | **Logout requires long-press on title.** Not discoverable. No visual hint. Users who need to switch accounts or clear credentials have no obvious path. On a patient-facing app, inability to log out is also a privacy concern (shared devices). | Add a visible logout option in a settings/profile screen or as an icon in the top nav. Keep long-press as a shortcut. | 2h |
| 24 | Regulatory | **No traceability matrix.** | **RESOLVED.** `regulatory/08-traceability-matrix.md` exists with bidirectional REQ/DES/RISK/TST coverage. 56/67 requirements have automated test coverage. 11 gaps listed. | Review and close gaps. | 1h (review) |

---

## Summary

| Severity | Total | Resolved | Open | Remaining Effort |
|----------|-------|----------|------|------------------|
| Critical | 4 | 3 | 1 | 2h |
| High | 6 | 1 | 5 | 21h |
| Medium | 8 | 0 | 8 | 11.5h |
| Low | 6 | 1 | 5 | 4h |
| **Total** | **24** | **5** | **19** | **~38.5h** |

## Recommended Priority Order (updated)

1. **Input validation on glucose values (#4)** — 2h, prevents patient-facing NaN/garbage. Only remaining critical.
2. **Interval stacking fix (#6)** — 0.5h, prevents API hammering. Trivial code change.
3. **Error message sanitization (#7)** — 0.5h, prevents info leak. Trivial code change.
4. **Stale docs (#15, #16, #17)** — 5h combined. Update ARCHITECTURE.md and README.md with auth subsystem.
5. **User Manual (#9)** — 4h. Only missing DHF document.
6. **Time-weighted TIR (#10)** — 2h. Documented as known gap, implement the fix.
7. **Everything else** — schedule based on when the app moves from demo to regulated product.

## Key Judgment Calls

- **JWT exposure (#5):** Acceptable for demo. Flag it prominently if this moves toward production.
- **Rate limiting (#12):** Good enough for a demo with a small user base. Not production-grade.
- **CSRF (#20):** Non-issue given the architecture (no cookies, explicit CORS origin).
- **DEV_DEFAULTS (#19):** Safe in production. Risk is only if someone forks without reading the code.
