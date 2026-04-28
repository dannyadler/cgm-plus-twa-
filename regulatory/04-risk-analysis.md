---
**AI-Generated Draft — Requires Human Review and QMS Integration**

This document was produced by an AI system from source code and architectural notes. It is illustrative material for a Trinity Biotech presentation on AI-assisted regulatory documentation. **It has not been reviewed by qualified Regulatory Affairs personnel, has not been integrated into any QMS, and must not be used as evidence of design controls under ISO 13485, IEC 62304, or 21 CFR 820. The hazard analysis below has not been validated by clinical or human-factors specialists.**
---

| Field | Value |
|---|---|
| Document Title | Risk Analysis |
| Document ID | TCG-REG-04 |
| Product | Trinity CGM Plus (presale demo) |
| Version | 0.1 (AI draft) |
| Generated | 2026-04-28 |
| Method | ISO 14971:2019 |
| Software Safety Class | B (per [TCG-REG-01](01-software-safety-classification.md)) |

## 1. Purpose and Scope

This document identifies hazards, estimates risks, and specifies risk-control measures for the Trinity CGM Plus presale demo software. It satisfies the software risk-management activity of IEC 62304 §7 by reference to the device-level risk-management framework of ISO 14971:2019.

The scope is the software system identified in [TCG-REG-03 SDD](03-software-design-description.md) §3 — the PWA, service worker, and Netlify Functions. Hardware risks (sensor accuracy, battery, etc.) are out of scope.

## 2. Method

The analysis follows ISO 14971:2019 §5 (risk analysis) and §6 (risk evaluation). For each identified hazard:

1. The hazardous situation is described.
2. The severity (S) and probability (P) of harm are estimated on a 1–5 scale.
3. An initial Risk Class is assigned per the matrix in §3.
4. Risk-control measures (RCMs) are specified.
5. Residual risk is re-estimated post-control.
6. Each RCM is traced to a requirement (REQ-*) or test (TST-*).

This AI-generated draft does **not** include:

- Independent clinical input on severity scaling.
- Human-factors analysis per IEC 62366.
- Use-error analysis from formative usability studies.
- Probability estimates grounded in field data.

## 3. Risk Acceptability Matrix

| Probability ↓ / Severity → | 1 — Negligible | 2 — Minor | 3 — Moderate | 4 — Serious | 5 — Catastrophic |
|---|---|---|---|---|---|
| 5 — Frequent (>1 in 100 uses) | LOW | MED | HIGH | UNACCEPTABLE | UNACCEPTABLE |
| 4 — Probable (1 in 1,000) | LOW | MED | HIGH | HIGH | UNACCEPTABLE |
| 3 — Occasional (1 in 10,000) | LOW | LOW | MED | HIGH | HIGH |
| 2 — Remote (1 in 100,000) | LOW | LOW | LOW | MED | HIGH |
| 1 — Improbable (<1 in 1M) | LOW | LOW | LOW | LOW | MED |

Acceptability:
- **LOW** — acceptable as-is, no action required beyond standard development controls.
- **MED** — accept only with documented risk-control measures.
- **HIGH** — must be reduced to MED or LOW before release.
- **UNACCEPTABLE** — must not ship in any form.

## 4. Intended Use, Reasonably Foreseeable Misuse, and Characteristics

### 4.1 Intended Use (per TCG-REG-01)

Demonstration of CGM-derived telemetry display for prospective Trinity Biotech customers during presale engagements. **Not a clinical decision tool.**

### 4.2 Reasonably Foreseeable Misuse

| Misuse | Likelihood | Hazard Reference |
|---|---|---|
| Customer screenshots a glucose value and shares it as if it were a real patient reading | Probable | HAZ-09 |
| Sales representative leaves the app open on an unlocked phone in a public place | Probable | HAZ-10 |
| Customer evaluator believes the demo represents a clinical-grade product | Probable | HAZ-11 |
| User attempts to use the demo for actual treatment decisions | Remote (controlled distribution) | HAZ-01 |

