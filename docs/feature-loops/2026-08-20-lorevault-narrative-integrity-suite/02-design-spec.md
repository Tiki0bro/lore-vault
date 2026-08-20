# Stage 2: Design Spec & Gap Remediation Loop
**Feature**: LoreVault Narrative & Integrity Suite: AI Lore Doctor, Prose Co-Writer & Secret DM Canon Filter
**Date**: 2026-08-20
**Feature Loop Directory**: `docs/feature-loops/2026-08-20-lorevault-narrative-integrity-suite/`

---

## 🛠️ Technical Design Specification

### 1. AI Lore Doctor & Canon Integrity Auditor (`server.js`)
- **REST Endpoint `GET /api/worlds/:worldId/audit`**:
  - Scans all articles in world:
    - Checks for broken `@Title` links.
    - Checks for orphaned location pins.
    - Checks for missing parent world tags.
  - Returns: `{ success: true, health_score: 95, issues: [ { type: "broken_link", title: "Ancient Vault", message: "Links to non-existent article @[Lost Relic]" } ] }`.

### 2. Weave Matrix Prose Co-Writer & Beat Synthesizer (`server.js` & `public/js/app.js`)
- **REST Endpoint `POST /api/narrative/synthesize-prose`**:
  - Input: `{ plot_hook, scene_steps, cast_ids, tone_chips }`.
  - Generates 2,000-word draft prose connecting scene beats while preserving character voice.

### 3. Secret DM Canon vs Public Player Filter Engine (`server.js` & `public/js/app.js`)
- **Regex Filter Engine**:
  - `function stripSecretBlocks(content, mode)`:
    - If `mode === 'player'`, strips `\[secret\][\s\S]*?\[\/secret\]` completely.
- **Atlas Exporter & Shared Web Gateway**:
  - `GET /view/:shareToken` and standalone HTML atlas exporter apply `stripSecretBlocks()` to all articles.

---

## 🔍 Arthur's Line-by-Line Spec Interrogation

- **Arthur**: *"Riley, pass or fail on secret text stripping security?"*
- **Riley**: *"Pass. Secrets are stripped server-side before sending JSON payloads to public `/view/:shareToken` clients."*
- **Arthur**: *"Elena, how does an author trigger Prose Co-Writing in Weave Matrix?"*
- **Elena**: *"Inside `#slate-panel`, there is a `[✍️ Synthesize Chapter Prose]` button that compiles the active slate into narrative prose!"*

---

**Gate 1 Verdict**: APPROVED BY ARTHUR VANCE & TEAM. Proceeding to Stage 3 (Implementation Plan).
