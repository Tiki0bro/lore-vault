# Stage 2: Design Specification & Gap Remediation
**Feature**: Interactive Faction War Dashboard (`faction-war-dashboard`)  
**Date**: 2026-08-20  
**Status**: Gate 1 Passed (Arthur Socratic Pass - Auto Mode)

---

## 1. DB Schema & REST Specifications

### SQLite Table: `lore_factions`
```sql
CREATE TABLE IF NOT EXISTS lore_factions (
  id TEXT PRIMARY KEY,
  world_id TEXT NOT NULL,
  article_id TEXT,
  name TEXT NOT NULL,
  leader_name TEXT,
  power_metric INTEGER DEFAULT 50,
  military_strength INTEGER DEFAULT 50,
  wealth_level INTEGER DEFAULT 50,
  controlled_territory_pct REAL DEFAULT 10.0,
  is_secret INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (world_id) REFERENCES worlds(id) ON DELETE CASCADE
);
```

### Endpoints:
- `GET /api/worlds/:worldId/factions`: Returns array of factions with calculated relationship counts and territory metrics. Respects `?mode=player`.
- `POST /api/factions`: Creates or updates a faction record.
- `DELETE /api/factions/:id`: Cascades deletion of faction assets.

---

## 2. Arthur's Gate 1 Review
- **Verdict**: APPROVED FOR IMPLEMENTATION.
