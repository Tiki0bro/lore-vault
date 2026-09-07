# Stage 2: Design Specification & Gap Remediation
**Feature**: AI Diplomatic Simulator & Resource Graph (`diplomatic-resource-simulator`)  
**Date**: 2026-08-20  
**Status**: Gate 1 Passed (Arthur Socratic Pass - Auto Mode)

---

## 1. REST Specifications

### `POST /api/factions/simulate-turn`
- **Payload**: `{ "world_id": "default", "turn_months": 3 }`
- **Response**: `{ "summary": "Quarterly War Report...", "events": [...], "resource_blockades": [...] }`

### `GET /api/factions/resource-graph/:worldId`
- **Response**: `{ "nodes": [...], "routes": [...] }`
