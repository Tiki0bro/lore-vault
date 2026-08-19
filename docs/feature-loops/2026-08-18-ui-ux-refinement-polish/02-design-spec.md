# Stage 2: Design Specification & Architecture

**Feature Title**: UI/UX Refinement, Polish & Micro-Interactions Loop
**Date**: 2026-08-18
**Mode**: Autonomous Fast-Track (`--auto`)

---

## 1. UI/UX Design System Specifications

### Refinement 1: Category Dock & Sub-Category Overflow Indicators
- Gradient Mask Fade: Apply CSS `-webkit-mask-image: linear-gradient(to right, transparent 0%, black 15px, black calc(100% - 15px), transparent 100%)` to `.category-dock-bar` and `#sub-category-bar`.
- Micro-hover elevation: `.category-dock-pill:hover` elevates by `-2px` with a subtle box-shadow glow matching the active theme accent.

### Refinement 2: Action Button Press Micro-Interactions & Active Pulse
- Add `:active` transform scale: `.btn:active`, `.tool-btn:active`, `.segmented-btn:active` scale to `0.97` for instantaneous tactile feedback.
- Slate Button Pulse: `#add-to-slate-btn.in-slate` displays a green checkmark `✓ In Slate` with a keyframe pulse glow (`@keyframes slatePulse`).

### Refinement 3: Reader Toolbar Keyboard Shortcut Badges
- Add subtle `.kbd-hint` badges (`Ctrl + Shift + F`, `Ctrl + K`) to reader toolbar buttons and AI drawer buttons in [public/index.html](file:///c:/Users/EthenGreening/.gemini/antigravity/scratch/lore-vault/public/index.html).

### Refinement 4: Ask AI Chat Drawer Message Copy Feedback
- In `public/js/app.js`, add event delegation for AI response bubble copy buttons that triggers temporary `✓ Copied` text and pulse animations.

---

## 2. Arthur's Design Interrogation & Gate 1 Auto-Pass

> **Arthur**: *"Does the gradient mask image break scrolling accessibility or obscure text on category pills?"*
> 
> **Maya (UI/UX)**: *"The fade edge is only 15px wide at the extreme left and right bounds, signaling overflow scrolling without obscuring text."*

**Arthur's Verdict**: PASSED (Auto-Approved for Stage 3).
