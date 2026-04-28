---
**AI-Generated Draft — Requires Human Review and QMS Integration**

This document was produced by an AI system from source code and architectural notes. It is illustrative material for a Trinity Biotech presentation on AI-assisted regulatory documentation. **It has not been reviewed by qualified Regulatory Affairs personnel, has not been integrated into any QMS, and must not be used as evidence of design controls under ISO 13485, IEC 62304, or 21 CFR 820. Test execution evidence (results, logs, screenshots) referenced in this document is generated automatically by the CI pipeline at the time of each release candidate; this document defines what tests exist and how they pass — it does not certify that they have passed any particular release.**
---

| Field | Value |
|---|---|
| Document Title | Software Test Description (Verification Plan + Procedures) |
| Document ID | TCG-REG-05 |
| Product | Trinity CGM Plus (presale demo) |
| Version | 0.1 (AI draft) |
| Generated | 2026-04-28 |
| Software Safety Class | B |

## 1. Purpose

This document defines the verification activities that satisfy IEC 62304 §5.5 (unit), §5.6 (integration), and §5.7 (system) for the Trinity CGM Plus PWA. It links each test to one or more REQ-IDs from [TCG-REG-02 SRS](02-software-requirements-specification.md) and to risk-control measures from [TCG-REG-04 Risk Analysis](04-risk-analysis.md).

## 2. Scope

In scope:
- All requirements REQ-001 through REQ-103 in TCG-REG-02.
- All RCMs in TCG-REG-04 marked with a TST-* identifier.

Out of scope:
- Clinical validation. Not applicable to demo software.
- Hardware-in-the-loop testing. Not applicable; no hardware.
- Performance benchmarking under load. Not in scope for demo (single-user usage profile).

## 3. Test Strategy

### 3.1 Test levels (IEC 62304 alignment)

| Level | IEC 62304 § | Targets | Mechanism |
|---|---|---|---|
| Static analysis | §5.5 | Parse correctness, lint compliance | `node` parse check + ESLint |
| Unit | §5.5 | Pure functions in DES-CLI-04, isolated branches in DES-SRV-01/02 | Node test runner, in-process |
| Integration | §5.6 | Login function ↔ BioT (mocked), WebAuthn server-side verify | Node test runner with mocked HTTP |
| System | §5.7 | Full UX flows, deployed app | Playwright against Netlify preview |
| Manual | §5.7 (auxiliary) | Biometric prompts, deploy verification | Documented checklist |

### 3.2 Pass criteria

A release candidate passes verification when:

1. All static-analysis checks return zero errors.
2. All unit tests pass.
3. All integration tests pass.
4. All system (Playwright) tests pass on the preview deploy.
5. Manual checklist items are signed off.
6. Any test marked "expected fail" or "skip" has a documented rationale and corresponding open issue.

A release candidate **fails** verification on the first non-passing test of any of the above.

### 3.3 Test environment

| Environment | Purpose | Mechanism |
|---|---|---|
| Developer local | Iterative dev, unit tests | `npm test` |
| GitHub Actions CI | Automated gate on every push | `.github/workflows/regulatory-ci.yml` |
| Netlify deploy preview | System tests on real-deployed code | Auto-created per branch |
| Production-like Netlify site | Manual smoke before release | `stellar-sprite-b171ee.netlify.app` |

## 4. Static Analysis Tests

### TST-PARSE — Script-block parse check

| Field | Value |
|---|---|
| Realizes | Implicit prerequisite for all REQ-* (RISK-12 mitigation) |
| Mechanism | `tests/parse-check.mjs` |
| Procedure | Read `index.html`, extract content between first `<script>` and matching `</script>`, attempt `new Function(content)`. Fail on any thrown SyntaxError. |
| Expected | Exit code 0, no error output. |
| Frequency | Every push, every PR. |

### TST-LINT — ESLint policy compliance

