# Design Spec: Faction & Character Relationship Matrix

**Date**: 2026-08-11  
**Status**: Approved  
**Target Version**: LoreVault v2.1  
**Primary User Personas**: Alex Vance (Dev/VTT), Elena Rostova (Author), Grant Harlow (AI Novelist), Morgan Reed (Worldbuilder), Ethen (Product Owner)

---

## 1. Executive Summary & Goals

The **Faction & Character Relationship Matrix** adds a structured, 2D matrix grid and spotlight dossier view to LoreVault. It replaces bloated, tangled "hairball" node graphs with an intuitive, non-clunky matrix layout showing dynamic political, personal, and secret relationships between entities (*Hostile*, *Allied*, *Tense Neutrality*, *Secret Master / Debt*). 

The feature includes 1-click AI relationship extraction using Gemini, an interactive slide-out Relationship Drawer with sentiment sliders and secret toggles, and an AI Story Tension Generator that creates actionable story beats and quest hooks.

---

## 2. Architecture & UX Design

### 2.1 Tab Navigation & Top Controls
* **Primary View Tab**: `⚔️ Relationships` added to main navigation bar in `public/index.html`.
* **Header Toolbar**:
  * **Entity Scope Filter**: `All Entities` | `Factions Only` | `Characters Only`
  * **Status Filter**: `All Types` | `🔴 Hostile` | `🟢 Allied` | `🟡 Tense` | `🟣 Secret/Debt`
  * **Entity Search**: Real-time text search filtering grid rows and columns.
  * **Action Buttons**: `✨ AI Extract Relationships` (Primary CTA) and `+ Add Relationship` (Manual entry modal).

### 2.2 Matrix Grid Layout (`#relationship-grid-container`)
* **Axes**: X-axis (columns) and Y-axis (rows) render active entities sorted alphabetically or by category.
* **Self-Intersecting Cells**: Render as darkened disabled tiles (`—`).
* **Relationship Badges**: Styled HSL status badges with hover states:
  * 🟢 **Allied / Vassal** (`rgba(34, 197, 94, 0.15)`)
  * 🔴 **Hostile / Enemy** (`rgba(239, 68, 68, 0.15)`)
  * 🟡 **Tense / Rival** (`rgba(234, 179, 8, 0.15)`)
  * 🟣 **Secret Master / Debt** (`rgba(168, 85, 247, 0.15)`)
  * ⚪ **Unspecified / Neutral** (`+`)
* **Sticky Scrolling**: Fixed header column and sticky top row for panned scrolling across large worlds.

### 2.3 Slide-Out Relationship Detail Drawer (`#relationship-detail-drawer`)
Clicking any cell opens a glassmorphic right-side drawer:
* **Header**: Displays `Entity A ↔ Entity B` with current status badge.
* **Controls**: Relationship status selector, sentiment score gauge (`-100` to `+100`), and `🔒 DM Secret` toggle.
* **Lore Excerpts & Cross-Links**: Displays supporting excerpts with clickable `@[Article Title](id)` cross-links.
* **AI Action CTA**: `⚡ Spark Story Tension` button generating 3 tailored narrative tension hooks.

---

## 3. Data Schema & REST API Contract

### 3.1 SQLite Database Schema (`lore.db`)

```sql
CREATE TABLE IF NOT EXISTS lore_relationships (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  world_id TEXT NOT NULL,
  source_entity_id TEXT NOT NULL,
  source_entity_title TEXT NOT NULL,
  target_entity_id TEXT NOT NULL,
  target_entity_title TEXT NOT NULL,
  relationship_type TEXT NOT NULL DEFAULT 'neutral', -- 'allied' | 'hostile' | 'tense' | 'secret_master' | 'debtor' | 'neutral'
  sentiment_score INTEGER DEFAULT 0,                 -- Range: -100 (Hostile) to +100 (Devoted)
  summary TEXT,                                      -- Supporting lore excerpt or notes
  is_secret INTEGER DEFAULT 0,                       -- 1 = DM Secret (filtered in player mode), 0 = Public Canon
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (world_id) REFERENCES worlds(id) ON DELETE CASCADE,
  UNIQUE(world_id, source_entity_id, target_entity_id)
);
```

### 3.2 REST API Endpoints (`server.js`)

1. `GET /api/worlds/:worldId/relationships`
   * Query params: `?mode=player` (filters `is_secret = 0`), `?category=factions|characters`.
   * Returns array of relationship records.
2. `POST /api/relationships`
   * Body: `{ world_id, source_entity_id, source_entity_title, target_entity_id, target_entity_title, relationship_type, sentiment_score, summary, is_secret }`.
   * Inserts or updates relationship.
3. `DELETE /api/relationships/:id`
   * Deletes a relationship record.
4. `POST /api/relationships/auto-extract`
   * Body: `{ world_id }`.
   * Runs Gemini relationship extraction over top articles and saves discovered relationships.
5. `POST /api/relationships/spark-conflict`
   * Body: `{ world_id, source_entity_title, target_entity_title }`.
   * Runs Gemini prompt generating 3 story beats/conflict hooks.

---

## 4. AI Prompt Engineering & Models

### 4.1 Relationship Extraction Prompt
* Gathers up to 30 vault articles for active world.
* Queries Gemini using model retry loop (`gemini-flash-latest`, `gemini-2.0-flash`, `gemini-3.1-pro-preview`, `gemini-pro-latest`).
* Requires strict JSON array output matching schema.

### 4.2 Story Tension Generator Prompt
* Analyzes lore for `source_entity_title` and `target_entity_title`.
* Outputs 3 structured story hooks (Inciting Incident, Hidden Dilemma, Escalation).

---

## 5. Verification & Testing Strategy
1. **Automated API Tests**: Validate endpoints, unique constraints, player secret filtering (`?mode=player`), and deletion cascades.
2. **UI & Layout Verification**: Verify sticky table headers, badge rendering, drawer slide animation, and light/dark theme inheritance.
3. **AI Fallback & Edge Cases**: Verify model candidate retries, handling worlds with 0 articles, and special character sanitization in entity names.
