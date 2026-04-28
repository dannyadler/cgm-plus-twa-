> **AI-Generated Draft — Requires Human Review and QMS Integration**
>
> This document was produced by an AI system from source code and architectural notes. It is illustrative material for a Trinity Biotech presentation on AI-assisted regulatory documentation. **It has not been reviewed by qualified Regulatory Affairs personnel, has not been integrated into any QMS, and must not be used as evidence of design controls under ISO 13485, IEC 62304, or 21 CFR 820.**


| Field | Value |
|---|---|
| Document Title | Traceability Matrix |
| Document ID | TCG-REG-08 |
| Product | Trinity CGM Plus (presale demo) |
| Version | 0.1 (AI draft) |
| Generated | 2026-04-28 |

## 1. Purpose

This document provides bidirectional traceability between user-facing requirements, design items, verification activities, and identified risks. It satisfies the implicit IEC 62304 traceability expectation that every requirement is realized in design, every requirement is verified by at least one test, and every identified risk has a corresponding control measure that is itself verified.

Cross-referenced documents:

- [TCG-REG-02 SRS](02-software-requirements-specification.md) — REQ-NNN identifiers
- [TCG-REG-03 SDD](03-software-design-description.md) — DES-CLI-NN, DES-SRV-NN identifiers
- [TCG-REG-04 Risk Analysis](04-risk-analysis.md) — RISK-NN, RCM-NN, HAZ-NN identifiers
- [TCG-REG-05 STD](05-software-test-description.md) — TST-NNN identifiers
- [TCG-REG-06 Cybersecurity](06-cybersecurity-assessment.md)

## 2. Forward Trace: Requirement → Design → Test → Risk