| Field | Value |
|---|---|
| Realizes | REQ-094 (no token logging), defensive coding hygiene |
| Mechanism | ESLint with custom config in `tests/lint.config.mjs` |
| Procedure | Run `npx eslint index.html sw.js netlify/functions/**/*.mjs scripts/*.mjs`. |
| Pass criteria | Zero errors, warnings reviewed but non-blocking. |
| Custom rules | `no-console` exception only for `console.warn` and `console.error`; explicit ban on `console.log(token)` patterns. |

### TST-SECRETS — Static secret scan

| Field | Value |
|---|---|
| Realizes | REQ-092 (no creds in client) |
| Mechanism | `grep -E "(daniel\\+olivia\\|daniel\\+nurse\\|Aa123456\\|Trinity2026)" index.html sw.js manifest.json` |
| Pass criteria | No matches in any client-shipped file. |
| Note | The legacy code path under `SECURE_AUTH_ENABLED=false` retains hardcoded creds and is **excluded from this scan rule** when explicitly toggled off; toggling it on is itself a release blocker. |

## 5. Unit Tests (Computation Module)

The Computation Module (DES-CLI-04) is the highest-leverage verification surface: it owns all glucose-value-affecting math. The following unit tests run on every push.

### TST-UNIT-001 — `toMmol` correctness

| Realizes | REQ-080, RCM-01 |
| --- | --- |
| Inputs | `{0, 18.0182, 36.0364, 100, 200, 252.2548, -1, NaN}` |
| Expected | `{0, 1.0, 2.0, 5.5494…, 11.0988…, 14.0, -0.0554…, NaN}` |
| Boundary cases | mg/dL = 18.0182 must yield exactly 1.0 to within IEEE 754 precision. |
| Pass | All vectors match within `1e-9`. |

### TST-UNIT-002 — `glucoseState` thresholds

| Realizes | REQ-024 (state classification), RCM-01 |
| --- | --- |
| Vectors | `{2.5: critical-low, 3.0: low, 3.5: low, 3.9: normal, 5.5: normal, 10.0: normal, 10.1: high, 13.9: high, 14.0: critical-high}` |
| Pass | All boundary values map to expected class. |

### TST-UNIT-003 — `computeTrend` direction and magnitude

| Realizes | REQ-022, RISK-09 (residual: see RCM-15 future) |
| --- | --- |
| Vectors | Synthetic sequences: monotone rising 0.2 mmol/L/min, monotone falling, flat, mixed |
| Pass | Arrow direction matches synthetic ground truth; rate within ±10% of expected. |
| Known limitation | Test uses last two readings of input array, mirroring current code. **This test will fail when RCM-15 (smoothed-window slope) is implemented; the test must be updated alongside.** |

### TST-UNIT-004 — `computeTIRFromReadings` percentages

| Realizes | REQ-024, RISK-07 |
| --- | --- |
| Vectors | Reading arrays with known counts in each band |
| Pass | All five percentage outputs match counts/total within 0.01% |
| Known limitation | TIR is row-weighted, not time-weighted (RISK-07). Test verifies current behavior; will be revised when RCM-13 lands. |

### TST-UNIT-005 — `resampleToBins` correctness

| Realizes | REQ-025 |
| --- | --- |
| Vectors | Synthetic readings spaced 1s, 5s, 30s, 10min; bin width 5min |
| Pass | Output bins are evenly spaced, average glucose matches arithmetic mean of contained inputs |

### TST-UNIT-006 — `smoothBins` triangular kernel symmetry

| Realizes | REQ-025 |
| --- | --- |
| Vectors | Step function; impulse |
| Pass | Output preserves DC level on flat input; impulse response is symmetric |

### TST-UNIT-007 — `smoothPath` Catmull-Rom continuity

| Realizes | REQ-025 |
| --- | --- |
| Vectors | Two points, three points, ten points |
| Pass | Generated SVG path string starts with `M`, contains correct number of `C` segments, no `NaN` substrings |

### TST-UNIT-008 — `bubbleClass` mapping

