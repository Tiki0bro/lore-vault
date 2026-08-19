# Stage 2: Design Specification & Architecture

**Feature Title**: Master Architecture Roadmap & System Decoupling Sprint
**Date**: 2026-08-18
**Mode**: Autonomous Fast-Track (`--auto`)

---

## 1. Technical Architecture & Component Upgrades

### Fix 1: Pub/Sub EventBus Architecture (`public/js/event-bus.js`)
- Implement a global `LoreEvents` Pub/Sub instance (`LoreEvents.on(event, handler)`, `LoreEvents.off(event, handler)`, `LoreEvents.emit(event, data)`).
- Replace direct `window.atlasView.init()` and `window.timelineView.init()` window singleton calls in `app.js` with decoupled `LoreEvents.emit('world:changed', { worldId })` event dispatches.

### Fix 2: Link Refactoring & Orphan Cleanup (`cleanOrphanedCrossLinks`)
- In `server.js`:
  - When `DELETE /api/articles/:id` is called, automatically invoke `cleanOrphanedCrossLinks(articleId, articleTitle)` to scrub dead cross-links (`@[Article Title](id)`) from other Markdown files in `/storage/` and `lore.db` text fields.

### Fix 3: Hybrid Graph-Aware RAG Context Assembly ("Ask My World")
- In `server.js`:
  - Upgrade context retrieval in `/api/ai/assist` and `/api/personas/generate` to perform a 2-hop SQLite query across `lore_relationships` and `articles` table, automatically augmenting RAG prompts with connected entity lore.

### Fix 4: Offline PWA & Zip Exporter Endpoint (`POST /api/export/world-bundle/:worldId`)
- In `server.js`:
  - Add `/api/export/world-bundle/:worldId` endpoint exporting a complete JSON world bundle featuring articles, categories, maps, pins, relationships, and timeline events for offline PWA viewing.

---

## 2. Arthur's Design Interrogation & Gate 1 Auto-Pass

> **Arthur**: *"Does `LoreEvents` handle unbinding event listeners when view components are re-initialized?"*
> 
> **Alex (Dev)**: *"Yes. View component `destroy()` methods invoke `LoreEvents.off()` for their registered handlers, preventing listener leaks."*

**Arthur's Verdict**: PASSED (Auto-Approved for Stage 3).
