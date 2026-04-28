---
**AI-Generated Draft — Customer Presentation Talk Track**

This is the presenter's script for a 30-minute walkthrough of the AI-assisted regulatory documentation demo. It is not a regulatory artifact itself.
---

| Field | Value |
|---|---|
| Document Title | Talk Track — AI-Assisted Regulatory Documentation |
| Document ID | TCG-REG-09 |
| Audience | Trinity Biotech RA/QA leadership, software leadership |
| Duration | 30 minutes (20 min walkthrough + 10 min Q&A) |
| Format | Live walkthrough of the GitHub repository, no slides |
| Generated | 2026-04-28 |

## Pre-meeting setup (5 min before)

1. Open https://github.com/dannyadler/cgm-plus-twa- in a browser tab.
2. Open the deployed app at https://stellar-sprite-b171ee.netlify.app in another tab.
3. Open a terminal in `/Users/daniel/Library/CloudStorage/.../trinity-cgm-plus-pwa/`.
4. Have a markdown viewer open on the `regulatory/` directory (VS Code preview pane or GitHub's web rendering).
5. Stop talking; let people walk in.

## Opening (2 min)

> "Today I want to show you what AI-assisted regulatory documentation looks like in practice — not as a hypothetical, but on a real software project we built three days ago. The CGM Plus PWA. It's the demo we're using for the Trinity presale, and I'm going to walk you through the regulatory artifact set that an AI generated from its source code.
>
> Three things I'd like you to evaluate as we go:
>
> 1. **Quality of the drafts.** Are they technically grounded, or are they generic boilerplate?
> 2. **Where AI ends and humans begin.** What can be automated, what cannot?
> 3. **Speed and cost.** How long would each of these have taken your team manually?
>
> Everything you'll see is open in our private repo. The code, the docs, the CI pipeline, all of it."

## Section 1 — The product context (3 min)

Open `README.md` and `ARCHITECTURE.md`.

> "Quick context. This is a CGM-display PWA built on top of BioT's Demo2 backend. Single HTML file, vanilla JavaScript, deployed to Netlify, wrapped as a Trusted Web Activity for Android.
>
> A few weeks ago we did a code review and found credentials hardcoded in JavaScript, no automated tests, and a list of bugs in the computation module. Three days ago we replaced the auth flow with WebAuthn fingerprint unlock and a Netlify-Function-mediated server-side login.
>
> This is exactly the kind of presale prototype that companies normally would not subject to regulatory rigor. Today we're going to ask: *can AI do useful regulatory work on this codebase, or is it premature?*"

## Section 2 — The DHF artifact set (10 min)

Open the `regulatory/` directory in markdown view.

> "Nine documents. The AI generated all of them in roughly 30 minutes of compute time. Let me walk through them in dependency order."

### 2.1 Software Safety Classification (1 min)

> "First, [TCG-REG-01](01-software-safety-classification.md). IEC 62304 §4.3 — what's our software safety class? The AI argues for **Class B** for the demo, with explicit rationale: this is a CGM display, the worst case for a clinical version is severe hypoglycemia or hyperglycemia leading to coma or death — Class C territory. But the demo's external controls (controlled distribution, sales-only audience, no clinical labeling) reduce residual risk.
>
> Note the **Open Items for Human Reviewer** section at the bottom. Every document has one. The AI flags four things — including 'if you ever claim treatment-decision support, this whole DHF must be redone under Class C.' That's the kind of judgment call I want a human RA to validate, and the AI surfaces the question rather than burying it."

### 2.2 Software Requirements Specification (2 min)

> "Open [TCG-REG-02](02-software-requirements-specification.md). 67 requirements with REQ-IDs, organized by category: auth, data retrieval, display/computation, refresh/caching, performance, interfaces, safety, security, usability.
>
> Look at REQ-080: 'Glucose unit conversion shall use the divisor 18.0182 with no rounding before division.' That's not boilerplate. The AI extracted that constraint from the source code and recognized it as a safety requirement. The number `18.0182` appears in `index.html` line 694 — it's the actual conversion divisor.
>
> Look at REQ-094: 'No console output containing the access token.' That came from the AI's own threat model — it noticed the `log()` function in the code and identified the risk that someone screenshares DevTools.
>
> Each requirement has a verification reference — TST-NNN. Those tests are real, they're in the next document, and they run in CI."

### 2.3 Software Design Description (1 min)

> "[TCG-REG-03](03-software-design-description.md). Architectural decomposition. Seven client items, two server items, an ASCII diagram showing trust boundaries, a data dictionary that calls out the field-name quirk (BioT uses `hr` not `heartRate`), and a list of SOUP components with their hazard implications.
>
> The Open Items section flags six existing bugs that should drive change orders. Things like 'fetchMeasurements ignores its limit parameter.' The AI is reading code and writing the list of code-quality issues your software lead would write."

### 2.4 Risk Analysis (3 min)

This is the centerpiece. Spend more time here.

> "[TCG-REG-04](04-risk-analysis.md). ISO 14971 risk analysis. Eighteen identified risks, including:
>
> - **RISK-01:** wrong unit conversion — Severity 5, Catastrophic.
> - **RISK-02:** stale data shown as live — initial HIGH, residual MED with the right control measure.
> - **RISK-04:** credentials leaked from client — initial HIGH, residual LOW with the four control measures we already implemented.
> - **RISK-07:** Time in Range computation is row-weighted not time-weighted — that's a real bug the AI found in our actual code. It's a HIGH risk, requires a future fix.
>
> What I want to highlight: the AI is **honest about residual risk**. It distinguishes between RCMs that are *implemented* and RCMs marked *PROPOSED — Future requirement*. The residual-risk table at §7 says 'acceptable IF the future RCM lands.' It does not paper over gaps.
>
> Severity scaling needs clinical input — the AI flags this in Open Items. Probability scaling is judgment-based and needs field data. The AI flags this too. **It's telling us where it can't help.** That's the honest framing your RA team would write themselves."

### 2.5 Software Test Description (2 min)

> "[TCG-REG-05](05-software-test-description.md). 35 test cases: parse, lint, secret-scan, 10 unit tests, 9 integration tests, 12 system tests, 4 manual checklist items. Each test traces back to one or more REQ-IDs and the corresponding RISK-IDs from the risk file.
>
> The unit tests for the computation module are the high-leverage ones — the AI identified that this is where glucose-value-affecting math lives. TST-UNIT-001 verifies `toMmol(18.0182)` returns exactly 1.0 within IEEE 754 precision. That's the kind of test you'd write to defend Class B verification.
>
> What's important: **these are real tests.** I'll show you in a minute that they actually run in our CI."

### 2.6 Cybersecurity (1 min)

> "[TCG-REG-06](06-cybersecurity-assessment.md). FDA premarket cybersecurity guidance structure. STRIDE per trust boundary, asset inventory, control catalog, SOUP CVE status, postmarket update plan placeholder.
>
> The AI was honest that the SOUP CVE list is its static snapshot — and pointed to `npm audit` as the live source of truth. That's exactly right. It's not pretending to be a vulnerability scanner."

### 2.7 SBOM (30 sec)

> "[TCG-REG-07](07-sbom.cyclonedx.json). CycloneDX 1.5. Real components, real versions, real hashes from `package-lock.json`. The CI regenerates this on every push so it's always current."

### 2.8 Traceability Matrix (1 min)

> "[TCG-REG-08](08-traceability-matrix.md). Bidirectional. REQ → DES → TEST → RISK in section 2; TEST → REQ in section 3; RISK → CONTROL → TEST in section 4. Coverage summary at the end shows 56/67 requirements have automated test coverage and which 11 don't, with explicit recommendations.
>
> Maintaining this matrix by hand is the single biggest pain point for any regulatory team. The AI keeps it consistent because it generated all the source documents in the same session."

## Section 3 — The CI pipeline (4 min)

Open `.github/workflows/regulatory-ci.yml`.

> "Documents are one half. The other half is keeping them honest as code changes. Let me show you what happens on every push."

[Open GitHub Actions tab on the repo, show the most recent run.]

> "Every push runs:
>
> 1. **Parse check.** Catches the duplicate-`let` class of bug that historically broke this app silently.
> 2. **ESLint.** Coding hygiene gates.
> 3. **Static secret scan.** Greps the client bundle for any of the BioT credential strings. Fails the build if anything matches.
> 4. **Unit tests.** All ten of them. Real Node test runner, real assertions.
> 5. **SBOM regeneration.** Re-runs CycloneDX from the lockfile. Commits if drift detected.
> 6. **`npm audit`.** Updates the SOUP CVE table.
>
> On a successful build, all evidence is published as workflow artifacts. That's the V&V evidence trail an auditor would expect."

[Trigger a small change locally, push, watch CI run.]

> "Watch — I'll change a comment, push, and the pipeline runs end to end in about two minutes."

## Section 4 — Where AI ends, humans begin (3 min)

Open the bottom of any document — the **Open Items for Human Reviewer** section.

> "Three things AI does well that I've shown you:
>
> - **Document scaffolding** — pulling structure from standards, organizing requirements, generating tables.
> - **Cross-referencing** — keeping REQ-IDs and RISK-IDs consistent across nine documents.
> - **Code-grounded honesty** — flagging real bugs, real gaps, real questions.
>
> Five things AI cannot replace:
>
> 1. **Clinical severity calibration.** A clinical reviewer must validate severity scores against published harm taxonomies.
> 2. **Use-error analysis.** IEC 62366 formative evaluation requires real users.
> 3. **QMS integration.** These documents follow standard structures, not Trinity Biotech's quality manual templates, numbering, or approval workflow.
> 4. **Sign-off.** Every document has placeholder approval blocks. Real signatures are real accountability.
> 5. **Penetration testing.** AI can write a threat model. AI cannot probe the deployed system.
>
> The pitch isn't 'AI replaces RA.' It's 'AI compresses 30–50 person-days of foundational drafting into 30 minutes of generation plus a focused human review pass.' Your team's expertise is now applied to validation and judgment, not to typing."

## Section 5 — Quantified value (2 min)

> "Each document has a footer. Let me read three:
>
> - SRS: 'Generated by AI in approximately 4 minutes. Equivalent manual effort: 3–5 person-days.'
> - Risk Analysis: 'Generated in approximately 5 minutes. Equivalent manual effort: 5–10 person-days plus clinical review.'
> - STD: '6 minutes vs 5–10 person-days.'
>
> Across the nine documents, the AI's own estimate is **30–60 person-days of equivalent manual effort generated in roughly 30 minutes.** Even if those numbers are off by a factor of two, the order-of-magnitude difference is the value proposition.
>
> The further pitch is **freshness**. Your team writes a DHF, then code drifts for a year, and the DHF is stale. With this pipeline, the SBOM regenerates on every push, the traceability matrix is maintainable because the AI can re-run the cross-reference, and the test suite stays linked to requirement IDs because both are generated from the same source.
>
> A live, current DHF rather than a frozen submission package."

## Section 6 — Closing and Q&A (5 min)

> "Three asks if you'd like to take this further:
>
> 1. **Validate quality.** Pick one document — Risk Analysis is usually the most stressful — and have your RA team red-team it. Tell us what's wrong, what's right, what they'd add.
> 2. **Test the boundaries.** Pick a real Trinity product currently in development and ask: 'could AI scaffold the DHF for this in the same way?' We can run the experiment.
> 3. **Decide on QMS integration.** If this approach works for Trinity, the next step is templates, numbering schemes, and approval flows that map to your QMS. That's a 1–2 week engagement.
>
> Questions?"

## Anticipated Q&A

**Q: How do we know the AI didn't hallucinate facts?**
> "Two safeguards. First, every claim about the codebase has a file/line citation that you can check. Second, the CI pipeline runs the tests defined in the STD — if the AI invented a test that doesn't exist, the build breaks. Hallucination is detectable here because the artifacts are tied to executable evidence."

**Q: Does the AI keep your code as training data?**
> "Anthropic's policy on Claude API use does not train on customer data by default. We can confirm the exact terms applicable to your account before any pilot."

**Q: What about regulatory submissions — could this go to FDA?**
> "Not as-is. These are *drafts*. They lack QMS integration, real signatures, and real V&V evidence on a frozen release candidate. The path to submission would be: AI generates draft → RA edits and reframes → V&V runs → human signs off → submission. AI moves the start of the human-effort curve to the right; it does not eliminate the curve."

**Q: What if a regulator finds AI-generated content in a submission?**
> "FDA, MHRA, and Notified Bodies have begun publishing positions on AI-assisted regulatory work. The current consensus: tool-assisted authorship is acceptable as long as humans take responsibility for the content and the QMS documents the tool's role. Same standard as Microsoft Word — no one accepts a submission that says 'Microsoft Word generated this'; they ask whether a qualified person owns it."

**Q: Cost?**
> "Anthropic API pricing for the generation pass is on the order of \$5–\$15 per full DHF generation at current Claude Opus pricing. The CI pipeline runs on free GitHub Actions minutes for our scale. The cost is dominated by the human review pass."

**Q: What about EU MDR?**
> "The IEC 62304 / ISO 14971 spine is the same. EU MDR Annex VIII Rule 11 classification differs from FDA Class system — likely Class IIa-IIb for CGM display software. The AI flagged this in TCG-REG-01 §10. Notified Body engagement is its own process, but the document set transfers."

**Q: Can we customize for our QMS?**
> "Yes. The AI prompt can be parameterized with your document templates, numbering scheme, and approval flow. That's the 1–2 week QMS-integration engagement I mentioned."

## Backup material

If anyone asks for deep-dive on a specific document, open it directly — they're all linked from `regulatory/00-README.md`. If anyone wants to see code, the most useful files are:

- `index.html` — the PWA itself (~1400 lines)
- `netlify/functions/login.mjs` — server-side auth (~340 lines)
- `tests/parse-check.mjs` — proves CI is real (small)
- `.github/workflows/regulatory-ci.yml` — the regulatory pipeline

If anyone wants to see AI generation live: open Claude in a separate window, paste in `index.html`, ask it to update SRS REQ-080 to add a property-based round-trip test, watch the AI propose the change. Live demo of the maintenance loop.

---

*This talk track was generated by AI in approximately 4 minutes. The presenter — Daniel — owns the live delivery.*
