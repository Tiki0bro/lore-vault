# Stage 2: Design Specification — Templates, Revision History & Theme Studio

## Executive Summary
This document specifies the database schemas, REST endpoints, disk directory structures, UI components, and theme token bindings for LoreVault's **Custom Templates, Revision History & Theme Studio Suite**.

---

## 1. Database & Storage Architecture (`server.js`)

### 1.1 `lore_templates` SQLite Table
```sql
CREATE TABLE IF NOT EXISTS lore_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  icon TEXT DEFAULT '📜',
  fields_json TEXT NOT NULL, -- JSON array of { label, default_val }
  boilerplate_markdown TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 1.2 Revision History Disk Storage Structure
- **Path**: `storage/history/${article_id}/${timestamp}_rev.md`
- **Metadata REST Endpoints**:
  - `GET /api/articles/:id/history` — Returns array of available revision snapshots with timestamp, file size, and preview snippet.
  - `POST /api/articles/:id/rollback` — Accepts `{ timestamp }`, reads revision snapshot from disk, and overwrites `/storage/${id}.md` and SQLite `articles` table with transaction dual-sync rollback.

---

## 2. Frontend UI Components

### 2.1 Custom Template Builder Modal (`#template-builder-modal`)
- **Location**: Triggered via `+ Custom Template` in category filter or tools dropdown.
- **Controls**: Template Name, Category Icon, Sidebar Fields Editor, Boilerplate Content Editor.

### 2.2 Revision History & Diff Modal (`#revision-history-modal`)
- **Location**: Triggered via `📜 Revisions` button in article viewer toolbar.
- **Controls**: Revision Timeline List, Side-by-Side Content Preview Box, `↩ Restore Revision` button.

### 2.3 Parchment & Codex Theme Studio Drawer (`#theme-studio-drawer`)
- **Location**: Triggered via `🎨 Theme Studio` button in tools menu or settings.
- **Controls**:
  - Preset Chips: `[ 📜 Ancient Codex | 🩸 Gothic Grimdark | ⚡ Aetherpunk | 🏛️ Scholar Ivory ]`
  - CSS Token Inputs: Primary Accent, Main Background, Sidebar Surface, Card Surface, Heading Font (`Cinzel`, `Lora`, `Outfit`, `Inter`).
  - Action Buttons: `[ 💾 Save & Apply | ↩ Reset Defaults ]`.
