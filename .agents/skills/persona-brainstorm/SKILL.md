---
name: persona-brainstorm
description: Use when brainstorming features or solving product/lore problems by conducting an individual pitching round across LoreVault's 10 user personas and synthesizing the top 3 launch-ready features with /feature-loop commands.
---

# LoreVault Persona Brainstorm (`/persona-brainstorm`)

## Overview

The **Persona Brainstorm** skill orchestrates a multi-perspective ideation session inside LoreVault. Given a topic, problem statement, or feature area, it prompts LoreVault's 10 user personas to pitch ideas from their distinct domain perspectives, subjects those ideas to Socratic grilling and Product Owner filtering, and outputs the **Top 3 launch-ready feature proposals** formatted with instant `/feature-loop` launch commands.

## Invocation Syntax

- Slash Commands:
  - `/persona-brainstorm "<topic or problem statement>"`
  - `/brainstorm-personas "<topic>"`
- Conversational Invocation:
  - `"Brainstorm features for <topic>"`
  - `"Have the personas pitch ideas for <topic>"`

---

## Participating Persona Roster

Each persona pitches 1 feature proposal grounded in their unique domain background, pain points, and wishlist:

1. 👔 **Ethen** — Product Owner & Project Lead (Balanced feature scope, presets, progressive UI, user value).
2. 🧪 **Riley "Solder" Chen** — QA Lead & Edge-Case Specialist (Boundary conditions, failure modes, zero silent errors, schema compliance).
3. 🎭 **Alex Vance** — Full-Stack Dev & VTT Specialist (API design, serializers, graph traversal, token performance).
4. 🎭 **Morgan "Gifford" Reed** — World Anvil Migrator & Power Worldbuilder (Cross-link resolution, categories, tags, DM secrets/spoilers).
5. 🎭 **Elena Rostova** — Novelist & Fiction Author (Character voice, scene slate, dynamic relationship tensions, narrative style chips).
6. 🎨 **Maya Lin** - Lead UI/UX Designer (Zero-overflow layout, header restructuring, accordion navigation, visual hierarchy).
7. 🤖 **Grant Harlow** — AI-Forward Novelist (AI-everywhere integration, model agility, auto context assembly, competitor feature parity).
8. 🖋️ **Merryn Ashford** — Craft Purist & Author (Strict no-generate mode, analytical consistency auditing, smart tagging, distraction-free UI).
9. 📢 **Marcus "HypeSmith" Sterling** — Marketing Strategist (Promotional slates, Kickstarter updates, public safe excerpts, VTT store copy).
10. 🔍 **Arthur "The Griller" Vance** — Socratic Architect & Stress-Tester (5-Whys probe, YAGNI, complexity tax, edge-case validation).

---

## 4-Phase Execution Workflow

### Phase 1: Individual Persona Pitching Round
For the given topic or problem statement, simulate each of the 10 personas presenting 1 feature concept:
- State the persona name and role.
- Outline their proposed feature title and core value proposition.
- Explain how it directly solves their key pain point.

### Phase 2: Socratic Filtering & PO Prioritization
- **Arthur's Socratic Probe**: Interrogates all 10 pitches against technical debt, YAGNI, edge-case risks, and cross-persona friction (e.g. Grant's AI enthusiasm vs. Merryn's craft boundaries).
- **Ethen's PO Prioritization**: Evaluates business value, roadmap feasibility, and broad user segment appeal to narrow the list.

### Phase 3: Top 3 Feature Selection & Refinement
Synthesize the winning pitches into 3 distinct, high-impact feature specifications:
1. **Feature 1**: Primary Core Workflow / UI/UX Feature (e.g., led by Maya & Ethen).
2. **Feature 2**: AI / Automation / Integration Feature (e.g., led by Grant & Alex).
3. **Feature 3**: QA / Stability / Guardrail Feature (e.g., led by Riley & Merryn).

### Phase 4: Action-Ready Report Generation
Format the output into a clean, actionable report containing feature details, persona sign-offs, and copy-pasteable `/feature-loop` commands.

---

## Output Report Specification

When `/persona-brainstorm` completes, output the final report using this structure:

```markdown
=====================================================
💡 PERSONA BRAINSTORM REPORT: <Topic / Problem Statement>
Participating Panel: 10 LoreVault Personas
Status: Top 3 Features Synthesized
=====================================================

### 🗣️ Persona Pitch Highlights:
- 👔 **Ethen**: Pitching <Idea 1>
- 🧪 **Riley**: Pitching <Idea 2>
- 🎭 **Alex**: Pitching <Idea 3>
- 🎭 **Morgan**: Pitching <Idea 4>
- 🎭 **Elena**: Pitching <Idea 5>
- 🎨 **Maya**: Pitching <Idea 6>
- 🤖 **Grant**: Pitching <Idea 7>
- 🖋️ **Merryn**: Pitching <Idea 8>
- 📢 **Marcus**: Pitching <Idea 9>
- 🔍 **Arthur**: Pitching <Idea 10>

### 🔍 Arthur & Ethen's Selection Rationale:
- **Filtered Out**: [Summary of pitches filtered due to scope/YAGNI]
- **Selected**: 3 features that best balance core UX, AI power, and system stability.

-----------------------------------------------------
### 🏆 TOP 3 FEATURE PROPOSALS

#### 1️⃣ Feature 1: <Feature Title>
- **Champion Personas**: 🎨 Maya (UI/UX) & 👔 Ethen (PO)
- **Problem Solved**: <Description>
- **Key Capabilities**:
  1. <Capability A>
  2. <Capability B>
- **Arthur's Verdict**: Passed Socratic check.
👉 **Launch Feature Loop**:
`/feature-loop "<Feature Title>"`

---

#### 2️⃣ Feature 2: <Feature Title>
- **Champion Personas**: 🤖 Grant (AI-Forward) & 🎭 Alex (Dev)
- **Problem Solved**: <Description>
- **Key Capabilities**:
  1. <Capability A>
  2. <Capability B>
- **Arthur's Verdict**: Passed Socratic check.
👉 **Launch Feature Loop**:
`/feature-loop "<Feature Title>"`

---

#### 3️⃣ Feature 3: <Feature Title>
- **Champion Personas**: 🧪 Riley (QA) & 🖋️ Merryn (Craft Purist)
- **Problem Solved**: <Description>
- **Key Capabilities**:
  1. <Capability A>
  2. <Capability B>
- **Arthur's Verdict**: Passed Socratic check.
👉 **Launch Feature Loop**:
`/feature-loop "<Feature Title>"`

=====================================================
👉 **Next Steps**: Select any feature above and run its `/feature-loop` command to initiate the 6-stage development process!
```
