# Spec: LoreVault Navbar Header Architecture & Overlap Prevention Fix

**Date**: 2026-07-29  
**Status**: Approved  
**Lead Designer Persona**: Maya Lin (Lead UI/UX Architect)  
**Aligned Stakeholders**: Ethen (PO), Riley (QA), Alex (VTT Dev), Morgan (Worldbuilder), Elena (Author)  

---

## 1. Executive Summary

This spec resolves header collision and overlap between the Search Bar and the Nav Tabs (`Lore Codex`, `Narrative Slate`, `Weave Matrix`) by re-architecting the top navbar into 3 strictly isolated flex zones with responsive space reclamation.

---

## 2. Key Objectives & Architectural Fixes

1. **Reclaim 220px Space (Hide Brand Subtitle on `< 1400px`)**:
   - Hide `.brand-text .subtext` on screens under 1400px using CSS `@media (max-width: 1400px) { .brand-text .subtext { display: none; } }`.

2. **Compact Search Bar (`200px` default, `250px` focus)**:
   - Restructure `.search-bar-container`:
     - Width: `200px` default, expanding to `250px` on focus.
     - Flex: `0 0 auto;`.
     - Right padding inside input: `padding-right: 60px !important;`.
     - Compact `<kbd>Ctrl K</kbd>` badge.

3. **Isolated Center Zone (`.navbar-zone-center`)**:
   - `navbar-zone-center` is given dedicated flex properties (`flex: 0 0 auto; margin: 0 auto;`).
   - `.nav-tabs` buttons cannot be overlapped or touched by Zone 1 or Zone 3.

4. **Clean SVG Badges in Nav Tabs**:
   - Replace `<span data-badge="scroll"...>` in nav tabs with clean inline SVG or emoji icons (`📚`, `🎬`, `⚡`) to eliminate broken image rendering.

---

## 3. Component Details & CSS Specifications

```css
/* NAVBAR CONTAINER LAYOUT */
.navbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.5rem 1.25rem;
  background: var(--surface-sidebar);
  border-bottom: var(--border-filigree);
  overflow: hidden;
  max-width: 100vw;
}

.navbar-zone-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 0 1 auto;
  min-width: 0;
}

.navbar-zone-center {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
}

.navbar-zone-right {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 0 0 auto;
}

.search-bar-container {
  width: 200px;
  max-width: 250px;
  flex: 0 0 auto;
  position: relative;
}

.search-bar-container input {
  width: 100%;
  padding-right: 60px !important;
  font-size: 0.8rem;
}

@media (max-width: 1400px) {
  .brand-text .subtext {
    display: none;
  }
}
```

---

## 4. Verification & Testing Plan

1. **Overlap Prevention Test**: Resize browser window across 1200px, 1366px, 1440px, and 1920px widths. Verify 0 pixel overlap between Search Bar and `Lore Codex` tab button.
2. **Icon Rendering Test**: Confirm `Lore Codex`, `Narrative Slate`, and `Weave Matrix` display clean icons without broken image boxes.
