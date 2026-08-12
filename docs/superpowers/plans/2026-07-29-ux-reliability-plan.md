# UI/UX & Reliability Refinements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development.

**Goal:** Implement responsive flex header tabs, collapsible sidebar article folders (accordions), and a standardized JSON error + UI Toast notification system.

---

### Task 1: Sidebar Accordions & Responsive Header (UI/UX)

**Files:**
- Modify: `public/css/styles.css`
- Modify: `public/js/app.js`

**Interfaces:**
- Consumes: Lore Codex article list
- Produces: Flex header and collapsible `<details>` sidebar list

- [ ] **Step 1: CSS Updates**
Update `styles.css` to add flex-wrap to the main nav container. Add styling for `<details>`, `<summary>` (folders), and child list items in the sidebar.

- [ ] **Step 2: JavaScript Rendering Logic**
Update `renderArticleList(articles)` in `app.js`. Extract categories from article metadata (or default to "Uncategorized"). Group articles by category. Generate HTML strings using `<details>` and `<summary>Category</summary>` containing the respective articles.

- [ ] **Step 3: UI Verification**
Run the frontend and visually verify that header tabs wrap on small screens and the sidebar features clickable, collapsible category folders.

- [ ] **Step 4: Commit Task 1**
Commit `styles.css` and `app.js`.

---

### Task 2: Structured Error Handling & Toast Notifications (Reliability)

**Files:**
- Modify: `server.js`
- Modify: `public/index.html`
- Modify: `public/css/styles.css`
- Modify: `public/js/app.js`

**Interfaces:**
- Consumes: All `server.js` API endpoints
- Produces: Standardized `{ status: 'error' }` JSON and `#toast-container` UI

- [ ] **Step 1: HTML & CSS for Toasts**
Add `<div id="toast-container" class="toast-container"></div>` to `index.html`. Add `.toast-container` and `.toast` (with slide-in animations and success/error color variants) to `styles.css`.

- [ ] **Step 2: Frontend Toast Logic**
Add `showToast(message, type = 'success')` to `app.js`. Refactor main `fetch` calls (e.g., `compileNarrativeSlate`, `generateMarketingCopy`) to catch errors and display them via `showToast` instead of `alert()` or `console.error`.

- [ ] **Step 3: Backend JSON Standardization**
Audit `server.js` endpoints (`/api/marketing/generate`, `/api/context/compile`, `/api/narrative/*`). Ensure global `try/catch` blocks are in place that intercept internal exceptions and return `{ status: 'error', message: err.message }` with a 500 status code.

- [ ] **Step 4: E2E Verification**
Simulate an error (e.g., invalid ID) and verify the backend returns JSON and the frontend renders a red Toast notification in the corner without crashing.

- [ ] **Step 5: Commit Task 2**
Commit `server.js`, `index.html`, `styles.css`, and `app.js`.
