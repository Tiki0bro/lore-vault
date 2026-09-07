# Stage 6: Release Retrospective & Decision Memory
**Feature**: AI Diplomatic Simulator & Resource Graph (`diplomatic-resource-simulator`)  
**Date**: 2026-08-20  
**Status**: FEATURE RELEASED COMPLETE

---

## 1. Architectural Decisions Summary
- **Simulation Endpoint**: Implemented `POST /api/factions/simulate-turn` with candidate model retries and structured `no_generate_mode` fallback.
- **Supply Graph**: Built `GET /api/factions/resource-graph/:worldId` linking production nodes (mines, harbors) to faction capitals.