### 4.3 Software Characteristics (ISO 14971 Annex A.2.2 questions, software-relevant)

| Characteristic | Value |
|---|---|
| Energy delivered to patient? | None |
| Substances delivered to patient? | None |
| Biological materials? | None |
| Sterility required? | No |
| Measurement function? | Yes — displays glucose values from a measurement system |
| Interpretive / diagnostic function? | No (in current scope); display only |
| Therapeutic decision support? | No (in current scope) |
| Single-use vs. reusable? | Reusable |
| Patient-attached? | No (independent app) |
| Connected to network? | Yes (HTTPS, BioT API) |
| Software updates? | Yes — service-worker mediated |

## 5. Hazard Analysis

### 5.1 Software-originated hazards

| ID | Hazard | Hazardous Situation | Plausible Harm | S | P | Initial Risk |
|---|---|---|---|---|---|---|
| RISK-01 | Display of incorrect glucose value due to mg/dL→mmol/L unit error | App displays "5.5 mmol/L" when true value is 5.5 mg/dL (or vice versa) | User dismisses a critically low reading | 5 | 1 | MED |
| RISK-02 | Display of stale data presented as live | App displays a 4-hour-old reading without prominent staleness indicator | User assumes stable glucose when actual value has trended | 4 | 3 | HIGH |
| RISK-03 | Auth bypass / impersonation via WebAuthn flaw | Attacker views another user's PHI | Privacy harm, regulatory disclosure obligation | 3 | 2 | LOW |
| RISK-04 | BioT credentials leaked from client | Anyone with public URL access can authenticate as the demo accounts | Privacy harm; account abuse | 3 | 4 | HIGH (pre-mitigation) |
| RISK-05 | Trend arrow shows wrong direction | User sees "↑ Rising" when actual glucose is falling | Wrong response action | 4 | 2 | MED |
| RISK-06 | Service worker serves stale HTML masking a known-defective version | A safety-critical fix never reaches the user | Bug-mediated harm | 4 | 2 | MED |
| RISK-07 | Time in Range computation weights observations by row count, not time | TIR percentage misleadingly high or low when sampling is uneven | User overestimates / underestimates control | 3 | 4 | HIGH |
| RISK-08 | Activity sum double-counts cumulative steps | Activity reads ten million steps for one day | User loses confidence in app accuracy → secondary disengagement | 1 | 4 | LOW |
| RISK-09 | Trend rate computed from two adjacent readings — extreme noise on simulator data | Trend arrow flips wildly each refresh | User confusion; trust erosion | 2 | 4 | MED |
| RISK-10 | Network failure on a single chunk fetch silently drops data | Chart shows an unexplained gap | User believes there was a real glucose dropout | 2 | 3 | LOW |
| RISK-11 | Token logged to console / DevTools | Token captured by browser extension or screenshare during demo | Session hijack window | 3 | 3 | MED |
| RISK-12 | App fails to launch (e.g., parse error from duplicate `let`) | Page renders static HTML, no banner of failure | User cannot check glucose | 3 | 2 | LOW |
| RISK-13 | XSS via uncontrolled HTML injection from BioT response | Attacker controlling backend can run JS in user context | Full session compromise | 4 | 1 | LOW |
| RISK-14 | Backgrounded tab continues polling, draining battery | Phone battery dies | Loss of monitoring (no direct harm in demo) | 1 | 4 | LOW |
| RISK-15 | Polling continues after token expires; unhandled error cascade | App gets stuck on "Connection error" until reload | Loss of monitoring | 2 | 3 | LOW |

### 5.2 Hazards from intended use / reasonably foreseeable misuse

| ID | Hazard | S | P | Initial Risk |
|---|---|---|---|---|
| HAZ-09 | Demo data screenshot misrepresented as real | 2 | 4 | MED |
| HAZ-10 | Phone left unlocked exposes patient screen | 2 | 3 | LOW |
| HAZ-11 | Customer believes demo is clinical-grade | 3 | 3 | MED |

