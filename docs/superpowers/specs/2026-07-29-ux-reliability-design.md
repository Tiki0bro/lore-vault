# UI/UX & Reliability Refinements Design Specification

**Date**: 2026-07-29  
**Status**: Approved  
**Author**: Antigravity & LoreVault Core Team  
**Target Feature**: Option D — UI/UX & Reliability Refinements  
**Target Personas**: Ethen (Product Owner), Elena (Author), Morgan (TTRPG GM)

---

## 1. Executive Summary
This final roadmap phase focuses on polishing the LoreVault interface to handle scaled-up content and toolbars without breaking layout, while establishing a robust, non-blocking error handling system for all backend API interactions.

## 2. Responsive Header Navigation
* **Problem**: Adding the Weave Matrix, Narrative Slate, and Marketing tabs crowds the header. On small screens or split-window layouts (Morgan's GM use case), the tabs overflow or clip.
* **Solution**: Apply `display: flex; flex-wrap: wrap; gap: 10px; justify-content: center;` to the header tab container. This ensures tabs gracefully wrap to a second line when space is constrained.

## 3. Sidebar Category Accordions ("Folders")
* **Problem**: The left sidebar Lore Codex list becomes unmanageable when an author has 100+ flat articles.
* **Solution**: 
  * Update the frontend rendering logic in `app.js` to group articles by their metadata tags/categories (e.g., *Locations*, *Characters*).
  * Wrap each group in native HTML `<details>` and `<summary>` tags to create a Scrivener-style collapsible folder interface.

## 4. Structured JSON Error Handling & Toasts
* **Problem**: API timeouts or DB failures currently either crash the app silently or return raw HTML stack traces that break JSON parsers. Errors trigger aggressive browser alerts.
* **Backend Solution (`server.js`)**: Wrap all endpoints in strict `try/catch` blocks that return a standardized payload: `{ status: 'error', code: 'ERR_TYPE', message: 'User friendly message' }`.
* **Frontend Solution (`app.js` / `index.html`)**: Implement a non-blocking UI Toast Notification system (`#toast-container`). When an error is caught in the frontend fetch calls, it triggers `showToast(msg, 'error')` which slides in from the bottom right and auto-dismisses after 5 seconds, preserving Elena's immersive writing flow.
