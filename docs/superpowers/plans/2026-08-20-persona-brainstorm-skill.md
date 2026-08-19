# Persona Brainstorm Skill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create the `.agents/skills/persona-brainstorm/SKILL.md` skill file to enable 10-persona brainstorming sessions with top 3 launch-ready features and `/feature-loop` integrations.

**Architecture:** Define a self-contained markdown skill file under `.agents/skills/persona-brainstorm/SKILL.md` with standard frontmatter, persona roster mappings, a 4-phase execution workflow (Pitching -> Filtering -> Top 3 -> Launch Commands), and an automated verification script to validate structural compliance.

**Tech Stack:** Markdown (Skill Specification), Node.js (Validation Harness)

## Global Constraints

- Skill path: `.agents/skills/persona-brainstorm/SKILL.md`
- YAML frontmatter: `name: persona-brainstorm`, description must start with "Use when..."
- Personas included: 10 LoreVault personas (Ethen, Riley, Alex, Morgan, Elena, Maya, Grant, Merryn, Marcus, Arthur)
- Output layout: 4 phases, top 3 features with `/feature-loop` launch commands.

---

### Task 1: Create Persona Brainstorm Skill File (`.agents/skills/persona-brainstorm/SKILL.md`)

**Files:**
- Create: `.agents/skills/persona-brainstorm/SKILL.md`

**Interfaces:**
- Consumes: `docs/USER_PERSONAS.md`, `docs/superpowers/specs/2026-08-20-persona-brainstorm-skill-design.md`
- Produces: Executable skill file `.agents/skills/persona-brainstorm/SKILL.md` for AGY agent harnesses.

- [ ] **Step 1: Write the skill file content**

Write complete skill document to `.agents/skills/persona-brainstorm/SKILL.md`.

- [ ] **Step 2: Verify file exists and is well-formed**

Check file contents using `view_file`.

- [ ] **Step 3: Commit**

```bash
git add .agents/skills/persona-brainstorm/SKILL.md
git commit -m "feat: add persona-brainstorm skill"
```

---

### Task 2: Create Verification Test Harness (`scratch/test-persona-brainstorm-skill.js`)

**Files:**
- Create: `scratch/test-persona-brainstorm-skill.js`

**Interfaces:**
- Consumes: `.agents/skills/persona-brainstorm/SKILL.md`
- Produces: Verification result passing all assertions (YAML frontmatter, 10 personas present, phase headers, `/feature-loop` format).

- [ ] **Step 1: Write failing verification test script**

Create `scratch/test-persona-brainstorm-skill.js` checking that:
1. `.agents/skills/persona-brainstorm/SKILL.md` exists.
2. Frontmatter contains `name: persona-brainstorm` and `description`.
3. All 10 user personas (Ethen, Riley, Alex, Morgan, Elena, Maya, Grant, Merryn, Marcus, Arthur) are listed.
4. Slash commands `/persona-brainstorm` and `/feature-loop` are documented.
5. Output format contains Phase 1, Phase 2, Phase 3, Phase 4.

- [ ] **Step 2: Run verification script**

Run: `node scratch/test-persona-brainstorm-skill.js`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add scratch/test-persona-brainstorm-skill.js
git commit -m "test: add verification script for persona-brainstorm skill"
```
