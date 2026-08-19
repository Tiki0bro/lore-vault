# 06 - Release Retrospective & Decision Log

## Feature Title: TTRPG Stat Block Engine (D&D 5e & Pathfinder 2e)
**Date**: 2026-08-20  
**Feature Loop Directory**: `docs/feature-loops/2026-08-20-ttrpg-statblocks/`

---

## 🚀 Accomplishments & What Went Well
1. **Hybrid Relational Architecture**: Stored stat blocks in `lore_statblocks` SQLite table linked to articles via foreign keys with `ON DELETE CASCADE`, keeping Markdown narrative text clean while allowing relational indexing by system (`dnd5e`/`pf2e`), type (`character`/`weapon`/`lore_card`), and CR.
2. **Authentic System Styling**: Designed authentic D&D 5e red/gold parchment stat cards, Pathfinder 2e purple action icon stat cards, weapon equipment cards, and lore/spell cards in CSS.
3. **Resilient AI Conversion Endpoint**: `POST /api/statblocks/convert-ai` leverages `callGeminiApiWithFallback` and `safeExtractJSON` with automatic model candidate retries and default fallback JSON for zero silent crashes.
4. **DM Secret Filtering**: `GET /api/articles/:id/statblock?mode=player` strictly filters out `is_secret = 1` rows to protect GM encounter secrets in player mode.

---

## 🛠️ Key Architectural Decisions Logged to DECISIONS.md
* Added `lore_statblocks` table (`id`, `article_id`, `system`, `type`, `name`, `stats_json`, `is_secret`, `created_at`, `updated_at`) and REST endpoints (`GET/POST/DELETE /api/articles/:articleId/statblock`, `POST /api/statblocks/convert-ai`).
* Added `#statblock-drawer` slide-out parchment drawer in `public/index.html` with D&D 5e, Pathfinder 2e, Weapon, and Lore Card renderers, `Ctrl + Shift + S` shortcut, and active dot indicator badge.
