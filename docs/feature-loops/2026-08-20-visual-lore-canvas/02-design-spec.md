# Stage 2: Design Specification & Gap Remediation
**Feature**: Visual Lore Canvas & Spatial Mindmap (`visual-lore-canvas`)  
**Date**: 2026-08-20  
**Status**: Gate 1 Passed (Arthur Socratic Pass - Auto Mode)

---

## 1. Functional Architecture & DB Schema

### SQLite Table: `lore_canvas_positions`
```sql
CREATE TABLE IF NOT EXISTS lore_canvas_positions (
  id TEXT PRIMARY KEY,
  world_id TEXT NOT NULL,
  entity_type TEXT NOT NULL, -- 'article', 'map_pin', 'character', 'custom'
  entity_id TEXT NOT NULL,
  pos_x REAL NOT NULL DEFAULT 0.5,
  pos_y REAL NOT NULL DEFAULT 0.5,
  pinned INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (world_id) REFERENCES worlds(id) ON DELETE CASCADE
);
```

---

## 2. API Specifications

### `GET /api/worlds/:worldId/canvas-nodes`
- **Response**:
```json
{
  "nodes": [
    {
      "id": "node_1",
      "entity_type": "article",
      "entity_id": "art_123",
      "title": "High Citadel of Aethelgard",
      "category": "Locations",
      "pos_x": 0.42,
      "pos_y": 0.35,
      "is_secret": 0
    }
  ],
  "edges": [
    {
      "id": "rel_1",
      "source_id": "art_123",
      "target_id": "art_456",
      "relationship_type": "Allied",
      "sentiment": "positive"
    }
  ]
}
```

### `POST /api/canvas/positions`
- **Payload**:
```json
{
  "world_id": "w_1",
  "positions": [
    { "entity_type": "article", "entity_id": "art_123", "pos_x": 0.55, "pos_y": 0.40 }
  ]
}
```

### `POST /api/canvas/auto-layout`
- **Payload**: `{ "world_id": "w_1", "algorithm": "force_directed" }`
- **Behavior**: Calculates force-directed layout coordinates for all vault entities and updates `lore_canvas_positions`.

---

## 3. UI/UX Wireframe & Components
- **View Container**: `#view-canvas` panel in `index.html`.
- **Canvas Toolbar**: `.canvas-toolbar` with pan/drag controls, layout preset selector, zoom buttons, and `Auto-Arrange Nodes` trigger.
- **Node Renderer**: Canvas/SVG interactive surface with drag-and-drop card elements and SVG edge curves.

---

## 4. Arthur's Gate 1 Socratic Review
- **Interrogation**: "What if `lore_canvas_positions` contains entries for entities that were deleted directly from disk or via SQL?"
- **Remediation**: `GET /api/worlds/:worldId/canvas-nodes` runs an inner join or soft cleanup on orphan node positions prior to payload serialization.
- **Verdict**: APPROVED FOR IMPLEMENTATION.
