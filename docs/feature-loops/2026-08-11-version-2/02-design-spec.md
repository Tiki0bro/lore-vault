# 02. Design Specification: LoreVault Version 2

**Feature Title**: LoreVault Version 2 (Multi-World Manager & Timeline Chronology Suite)  
**Status**: Stage 2 Complete (Arthur Socratic Pass)  
**Target Path**: `docs/feature-loops/2026-08-11-version-2/02-design-spec.md`

---

## 1. Scope & Components

### Component 1: Timeline Chronology Engine (`timeline_events` Table)
- **SQLite Table**:
  ```sql
  CREATE TABLE IF NOT EXISTS timeline_events (
    id TEXT PRIMARY KEY,
    world_id TEXT NOT NULL,
    article_id TEXT,
    title TEXT NOT NULL,
    epoch_name TEXT DEFAULT 'Common Era',
    display_year TEXT NOT NULL,
    sort_order REAL NOT NULL,
    summary TEXT,
    is_secret INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (world_id) REFERENCES worlds(id) ON DELETE CASCADE,
    FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE SET NULL
  );
  ```
- **REST API Endpoints**:
  - `GET /api/worlds/:worldId/timeline`: Fetch timeline events ordered by `sort_order ASC`.
  - `POST /api/timeline-events`: Create new timeline event.
  - `DELETE /api/timeline-events/:id`: Delete timeline event.

### Component 2: Multi-World Vault Manager (`worlds` API Upgrade)
- REST API Endpoints:
  - `GET /api/worlds`: Fetch all available worlds.
  - `POST /api/worlds`: Create new world record.
  - `DELETE /api/worlds/:id`: Delete world and cascade all associated articles, maps, and timeline events (`ON DELETE CASCADE`).

### Component 3: Timeline View Component (`public/js/timeline-view.js`)
- Renders an interactive vertical chronology timeline with epoch filters, event cards, article links, and `+ Add Event` modal.

---

## 2. Arthur's Stage 2 Spec Grilling & Remediation

- **Probe 1**: "What happens when a user deletes a world?"
  - *Remediation*: SQLite `FOREIGN KEY ON DELETE CASCADE` purges associated articles, maps, map pins, and timeline events atomically.
- **Probe 2**: "How does Player Mode handle timeline events with private DM secrets?"
  - *Remediation*: When `req.query.mode === 'player'`, `GET /api/worlds/:worldId/timeline` adds `AND is_secret = 0` and runs `sanitizeSecretContent(summary)`.

---

## 3. Approval Status
**Gate 1 Auto-Approved (Fast-Track Mode)**. Proceeding to Stage 3.
