> **AI-Generated Draft — Requires Human Review and QMS Integration**
>
> This document was produced by an AI system from source code and architectural notes. It is illustrative material for a Trinity Biotech presentation on AI-assisted regulatory documentation. **It has not been reviewed by qualified Regulatory Affairs personnel, has not been integrated into any QMS, and must not be used as evidence of design controls under ISO 13485, IEC 62304, or 21 CFR 820.**


| Field | Value |
|---|---|
| Document Title | Software Safety Classification |
| Document ID | TCG-REG-01 |
| Product | Trinity CGM Plus (presale demo) |
| Version | 0.1 (AI draft) |
| Generated | 2026-04-28 |
| Author | AI-assisted (Claude Opus 4.7) |
| Status | DRAFT — Pending Human Review |
| Reviewers | TBD |
| Approvers | TBD |

## 1. Purpose

This document establishes the IEC 62304 software safety class for the Trinity CGM Plus mobile demonstration application and its associated Netlify Function backend. The classification drives the depth of design controls, verification activities, and risk management required for the software system.

## 2. Scope

The scope includes:

- The single-page Progressive Web App (PWA) at `index.html` running in Chrome (browser and Trusted Web Activity / TWA wrapper).
- The Netlify Functions in `netlify/functions/` (`login.mjs`, `register-credential.mjs`).
- The service worker (`sw.js`).
- The Software of Unknown Provenance (SOUP) components enumerated in [TCG-REG-07 SBOM](07-sbom.cyclonedx.json).

Out of scope:

- The BioT Demo2 backend (treated as a SOUP item with its own classification by its supplier).
- Hardware glucose sensors (not part of this software system; provided by future sensor partners).
- The Android operating system and Chrome browser (treated as platform SOUP).

## 3. References

- IEC 62304:2006/AMD 1:2015 — Medical device software — Software life cycle processes
- IEC TR 80002-1:2009 — Guidance on the application of ISO 14971 to medical device software
- ISO 14971:2019 — Application of risk management to medical devices
- FDA Guidance: Content of Premarket Submissions for Device Software Functions (2023)
- TCG-REG-04 Risk Analysis (this DHF)
- TCG-REG-02 Software Requirements Specification (this DHF)

## 4. Definitions

| Term | Meaning |
|---|---|
| Class A | No injury or damage to health is possible |
| Class B | Non-serious injury is possible |
| Class C | Death or serious injury is possible |
| SOUP | Software Of Unknown Provenance — software previously developed and generally available |
| Hazardous Situation | Circumstance in which people, property, or environment is exposed to one or more hazards |
| Risk Control | Measure taken to reduce risk to acceptable level |

## 5. Software System Identification

The Trinity CGM Plus PWA is a software-only mobile application that:

1. Authenticates a user via app-level password and platform biometric (WebAuthn).
2. Retrieves glucose, heart rate, activity, and skin temperature readings from the BioT Demo2 backend on behalf of a designated patient.
3. Displays the most recent glucose value, trend, and derived metrics (Time in Range, weekly average, GMI, CV) on five tabbed screens.
4. Refreshes data every 60 seconds while in the foreground.

The application **does not**:

- Control or actuate any therapeutic device (no insulin pump integration, no alarm actuator).
- Make automated treatment recommendations.
- Replace a primary CGM reader for clinical use.
- Carry a labeled indication for treatment decisions.

## 6. Intended Use Statement (for classification purposes)

The Trinity CGM Plus presale demo application is intended to **display CGM-derived telemetry from the BioT Demo2 backend for demonstration purposes during pre-sales engagements with prospective Trinity Biotech customers**. It is not intended for clinical decision-making, diagnosis, or therapy. The product is not currently a candidate for market clearance.

## 7. Hazardous Situation Analysis

Per IEC 62304 §4.3, classification is determined by the worst-case **hazardous situation** that could arise from the software contributing to a hazard, **after consideration of risk controls external to the software itself** (e.g., labeling, user training, hardware safety mechanisms).

### 7.1 Identified hazardous situations relevant to a deployed CGM display

