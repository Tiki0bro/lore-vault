# Spec: Remove Hovering Kbd Badge & Clean Up Search Input

**Date**: 2026-07-29  
**Status**: Approved  
**Lead Personas**: Maya Lin (Lead UI/UX Architect), Riley Chen (QA Lead), Alex Vance (Full-Stack Dev)  

---

## 1. Executive Summary

This spec removes the `<span class="search-kbd-badge">` element from `public/index.html` and its associated CSS rules from `public/css/styles.css`, permanently fixing the vertical line-height overflow and hovering badge defect. The search hotkey hint is placed directly into the search input placeholder: `placeholder="Search lore (Ctrl+K)..."`. Hotkey functionality (`Ctrl+K` / `Cmd+K`) remains 100% active.

---

## 2. Component Changes & CSS Cleanup

### 2.1 Markup (`public/index.html`)
```html
<div class="search-bar-container" id="search-container">
  <span class="search-icon-static">🔍</span>
  <input type="text" id="global-search" placeholder="Search lore (Ctrl+K)..." autocomplete="off">
  <div id="search-results-dropdown" class="search-dropdown hidden"></div>
</div>
```

### 2.2 CSS Cleanup (`public/css/styles.css`)
- Remove `.search-kbd-badge`, `.search-kbd-badge kbd`, and `.search-actions-right`.
- Simplify `.search-bar-container input`:
  ```css
  .search-bar-container input[type="text"], #global-search {
    width: 100% !important;
    padding-right: 0.5rem !important;
    background: transparent !important;
    border: none !important;
    color: var(--text-primary, #f8fafc) !important;
    font-size: 0.82rem !important;
    outline: none !important;
  }
  ```

---

## 3. Verification & Testing Plan

1. **Visual Verification**: Inspect top navbar search bar and confirm 0 hovering badge artifacts above the search box.
2. **Hotkey Test**: Press `Ctrl+K` and `Cmd+K` to confirm search input receives instant keyboard focus.
