# Persona Brainstorm Skill Design Specification

- **Date**: 2026-08-20
- **Author**: Antigravity & Ethen (Product Owner)
- **Status**: Approved
- **Target File**: `.agents/skills/persona-brainstorm/SKILL.md`

---

## 1. Overview & Purpose

The **Persona Brainstorm** skill (`/persona-brainstorm`) enables persona-driven product ideation and problem-solving inside LoreVault. Given any topic, feature area, or problem statement, the skill conducts an individual pitching round across all 10 LoreVault user personas, filters the pitches through Socratic interrogation and Product Owner prioritization, and presents the **Top 3 launch-ready features** formatted with direct `/feature-loop` launcher commands.

---

## 2. Triggering & Invocation Syntax

- **Slash Commands**:
  - `/persona-brainstorm "<topic or problem statement>"`
  - `/brainstorm-personas "<topic>"`
- **Natural Language Triggers**:
  - `"Brainstorm features for <topic>"`
  - `"Have the personas pitch ideas for <topic>"`

---

## 3. Persona Roster & Pitching Domains

The skill utilizes LoreVault's 10 user personas (from `docs/USER_PERSONAS.md`):

1. 👔 **Ethen** (Product Owner): Focuses on balanced feature scope, business value, presets, and progressive disclosure UI.
2. 🧪 **Riley "Solder" Chen** (QA Lead): Focuses on boundary testing, failure modes, zero silent errors, and schema stability.
3. 🎭 **Alex Vance** (Dev & VTT Specialist): Focuses on API serializers, prompt formatting (XML/JSON), graph traversal, and token efficiency.
4. 🎭 **Morgan "Gifford" Reed** (World Anvil Migrator): Focuses on cross-links, tags, categories, active context tray, and DM secrets/spoilers.
5. 🎭 **Elena Rostova** (Novelist): Focuses on character voice, scene slates, emotional tension, prose style chips, and narrative tone.
6. 🎨 **Maya Lin** (Lead UI/UX Designer): Focuses on zero-overflow responsive design, header layout, accordion sidebars, and parchment toolbars.
7. 🤖 **Grant Harlow** (AI-Forward Novelist): Focuses on AI-everywhere integration, model agility, auto-assembled context, and competitor feature parity.
8. 🖋️ **Merryn Ashford** (Craft Purist): Focuses on strict no-generate mode, analytical consistency auditing, smart tagging, and distraction-free UI.
9. 📢 **Marcus "HypeSmith" Sterling** (Marketing Strategist): Focuses on promotional slates, Kickstarter updates, public safe excerpts, and VTT store packaging.
10. 🔍 **Arthur "The Griller" Vance** (Socratic Architect): Focuses on 5-Whys interrogation, YAGNI, complexity tax, and edge-case validation.

---

## 4. Execution Workflow

### Phase 1: Individual Persona Pitching Round
- The agent simulates each of the 10 personas submitting 1 pitch tailored to the provided topic/problem statement.
- Each pitch includes:
  - Persona Name & Role
  - Proposed Feature Title
  - Problem Solved & Value Proposition

### Phase 2: Socratic Filtering & PO Prioritization
- **Arthur's Interrogation**: Challenges pitches for scope creep, hidden debt, edge cases, and persona friction.
- **Ethen's Evaluation**: Ranks pitches by overall product impact and feasibility.

### Phase 3: Synthesis of Top 3 Features
- Combine and refine the top ideas into 3 cohesive feature proposals:
  - **Feature 1**: Core Workflow / UI/UX Feature
  - **Feature 4**: AI / Automation Feature
  - **Feature 3**: QA / Stability / Guardrail Feature

### Phase 4: Action-Ready Report
- Render the final report in markdown with `/feature-loop` commands ready to copy-paste or execute.

---

## 5. Output Report Format

```markdown
=====================================================
💡 PERSONA BRAINSTORM REPORT: <Topic / Problem Statement>
Participating Panel: 10 LoreVault Personas
Status: Top 3 Features Synthesized
=====================================================

### 🗣️ Persona Pitch Highlights:
- 👔 **Ethen**: Pitching <Idea 1>
- 🧪 **Riley**: Pitching <Idea 2>
- ... (Recap of pitches)

### 🔍 Arthur & Ethen's Selection Rationale:
- **Filtered Out**: [Pitches filtered due to complexity/scope]
- **Selected**: 3 features balancing core UX, AI capabilities, and system stability.

-----------------------------------------------------
### 🏆 TOP 3 FEATURE PROPOSALS

#### 1️⃣ Feature 1: <Feature Title>
- **Champion Personas**: 🎨 Maya (UI/UX) & 👔 Ethen (PO)
- **Problem Solved**: <Brief description>
- **Key Capabilities**:
  1. <Capability A>
  2. <Capability B>
- **Arthur's Verdict**: Passed Socratic check.
👉 **Launch Feature Loop**:
`/feature-loop "<Feature Title>"`

---

#### 2️⃣ Feature 2: <Feature Title>
...

---

#### 3️⃣ Feature 3: <Feature Title>
...
```