| Realizes | REQ-027 |
| --- | --- |
| Vectors | Boundary mmol values |
| Pass | Class string matches expected |

### TST-UNIT-009 — `latestNonNull` traversal direction

| Realizes | REQ-023 |
| --- | --- |
| Vectors | Array with last element null, second-to-last non-null |
| Pass | Returns second-to-last value, not first match from start |

### TST-UNIT-010 — `timeAgoStr` boundaries

| Realizes | REQ-021, RCM-03 |
| --- | --- |
| Vectors | `Date.now() - {0, 30s, 60s, 30min, 60min, 90min, 24h}` |
| Pass | Returns "just now", "X min ago", "Xh ago" per spec |

## 6. Integration Tests (Netlify Functions)

### TST-INT-001 — Login function password-mode happy path

| Realizes | REQ-002, REQ-091, REQ-092, RCM-06, RCM-07 |
| --- | --- |
| Setup | Mock BioT login endpoint to return `{ accessJwt: { token: 'mock-token' } }`. Set env vars in test fixture. |
| Procedure | POST `{ mode: 'password', appPassword: <env-value> }` |
| Pass | Response 200, body contains `token`, `role`, `patientId`, `apiBase`, `expiresAt`. Response **does not** contain raw BioT credentials, app password, or env-var values. |

### TST-INT-002 — Login function password-mode rejection

| Realizes | REQ-091 |
| --- | --- |
| Procedure | POST `{ mode: 'password', appPassword: 'wrong' }` |
| Pass | Response 401, body does not disclose whether the password was a known weak guess vs. invalid format. |

### TST-INT-003 — Rate limiting

| Realizes | REQ-007, RCM-09 |
| --- | --- |
| Procedure | POST 5 wrong-password attempts from same source IP, then a 6th |
| Pass | First 5 return 401; 6th returns 429. |

### TST-INT-004 — CORS allowlist enforcement

| Realizes | REQ-093, RCM-08 |
| --- | --- |
| Procedure | POST with `Origin: https://evil.example.com` header |
| Pass | Response lacks `Access-Control-Allow-Origin: *`; if origin is not in allowlist, no `Access-Control-Allow-Origin` header is returned. |

### TST-INT-005 — Login function challenge-mode

| Realizes | REQ-003 |
| --- | --- |
| Setup | Pre-seed Netlify Blobs with a known credentialId + public key. |
| Procedure | POST `{ mode: 'challenge', credentialId: <known> }` |
| Pass | Response includes `options.challenge` (base64url, 32 bytes), `options.allowCredentials[0].id` matches input, `options.userVerification === 'required'`. |

### TST-INT-006 — Login function webauthn-mode happy path

| Realizes | REQ-003, REQ-062, RCM-05 |
| --- | --- |
| Setup | Pre-seed Blobs. Generate a known assertion using a software authenticator stub. |
| Procedure | POST `{ mode: 'webauthn', credentialId, assertion }` |
| Pass | Response 200, BioT login proceeds, returns full token shape. |

### TST-INT-007 — Login function webauthn-mode invalid signature

| Realizes | REQ-062, RCM-05 |
| --- | --- |
| Procedure | POST a tampered assertion |
| Pass | Response 401. No BioT login attempted (verified by assertion that mocked BioT endpoint not called). |

### TST-INT-008 — Register-credential function happy path

| Realizes | REQ-003 |
| --- | --- |
| Procedure | After a TST-INT-001 success, take the returned `nonce`/`nonceSig`, generate a synthetic attestation, POST to `/register-credential` |
| Pass | Response 200; Blob now contains the new credentialId. |

### TST-INT-009 — Register-credential without nonce

| Realizes | REQ-003 |
| --- | --- |
| Procedure | POST without nonce or with stale nonce |
| Pass | Response 401; Blob unchanged. |

## 7. System Tests (Playwright, deployed)

### TST-SYS-001 — Cold launch shows password gate

