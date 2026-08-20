# Stage 1 & Stage 2: Ideation Grill & Design Spec — Aethelgard Sandbox World

**Feature**: 1-Click "Aethelgard" Sandbox Demo World  
**Date**: 2026-08-20  
**Author**: Arthur "The Griller" Vance & Persona Panel  

---

## 1. Persona Ideation & Socratic Grilling

### Persona Feedback:
- 🧪 **Riley Chen (QA)**: "A blank database makes cross-link and relationship testing impossible for new users. A pre-populated sandbox world solves this instantly."
- 👔 **Ethen (PO)**: "New users drop off when faced with a blank screen. Giving them a 1-click starter world lets them experiment risk-free."

### Arthur's Socratic Grill Pass:
> **Question**: How do we prevent demo world data from corrupting or overwriting user content?  
> **Answer**: `POST /api/worlds/seed-demo` uses a dedicated `world_id = 'aethelgard'`. It inserts demo articles, maps, and relationships idempotently (`INSERT OR IGNORE`), with a 1-click `Reset Sandbox` action.

---

## 2. Design Specification

### 2.1 Backend Endpoint `POST /api/worlds/seed-demo`
- Seeds world `aethelgard` ("The Shattered Realm of Aethelgard").
- Seeds 3 articles:
  - *"High King Roderick"* (Character, category: `Characters`)
  - *"The Sunken Citadel"* (Location, category: `Locations`)
  - *"Order of the Dragon"* (Faction, category: `Factions`)
- Seeds 1 map: *"Aethelgard Realm Map"* with 2 pins.
- Seeds 1 relationship: *"High King Roderick"* ➔ Leader ➔ *"Order of the Dragon"*.

### 2.2 Client UI Trigger
- Button inside Welcome Concierge & Header dropdown:
  `🏰 Load Sandbox Demo World ('Aethelgard')` (`window.app.loadDemoWorld()`).
