# Lore Marketing Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development.

**Goal:** Build the Lore Marketing Engine backend endpoint and frontend interfaces (Dashboard & Quick Modal) with guaranteed spoiler filtering.
**Architecture:** Add `POST /api/marketing/generate` in `server.js`, and add `#marketing-view` + `#marketing-quick-modal` in `public/index.html` & `public/js/app.js`.

---

### Task 1: Backend Marketing API Engine & Spoiler Guardrails

**Files:**
- Modify: `server.js`
- Create: `scratch/test-marketing-engine.js`

**Interfaces:**
- Consumes: Existing `stripSecretBlocks` and `filterArticleVisibility` functions
- Produces: `POST /api/marketing/generate`

- [ ] **Step 1: Write integration test script**
Create `scratch/test-marketing-engine.js` to test `POST /api/marketing/generate`. It must assert that a seeded article with `[secret]Super Secret Plot Twist[/secret]` never leaks the twist in the output response.

- [ ] **Step 2: Implement endpoint in server.js**
Add `POST /api/marketing/generate` parsing `{ article_ids, preset, tone_chip, cta_type }`. Fetch articles, strip secrets, build preset prompt, and call Gemini LLM. Return `{ status: 'success', generated_copy }`.

- [ ] **Step 3: Run integration test**
Run `node scratch/test-marketing-engine.js` to verify successful generation and spoiler safety.

- [ ] **Step 4: Commit Task 1**
Commit `server.js` and test script.

---

### Task 2: Frontend Global Marketing Dashboard & Quick Modal

**Files:**
- Modify: `public/index.html`
- Modify: `public/css/styles.css`
- Modify: `public/js/app.js`

**Interfaces:**
- Consumes: `POST /api/marketing/generate`
- Produces: `#marketing-view` and `#marketing-quick-modal`

- [ ] **Step 1: Add HTML markup in index.html**
Add `📢 Marketing` top nav tab, `#marketing-view` container, and `#marketing-quick-modal` HTML structure. Add `📢 Quick Promo Copy` button to `#article-viewer` action toolbar.

- [ ] **Step 2: Add CSS rules**
Style `.marketing-dashboard`, `.preset-dropdown`, `.cta-selector`.

- [ ] **Step 3: Implement JS handlers in app.js**
Add `switchView('marketing')`, `generateMarketingCopy(type)`, `openQuickMarketingModal()`, and copy to clipboard handlers.

- [ ] **Step 4: Verify UI syntax and flow**
Run `node -c public/js/app.js`.

- [ ] **Step 5: Commit Task 2**
Commit HTML, CSS, JS modifications.
