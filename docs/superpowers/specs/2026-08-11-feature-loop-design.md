# LoreVault Feature Loop Design Spec (`/feature-loop`)

## Overview

The **Feature Loop** command (`/feature-loop`) is an autonomous, persona-driven development lifecycle engine for LoreVault. It orchestrates LoreVault's 10 established user personas—headlined by **Arthur "The Griller" Vance** as the principal Socratic architect—through a rigorous 6-stage development pipeline spanning ideation, design spec grilling, implementation planning, automated execution, QA verification, customer feedback, and release retrospectives.

---

## 1. Architecture & Execution Context

- **Skill Location**: `.agents/skills/feature-loop/SKILL.md` (Workspace Custom Skill)
- **Invocation**: Triggered via `/feature-loop "Feature Title / Summary"` or prompt: *"Start a feature loop for X"*
- **Artifact Directory**: Every feature loop creates a dedicated folder under `docs/feature-loops/YYYY-MM-DD-<feature-slug>/` to store state artifacts:
  ```
  docs/feature-loops/YYYY-MM-DD-<feature-slug>/
  ├── 01-ideation-grill.md
  ├── 02-design-spec.md
  ├── 03-implementation-plan.md
  ├── 04-qa-verification.md
  ├── 05-customer-feedback.md
  └── 06-release-retrospective.md
  ```

---

## 2. Persona Roster & Socratic Grilling Engine

### Persona Roster
1. 👔 **Ethen**: Product Owner (Scope, roadmap balance, user value).
2. 🧪 **Riley**: QA Lead & Edge-Case Specialist (Boundary checks, zero silent errors, test coverage).
3. 🎭 **Alex**: Full-Stack Dev & VTT Specialist (API design, serializers, token performance, graph traversal).
4. 🎭 **Morgan**: World Anvil Migrator (Cross-links, tags, categories, DM secrets).
5. 🎭 **Elena**: Novelist (Character voice, scene slate, narrative tone).
6. 🎨 **Maya**: Lead UI/UX Designer (Zero-overflow layout, progressive disclosure, contrast).
7. 🤖 **Grant**: AI-Forward Novelist (AI feature coverage, model agility, transparent pipelines).
8. 🖋️ **Merryn**: Craft Purist (No-generate mode, analytical boundaries, consistency auditing).
9. 📢 **Marcus**: Marketing Strategist (Promotional slates, public excerpts, showcase copy).
10. 🔍 **Arthur "The Griller" Vance**: Socratic Architect & Stress-Tester ("Grill Me").

### Arthur's Interrogation Protocols
- **The 5-Whys Deep Probe**: Interrogates feature value down to core user utility.
- **Cross-Persona Friction**: Forces personas with competing interests to defend trade-offs (e.g., Grant's AI enthusiasm vs. Merryn's craft purism, Alex's dev complexity vs. Maya's UI simplicity).
- **YAGNI & Complexity Tax**: Rejects over-engineered specs, unnecessary UI buttons, or bloated endpoints.
- **Edge-Case & Failure Auditing**: Forcing failure mode definitions upfront before code is written.

---

## 3. The 6-Stage Pipeline & Gate Approval Contracts

```
Stage 1: Ideation & Initial Grill ──> Stage 2: Design Spec [GATE 1] ──> Stage 3: Implementation Plan [GATE 2]
                                                                                              │
Stage 6: Release Retrospective <── Stage 5: Customer Feedback [GATE 4] <── Stage 4: Execution & QA [GATE 3]
```

### Stage 1: Ideation & Initial Grilling
- **Process**: Identifies affected personas for the requested feature. Arthur interrogates the raw feature concept, asking *"Why build this now? What breaks if we don't?"*
- **Artifact**: `01-ideation-grill.md`
- **Gate**: Auto-advances to Stage 2.

### Stage 2: Design Spec & Gap Remediation Loop [GATE 1]
- **Process**: Synthesizes ideation into a formal design spec (`02-design-spec.md`). Arthur grills the spec line-by-line against Alex, Riley, Maya, Merryn, etc. Gaps are identified, remediation plans are added to the spec, and re-grilled until clean.
- **Artifact**: `02-design-spec.md`
- **Gate Checkpoint (GATE 1)**: Pauses execution. Presents Arthur's Spec Grilling Summary to the user for approval.

### Stage 3: Implementation Plan & Team Validation [GATE 2]
- **Process**: Converts approved spec into a step-by-step TDD/SDD implementation plan (`03-implementation-plan.md`). Arthur grills the dev team (Alex & Riley) on code boundaries, test strategies, and model fallback safety.
- **Artifact**: `03-implementation-plan.md`
- **Gate Checkpoint (GATE 2)**: Pauses execution. Presents Arthur's Plan Grilling Summary to the user for approval.

### Stage 4: Execution & QA Verification Loop [GATE 3]
- **Process**: Executes the implementation plan (edits code, runs build/test scripts, validates UI layout). Riley & QA run boundary, schema, and error-recovery checks. Arthur conducts post-implementation grilling on test logs, code cleanliness, and zero-regression proof (`04-qa-verification.md`).
- **Artifact**: `04-qa-verification.md`
- **Gate Checkpoint (GATE 3)**: Pauses execution. Presents QA results & Arthur's Verification Sign-off to the user for approval.

### Stage 5: Customer Review & Feedback Collection [GATE 4]
- **Process**: Simulates user feedback across target personas evaluating the live working feature (`05-customer-feedback.md`). Captures delights, friction points, and user suggestions.
- **Artifact**: `05-customer-feedback.md`
- **Gate Checkpoint (GATE 4)**: Pauses execution. Asks for final release sign-off.

### Stage 6: Release Retrospective & Next Release Brainstorming
- **Process**: Summarizes high-level architectural decisions and post-mortems into `DECISIONS.md`. Queues feedback ideas into `06-release-retrospective.md` for the next feature release loop.
- **Artifact**: Updated `DECISIONS.md` & `06-release-retrospective.md`.

---

## 4. Gate Approval Report Format

Whenever the workflow hits a Gate Checkpoint (Gates 1, 2, 3, 4), the agent outputs a formatted report:

```markdown
=====================================================
🔥 ARTHUR'S GRILLING REPORT & GATE CHECKPOINT [GATE X/4]
Feature: <Feature Name>
Status: READY FOR USER APPROVAL
=====================================================

### 🔍 Arthur's Key Interrogations & Verdict:
- [Issue 1]: <Description & How it was resolved in the spec/plan/code>
- [Issue 2]: <Description & How it was resolved>

### 👥 Persona Sign-Offs:
- 👔 Ethen (PO): Approved
- 🧪 Riley (QA): Approved
- 🎭 Alex (Dev): Approved
- 🎨 Maya (UI/UX): Approved

### 📄 Artifact Link:
[View Artifact](file:///c:/Users/EthenGreening/.gemini/antigravity/scratch/lore-vault/docs/feature-loops/YYYY-MM-DD-<slug>/XX-artifact.md)

-----------------------------------------------------
👉 Action Required: Reply 'Approved' to proceed to Stage X+1, or specify revisions.
```

---

## 5. Self-Review & Verification

1. **Placeholder Scan**: Verified—no TODOs or TBDs.
2. **Internal Consistency**: Verified—all 6 stages, 4 approval gates, and 10 personas match the agreed architecture.
3. **Scope Check**: Clear, self-contained specification for the custom `/feature-loop` skill.
4. **Ambiguity Check**: Gate checkpoints explicitly state pausing rules and user response triggers.
