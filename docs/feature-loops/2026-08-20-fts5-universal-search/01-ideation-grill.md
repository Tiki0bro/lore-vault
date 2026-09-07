# Stage 1: Persona Ideation & Initial Grilling — SQLite FTS5 Universal Search Engine

## Feature Overview
- **Feature Name**: SQLite FTS5 Universal Search Engine & Tag Filtering
- **Target Release Date**: 2026-08-20
- **Lead Champion Personas**: 🎭 Morgan Reed (World Anvil Migrator), 🖋️ Merryn Ashford (Craft Purist), 🎨 Maya Lin (UI/UX)
- **Primary Goal**: Implement SQLite FTS5 (Full-Text Search) virtual table indexing across article titles, categories, summaries, body text, DM secrets, and tags to provide sub-millisecond keyword search and category/tag faceted filtering in `Ctrl+K` Universal Search.

---

## Technical Specifications & Features

1. **SQLite FTS5 Virtual Table (`articles_fts`)**:
   - `CREATE VIRTUAL TABLE IF NOT EXISTS articles_fts USING fts5(id UNINDEXED, title, category, summary, content, tags)`
   - Triggers: Automatically sync `articles_fts` on `INSERT`, `UPDATE`, and `DELETE` on the `articles` table.

2. **REST API Endpoint (`GET /api/search/fts`)**:
   - Accepts `q` (query), `category`, `tag`, `world_id`, `mode` (`dm` or `player`).
   - Executes `SELECT id, title, category, summary, snippet(articles_fts, 3, '<mark>', '</mark>', '...', 15) as highlight FROM articles_fts WHERE articles_fts MATCH ?`.

3. **`Ctrl+K` Universal Search UI Facets**:
   - Category filter pills (*All*, *Characters*, *Locations*, *Factions*, *Items*, *Lore*).
   - Instant highlight snippet rendering of search term matches.

---

## 🔍 Arthur "The Griller" Vance's Socratic Interrogation

1. **Arthur**: *"How will existing articles be indexed into FTS5 when the database starts up?"*
   - **Morgan & Alex**: *"We add an `INSERT OR REPLACE INTO articles_fts (id, title, category, summary, content, tags) SELECT id, title, category, summary, content, tags FROM articles` query during `initDatabase()` so all pre-existing lore is indexed instantly."*
2. **Arthur**: *"Will player mode hide DM secret blocks inside search result snippets?"*
   - **Merryn & Riley**: *"Yes! In player mode (`mode=player`), secret blocks (`[secret]` and `[dm]`) are stripped from content before snippets are generated."*
3. **Arthur**: *"What if the user types special FTS5 operators like OR, AND, or quotes?"*
   - **Riley**: *"We sanitize the query string to prevent FTS5 syntax errors, escaping special characters while preserving natural multi-word searches."*

---

## 👥 Persona Sign-Offs
- 🎭 **Morgan (Worldbuilder)**: Approved (Instant search across 100+ articles).
- 🖋️ **Merryn (Craft Purist)**: Approved (DM secret filtering preserved).
- 🔍 **Arthur (Architect)**: Approved (Sub-millisecond FTS5 index performance).