| Realizes | REQ-001 |
| --- | --- |
| Procedure | Open the deployed URL in a fresh browser context. |
| Pass | The password input is visible; the home/glucose value DOM is hidden or not yet populated. |

### TST-SYS-002 — Wrong password rejected

| Realizes | REQ-002, REQ-091 |
| --- | --- |
| Procedure | Enter "wrong-password", submit. |
| Pass | Inline error visible. Glucose value remains "--". |

### TST-SYS-003 — Correct password loads glucose

| Realizes | REQ-002, REQ-010, REQ-020 |
| --- | --- |
| Procedure | Enter the test-environment APP_PASSWORD. Wait up to 10 seconds. |
| Pass | Glucose value element matches `/^\d+\.\d$/` (numeric, one decimal). |

### TST-SYS-004 — Tab navigation walks all five screens

| Realizes | REQ-026 |
| --- | --- |
| Procedure | Click each of Home, Health, Range, Average, Dashboard tabs. |
| Pass | Each screen renders without console errors; numeric values appear in expected slots within 200 ms of click. |

### TST-SYS-005 — Time pill switches chart range

| Realizes | REQ-026, REQ-041 |
| --- | --- |
| Procedure | On Dashboard tab, click 6h pill. Wait 200 ms. |
| Pass | `chartRange` text shows "6h"; chart SVG has been re-rendered (path `d` attribute changed). |

### TST-SYS-006 — Service worker registered

| Realizes | REQ-070 |
| --- | --- |
| Procedure | Use `navigator.serviceWorker.getRegistrations()` via Playwright `evaluate`. |
| Pass | At least one registration with scope matching the deploy origin. |

### TST-SYS-007 — Network panel shows no plaintext credentials

| Realizes | REQ-004, REQ-092, RCM-06 |
| --- | --- |
| Procedure | Capture all requests during a full cold-launch + load. Search request bodies and URL query strings for `Aa123456`, `daniel+olivia`, `daniel+nurse`. |
| Pass | Zero matches. |

### TST-SYS-008 — localStorage contains no token, only credential ID

| Realizes | REQ-004, REQ-005 |
| --- | --- |
| Procedure | Inspect `localStorage` after successful login. |
| Pass | Keys present: `cgm_webauthn_cred_id` (and optionally `cgm_webauthn_skipped`). No keys whose value contains `eyJ` (JWT prefix). |

### TST-SYS-009 — Console contains no token

| Realizes | REQ-094, RCM-17 |
| --- | --- |
| Procedure | Capture all console events during full session. Search messages for `eyJ`. |
| Pass | Zero matches. |

### TST-SYS-010 — 60-second auto-refresh cycle

| Realizes | REQ-031 |
| --- | --- |
| Procedure | Note the "Updated HH:MM:SS" stamp. Wait 70 seconds. |
| Pass | Stamp has advanced. New refresh cycle was triggered (verified by network log showing additional measurement queries). |

### TST-SYS-011 — Sign-out clears credential

| Realizes | REQ-008 |
| --- | --- |
| Procedure | Long-press the title element for ≥1.5 seconds; confirm dialog. |
| Pass | `localStorage.cgm_webauthn_cred_id` is removed; password gate visible. |

### TST-SYS-012 — Stale tab handling (token expiry simulation)

| Realizes | REQ-006 |
| --- | --- |
| Procedure | Inject a stale token via Playwright `evaluate`, trigger a refresh cycle. |
| Pass | Banner shows "Connection error" or fingerprint prompt re-appears; no infinite cascade of 401s. |

## 8. Manual Verification (cannot be automated)

### TST-MAN-001 — Biometric prompt UX

| Realizes | REQ-003, REQ-061 |
| --- | --- |
| Procedure | On a Mac with Touch ID enrolled, complete first-launch fingerprint registration. Reload. |
| Pass | Touch ID prompt appears within 1 second of reload; on success, app loads without password screen. |

### TST-MAN-002 — Cache-name bump enforcement

