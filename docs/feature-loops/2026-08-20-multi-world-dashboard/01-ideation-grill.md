# Stage 1 & Stage 2: Ideation Grill & Design Spec — Multi-World Dashboard

**Feature**: Multi-World Project Workspace Switcher & Vault Dashboard  
**Date**: 2026-08-20  
**Author**: Arthur "The Griller" Vance & Persona Panel  

---

## 1. Persona Ideation & Socratic Grilling

### Persona Feedback:
- 👔 **Ethen (PO)**: "A visual dashboard for project management makes LoreVault feel like a professional worldbuilding suite."
- 🎨 **Maya Lin (UI/UX)**: "Project cards should show banner images, theme badges, and key metrics at a glance."

### Arthur's Socratic Grill Pass:
> **Question**: What happens to active state when switching worlds from the dashboard?  
> **Answer**: `switchWorldWorkspace(worldId)` updates `currentWorldId`, reloads articles, maps, and relationships, updates theme data attributes (`data-theme`), and persists the active project in `localStorage`.

---

## 2. Design Specification

### 2.1 Backend Endpoint `GET /api/worlds/dashboard`
- Returns array of world objects enriched with:
  - `article_count`, `map_count`, `statblock_count`, `relationship_count`
  - `theme`, `banner_image`, `tagline`, `last_updated`

### 2.2 UI Component (`#world-dashboard-modal`)
- Visual grid of project cards with 1-click `🌐 Switch Workspace` action.
- Integrated `+ Create World` form and `🏰 Load Aethelgard Demo` shortcut.
