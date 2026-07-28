# Spec: LoreVault Fantasy UI Redesign & Per-World Theme Engine

**Date**: 2026-07-28  
**Status**: Approved  

---

## 1. Executive Summary

LoreVault is transitioning from a generic dark tech dashboard into an immersive tabletop RPG worldbuilding studio. The redesign introduces an **Ancient Parchment & Codex** primary aesthetic (aged parchment cards, gold filigree frames, crimson/amber accents, Cinzel serif typography, and RPG badge iconography), along with a secondary **Sci-Fi Fantasy (Aetherpunk / Cyber-Codex)** theme. Themes are assigned on a **per-world basis** stored in the database, automatically updating the UI whenever a user switches between worlds.

---

## 2. Key Objectives & Design Directives

1. **Dual Fantasy Design Systems**:
   - **Ancient Parchment & Codex Theme (`ancient-codex`)**: Deep warm mahogany/leather backdrop, aged parchment cards, burnished gold/bronze filigree borders, glowing amber & royal crimson accents, *Cinzel* & *Lora* typography.
   - **Sci-Fi Fantasy Theme (`scifi-fantasy`)**: Deep stellar void backdrop, nebula slate containers, illuminated cyan & plasma violet borders, *Cinzel* & *Orbitron* hybrid typography.
2. **RPG Badge Iconography System**:
   - Replace standard modern emojis across navigation tabs, category lists, action buttons, stat blocks, and World Doctor with SVG RPG badge frames (scrolls, quills, shields, wax seals, compass roses, runic crystals).
3. **Per-World Theme Persistence**:
   - Add `theme` column to `worlds` SQLite table.
   - Extend World creation & editing API and UI modals to select a theme per World.
   - Dynamically set `document.body.dataset.theme` on world switch.
4. **WorldAnvil Standard Compliance**:
   - Maintain WorldAnvil parsing directives (`[quote]`, `[row]`, `[col]`, `[h1]`, `[h2]`, `[hr]`, `[table]`, `[b]`, `@[Title](template:id)`).
   - Render clean, elegant parchment article layouts with gold filigree top borders, styled blockquotes, and plain-text table headers.

---

## 3. Architecture & Technical Breakdown

### 3.1 CSS Design System (`public/css/styles.css`)
- **Theme Variables Engine**:
  ```css
  [data-theme="ancient-codex"] {
    --bg-main: #0c0a08;
    --surface-card: #18130e;
    --surface-card-hover: #241c14;
    --border-filigree: #c5a059;
    --border-subtle: rgba(197, 160, 89, 0.25);
    --accent-primary: #d97706;
    --accent-secondary: #8b0000;
    --text-primary: #f3e8d7;
    --text-secondary: #bfa888;
    --font-heading: 'Cinzel', serif;
    --font-body: 'Inter', sans-serif;
    --font-article-body: 'Lora', serif;
  }

  [data-theme="scifi-fantasy"] {
    --bg-main: #050811;
    --surface-card: #0b1220;
    --surface-card-hover: #121e34;
    --border-filigree: #00f0ff;
    --border-subtle: rgba(0, 240, 255, 0.25);
    --accent-primary: #00f0ff;
    --accent-secondary: #a855f7;
    --text-primary: #e0f2fe;
    --text-secondary: #7dd3fc;
    --font-heading: 'Cinzel', 'Orbitron', serif;
    --font-body: 'Inter', sans-serif;
    --font-article-body: 'Inter', sans-serif;
  }
  ```

### 3.2 RPG Badge SVG Asset System (`public/js/badges.js` & SVG Icons)
- Create `public/js/badges.js` helper that generates or inserts inline SVG badge icons with framed borders (shield, wax seal, scroll, crystal, stethoscope, compass).
- Replace plain emoji icons in header tabs, buttons, category menu items, and World Doctor UI.

### 3.3 Server & Database Modifications (`server.js`)
- Migration: Ensure `theme` column exists in `worlds` table (`ALTER TABLE worlds ADD COLUMN theme TEXT DEFAULT 'ancient-codex'`).
- `GET /api/worlds`, `POST /api/worlds`, `PUT /api/worlds/:id` endpoints support `theme`.

### 3.4 Client Application Logic (`public/js/app.js`)
- `app.switchWorld(worldId)` updates `document.body.setAttribute('data-theme', currentWorld.theme || 'ancient-codex')`.
- Create / Edit World modals include a theme selector dropdown (`ancient-codex` vs `scifi-fantasy`).

---

## 4. Verification & Testing Plan

1. **Visual Testing**:
   - Verify *Ancient Parchment & Codex* theme styling (typography, background textures, gold filigree borders, RPG badges).
   - Verify *Sci-Fi Fantasy* theme styling (cyan glows, nebula slate containers, orbitron/cinzel font blend).
2. **Per-World Theme Switching**:
   - Create World A with *Ancient Codex* theme, World B with *Sci-Fi Fantasy* theme.
   - Switch between World A and World B and verify `document.body.dataset.theme` toggles instantly and all UI elements adapt seamlessly.
3. **WorldAnvil Article View**:
   - Inspect articles with `[quote]`, `[row]`/`[col]`, `[h1]`, `[h2]`, `[hr]`, `[table]` to confirm strict compliance with WorldAnvil directives.
