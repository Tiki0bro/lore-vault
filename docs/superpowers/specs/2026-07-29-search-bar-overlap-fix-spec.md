# Spec: LoreVault Search Bar & Navbar Overlap Fix

**Date**: 2026-07-29  
**Status**: Approved  
**Lead Designer Persona**: Maya Lin (Lead UI/UX Architect)  
**Aligned Stakeholders**: Ethen (PO), Riley (QA), Alex (VTT Dev), Morgan (Worldbuilder), Elena (Author)  

---

## 1. Executive Summary

A layout overlap issue occurred where search input text ran underneath the `<kbd>Ctrl K</kbd>` badge, and search bar width expansion compressed Zone 2 (`.nav-tabs`), causing the `Lore Codex` tab button to truncate.

This spec fixes both overlaps:
1. Inner Search Bar Padding: Applies `padding-right: 85px` on `#global-search` so text never touches the badge or toggle buttons.
2. Navbar Flex Protection: Enforces `flex-shrink: 0` on `.nav-tabs` and caps search bar width at `300px` to guarantee `Lore Codex`, `Narrative Slate`, and `Weave Matrix` tabs are 100% visible at all times.

---

## 2. Component Fixes & Styling Changes

### 2.1 Search Input Inner Padding (`public/css/styles.css`)
```css
.search-bar-container {
  position: relative;
  display: flex;
  align-items: center;
  width: 300px;
  max-width: 320px;
  flex-shrink: 1;
  background: var(--surface-card);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 0.35rem 0.5rem;
}

.search-bar-container input[type="text"] {
  width: 100%;
  padding-right: 85px !important; /* Prevents text from colliding with kbd badge */
  background: transparent;
  border: none;
  color: var(--text-primary);
  outline: none;
}

.search-actions-right {
  position: absolute;
  right: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.35rem;
  pointer-events: none;
}

.search-actions-right button,
.search-actions-right .search-kbd-badge {
  pointer-events: auto;
}
```

### 2.2 Nav Tabs Flex Protection (`public/css/styles.css`)
```css
.navbar-zone-center,
.nav-tabs {
  flex-shrink: 0 !important; /* Protects Lore Codex, Narrative Slate, Weave Matrix tabs from squeezing */
  display: flex;
  align-items: center;
}
```

---

## 3. Verification & Testing Plan

1. **Inner Padding Test**: Type a long search string into `#global-search` and verify text stops cleanly before `<kbd>Ctrl K</kbd>` and `📝` buttons without any overlap.
2. **Tab Visibility Test**: Inspect navbar header on 1366px, 1440px, and 1920px viewports and verify `Lore Codex`, `Narrative Slate`, and `Weave Matrix` tabs are all 100% visible.
