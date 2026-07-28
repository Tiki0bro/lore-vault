# Spec: LoreVault Search Bar Optimization & Expanded Search Engine Suite

**Date**: 2026-07-29  
**Status**: Approved  
**Aligned Personas**: Maya Lin (UI/UX), Morgan Reed (Worldbuilder), Elena Rostova (Author), Alex Vance (Developer), Riley Chen (QA), Ethen (PO)  

---

## 1. Executive Summary

The top navbar search bar is expanded and upgraded into an intelligent, instant-access search hub:
1. **Dynamic Width Header Expansion**: Flexes dynamically up to `480px` wide, utilizing header space gracefully.
2. **Global Hotkey (`Ctrl + K` / `⌘K`)**: Hotkey listener and visual `<kbd>Ctrl K</kbd>` badge focusing search instantly.
3. **🕒 Recent Articles / History Dropdown**: Displays 5 most recently viewed articles on empty search focus.
4. **🎯 Live Search Results Overlay Dropdown**: Floating parchment result list with category icons, summary snippets, and keyboard arrow key navigation (`Up`/`Down`/`Enter`).
5. **🏷️ Prefix Scope Filtering**: Supports inline prefix queries like `cat:Locations`, `cat:Characters`, or `#tag`.
6. **🔒 DM Secret Warning Badges**: Highlights secret articles with a 🔒 badge.
7. **📝 Full-Text Content Search Toggle**: Toggle switch allowing full-text content searching.
8. **🧹 One-Click Clear Button (`✕`)**: Fast reset button inside the search container.

---

## 2. Technical Architecture & Endpoints

### 2.1 API Extensions (`server.js`)
- Update `GET /api/articles` query handling:
  - Support `q` query parameter for searching title, summary, and content.
  - Support `content=true` for full-text searching inside article body.
  - Support `category` and `tag` filtering.

### 2.2 Frontend UI Components (`public/index.html` & `public/css/styles.css`)
- Update `.search-bar-container`:
  ```html
  <div class="search-bar-container" id="search-container">
    <span class="search-icon">🔍</span>
    <input type="text" id="global-search" placeholder="Search world lore (Ctrl+K)..." autocomplete="off" oninput="window.app.handleSearchInput(this.value)" onfocus="window.app.handleSearchFocus()" onkeydown="window.app.handleSearchKeyDown(event)">
    <span class="search-kbd-badge"><kbd>Ctrl</kbd> <kbd>K</kbd></span>
    <button class="search-clear-btn hidden" id="search-clear-btn" onclick="window.app.clearSearch()">✕</button>
    <button class="search-fulltext-toggle" id="search-fulltext-toggle" onclick="window.app.toggleFullTextSearch()" title="Toggle Full-Text Content Search">📝</button>

    <!-- Floating Search Results Overlay -->
    <div id="search-results-dropdown" class="search-dropdown hidden">
      <!-- Dynamically populated -->
    </div>
  </div>
  ```

### 2.3 Frontend Logic (`public/js/app.js`)
- Store `recentArticles` array (up to 5 items) in `localStorage`.
- Add keyboard event listener for `Ctrl+K` and `Cmd+K`.
- Add `handleSearchInput(query)` with debounced API search, prefix parsing (`cat:`, `#`), recent history rendering on empty focus, keyboard arrow selection, and article click loading.

---

## 3. Verification & Testing Plan

1. **Hotkey Test**: Press `Ctrl+K` or `⌘K` on Windows/Mac and verify search bar is focused.
2. **Recent History Test**: Open articles, then click an empty search bar and verify recent history dropdown renders.
3. **Prefix Search Test**: Type `cat:Locations` or `#magic` and verify results filter correctly.
4. **Keyboard Navigation Test**: Press `Down`/`Up` arrow keys and `Enter` to navigate and open search results.