| Realizes | REQ-071, RCM-12 |
| --- | --- |
| Procedure | Pre-deploy, verify `CACHE_NAME` differs from the previous deployment. |
| Pass | New CACHE_NAME found via `git diff HEAD~1 sw.js`. |

### TST-MAN-003 — Assetlinks delivered correctly

| Realizes | RCM (TWA URL bar removal) |
| --- | --- |
| Procedure | `curl -sIL https://stellar-sprite-b171ee.netlify.app/.well-known/assetlinks.json` |
| Pass | HTTP 200 with `Content-Type: application/json` (no intermediate redirect-then-HTML). |

### TST-MAN-004 — Deployed env vars match expected schema

| Realizes | REQ-092, REQ-093 |
| --- | --- |
| Procedure | In Netlify dashboard, confirm presence of all 10 env vars listed in DEPLOY_NEW_SITE.md. Confirm `ALLOWED_ORIGIN` matches deployed site. |
| Pass | All vars present, values look syntactically correct. |

## 9. Test Execution Plan and Reporting

### 9.1 Cadence

| Trigger | Tests Executed |
|---|---|
| Every push to any branch | TST-PARSE, TST-LINT, TST-SECRETS, all TST-UNIT-* |
| PR open / update | Above + all TST-INT-* |
| Push to `main` | Above + all TST-SYS-* against the resulting Netlify preview |
| Pre-release manual gate | All TST-MAN-* |

### 9.2 Report format

The CI workflow emits a JUnit-XML report and a human-readable summary as a workflow artifact. The summary is structured per the schema in `regulatory/templates/test-report.template.md` (placeholder; not generated in this draft) and is suitable for inclusion in a release dossier as Verification Evidence.

### 9.3 Failure response

A failed test of any kind blocks merge or release. The failure is investigated, the root cause identified, and either:
- A code change brings the test back to passing.
- The test is determined to be incorrect and is updated, with a documented rationale committed alongside.

## 10. Coverage Summary

| Area | Tests | Coverage Notes |
|---|---|---|
| Computation (DES-CLI-04) | TST-UNIT-001 through TST-UNIT-010 | Full function coverage; some property-based edge cases would strengthen |
| Auth (DES-SRV-01, DES-SRV-02) | TST-INT-001 through TST-INT-009 | Happy + sad paths covered |
| UI flows (DES-CLI-01, 05, 07) | TST-SYS-001 through TST-SYS-012 | Visual regression not included; out of scope for demo |
| Service worker (DES-CLI-06) | TST-SYS-006 | Cache-policy unit tests not implemented; gap |
| Data fetching (DES-CLI-03) | TST-SYS-003, 010 | No unit-level test of the chunk-merge-dedupe logic; gap (recommend addition) |

**Identified verification gaps:**

1. No unit test for the `fetchMeasurements` dedupe / merge logic. Recommended to add TST-UNIT-011.
2. No integration test for service-worker behavior across cache-name bumps. Recommended manual procedure or Playwright + mock SW.
3. No "fuzz" / property-based test on glucose conversions (random mg/dL → mmol/L → mg/dL round-trip). Recommended addition.
4. The legacy hardcoded-creds path (when `SECURE_AUTH_ENABLED=false`) is not covered by any test. Decision needed: remove the legacy path entirely, or add explicit test coverage to keep it functional.

## 11. Open Items for Human Reviewer

1. ESLint configuration is included in this draft as a starter. A formal coding standard document (e.g., MISRA-style or company-specific) should be referenced once Trinity Biotech's QMS lists one.
2. Test environment: the Netlify preview URL changes per branch. The system-test config must be parameterized accordingly.
3. The "expected fail" mechanism for tests pending RCM implementation is not formally defined. Recommend using `test.fixme()` (Playwright) and `test.skip()` (Node test runner) with a structured comment containing the corresponding RISK-ID.

---

*Generated by AI in approximately 6 minutes. Equivalent manual effort: 5–10 person-days.*
