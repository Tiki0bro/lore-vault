# Stage 3: Implementation Plan

**Feature Title**: Modernized UI Aesthetic & Interaction Suite  
**Date**: 2026-08-21  

---

## 🛠️ Step-by-Step Task Breakdown

### Task 1: Dual Theme CSS Matrix & Micro-Interactions (`public/css/styles.css`)
- Define `[data-theme="radiant-arcane"]` and `[data-theme="grimdark-iron"]` CSS custom variables.
- Add micro-interaction classes: `.btn` active ripple/compress effects, `.article-card` tilt & hover glow, `.modal` spring entrance animations.
- Enforce `@media (prefers-reduced-motion: reduce)` overrides.

### Task 2: Living Particle Banner Engine (`public/js/particle-banner.js`)
- Create standard `ParticleBannerManager` class.
- Support Arcane Embers and Grimdark Ash particle styles.
- Add `IntersectionObserver` auto-pause and `document.addEventListener('visibilitychange')` listener to maintain zero performance degradation.

### Task 3: UI Controls & Theme Selection Integration (`public/index.html` & `public/js/app.js`)
- Add Theme Preset selector options in top nav / Parchment Theme Studio (`Radiant Arcane` & `Grimdark Iron`).
- Connect Theme Switcher to `ParticleBannerManager.setTheme()`.
- Add card tilt event listeners to dynamically rendered article cards in `public/js/app.js`.

### Task 4: Automated Verification Suite (`tests/ui-modernization.test.js`)
- Test theme attribute mutations (`data-theme`).
- Test `ParticleBannerManager` instantiation and theme state switching.
- Validate DOM stability and zero CSS syntax errors.

---

## 🔥 Arthur's Grilling Sign-Off
**Arthur's Verdict**: PASSED (Auto-Approved). Implementation plan verified. Proceed to Stage 4 (Execution & QA).