## 6. Risk Control Measures

| RCM-ID | For Risk(s) | Description | Realized in | Verification |
|---|---|---|---|---|
| RCM-01 | RISK-01 | Use literal divisor `18.0182` in `toMmol()`; never round before division | DES-CLI-04, REQ-080 | TST-080 (unit test on toMmol with reference vectors) |
| RCM-02 | RISK-01 | Display unit "mmol/L" in fixed UI text adjacent to value; no unit toggle | DES-CLI-05 | TST-020, visual inspection |
| RCM-03 | RISK-02 | Display "X min ago" indicator next to glucose value | DES-CLI-04 `timeAgoStr`, DES-CLI-05 `applyHome` | TST-021 |
| RCM-04 | RISK-02 | **PROPOSED** — Visually escalate freshness indicator (color + text emphasis) when reading older than 30 minutes | REQ-082 (currently Future) | TST pending |
| RCM-05 | RISK-03 | Server-side WebAuthn assertion verification using `@simplewebauthn/server`; never trust client-asserted credential | DES-SRV-01, REQ-062 | TST-062 |
| RCM-06 | RISK-04 | All BioT credentials live in env vars on Netlify Function tier; never sent to browser | DES-SRV-01, REQ-092 | TST-092 (static scan of client bundle for credential strings) |
| RCM-07 | RISK-04 | Constant-time comparison of `appPassword` to env value | DES-SRV-01, REQ-091 | TST-091 |
| RCM-08 | RISK-04 | CORS Allow-Origin restricted to one host, no wildcard | DES-SRV-01, REQ-093 | TST-093 |
| RCM-09 | RISK-04 | IP-based rate limit, 5 attempts / 60s | DES-SRV-01, REQ-007 | TST-007 |
| RCM-10 | RISK-05 | **PROPOSED** — Compute trend rate over a smoothed 15-minute slope, not adjacent raw points | Future requirement | TST pending |
| RCM-11 | RISK-06 | Service worker network-first for HTML; cache used only as offline fallback | DES-CLI-06, REQ-034 | TST-034 |
| RCM-12 | RISK-06 | `CACHE_NAME` bumped each release; activate handler purges old caches | DES-CLI-06, REQ-036, REQ-071 | TST-036, TST-071 (manual checklist) |
| RCM-13 | RISK-07 | **PROPOSED** — Re-implement TIR as time-weighted aggregation: total minutes in range / total minutes observed | Future requirement | TST pending |
| RCM-14 | RISK-08 | **PROPOSED** — Document activity field semantics in BioT contract; treat as cumulative if so, take max instead of sum | Future requirement | TST pending |
| RCM-15 | RISK-09 | **PROPOSED** — Trend computed over 15-minute smoothed window | Future requirement | TST pending |
| RCM-16 | RISK-10 | Chart shows visible gap rendering with explanatory tooltip on stale data — alternative: show banner "data incomplete for window" | Future requirement | TST pending |
| RCM-17 | RISK-11 | No `console.log(token)` anywhere in code; verified by static grep | DES-CLI-02, REQ-094 | TST-094 |
| RCM-18 | RISK-12 | Pre-deploy parse check on the `<script>` block via `node -e "new Function(scriptText)"` | CI workflow | TST-PARSE (CI gate) |
| RCM-19 | RISK-13 | All DOM mutations use `textContent` for BioT-derived strings; `innerHTML` only for hardcoded UI text | DES-CLI-05 | TST-095 |
| RCM-20 | RISK-14 | **PROPOSED** — Wrap `setInterval` in `document.visibilityState === 'visible'` check | Future requirement | TST pending |
| RCM-21 | RISK-15 | 401 retries are bounded (one retry, then surface error) | DES-CLI-03, REQ-006 | TST-006 |
| RCM-22 | HAZ-09, HAZ-11 | "Demo Data — Olivia (Demo2)" badge on every screen; on-screen disclaimer in an "About" affordance | Future requirement | TST pending |
| RCM-23 | HAZ-10 | App auto-locks after configurable inactivity, requiring fingerprint | Future requirement | TST pending |