| HAZ-ID | Hazardous Situation | Plausible Harm |
|---|---|---|
| HAZ-01 | Display of incorrect glucose value (sensor error, decoding error, unit conversion error) | User takes incorrect action (e.g., insulin overdose → severe hypoglycemia) |
| HAZ-02 | Display of stale data presented as live | User believes glucose is steady when it has fallen below target |
| HAZ-03 | Trend arrow displayed in wrong direction | User takes incorrect action |
| HAZ-04 | Application fails to launch or display | User cannot check glucose; no harm directly, but loss of monitoring |
| HAZ-05 | Auth bypass / session hijack | Unauthorized exposure of patient data; PHI disclosure |
| HAZ-06 | Token leak / credential exposure | Same as HAZ-05 |
| HAZ-07 | Service worker serves stale cached HTML masking a critical update | Defective version persists past intended retirement |

### 7.2 Severity rationale

For HAZ-01, HAZ-02, HAZ-03 in a **deployed clinical product**, the worst-case harm is severe hypoglycemia or hyperglycemia leading to seizure, coma, or death. This places a future productized version of this software in the realm of **Class C** if marketed as supporting treatment decisions.

For the **current presale demo**, the application:

- Is used only by Trinity Biotech sales staff and named customer evaluators during in-person demos.
- Carries on-screen labeling and verbal disclosure that the data is from a demo backend (Olivia patient, Demo2 environment).
- Is not used by patients to make treatment decisions.
- Has no clinical labeling or claims.

These external (non-software) controls reduce the residual risk of the demo to **non-serious injury possible**, and arguably to **no injury possible** if the demo is conducted strictly per protocol.

## 8. Classification Decision

| Context | Class | Rationale |
|---|---|---|
| **Current presale demo (this DHF)** | **B** | Conservative classification. Although the demo is conducted under controlled conditions that arguably support Class A, classifying as B ensures the software life cycle activities documented in this DHF are sufficient should the codebase later be repurposed. |
| **Future productized version** | **C** (anticipated) | If labeled for treatment decisions. Class C requires significantly more rigorous unit-level verification, formal architectural design review, and detailed traceability that this AI-generated DHF does not currently provide. |

## 9. Implications of Class B Classification (this demo)

Per IEC 62304 §5, Class B requires:

- §5.1 Software development planning ✓ (implicit in this DHF)
- §5.2 Software requirements analysis → see [TCG-REG-02 SRS](02-software-requirements-specification.md)
- §5.3 Software architectural design → see [TCG-REG-03 SDD](03-software-design-description.md)
- §5.4 Software detailed design — **NOT REQUIRED** for Class B (Class C only)
- §5.5 Software unit implementation and verification → see [TCG-REG-05 STD](05-software-test-description.md)
- §5.6 Software integration and integration testing → see [TCG-REG-05 STD](05-software-test-description.md)
- §5.7 Software system testing → see [TCG-REG-05 STD](05-software-test-description.md)
- §5.8 Software release → not applicable to demo (no formal release)

Plus:

- §6 Software maintenance process — defined informally for this demo
- §7 Software risk management process — see [TCG-REG-04 Risk Analysis](04-risk-analysis.md)
- §8 Software configuration management process — git-based version control with commit history
- §9 Software problem resolution process — informal during demo; would require formalization for productization

## 10. Open Items for Human Reviewer

The following items require RA/QA judgment before this classification can be finalized:

1. **Treatment-decision claim.** If Trinity Biotech intends to claim this software supports treatment decisions in any future productized form, Class C must be applied retroactively, and the entire DHF must be re-derived under Class C process rigor.
2. **Geography.** This classification is FDA / IEC 62304 oriented. EU MDR Annex VIII Rule 11 may produce a different classification (likely Class IIa-IIb for CGM display software).
3. **Integration with existing Trinity Biotech QMS.** This document follows IEC 62304 structure but does not yet conform to Trinity Biotech's quality manual templates, document numbering scheme, or approval workflow.
4. **SOUP qualification.** The SOUP components listed in the SBOM have not yet been formally qualified per IEC 62304 §8.1.2; this is required before any productized release.

## 11. Approval

| Role | Name | Signature | Date |
|---|---|---|---|
| Author (AI-assisted) | Claude Opus 4.7 | [AI-DRAFT] | 2026-04-28 |
| Software Lead | TBD | _Pending human approval_ | — |
| Regulatory Affairs | TBD | _Pending human approval_ | — |
| Quality Assurance | TBD | _Pending human approval_ | — |

---

*Generated by AI in approximately 90 seconds from source code review. Equivalent manual effort: estimated 1–2 person-days.*