| REQ-ID | Requirement Summary | Realized in (Design) | Verified by (Test) | Mitigates Risk |
|---|---|---|---|---|
| REQ-001 | No data fetch before auth | DES-CLI-01 | TST-SYS-001 | RISK-04 |
| REQ-002 | Server-side password auth | DES-SRV-01 | TST-INT-001, TST-SYS-002, TST-SYS-003 | RISK-04 |
| REQ-003 | WebAuthn unlock | DES-CLI-02, DES-SRV-01, DES-SRV-02 | TST-INT-005, TST-INT-006, TST-INT-007, TST-INT-008, TST-INT-009, TST-MAN-001 | RISK-03 |
| REQ-004 | No client-side cred storage | DES-CLI-02 | TST-SYS-007, TST-SYS-008 | RISK-04 |
| REQ-005 | Token in-memory only | DES-CLI-02 | TST-SYS-008 | RISK-11 |
| REQ-006 | Re-auth on 401, retry once | DES-CLI-03 | TST-SYS-012 | RISK-15 |
| REQ-007 | Rate limit 5/60s | DES-SRV-01 | TST-INT-003 | RISK-04 |
| REQ-008 | Sign-out clears credential | DES-CLI-01 | TST-SYS-011 | — |
| REQ-009 | Graceful WebAuthn fallback | DES-CLI-02 | TST-MAN-001 | — |
| REQ-010 | 24h measurement fetch | DES-CLI-03 | TST-SYS-003 | — |
| REQ-011 | DESC sort | DES-CLI-03 | (visible via TST-SYS-003 latency) | RISK-15 (perf-related) |
| REQ-012 | Parallel chunks | DES-CLI-03 | (visible via TST-SYS-003 latency) | — |
| REQ-013 | Active session fetch | DES-CLI-03 | TST-SYS-003 | — |
| REQ-014 | Week parallel + 5min cache | DES-CLI-03 | TST-SYS-003 | — |
| REQ-015 | Dedupe by timestamp+fields | DES-CLI-03 | TST-UNIT-011 (gap, recommended) | RISK-10 |
| REQ-020 | Glucose mmol/L on Home | DES-CLI-04, DES-CLI-05 | TST-UNIT-001, TST-SYS-003, TST-SYS-004 | RISK-01 |
| REQ-021 | Time ago string | DES-CLI-04, DES-CLI-05 | TST-UNIT-010 | RISK-02 |
| REQ-022 | Trend arrow + text | DES-CLI-04, DES-CLI-05 | TST-UNIT-003 | RISK-05, RISK-09 |
| REQ-023 | HR / activity / temp | DES-CLI-04, DES-CLI-05 | TST-UNIT-009, TST-SYS-004 | RISK-08 |
| REQ-024 | TIR percentages | DES-CLI-04 | TST-UNIT-002, TST-UNIT-004 | RISK-07 |
| REQ-025 | Smoothed chart | DES-CLI-04, DES-CLI-05 | TST-UNIT-005, TST-UNIT-006, TST-UNIT-007 | — |
| REQ-026 | Time pill < 200 ms | DES-CLI-07 | TST-SYS-005 | — |
| REQ-027 | Week bubbles | DES-CLI-04, DES-CLI-05 | TST-UNIT-008 | — |
| REQ-028 | GMI display | DES-CLI-04, DES-CLI-05 | (visible via TST-SYS-004) | — |
| REQ-029 | CV display | DES-CLI-04, DES-CLI-05 | (visible via TST-SYS-004) | — |
| REQ-030 | Background color cue | DES-CLI-05 | (visible via TST-SYS-003) | — |
| REQ-031 | 60s refresh | DES-CLI-03 | TST-SYS-010 | — |
| REQ-032 | In-memory 24h cache | DES-CLI-03 | TST-SYS-005 | — |
| REQ-033 | 5min week cache | DES-CLI-03 | (no direct test; recommend addition) | — |
| REQ-034 | SW network-first HTML | DES-CLI-06 | TST-SYS-006 | RISK-06 |
| REQ-035 | SW never-cache API | DES-CLI-06 | (no direct test; recommend addition) | — |
| REQ-036 | SW purges old caches | DES-CLI-06 | (no direct test; recommend addition) | RISK-06 |
| REQ-040 | Cold load < 6s | All | (covered manually; recommend Lighthouse CI) | — |
| REQ-041 | Pill switch < 200ms | DES-CLI-07 | TST-SYS-005 | — |
| REQ-042 | Refresh cycle < 4s | DES-CLI-03 | (covered manually) | — |
| REQ-043 | Bundle < 200 KB | All | (covered by build size check; recommend automation) | — |
| REQ-050 | Bearer header | DES-CLI-03, DES-SRV-01 | TST-INT-001 | — |
| REQ-051 | accessJwt parse | DES-CLI-02, DES-SRV-01 | TST-INT-001 | — |
| REQ-052 | searchRequest encoding | DES-CLI-03 | (covered via integration mocks) | — |
| REQ-053 | Field name `hr` | DES-CLI-03, DES-CLI-04 | TST-UNIT-009 | — |
| REQ-060 | Platform authenticator | DES-CLI-02 | TST-MAN-001 | RISK-03 |
| REQ-061 | userVerification required | DES-CLI-02 | TST-INT-005 | RISK-03 |
| REQ-062 | Server-side WebAuthn verify | DES-SRV-01, DES-SRV-02 | TST-INT-006, TST-INT-007 | RISK-03 |
| REQ-070 | SW register on load | DES-CLI-06 | TST-SYS-006 | — |
| REQ-071 | CACHE_NAME bumped | DES-CLI-06 | TST-MAN-002 | RISK-06 |
| REQ-080 | mmol divisor 18.0182 | DES-CLI-04 | TST-UNIT-001 | RISK-01 |
| REQ-081 | "--" when no reading | DES-CLI-05 | (covered by visual inspection in TST-SYS-001) | — |
| REQ-082 | Stale-data warning | (Future) | (Future) | RISK-02 |
| REQ-083 | No projected values | DES-CLI-04, DES-CLI-05 | (negative test; recommend adding) | RISK-02 |
| REQ-084 | Updated stamp = render time | DES-CLI-05 | TST-SYS-010 | — |
| REQ-090 | TLS 1.2+ | All | TST-MAN-003 (curl shows TLS) | — |
| REQ-091 | Constant-time compare | DES-SRV-01 | TST-INT-001, TST-INT-002 | RISK-04 |
| REQ-092 | Creds in env vars only | DES-SRV-01 | TST-SECRETS, TST-SYS-007 | RISK-04 |
| REQ-093 | CORS single allowlist | DES-SRV-01 | TST-INT-004 | RISK-04 |
| REQ-094 | No token logging | DES-CLI-02, DES-SRV-01 | TST-LINT, TST-SYS-009 | RISK-11 |
| REQ-095 | Origin-binding of credentials | DES-CLI-02 | (browser-enforced; verified by TST-INT-007 negative case) | RISK-03 |
| REQ-100 | Glucose value size | DES-CLI-05 (CSS) | (visual inspection) | — |
| REQ-101 | Tap target ≥ 44px | DES-CLI-05 (CSS) | (visual inspection) | — |
| REQ-102 | Banner auto-hide | DES-CLI-05 | (visual inspection) | — |
| REQ-103 | Contrast ≥ 4.5:1 | DES-CLI-05 (CSS) | (visual inspection; recommend Axe CI) | — |

## 3. Reverse Trace: Test → Requirement

