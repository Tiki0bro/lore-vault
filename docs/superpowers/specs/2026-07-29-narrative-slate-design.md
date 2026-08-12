# Narrative Slate (Scene & Session Workspace) Design Specification

**Date**: 2026-07-29  
**Status**: Approved  
**Author**: Antigravity & LoreVault Core Team  
**Target Feature**: Option B — Narrative Slate (Scene & Session Workspace)  
**Target Personas**: Elena Rostova (Novelist & Fiction Author), Morgan Reed (WorldAnvil & TTRPG GM), Ethen (Product Owner), Maya Lin (UI/UX Architect)

---

## 1. Executive Summary & Objectives

The **Narrative Slate** is a dedicated creative workspace in LoreVault designed for fiction authors and Game Masters. It bridges world knowledge (Lore Codex) and prompt engineering (The Weave Matrix) into a streamlined prose drafting environment.

### Core Goals:
1. **Layered Context Buckets**: Separate prompt context into System/Tone, Active Scene Cast, Plot Hooks & Scene Action Steps, and Pinned Lore.
2. **Dynamic Persona & Character Flaw Injection**: Automatically inject internal character traits (`wants`, `needs`, `thoughts`, `history_log`) from SQLite persona profiles when adding characters to the Active Cast.
3. **Plot Hooks & Scene Action Steps**: Allow authors/GMs to define an inciting plot hook and step-by-step action milestones to keep AI generation on-track without hallucinated plot tangents.
4. **Prose Co-Writer & POV Tools**: One-click actions for `⚡ Continue Prose`, `🎭 POV Rewrite` (rewrite passage from character perspective), and `💡 Suggest Next Steps` (3 dramatic choices).
5. **Slate Persistence**: Save and reload named scene snapshots (e.g. *"Chapter 14: The Heist Slate"*) in SQLite.

---

## 2. Data Model & Storage Schema (`lore.db`)

### 2.1 SQLite Table Schema: `slates`
```sql
CREATE TABLE IF NOT EXISTS slates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  world_id TEXT DEFAULT 'all',
  plot_hook TEXT,
  scene_steps TEXT,        -- JSON array of action step strings
  cast_ids TEXT,           -- JSON array of article IDs (characters)
  pinned_lore_ids TEXT,    -- JSON array of pinned lore article IDs
  tone_chips TEXT,         -- JSON array of selected tone strings
  visibility TEXT DEFAULT 'public',
  format TEXT DEFAULT 'markdown',
  max_tokens INTEGER DEFAULT 4000,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 2.2 Persona Profile Integration
When character articles are added to `cast_ids`, the backend queries `SELECT * FROM personas WHERE article_id IN (...)` and embeds character internal states:
```markdown
### Active Cast Internal Drivers:
- **Elena Vance**:
  - Wants: Uncover the Imperial traitor in House Ravenwing.
  - Needs: Learn to trust allies before she is isolated.
  - Internal Flaws / Tensions: Highly suspicious, prone to reckless solo actions.
```

---

## 3. Backend API Endpoints (`server.js`)

### 3.1 `POST /api/narrative/compile-slate`
Assembles context into a unified prompt:
```json
{
  "plot_hook": "Elena intercepts an Imperial courier carrying a sealed parchment.",
  "scene_steps": ["Elena confronts courier", "Courier reveals midnight ambush", "Shadowy figure on balcony"],
  "cast_ids": ["elena-vance", "smuggler-kael"],
  "pinned_lore_ids": ["house-ravenwing"],
  "tone_chips": ["Gritty & Noir"],
  "visibility": "public",
  "max_tokens": 4000
}
```

### 3.2 `POST /api/narrative/continue-prose`
Generates 2-3 continuation paragraphs based on compiled slate context and current draft prose.

### 3.3 `POST /api/narrative/pov-rewrite`
Rewrites highlighted text from a specified character's POV:
```json
{
  "highlighted_text": "The guard stepped closer, holding his torch high.",
  "pov_character_id": "smuggler-kael"
}
```

### 3.4 `POST /api/narrative/suggest-beats`
Generates 3 dramatic scene direction choices as a JSON array:
```json
[
  "The courier attempts to swallow a secret cipher before Elena can grab it.",
  "An Imperial patrol horn sounds in the distance, cutting off negotiations.",
  "Smuggler Kael steps out of the shadows, aiming a loaded crossbow at the courier."
]
```

### 3.5 `POST /api/narrative/save-slate` & `GET /api/narrative/slates`
Saves and retrieves named slate snapshots to SQLite.

---

## 4. Frontend UI Layout (`#narrative-slate-view`)

### 4.1 Navigation Integration
* Primary header view button `📜 Narrative Slate` toggles `#narrative-slate-view`.

### 4.2 Workspace Layout (Split Pane)
* **Left Pane (Prose Editor)**:
  * Full-height prose editor with real-time `[[WikiLink]]` auto-complete popover when typing `[[`.
  * Toolbar: `⚡ Continue Prose`, `🎭 POV Rewrite`, `💡 Suggest Next Steps`, `💾 Save Slate`.
* **Right Pane (Slate Drawer)**:
  * **🪝 Plot Hooks & Scene Outline**: Primary plot hook text field + list of Scene Action Steps.
  * **🎭 Active Scene Cast**: Multi-select dropdown + cards showing character Wants/Needs/Flaws.
  * **🎨 Tone & Style Chips**: Chips for *Gritty & Noir*, *Fast-Paced Action*, *Whimsical*, *Deep Monologue*, *High-Stakes Thriller*.
  * **📚 Pinned World Lore**: List of pinned lore articles.
  * **💾 Saved Slates**: Snapshot manager dropdown.

---

## 5. Verification & Test Suite (`scratch/test-narrative-slate.js`)

1. Verify `slates` table migration creates database schema cleanly.
2. Test `POST /api/narrative/compile-slate` embeds persona profiles (`wants`/`needs`) and plot hooks.
3. Test `POST /api/narrative/pov-rewrite` and `POST /api/narrative/suggest-beats` with Gemini API candidate fallback.
4. Test `POST /api/narrative/save-slate` and `GET /api/narrative/slates` persistence.
