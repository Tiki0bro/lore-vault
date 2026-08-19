# Scholar's Orientation Tour & Interactive Guide Mode Design Spec

**Date**: 2026-08-20  
**Status**: Approved  
**Target Feature**: Interactive Step-by-Step UI Spotlight Tour & New User Onboarding for LoreVault  

---

## 1. Overview & Purpose
LoreVault's **Scholar's Orientation Tour** provides an interactive, hands-on step-by-step UI spotlight walkthrough for first-time creators and returning scholars.

It highlights 5 core areas of the application:
1. 🗺️ **Navigation Tabs**: Master overview of Reader, Atlas Map, Timeline, Factions, & Frontpage.
2. 📝 **Lore Creation & @ Cross-Links**: `+ New Article` button, templates, and `@` typing syntax.
3. 🪐 **Interactive World Atlas**: Cartography canvas, territory layers, map pins, & DM secrets.
4. 📜 **Zen Writer & Weave Matrix**: Distraction-free drafting (`Ctrl+Shift+F`) & AI context builder (`Ctrl+Shift+M`).
5. ✨ **Concierge & Universal Hotkeys**: AI Journey Launcher (`Ctrl+Shift+W`) & Universal Search (`Ctrl+K`).

---

## 2. Component Specifications

### 2.1 UI Overlay (`#onboarding-spotlight-overlay` & `#onboarding-tooltip-card`)
- **Spotlight Backdrop**: Darkened glass overlay (`rgba(0,0,0,0.65)`) with backdrop blur (`blur(4px)`). Pointer events pass through to highlighted elements.
- **Active Ring**: SVG/CSS cutout ring (`.spotlight-active-ring`) positioned over `element.getBoundingClientRect()` with gold/cyan pulse animation (`@keyframes ringPulse`).
- **Floating Tooltip Popover (`#onboarding-tooltip-card`)**:
  - Badge: `🎓 SCHOLAR'S TOUR — STEP X OF 5`
  - Title & Guidance Description
  - Hotkey Badge: `<span class="kbd-hint">Ctrl + Shift + F</span>`
  - Controls: `[⏮ Back]`, `[Next ➔]`, `[✕ Skip Tour]`

### 2.2 Welcome Concierge Banner Trigger
- Prominent banner inside `#welcome-concierge-modal`:
  `🎓 New to LoreVault? Take the 2-Minute Scholar's Orientation Tour`
- Command Palette (`Ctrl + K`) entry: `"🎓 Start Scholar's Orientation Tour"`.

### 2.3 Client State Machine (`public/js/app.js`)
- `startScholarTour()`: Initiates 5-step sequence.
- `renderTourStep(stepIndex)`: Computes target element position, switches active view if needed, positions tooltip card.
- `endScholarTour()`: Dismisses overlay, sets `localStorage.setItem('lorevault_onboarding_completed', 'true')`, and displays toast.

---

## 3. Verification & Test Plan
- **Automated Test Suite**: Add test cases in `test/api-suite.js` (or DOM test suite) verifying tour initialization, step index bounds, and completion preference persistence.
