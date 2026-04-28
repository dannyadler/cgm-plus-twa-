> **AI-Generated Draft — Requires Human Review and QMS Integration**
>
> This document was produced by an AI system from source code and architectural notes. It is illustrative material for a Trinity Biotech presentation on AI-assisted regulatory documentation. **It has not been reviewed by qualified Regulatory Affairs personnel, has not been integrated into any QMS, and must not be used as evidence of design controls under ISO 13485, IEC 62304, or 21 CFR 820. The threat model, control set, and SOUP vulnerability assessment must be validated by a security engineer before use.**


| Field | Value |
|---|---|
| Document Title | Cybersecurity Assessment & Plan |
| Document ID | TCG-REG-06 |
| Product | Trinity CGM Plus (presale demo) |
| Version | 0.1 (AI draft) |
| Generated | 2026-04-28 |
| Standard References | FDA Cybersecurity Premarket Guidance (2023); IEC 81001-5-1; AAMI TIR57; NIST SP 800-30 |

## 1. Purpose

This document describes the cybersecurity posture of the Trinity CGM Plus PWA: the threat model, the inventory of assets and attack surfaces, the security controls currently in place, the SBOM-driven vulnerability management plan, and the postmarket cybersecurity update commitments.

It targets the structure of the FDA "Content of Premarket Submissions for Device Software Functions" guidance (2023) Section VI (Cybersecurity), adapted for a presale demo context.

## 2. Scope

In scope:
- Client PWA (`index.html`, `sw.js`).
- Netlify Functions (`login.mjs`, `register-credential.mjs`).
- All SOUP enumerated in [TCG-REG-07 SBOM](07-sbom.cyclonedx.json).
- Communication channels (browser ↔ Netlify, Netlify ↔ BioT, browser ↔ WebAuthn authenticator).

