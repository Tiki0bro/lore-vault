---
name: feature-loop
description: Use when initiating a comprehensive feature development loop driven by LoreVault's 10 user personas and Arthur "The Griller" Vance across 6 stages and 4 Socratic approval gates (interactive or fully automated --auto mode).
---

# LoreVault Feature Loop (`/feature-loop`)

## Overview

The **Feature Loop** skill orchestrates a persona-driven, Socratic Software Development Lifecycle (SDLC) inside LoreVault. It turns Arthur "The Griller" Vance and LoreVault's 10 user personas into an autonomous design, engineering, QA, and feedback panel.

## Execution Modes & Invocation

1. **Interactive Gate Mode (Default)**:
   - Invocation: `/feature-loop "<Feature Title / Description>"` or `"Start a feature loop for <Feature Title>"`
   - Behavior: Pauses at Gates 1, 2, 3, and 4 for explicit human Product Owner sign-off before advancing.

2. **Autonomous Fast-Track Mode (Fully Automated)**:
   - Invocation: `/feature-loop --auto "<Feature Title / Description>"` or `/feature-loop-auto "<Feature Title>"`
   - Behavior: Runs Stages 1 through 5 sequentially **without pausing** at intermediate gates (Gates 1–3). Arthur autonomously grills each stage, writes remediation plans, executes the implementation, runs QA tests, captures customer feedback, and pauses **ONLY at Gate 4 (Final Release Package Sign-Off)** for single-touch review.

---

## Workspace Setup & State Tracking

Every feature loop creates a tracking directory: `docs/feature-loops/YYYY-MM-DD-<feature-slug>/` containing 6 artifacts:
1. `01-ideation-grill.md`
2. `02-design-spec.md`
3. `03-implementation-plan.md`
4. `04-qa-verification.md`
5. `05-customer-feedback.md`
6. `06-release-retrospective.md`

---

## Personas & Socratic Grilling Rules

### Persona Roster
- 👔 **Ethen**: Product Owner (Scope & user value balance).
- 🧪 **Riley**: QA Lead & Edge-Case Specialist (Boundary checks, zero silent errors).
- 🎭 **Alex**: Dev & VTT Specialist (API design, serializers, token performance).
- 🎭 **Morgan**: World Anvil Migrator (Cross-links, tags, categories, DM secrets).
- 🎭 **Elena**: Novelist (Character voice, scene slate, narrative tone).
- 🎨 **Maya**: Lead UI/UX Designer (Zero-overflow layout, progressive disclosure).
- 🤖 **Grant**: AI-Forward Novelist (AI feature coverage, model agility).
- 🖋️ **Merryn**: Craft Purist (No-generate mode, analytical boundaries).
- 📢 **Marcus**: Marketing Strategist (Promotional slates, public excerpts).
- 🔍 **Arthur "The Griller" Vance**: Socratic Architect & Stress-Tester ("Grill Me").

### Arthur's Interrogation Directives
1. **The 5-Whys Deep Probe**: Interrogate feature requests down to their root value (*"Why build this? What breaks if we don't?"*).
2. **Cross-Persona Friction**: Force personas with competing interests to defend trade-offs (e.g., Grant's AI enthusiasm vs. Merryn's craft purism).
3. **YAGNI & Complexity Tax**: Challenge over-engineered solutions and calculate maintenance debt.
4. **Edge-Case & Failure-Mode Auditing**: Force failure mode definitions upfront before code is written.

---

## Pipeline Stages & Approval Gates

### Stage 1: Persona Ideation & Initial Grilling
- Synthesize feature concept across impacted personas.
- Arthur grills raw idea. Save to `01-ideation-grill.md`.
- Auto-advances to Stage 2.

### Stage 2: Design Spec & Gap Remediation Loop [GATE 1]
- Write formal spec in `02-design-spec.md`.
- Arthur grills spec line-by-line against Alex, Riley, Maya, Merryn, etc.
- Gaps identified produce remediation plans, re-grilled until clean.
- *Interactive Mode*: PAUSE & PRESENT GATE 1 CHECKPOINT REPORT.
- *Automated Mode (`--auto`)*: Mark as Auto-Approved by Arthur Socratic Pass and proceed directly to Stage 3.

### Stage 3: Implementation Plan & Team Validation [GATE 2]
- Convert spec to TDD/SDD plan in `03-implementation-plan.md`.
- Arthur grills dev team on boundaries, test strategy, model fallback safety.
- *Interactive Mode*: PAUSE & PRESENT GATE 2 CHECKPOINT REPORT.
- *Automated Mode (`--auto`)*: Mark as Auto-Approved by Arthur Socratic Pass and proceed directly to Stage 4.

### Stage 4: Execution & QA Verification Loop [GATE 3]
- Execute implementation plan (TDD/SDD).
- Riley & QA run boundary, schema, and zero-silent-error checks.
- Arthur grills final build (`04-qa-verification.md`).
- *Interactive Mode*: PAUSE & PRESENT GATE 3 CHECKPOINT REPORT.
- *Automated Mode (`--auto`)*: Mark as Auto-Approved by Arthur Socratic Pass and proceed directly to Stage 5.

### Stage 5: Customer Review & Feedback Collection [GATE 4]
- Simulate user feedback across target personas evaluating live feature (`05-customer-feedback.md`).
- **PAUSE & PRESENT CONSOLIDATED RELEASE PACKAGE & GATE 4 CHECKPOINT REPORT**.

### Stage 6: Release Retrospective & Next Release Brainstorming
- Log architectural choices & post-mortems in `DECISIONS.md`.
- Save retro in `06-release-retrospective.md`. Complete loop.

---

## Gate Approval Report Template

When reaching any Gate Checkpoint, output this block:

```markdown
=====================================================
🔥 ARTHUR'S GRILLING REPORT & GATE CHECKPOINT [GATE X/4]
Feature: <Feature Name>
Mode: <Interactive Gate Mode | Autonomous Fast-Track (--auto)>
Status: READY FOR USER APPROVAL
=====================================================

### 🔍 Arthur's Key Interrogations & Verdict:
- [Issue 1]: <Description & How it was resolved in artifact>
- [Issue 2]: <Description & How it was resolved>

### 👥 Persona Sign-Offs:
- 👔 Ethen (PO): Approved
- 🧪 Riley (QA): Approved
- 🎭 Alex (Dev): Approved
- 🎨 Maya (UI/UX): Approved

### 📄 Artifact Links:
- Ideation: [01-ideation-grill.md](file:///<path>/01-ideation-grill.md)
- Design Spec: [02-design-spec.md](file:///<path>/02-design-spec.md)
- Implementation Plan: [03-implementation-plan.md](file:///<path>/03-implementation-plan.md)
- QA Verification: [04-qa-verification.md](file:///<path>/04-qa-verification.md)
- Customer Feedback: [05-customer-feedback.md](file:///<path>/05-customer-feedback.md)

-----------------------------------------------------
👉 Action Required: Reply 'Approved' to accept release package & complete retro, or specify revisions.
```