| TST-ID | Verifies REQ |
|---|---|
| TST-PARSE | All (prerequisite for code to run) |
| TST-LINT | REQ-094, defensive coding hygiene |
| TST-SECRETS | REQ-092 |
| TST-UNIT-001 | REQ-080, REQ-020 |
| TST-UNIT-002 | REQ-024 |
| TST-UNIT-003 | REQ-022 |
| TST-UNIT-004 | REQ-024 |
| TST-UNIT-005 | REQ-025 |
| TST-UNIT-006 | REQ-025 |
| TST-UNIT-007 | REQ-025 |
| TST-UNIT-008 | REQ-027 |
| TST-UNIT-009 | REQ-023, REQ-053 |
| TST-UNIT-010 | REQ-021 |
| TST-INT-001 | REQ-002, REQ-091, REQ-092, REQ-050, REQ-051 |
| TST-INT-002 | REQ-091 |
| TST-INT-003 | REQ-007 |
| TST-INT-004 | REQ-093 |
| TST-INT-005 | REQ-003, REQ-061 |
| TST-INT-006 | REQ-003, REQ-062 |
| TST-INT-007 | REQ-062, REQ-095 |
| TST-INT-008 | REQ-003 |
| TST-INT-009 | REQ-003 |
| TST-SYS-001 | REQ-001 |
| TST-SYS-002 | REQ-002, REQ-091 |
| TST-SYS-003 | REQ-002, REQ-010, REQ-020 |
| TST-SYS-004 | REQ-026 |
| TST-SYS-005 | REQ-026, REQ-041, REQ-032 |
| TST-SYS-006 | REQ-070 |
| TST-SYS-007 | REQ-004, REQ-092 |
| TST-SYS-008 | REQ-004, REQ-005 |
| TST-SYS-009 | REQ-094 |
| TST-SYS-010 | REQ-031, REQ-084 |
| TST-SYS-011 | REQ-008 |
| TST-SYS-012 | REQ-006 |
| TST-MAN-001 | REQ-003, REQ-009, REQ-060, REQ-061 |
| TST-MAN-002 | REQ-071 |
| TST-MAN-003 | REQ-090 |
| TST-MAN-004 | REQ-092, REQ-093 |

## 4. Risk → Control → Test

| RISK-ID | Hazard Summary | RCM(s) | Verified by |
|---|---|---|---|
| RISK-01 | Wrong unit conversion | RCM-01, RCM-02 | TST-UNIT-001 |
| RISK-02 | Stale data shown live | RCM-03, RCM-04 (future) | TST-UNIT-010, TST pending |
| RISK-03 | Auth bypass | RCM-05 | TST-INT-006, TST-INT-007 |
| RISK-04 | Cred leak from client | RCM-06, RCM-07, RCM-08, RCM-09 | TST-SECRETS, TST-SYS-007, TST-INT-002, TST-INT-003, TST-INT-004 |
| RISK-05 | Wrong trend direction | RCM-10 (future) | TST pending |
| RISK-06 | Stale cached HTML | RCM-11, RCM-12 | TST-SYS-006, TST-MAN-002 |
| RISK-07 | Row-weighted TIR | RCM-13 (future) | TST pending |
| RISK-08 | Activity double-count | RCM-14 (future) | TST pending |
| RISK-09 | Trend noise | RCM-15 (future) | TST pending |
| RISK-10 | Single-chunk failure silent | RCM-16 (future) | TST pending |
| RISK-11 | Token logged | RCM-17 | TST-LINT, TST-SYS-009 |
| RISK-12 | Parse error | RCM-18 | TST-PARSE |
| RISK-13 | XSS via backend | RCM-19 | (recommend dedicated negative test) |
| RISK-14 | Background polling | RCM-20 (future) | TST pending |
| RISK-15 | 401 cascade | RCM-21 | TST-SYS-012 |
| HAZ-09 | Demo screenshot misuse | RCM-22 (future) | Visual inspection (future) |
| HAZ-11 | Customer believes clinical-grade | RCM-22 (future) | Visual inspection (future) |
| HAZ-10 | Phone left unlocked | RCM-23 (future) | TST pending |

## 5. Coverage Summary

| Metric | Value |
|---|---|
| Total requirements | 67 |
| Requirements with at least one test | 56 |
| Requirements with no test (gap) | 11 |
| Total risks | 18 |
| Risks with implemented RCM | 11 |
| Risks with future RCM only | 7 |
| Total tests | 35 |

**Coverage gaps requiring follow-up (verbatim from STD §10):**

1. TST-UNIT-011 (fetchMeasurements dedupe/merge) — recommended addition.
2. SW cache-policy unit tests — recommended addition.
3. mg/dL ↔ mmol/L round-trip property tests — recommended addition.
4. Negative XSS test for RCM-19 — recommended addition.
5. Lighthouse CI for REQ-040 cold-load timing — recommended addition.
6. Bundle-size budget check for REQ-043 — recommended automation.
7. Axe accessibility CI for REQ-103 — recommended addition.

## 6. Open Items for Human Reviewer

1. Several REQs (REQ-082, REQ-083, REQ-095, REQ-100–REQ-103) are realized in design but have no automated test. RA review should decide whether to require automated coverage or accept manual verification.
2. The mapping of RISK → RCM → TST relies on RCMs (RCM-04, RCM-10, RCM-13, RCM-15, RCM-16, RCM-20, RCM-22, RCM-23) that are not yet implemented in code. Until they are, the residual-risk claims in TCG-REG-04 §7 are conditional.
3. There is no requirement covering "the legacy `SECURE_AUTH_ENABLED=false` path must remain functional during the transition." Decide whether to support, deprecate, or delete.

---

*Generated by AI in approximately 3 minutes. Equivalent manual effort: 2–4 person-days.*
