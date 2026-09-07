# Stage 2: Design Spec & Gap Remediation Loop [GATE 1]

**Feature Suite**: Writer's Journey & Experience Master Suite (5 Core Pillars)
**Date**: 2026-08-21
**Mode**: Autonomous Fast-Track Feature Loop (`--auto`)

---

## 🏛️ Comprehensive Architecture & Design Specification

### 1. The Manuscript Binder & Chapter Pipeline
- **Database Table**: `manuscript_chapters`
  - `id` (TEXT PRIMARY KEY), `world_id` (TEXT), `act_number` (INTEGER), `chapter_number` (INTEGER), `title` (TEXT), `summary` (TEXT), `pov_character_id` (TEXT), `location_id` (TEXT), `target_word_count` (INTEGER), `current_word_count` (INTEGER), `status` (TEXT), `sort_order` (REAL), `content` (TEXT), `created_at`, `updated_at`.
- **REST Endpoints**:
  - `GET /api/manuscripts/:worldId` - Fetch all chapters, grouped by Act with total word counts, target progress, and character/location cross-references.
  - `POST /api/manuscripts/chapters` - Create or update chapter metadata and prose content.
  - `DELETE /api/manuscripts/chapters/:id` - Delete a chapter cleanly with cascade integrity.
  - `POST /api/manuscripts/reorder` - Reorder chapter sequences in batch.
  - `POST /api/manuscripts/export` - Export compiled manuscript with standard Markdown dividers (`# Act X`, `## Chapter Y`, `***`).

### 2. Dynamic Margin Inspector & Hover Lore Codex
- **REST Endpoints**:
  - `GET /api/lore/inspector-entity` - Query entity by `article_id` or `title`/`query` to return instant JSON snapshot: title, category, summary, tags, statblock summary, and linked relationships.
  - `POST /api/lore/unlinked-mentions` - Scan text body against active world entity titles to suggest 1-click `@[Entity]` cross-links.
- **UI Component**:
  - `#lore-margin-inspector` floating glassmorphic card on hover or `Ctrl + Click` in editor/reader.

### 3. Distraction-Free "Zen Studio" & Typewriter Focus Mode
- **Database Table**: `manuscript_autosave_buffers`
  - `id` (TEXT PRIMARY KEY), `target_id` (TEXT), `target_type` (TEXT), `content` (TEXT), `word_count` (INTEGER), `wpm` (REAL), `cursor_pos` (INTEGER), `updated_at`.
- **REST Endpoints**:
  - `POST /api/manuscripts/autosave-buffer` - Delta autosave buffering for continuous crash recovery.
  - `GET /api/manuscripts/autosave-buffer/:targetType/:targetId` - Fetch last autosaved draft snapshot.
- **UI Component**:
  - Fullscreen `#zen-studio-modal` with centered active line focus, paragraph spotlighting, 15/30/60m sprint timer, ambient background audio options, and live WPM speedometer.

### 4. Analytical Prose Health & Stylistic Pacing Telemetry
- **REST Endpoint**:
  - `POST /api/prose/analyze-telemetry`
  - **Inputs**: `{ text: string }`
  - **Outputs**:
    - `sentence_metrics`: Array of sentence lengths, average length, variance, standard deviation, rhythm sparkline points.
    - `sensory_density`: Counts and frequencies of visual, auditory, olfactory, tactile, and gustatory words.
    - `dialogue_ratio`: Percentage of dialogue vs narration/exposition.
    - `stylistic_friction`: Adverb count (`-ly`), passive voice indicators, repeated word stems, readability score (Flesch-Kincaid & Reading Ease).
    - **No-Generate Purity**: 100% deterministic algorithms with zero AI hallucination risk or token cost.

### 5. Socratic Causality Auditor & Character Voice Mirror
- **REST Endpoints**:
  - `POST /api/prose/socratic-audit` - Runs Arthur's 5-Whys interrogator on scene prose/outline, identifying stakes, causality gaps, cost of failure, and unresolved tensions.
  - `POST /api/prose/voice-mirror` - Evaluates extracted character dialogue against character persona and speech traits, returning consistency scores and out-of-character flags.

---

## 🔍 Arthur's Gate 1 Socratic Interrogation
1. *Probe*: "How does the Zen Studio avoid UI lag with real-time telemetry and autosave buffering?"
   - *Resolution*: Autosave uses a 1.5s debounce; prose telemetry is evaluated via pure synchronous regex parsers without blocking the main event loop.
2. *Probe*: "Are DM secrets protected in Manuscript Exports?"
   - *Resolution*: `POST /api/manuscripts/export` supports `?mode=player` to strip `[secret]` blocks using `stripSecretBlocks`.

**Gate 1 Verdict**: PASSED & AUTO-APPROVED. Proceeding to Stage 3 (Implementation Plan).