Out of scope:
- BioT backend security posture (relies on BioT's own cybersecurity program).
- Underlying browser, OS, and Android Trusted Web Activity sandboxing (relies on platform vendor).
- Netlify infrastructure security (relies on Netlify's program).

## 3. Cybersecurity Risk Management Methodology

The assessment uses STRIDE threat categorization (Microsoft) applied per trust boundary, and qualitative risk scoring per [TCG-REG-04 Risk Analysis](04-risk-analysis.md) §3.

## 4. Asset Inventory

| Asset | Location | Sensitivity | Compromise Impact |
|---|---|---|---|
| BioT access token (JWT) | Browser memory; Netlify Function memory | High | Read patient telemetry; spoof user actions on BioT |
| App password | Netlify env var; user's mind | High | Bypass auth gate |
| BioT credentials (patient + clinician) | Netlify env var only | Critical | Full backend access |
| WebAuthn private key material | Platform authenticator (Secure Enclave, TPM, Strongbox) | Critical | Device-bound; not exfiltratable |
| WebAuthn public keys | Netlify Blobs | Low (public by design) | Validation-tampering possible if Blob writeable |
| WebAuthn credential ID | localStorage | Low | Identifies a registered credential; not a secret |
| Patient telemetry rendered on screen | Browser DOM | Medium-High | PHI; HIPAA / GDPR-relevant once productized |

## 5. Trust Boundaries and Attack Surface

Three trust boundaries (full diagram in [TCG-REG-03 SDD](03-software-design-description.md) §4):

| # | Boundary | Attack Surface |
|---|---|---|
| 1 | Network ↔ Browser | DOM, JS execution context, localStorage, service worker |
| 2 | Browser ↔ Netlify Function | HTTPS request body and headers, CORS preflight, query string |
| 3 | Netlify Function ↔ BioT | HTTPS, Bearer token, query JSON |

## 6. STRIDE Analysis (per Trust Boundary)

### 6.1 Boundary 1 — Browser

| Threat | Description | Severity | Control |
|---|---|---|---|
| **S**poofing | Attacker forges a session by stealing token | Med | Token in memory only (REQ-005); session expires; HTTPS only |
| **T**ampering | Attacker modifies displayed glucose | Low | Only DOM modifications via own JS; XSS prevented by `textContent` (RCM-19) |
| **R**epudiation | User denies a registration | Low | Demo context; not enforcement-relevant |
| **I**nformation disclosure | DevTools reveals token | Low (logs scrubbed per RCM-17); accept | TST-094, TST-009 |
| **D**enial of service | Service worker locks app on bad version | Med | CACHE_NAME bumped each release (RCM-12) |
| **E**levation of privilege | Patient token escalates to clinician | Low | Tokens issued server-side from controlled creds (REQ-092) |

### 6.2 Boundary 2 — Netlify Function

| Threat | Description | Severity | Control |
|---|---|---|---|
| **S**poofing | Attacker calls /login from arbitrary origin | High | CORS allowlist (REQ-093, RCM-08); rate limit (RCM-09) |
| **T**ampering | Attacker modifies request mid-flight | Low | TLS 1.2+ |
| **R**epudiation | — | — | Logging by Netlify |
| **I**nformation disclosure | Function logs leak creds | High | Code review: `console.log` scrubbed for env vars (TST-LINT) |
| **D**enial of service | Brute force on app password | High | Rate limit per IP (REQ-007) |
| **E**levation of privilege | Caller registers a credential without prior password auth | High | Signed nonce gate (REQ-003) |

### 6.3 Boundary 3 — Netlify Function ↔ BioT

| Threat | Description | Severity | Control |
|---|---|---|---|
| **S**poofing | Function impersonates a different patient | Low | Functions hardcode `BIOT_PATIENT_ID` env; out-of-band rotation required to change |
| **T**ampering | MITM on HTTPS to BioT | Low | TLS pinning not implemented (acceptable for demo) |
| **R**epudiation | — | — | BioT-side audit logs |
| **I**nformation disclosure | Token logged | Low | TST-LINT |
| **D**enial of service | Function exhausts BioT rate limit | Low | Single-user demo profile; not at risk |
| **E**levation of privilege | Clinician fallback used inappropriately | Medium | Probe-then-fallback logic; documented in REQ-002 |

## 7. Security Controls Catalog

### 7.1 Authentication
- App-level password gate (constant-time compare, REQ-091).
- WebAuthn platform authenticator (REQ-060, REQ-061, REQ-062).
- Defense in depth: both layers must succeed for access.

### 7.2 Authorization
- BioT ABAC enforced server-side at BioT (out of scope for this DHF).
- Netlify Function decides patient-vs-clinician token based on probe result (REQ-002).

### 7.3 Confidentiality
- TLS 1.2+ on all hops (REQ-090).
- BioT credentials never leave Netlify env (REQ-092).
- Token never persisted; session-bound only (REQ-005).
- WebAuthn private key in hardware-backed key store; never exfiltrated.

### 7.4 Integrity
- HTTPS prevents in-flight tampering.
- Service worker pinned to a release-specific `CACHE_NAME` (REQ-071).
- Subresource integrity (SRI) — **not implemented**; recommended for productization since the page loads inline JS only (no external CDN currently, so risk is low).

### 7.5 Availability
- Single-region Netlify deploy. No high-availability commitments for the demo.
- Service worker offline cache fallback for static assets (REQ-034).

### 7.6 Audit
- Netlify Function invocation logs retained per Netlify's policy.
- BioT-side request logs retained per BioT's policy.
- Client-side `log()` mirrors to console with `[CGM]` prefix; persists only as long as DevTools is open.

## 8. SOUP Vulnerability Management

Each SOUP component listed in the [SBOM](07-sbom.cyclonedx.json) is subject to:

1. **Continuous CVE monitoring** via `npm audit` on every CI run.
2. **Manual triage** of any new CVE within 30 days of disclosure.
3. **Patch upgrade** within 90 days for HIGH or CRITICAL CVEs that affect a path actually used by this app.

### 8.1 Current SOUP CVE status (as of 2026-04-28)

This snapshot is generated by the AI at draft time and **must be regenerated by `npm audit` in CI** before treating it as authoritative.

| Component | Version | Known CVEs | Action |
|---|---|---|---|
| @netlify/blobs | 8.1.0 | None known at draft time | Monitor |
| @simplewebauthn/server | 13.1.1 | None known at draft time | Monitor |
| @hexagon/base64 | 1.1.28 | None known at draft time | Monitor |
| @levischuck/tiny-cbor | 0.2.11 | None known at draft time | Monitor |
| @peculiar/asn1-* | 2.6.x | None known at draft time | Monitor |
| asn1js | 3.0.10 | None known at draft time | Monitor |
| pvtsutils, pvutils | 1.3.x, 1.1.x | None known at draft time | Monitor |
| tslib | 2.8.1 | None known at draft time | Monitor |

> **Important:** The above is the AI-author's static knowledge. The CI workflow `regulatory-ci.yml` includes a step that runs `npm audit --json` and gates on its output; treat that output as the source of truth.

### 8.2 SOUP qualification (IEC 62304 §8.1.2)

A formal SOUP qualification record per component is required for productization. Not present in this DHF.

## 9. Update Mechanism

The PWA model means updates are pull-based:

1. New code is deployed to Netlify.
2. Service worker fetches the updated `index.html` (network-first per REQ-034).
3. New `CACHE_NAME` causes activate handler to purge previous-version caches.
4. The user gets the new version on the next page navigation.

There is no patient or clinician affirmative consent to updates in the current model. For a productized version, an in-app update notification with release notes and acknowledgment is recommended.

## 10. Postmarket Cybersecurity (placeholder for productized version)

This section is required by the FDA Premarket Cybersecurity Guidance for any cleared device. For the current demo, postmarket activities are limited to:

- Monitoring `npm audit` outputs in CI.
- Investigating any anomalous Netlify Function invocation patterns (manual review).
- Disabling the demo deploy if a critical vulnerability is detected, pending a fix.

A productized version would require:

- Coordinated Vulnerability Disclosure policy (CVD), including a `security.txt`.
- Software Bill of Materials publishing per FDA cybersecurity guidance.
- Postmarket Software Update Plan with release cadence, severity criteria, customer notification path.
- Incident response runbook.
- Penetration testing on a pre-defined cadence.
- Threat-intel feed subscription for the SOUP set.

## 11. Identified Cybersecurity Risks (cross-reference)

Mapping to [TCG-REG-04 Risk Analysis](04-risk-analysis.md):

| Cybersecurity Concern | Risk ID(s) | Residual Status |
|---|---|---|
| Credential exposure | RISK-04 | LOW (post RCM-06–RCM-09) |
| Auth bypass | RISK-03 | LOW |
| Token leak via logs | RISK-11 | LOW |
| Stale software | RISK-06 | LOW |
| XSS via backend | RISK-13 | LOW |

No cybersecurity risk currently rates HIGH or UNACCEPTABLE post-mitigation.

## 12. Open Items for Human Reviewer

1. **Penetration testing** has not been performed. Recommended before any external customer demo, even in a "demo only" framing.
2. **CVD policy** (security.txt) is not in place.
3. **TLS pinning** not implemented in the Netlify Function → BioT call. Acceptable for demo; consider for productization.
4. **No formal incident-response runbook**; demo context tolerates this, productization does not.
5. **BioT credentials in commit history** (referenced in earlier code review). Status as of this draft: BioT passwords were committed in past `index.html` versions but have since been moved server-side. Whether to rotate the BioT-side accounts is a BioT-and-Trinity decision.

---

*Generated by AI in approximately 4 minutes. Equivalent manual effort: 4–7 person-days plus security engineering review.*