## 7. Residual Risk

After application of the listed RCMs (those marked "Future requirement" assumed implemented), residual risk per hazard:

| Risk | Initial | Residual | Acceptable? |
|---|---|---|---|
| RISK-01 | MED | LOW | Yes |
| RISK-02 | HIGH | MED | With RCM-04 implemented |
| RISK-03 | LOW | LOW | Yes |
| RISK-04 | HIGH | LOW | With RCM-06–RCM-09 implemented |
| RISK-05 | MED | LOW | With RCM-10 implemented |
| RISK-06 | MED | LOW | Yes |
| RISK-07 | HIGH | MED | With RCM-13 implemented |
| RISK-08 | LOW | LOW | Yes |
| RISK-09 | MED | LOW | With RCM-15 implemented |
| RISK-10 | LOW | LOW | Yes |
| RISK-11 | MED | LOW | Yes (existing) |
| RISK-12 | LOW | LOW | Yes (existing CI) |
| RISK-13 | LOW | LOW | Yes (existing) |
| RISK-14 | LOW | LOW | Yes |
| RISK-15 | LOW | LOW | Yes |

The residual-risk profile for the **demo** is acceptable for the demo's intended use. **Productization for clinical use would require re-evaluation under Class C, additional RCMs (alarm logic, redundancy, validation suites), and clinical evaluation per ISO 14155 and FDA expectations.**

## 8. Risk-Benefit Analysis

For the presale demo: there is no clinical benefit to balance. The product is a sales tool; the primary "benefit" is commercial. The MED-rated residual risks (RISK-02 stale data, RISK-07 TIR weighting) are acceptable in a controlled demo context where the customer is informed up front that the data is illustrative.

For a productized version, this section would compare clinical benefit (early intervention, improved time in range, reduced HbA1c) against residual risk and would require post-market surveillance commitments per ISO 14971 §10.

## 9. Risk Management Summary Conclusions

1. **All HIGH initial risks have a path to LOW or MED residual.** RCM-04, RCM-13, RCM-15 are needed and tracked as future requirements.
2. **Two demo-specific hazards (HAZ-09, HAZ-11) are not adequately controlled** in the current build. RCM-22 (on-screen demo badge) should be a release blocker for any external demo.
3. **No HIGH or UNACCEPTABLE residual risks remain** assuming the proposed RCMs are implemented.
4. The risk file is alive: any change to the codebase that touches DES-CLI-04 (computation) or DES-SRV-01 (auth) requires re-review of related risks before merge.

## 10. Open Items for Human Reviewer

1. **Severity calibration is conservative.** A clinical reviewer should validate severity scores against published harm taxonomies (e.g., MAUDE, IMDRF terminology).
2. **Probability estimates are AI-supplied judgment, not data-driven.** Field data, simulator runs, or analogue device experience would replace these.
3. **No formal use-error analysis.** A IEC 62366 Use-Specification + formative evaluation is recommended before any external demo to a clinical audience.
4. **Several "PROPOSED" RCMs require requirement updates** before they can be verified — see SRS §11 open items.
5. **HAZ-04 (auth bypass via SOUP vulnerability)** assumes `@simplewebauthn/server` is itself secure. SOUP qualification per IEC 62304 §8.1.2 is required.

## 11. Approval

| Role | Name | Signature | Date |
|---|---|---|---|
| Author (AI-assisted) | Claude Opus 4.7 | [AI-DRAFT] | 2026-04-28 |
| Software Lead | TBD | _Pending human approval_ | — |
| Risk Manager | TBD | _Pending human approval_ | — |
| Clinical Reviewer | TBD | _Pending human approval_ | — |
| Quality Assurance | TBD | _Pending human approval_ | — |

---

*Generated by AI in approximately 5 minutes. Equivalent manual effort: estimated 5–10 person-days plus clinical review.*
