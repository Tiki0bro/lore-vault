# Feature Loop Stage 3: Implementation Plan
**Feature**: Interactive World Atlas v2 (Nested Sub-Maps, Scale Ruler, Pin Search & Expedition Paths)
**Date**: 2026-08-11
**Status**: Stage 3 Implementation Plan Written (Pending Gate 2 Approval)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build multi-tier nested sub-map drill-down navigation, scale ruler calibration, distance measuring tools, pin search/filtering, and expedition route drawing for LoreVault's World Atlas.

**Architecture:** Extend `server.js` with SQLite schema migrations and REST routes. Update `public/js/atlas-view.js` and `public/css/styles.css` with Leaflet event listeners, glassmorphic breadcrumb navigation, ruler overlay, pin filtering, and route drawing.

**Tech Stack:** Node.js, Express, SQLite (`better-sqlite3`), Leaflet.js, Vanilla CSS.

## Global Constraints

- Preserve all v1 cartography features (Territory Polygons, Custom Layers, Contested Zones, AI Vision Auto-Borders).
- Store scale calibration as `scale_pixels` / `scale_distance` relative to map width for screen-scaling safety.
- Maintain DM Canon vs Public Player mode secret filtering across sub-maps and expedition routes.

---

### Task 1: Database Schema Migrations & REST API Endpoints

**Files:**
- Modify: `server.js`
- Test: `scratch/test-atlas-v2-backend.js`

- [ ] **Step 1: Write failing verification test `scratch/test-atlas-v2-backend.js`**
- [ ] **Step 2: Add SQLite schema migrations (`parent_map_id`, `scale_pixels`, `scale_distance`, `scale_unit`, `target_sub_map_id`, `map_routes` table) in `server.js`**
- [ ] **Step 3: Implement REST routes (`GET /api/maps/:mapId/tree`, `PUT /api/maps/:mapId/scale`, `GET/POST/DELETE /api/maps/:mapId/routes`)**
- [ ] **Step 4: Run test to verify clean pass**
- [ ] **Step 5: Commit changes (`feat(backend): add atlas v2 db schema migrations and REST API endpoints`)**

---

### Task 2: Sub-Map Hierarchy Drill-Down & Breadcrumb Navigation Bar

**Files:**
- Modify: `public/js/atlas-view.js`
- Modify: `public/css/styles.css`
- Test: `scratch/test-task-2-breadcrumbs.js`

- [ ] **Step 1: Add `#atlas-breadcrumbs` floating glassmorphic header pill in `atlas-view.js` layout**
- [ ] **Step 2: Connect pin `target_sub_map_id` to switch maps and push to navigation stack**
- [ ] **Step 3: Add breadcrumb click listener to pop navigation stack and return to parent maps**
- [ ] **Step 4: Verify cyclic hierarchy detection & breadcrumb navigation in test script**
- [ ] **Step 5: Commit changes (`feat(ui): add sub-map drill-down and breadcrumb navigation`)**

---

### Task 3: Distance Scale Ruler & Travel Time Calculator

**Files:**
- Modify: `public/js/atlas-view.js`
- Modify: `public/css/styles.css`
- Test: `scratch/test-task-3-ruler.js`

- [ ] **Step 1: Add scale calibration modal `#atlas-scale-modal` and toolbar button**
- [ ] **Step 2: Implement interactive click-and-drag measuring tape tool (`#atlas-ruler-tool`)**
- [ ] **Step 3: Render real-time distance and travel time calculation pill (`on foot`, `horseback`, `sailing`)**
- [ ] **Step 4: Verify distance scaling accuracy across zoom levels**
- [ ] **Step 5: Commit changes (`feat(atlas): add scale ruler calibration and travel time calculator`)**

---

### Task 4: Pin Search Input & Category Filter Chips

**Files:**
- Modify: `public/js/atlas-view.js`
- Modify: `public/css/styles.css`
- Test: `scratch/test-task-4-pin-filter.js`

- [ ] **Step 1: Add `#atlas-pin-search` search bar and category filter chips to toolbar**
- [ ] **Step 2: Implement real-time label/article matching, pin highlighting, and auto-zoom**
- [ ] **Step 3: Test filtering pins by category chips (*Settlements*, *Dungeons*, *Fortresses*, *Quests*)**
- [ ] **Step 4: Commit changes (`feat(atlas): add pin search bar and category filter chips`)**

---

### Task 5: Expedition Route Drawing & Offline Standalone Exporter Update

**Files:**
- Modify: `server.js`
- Modify: `public/js/atlas-view.js`
- Test: `scratch/test-task-5-routes-export.js`

- [ ] **Step 1: Add polyline route drawing mode (`map_routes`) with calculated distance totals**
- [ ] **Step 2: Update `POST /api/export/atlas/:worldId` to include routes, scale calibration, and sub-map hierarchy tree in offline bundle**
- [ ] **Step 3: Execute full E2E verification test suite**
- [ ] **Step 4: Commit changes (`feat(atlas): add expedition route drawing and standalone HTML export support`)**
