# Stage 1 & Stage 2: Ideation Grill & Design Spec — Live VTT 2-Way Sync Gateway

**Feature**: Live Foundry VTT & Roll20 2-Way Sync Gateway  
**Date**: 2026-08-20  
**Author**: Arthur "The Griller" Vance & Persona Panel  

---

## 1. Persona Ideation & Socratic Grilling

### Persona Feedback:
- 🎭 **Alex Vance (VTT Dev)**: "DMs shouldn't have to export static JSON files manually mid-session. Live sync broadcasts HP changes and map pin drops instantly."
- 🧪 **Riley Chen (QA Lead)**: "The gateway must support fallback rest polling when web sockets are restricted by browser firewalls."

### Arthur's Socratic Grill Pass:
> **Question**: How do we prevent live sync loops between Foundry and LoreVault?  
> **Answer**: All event payloads carry an `origin_source` tag (`lorevault` vs `foundry_vtt`). Incoming events matching the current local state are deduplicated before mutating SQLite.

---

## 2. Design Specification

### 2.1 Backend Endpoints & Event Gateway
- `GET /api/vtt/status`: Returns gateway readiness (`{ active: true, connected_clients: 1, protocol: 'vtt_sync_v1' }`).
- `POST /api/vtt/sync-event`: Receives/broadcasts real-time events (`statblock_hp_update`, `map_pin_drop`, `secret_note_reveal`).

### 2.2 UI Components
- Navbar status chip `#vtt-status-chip` (`🟢 VTT Gateway: Active`).
- Slide-out drawer `#vtt-gateway-drawer` showing connection status and live event stream.
