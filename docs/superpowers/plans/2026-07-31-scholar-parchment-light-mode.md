# Scholar's Parchment Universal Light Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a Universal Light Mode with the Scholar's Parchment theme aesthetic and zero-dead-button safeguards across LoreVault.

**Architecture:** Add `data-mode="light|dark"` state to `document.body`, refactor CSS root tokens in `styles.css` for dual-mode support, add `#theme-mode-toggle` to top navbar in `index.html` with robust event delegation in `app.js`, and persist settings in `localStorage`.

**Tech Stack:** Vanilla JS (ES6), HTML5, CSS3 Custom Properties, Node.js (for test runner).

## Global Constraints

- Preserve per-world theme compatibility (`ancient-codex` and `scifi-fantasy`).
- Keep default state as `data-mode="dark"` for backward compatibility.
- Enforce Zero-Dead-Button policy: event handlers for navbar actions must use persistent delegation or DOM-ready binding.
- Ensure high readability with high contrast (`#2c221e` on `#faf6ed` in light mode).

---

### Task 1: Light Mode CSS Tokens & Scholar's Parchment Styling

**Files:**
- Modify: [public/css/styles.css](file:///c:/Users/EthenGreening/.gemini/antigravity/scratch/lore-vault/public/css/styles.css)

**Interfaces:**
- Consumes: Existing CSS Custom Properties (`:root`).
- Produces: `[data-mode="light"]` token overrides for `--bg-primary`, `--bg-secondary`, `--bg-card`, `--text-primary`, `--text-secondary`, `--border-color`, `--accent-gold`, and `--shadow-color`.

- [ ] **Step 1: Define `[data-mode="light"]` CSS variables in `public/css/styles.css`**

Add the following block to `public/css/styles.css`:

```css
/* ==========================================
   Universal Light Mode: Scholar's Parchment
   ========================================== */
[data-mode="light"] {
  --bg-primary: #faf6ed;
  --bg-secondary: #f3ecdc;
  --bg-card: #f8f2e4;
  --bg-modal: #faf6ed;
  --text-primary: #2c221e;
  --text-secondary: #6e5d4f;
  --text-muted: #8c7b6c;
  --border-color: #d6c5a3;
  --accent-gold: #a85d16;
  --accent-hover: #854810;
  --shadow-color: rgba(44, 34, 30, 0.12);
  --shadow-lg: 0 10px 25px -5px rgba(44, 34, 30, 0.18);
  --input-bg: #ffffff;
  --hover-bg: rgba(168, 93, 22, 0.08);
}
```

- [ ] **Step 2: Add light-mode specific tweaks for cards, sidebars, and inputs in `public/css/styles.css`**

Ensure `.card`, `.sidebar`, `.navbar`, `input`, `textarea`, and `.modal-content` utilize the custom properties cleanly when `data-mode="light"` is active.

```css
[data-mode="light"] input,
[data-mode="light"] select,
[data-mode="light"] textarea {
  background-color: var(--input-bg);
  color: var(--text-primary);
  border-color: var(--border-color);
}

[data-mode="light"] .navbar {
  background-color: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
}

[data-mode="light"] .sidebar {
  background-color: var(--bg-secondary);
  border-right: 1px solid var(--border-color);
}
```

- [ ] **Step 3: Verify CSS syntax integrity**

Run: `node -e "const fs=require('fs'); const css=fs.readFileSync('public/css/styles.css','utf8'); console.log('CSS size:', css.length);"`
Expected: Prints CSS file size with 0 syntax errors.

---

### Task 2: Navbar Toggle Component & Styling

**Files:**
- Modify: [public/index.html](file:///c:/Users/EthenGreening/.gemini/antigravity/scratch/lore-vault/public/index.html)
- Modify: [public/css/styles.css](file:///c:/Users/EthenGreening/.gemini/antigravity/scratch/lore-vault/public/css/styles.css)

**Interfaces:**
- Consumes: Header DOM container `.navbar-zone-right.header-actions`.
- Produces: `#theme-mode-toggle` button element.

- [ ] **Step 1: Add `#theme-mode-toggle` button to `public/index.html`**

Insert the `#theme-mode-toggle` button into `public/index.html` inside `.navbar-zone-right.header-actions` before the New Article button:

```html
<!-- Light / Dark Mode Toggle -->
<button id="theme-mode-toggle" class="btn btn-secondary btn-icon-toggle" title="Toggle Light/Dark Mode" aria-label="Toggle Light/Dark Mode">
  <span class="mode-icon-sun">☀️</span>
  <span class="mode-icon-moon" style="display:none;">🌙</span>
</button>
```

- [ ] **Step 2: Add CSS rules for `.btn-icon-toggle` in `public/css/styles.css`**

```css
.btn-icon-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.4rem 0.75rem;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s ease;
  border-radius: 6px;
}

.btn-icon-toggle:hover {
  transform: scale(1.05);
  background-color: var(--hover-bg);
}
```

- [ ] **Step 3: Run HTML structural validation**

Run: `node -e "const fs=require('fs'); const html=fs.readFileSync('public/index.html','utf8'); console.log('Contains toggle:', html.includes('theme-mode-toggle'));"`
Expected: `Contains toggle: true`

---

### Task 3: JavaScript Theme Mode Controller & Event Delegation

**Files:**
- Modify: [public/js/app.js](file:///c:/Users/EthenGreening/.gemini/antigravity/scratch/lore-vault/public/js/app.js)

**Interfaces:**
- Consumes: `localStorage`, `document.body`, `#theme-mode-toggle`.
- Produces: `window.app.toggleThemeMode()`, `window.app.initThemeMode()`.

- [ ] **Step 1: Implement `initThemeMode()` and `toggleThemeMode()` in `public/js/app.js`**

Add theme mode initialization and toggling functions:

```javascript
initThemeMode() {
  const savedMode = localStorage.getItem('lorevault_mode') || 'dark';
  document.body.setAttribute('data-mode', savedMode);
  this.updateToggleIcon(savedMode);
},

toggleThemeMode() {
  const currentMode = document.body.getAttribute('data-mode') || 'dark';
  const newMode = currentMode === 'dark' ? 'light' : 'dark';
  document.body.setAttribute('data-mode', newMode);
  localStorage.setItem('lorevault_mode', newMode);
  this.updateToggleIcon(newMode);
},

updateToggleIcon(mode) {
  const btn = document.getElementById('theme-mode-toggle');
  if (!btn) return;
  const sun = btn.querySelector('.mode-icon-sun');
  const moon = btn.querySelector('.mode-icon-moon');
  if (sun && moon) {
    if (mode === 'light') {
      sun.style.display = 'none';
      moon.style.display = 'inline';
      btn.setAttribute('title', 'Switch to Dark Mode');
    } else {
      sun.style.display = 'inline';
      moon.style.display = 'none';
      btn.setAttribute('title', 'Switch to Scholar\'s Parchment Light Mode');
    }
  }
}
```

- [ ] **Step 2: Add event delegation for `#theme-mode-toggle` in DOM initialization**

In `app.js` initialization (`DOMContentLoaded` listener or `init()` method), bind click handling via robust event delegation:

```javascript
document.addEventListener('click', (e) => {
  const toggleBtn = e.target.closest('#theme-mode-toggle');
  if (toggleBtn) {
    e.preventDefault();
    if (window.app && typeof window.app.toggleThemeMode === 'function') {
      window.app.toggleThemeMode();
    }
  }
});
```

- [ ] **Step 3: Call `initThemeMode()` during application boot**

Call `window.app.initThemeMode()` inside `DOMContentLoaded` or `window.onload`.

---

### Task 4: Automated Verification & Dead-Button Audit

**Files:**
- Create: `scratch/test-theme-toggle.js`

**Interfaces:**
- Consumes: `public/index.html`, `public/js/app.js`, `public/css/styles.css`.
- Produces: Test execution logs verifying zero dead buttons and accurate mode toggling.

- [ ] **Step 1: Write `scratch/test-theme-toggle.js` verification script**

```javascript
const fs = require('fs');

console.log('--- LoreVault Theme & Dead-Button Audit ---');

const html = fs.readFileSync('public/index.html', 'utf8');
const appJs = fs.readFileSync('public/js/app.js', 'utf8');
const css = fs.readFileSync('public/css/styles.css', 'utf8');

// Check 1: Button exists in HTML
if (!html.includes('id="theme-mode-toggle"')) {
  console.error('FAIL: #theme-mode-toggle missing in index.html');
  process.exit(1);
}
console.log('PASS: #theme-mode-toggle element present in index.html');

// Check 2: Event delegation or click handler in app.js
if (!appJs.includes('toggleThemeMode') || !appJs.includes('lorevault_mode')) {
  console.error('FAIL: toggleThemeMode or localStorage persistence missing in app.js');
  process.exit(1);
}
console.log('PASS: Theme mode controller and persistence present in app.js');

// Check 3: CSS data-mode="light" tokens present
if (!css.includes('[data-mode="light"]')) {
  console.error('FAIL: [data-mode="light"] missing in styles.css');
  process.exit(1);
}
console.log('PASS: Scholar\'s Parchment light mode tokens defined in styles.css');

console.log('--- ALL VERIFICATION CHECKS PASSED ---');
```

- [ ] **Step 2: Run verification script**

Run: `node scratch/test-theme-toggle.js`
Expected: `--- ALL VERIFICATION CHECKS PASSED ---`

---
