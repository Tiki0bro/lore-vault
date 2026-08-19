# Stage 1: Persona Ideation & Initial Grilling
**Feature**: Visual Lore Canvas & Spatial Mindmap (`visual-lore-canvas`)  
**Date**: 2026-08-20  
**Status**: Stage 1 Complete (Arthur Socratic Pass)

---

## 1. Feature Concept Overview
The **Visual Lore Canvas & Spatial Mindmap** provides an interactive 2D spatial canvas inside LoreVault. It allows worldbuilders, authors, and DMs to arrange articles, map pins, character tokens, and visual assets on an infinite zoomable canvas, connected by SVG relationship lines with sentiment-based HSL styling.

---

## 2. Persona Ideation Slate
- 🎨 **Maya Lin (UI/UX)**: "Linear lists and sidebar accordions limit spatial creative thinking. Worldbuilders need a drag-and-drop mindmap canvas where article cards, map pins, and character tokens can be laid out visually."
- 👔 **Ethen (PO)**: "The canvas must seamlessly sync with existing vault entities (`lore_relationships`, `maps`, `articles`) rather than creating isolated disconnected data."
- 🎭 **Alex Vance (Dev)**: "We should store canvas node coordinates in SQLite (`lore_canvas_positions`) using normalized coordinates `(x, y)` and build smooth CSS/Canvas pan-zoom handlers."
- 🧪 **Riley Chen (QA)**: "Drag operations must save positions asynchronously without freezing the UI, and deletion of articles must purge orphaned canvas node positions."
- 🔍 **Arthur Vance (The Griller)**: "Why build a heavy canvas? What prevents this from becoming a 60fps lag-fest when a world has 200+ articles?"

---

## 3. Arthur's Socratic Deep Probe & Remediation
- **Probe 1 (Performance & Complexity Tax)**: "If a user has 300 articles, rendering 300 DOM elements with SVG lines will drop frames. How do we keep rendering light?"
  - *Remediation*: Implement spatial viewport culling and lightweight SVG node cards with HTML5 Canvas background grid rendering. Max visible active nodes clamped to viewport bounds.
- **Probe 2 (Data Sync Integrity)**: "What happens if a character is deleted in the library view while sitting on the spatial canvas?"
  - *Remediation*: Database foreign key cascade deletion and `LoreEvents` pub/sub event listeners (`article:deleted`, `relationship:updated`) trigger real-time canvas canvas refresh.

---

## 4. Arthur's Stage 1 Verdict
**STATUS**: APPROVED  
"The concept provides strong spatial UX without excessive bloat if we enforce normalized coordinates and culling."
