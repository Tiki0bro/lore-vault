# Stage 2: Design Spec & Gap Remediation

**Feature Title**: Modernized UI Aesthetic & Interaction Suite  
**Date**: 2026-08-21  

---

## 1. System Architecture & Component Design

### 1.1 Dual-Aesthetic Theme Matrix
We introduce two new top-tier aesthetic themes into `public/css/styles.css`:
- **Radiant Arcane (`data-theme="radiant-arcane"`)**:
  - Background: Ethereal midnight violet (`#090714`) with glowing cyan/purple radial gradient (`rgba(6, 182, 212, 0.15)`).
  - Cards & Panels: Semi-transparent glassmorphic panels (`rgba(22, 17, 43, 0.75)` with `backdrop-filter: blur(12px)`).
  - Accent Color: Arcane Cyan (`#00f2fe`) & Celestial Gold (`#f59e0b`).
  - Borders: Neon rune filigree (`1px solid rgba(0, 242, 254, 0.35)`).
- **Grimdark Iron (`data-theme="grimdark-iron"`)**:
  - Background: Weathered volcanic ash/obsidian (`#0a0a0c`) with deep blood-crimson atmospheric tint (`rgba(153, 27, 27, 0.18)`).
  - Cards & Panels: Dark slate obsidian with iron rivet border outlines (`#141418`).
  - Accent Color: Blood Crimson (`#e11d48`) & Rusted Steel (`#94a3b8`).
  - Borders: Rusted iron borders with sharp corners (`1px solid rgba(225, 29, 72, 0.4)`).

### 1.2 Micro-Interaction Suite
- **Tactile Button Clicks**: Active scale compression (`transform: scale(0.96)`), hardware-accelerated ripple keyframe animation on `.btn`, and subtle glowing shadow expansion on focus/hover.
- **Fluid Spring Modals**: Modal dialogues open with GPU spring scale transitions (`transform: scale(0.92) -> scale(1.0)` with cubic-bezier timing).
- **3D Living Card Tilt**: Mouse pointer tracking on `.article-card` calculates `rotateX` and `rotateY` offsets for dynamic 3D tilt and specular lighting sheen on hover.

### 1.3 Animated Banner & Particle Engine (`public/js/particle-banner.js`)
- Renders an interactive Canvas header overlay above top navigation or article views.
- **Arcane Mode**: Floating mana particles with glowing trails.
- **Grimdark Mode**: Drifting ash particles and low fog wisps.
- **Performance Constraints**: Capped at 35 particles, auto-pauses when `document.hidden` is true or element is scrolled out of viewport (via `IntersectionObserver`).

### 1.4 Accessibility & Performance Layer
- Respects `@media (prefers-reduced-motion: reduce)` by disabling canvas particle motion and setting transition durations to 0ms.
- Includes a setting toggle in the Theme Studio drawer for FX intensity: High (Canvas + 3D Tilt + Micro-FX), Medium (Micro-FX only), Low (Static).

---

## 🔥 Arthur's Grilling Sign-Off
**Arthur's Verdict**: PASSED (Auto-Approved). Specs validated against zero-layout-shift and GPU animation standards. Proceed to Stage 3.
