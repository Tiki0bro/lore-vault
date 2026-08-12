# Design Spec: Scholar's Parchment Universal Light Mode & Zero-Dead-Button Safeguards

- **Author**: Maya Lin (Lead UI/UX Architect) & Ethen (Product Lead)
- **Reviewer**: Alex Vance (Full-Stack Dev) & Riley "Solder" Chen (QA Specialist)
- **Date**: 2026-07-31
- **Status**: Proposed

---

## 1. Overview & Objectives

LoreVault currently defaults to dark-toned theme palettes (`ancient-codex` and `scifi-fantasy`). To accommodate long daytime reading/writing sessions, reduce eye fatigue, and improve high-contrast accessibility, this design introduces a **Universal Light Mode** featuring the **Scholar's Parchment** aesthetic.

Additionally, per Alex Vance's technical request, this specification includes strict **Zero-Dead-Button Safeguards** to ensure all top-level navbar controls, modal triggers, and theme toggles remain 100% responsive without event listener dropouts.

---

## 2. Architecture & Data Flow

### 2.1 Dual CSS Token Matrix (`data-mode`)
- The `<body>` element will manage two independent state attributes:
  - `data-theme`: `"ancient-codex"` | `"scifi-fantasy"` (determines font families, decorative filigree, and primary accents)
  - `data-mode`: `"dark"` | `"light"` (determines canvas background, card surfaces, text color, and border contrast)
- Default state: `data-mode="dark"` (backward compatible with existing layout).

### 2.2 Persistence & Initialization
- Preference key: `localStorage.getItem('lorevault_mode')` -> `"dark" | "light"`.
- On application boot:
  1. Inspect `localStorage.getItem('lorevault_mode')`.
  2. If unset, check system preference (`window.matchMedia('(prefers-color-scheme: light)').matches`).
  3. Apply `data-mode` to `document.body` before first render to avoid theme flash.

---

## 3. Visual Design System: Scholar's Parchment Palette

| Token Name | Dark Mode (Default) | Light Mode (Scholar's Parchment) | Usage |
|---|---|---|---|
| `--bg-primary` | `#121110` / `#0a0d14` | `#faf6ed` | Main application background / scroll canvas |
| `--bg-secondary` | `#1b1916` / `#111622` | `#f3ecdc` | Sidebars, navbar header, card containers |
| `--bg-card` | `#24211d` / `#182030` | `#f8f2e4` | Article cards, modal body, dropdown menus |
| `--text-primary` | `#e8dec8` / `#e2f1f8` | `#2c221e` | Main body typography, titles, article text |
| `--text-secondary` | `#a39784` / `#8aa2b5` | `#6e5d4f` | Subtitle text, metadata, table headers |
| `--border-color` | `#3d372e` / `#233348` | `#d6c5a3` | Card outlines, dividers, input borders |
| `--accent-gold` | `#d4a359` / `#00d2ff` | `#a85d16` | Active tab highlights, CTA borders |
| `--accent-hover` | `#e5b86b` / `#33dcff` | `#854810` | Button hover states |
| `--shadow-color` | `rgba(0, 0, 0, 0.5)` | `rgba(44, 34, 30, 0.12)` | Card depth & modal drop shadows |

---

## 4. Component Specs & Zero-Dead-Button Safeguards

### 4.1 Top Navbar Mode Toggle Component
- **Element ID**: `#theme-mode-toggle`
- **Location**: Top right header bar alongside `⚙️ Tools & World Actions` dropdown.
- **HTML Structure**:
  ```html
  <button id="theme-mode-toggle" class="btn-icon-toggle" title="Toggle Light/Dark Mode" aria-label="Toggle Light/Dark Mode">
    <span class="mode-icon sun-icon">☀️</span>
    <span class="mode-icon moon-icon">🌙</span>
  </button>
  ```

### 4.2 Dead-Button Prevention Checklist (Alex Vance Handoff)
To prevent "dead button" bugs where dynamic DOM re-renders detach event handlers:
1. **Central Event Delegation**: Header actions (mode toggle, world switcher, new article button) must be bound using persistent root container event delegation or initialized once inside `DOMContentLoaded`.
2. **ID Safety Guard**: Button IDs MUST remain unique and must not be overwritten during dynamic modal HTML injection.
3. **Visual Feedback & Active State**: Every button must have explicit `:hover`, `:active`, and `.active` CSS states in both Light and Dark modes so click interactions provide instant visual feedback.
4. **Console Failure Logging**: Click event handlers must log clear warning diagnostics if target actions or modals fail to open.

---

## 5. Verification & QA Matrix (Riley "Solder" Chen)

1. **Theme Switch Verification**:
   - Toggle mode 10x rapidly in navbar; confirm zero state drift or broken contrast tokens.
   - Reload page; confirm `localStorage` persists mode selection.
2. **Cross-Theme Verification**:
   - Test Light Mode + `ancient-codex` (Warm Parchment).
   - Test Light Mode + `scifi-fantasy` (Clean Futuristic Light Paper).
3. **Dead-Button Audit**:
   - Test all navbar buttons (`#theme-mode-toggle`, `#new-article-btn`, `#world-doctor-btn`, `#ai-settings-btn`) after switching modes.
   - Verify 0 unhandled JS errors in browser developer tools console.

---
