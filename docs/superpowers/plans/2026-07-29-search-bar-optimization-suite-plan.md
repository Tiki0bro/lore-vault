# Search Bar Optimization Suite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform top navbar search bar into an intelligent 480px hotkey-enabled search hub with recent search history, floating result cards, prefix filtering, and full-text content searching.

**Architecture:** Express.js `GET /api/articles` query extensions. Dynamic flex styling in `styles.css`. Hotkey listener, debounced live search, overlay dropdown, and `localStorage` recent history in `app.js`.

**Tech Stack:** Express.js, SQLite3, Vanilla HTML5/CSS3/JavaScript.

## Global Constraints
- Pure CSS & Vanilla JavaScript.
- Zero screen clipping, responsive down to 1024px displays.

---

### Task 1: Backend Full-Text & Prefix Search Support

**Files:**
- Modify: `server.js`

**Interfaces:**
- Consumes: `q`, `content`, `category`, `tag` parameters in `GET /api/articles`.
- Produces: JSON list of matching articles filtered by title, summary, content, category, or tag.

- [ ] **Step 1: Update `GET /api/articles` in `server.js`**
Support `content=true` to query `title LIKE ? OR summary LIKE ? OR content LIKE ?`.

- [ ] **Step 2: Commit**
`git add server.js`
`git commit -m "feat(search): add full-text content search support to GET /api/articles"`


### Task 2: Search Bar HTML Markup & Dynamic Width CSS

**Files:**
- Modify: `public/index.html`
- Modify: `public/css/styles.css`

**Interfaces:**
- Consumes: `.search-bar-container`.
- Produces: 480px expanding search container with `<kbd>Ctrl K</kbd>` badge, clear button `✕`, full-text toggle `📝`, and floating dropdown `#search-results-dropdown`.

- [ ] **Step 1: Update `#search-container` in `index.html`**
Add `<kbd>Ctrl K</kbd>`, `#search-clear-btn`, `#search-fulltext-toggle`, and `#search-results-dropdown`.

- [ ] **Step 2: Add CSS rules for Search Bar Suite in `styles.css`**
Style flex expansion (`max-width: 480px`), gold border focus, `<kbd>` badges, clear button, and floating overlay dropdown `.search-dropdown`.

- [ ] **Step 3: Commit**
`git add public/index.html public/css/styles.css`
`git commit -m "feat(ui): implement expanded 480px search bar layout, kbd badges, and floating dropdown markup"`


### Task 3: Search Engine JS Logic, Hotkeys & Floating Overlay

**Files:**
- Modify: `public/js/app.js`

**Interfaces:**
- Consumes: User search input & hotkey events.
- Produces: Debounced search, `Ctrl+K` hotkey focus, recent history dropdown, prefix parsing (`cat:`, `#`), keyboard arrow key navigation, and article loading.

- [ ] **Step 1: Add `Ctrl+K` and `Cmd+K` global hotkey listener in `app.js`**
Focus `#global-search` on `Ctrl+K` / `Cmd+K`.

- [ ] **Step 2: Add Recent Articles tracking (`localStorage`)**
Record last 5 opened articles and display them in dropdown on empty search focus.

- [ ] **Step 3: Implement `handleSearchInput()`, `renderSearchResults()`, and Keyboard Navigation (`Up`/`Down`/`Enter`)**
Parse `cat:` and `#` prefixes, fetch results, render category/secret badges, and navigate using arrow keys.

- [ ] **Step 4: Commit**
`git add public/js/app.js`
`git commit -m "feat(search): implement hotkeys, recent search history, prefix filtering, and arrow key navigation"`
