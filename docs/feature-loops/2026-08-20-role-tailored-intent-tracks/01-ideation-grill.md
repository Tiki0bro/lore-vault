# Stage 1 & Stage 2: Ideation Grill & Design Spec — Role-Tailored Intent Tracks

**Feature**: Role-Tailored Intent Tracks (Persona Guided Paths)  
**Date**: 2026-08-20  
**Author**: Arthur "The Griller" Vance & Persona Panel  

---

## 1. Persona Ideation & Socratic Grilling

### Persona Feedback:
- 🛡️ **Alex Vance (VTT/DM)**: "I need session prep speed. DM Secrets, Statblocks, and Dice Rolling are what I care about—not author prose tools."
- ✍️ **Merryn & Elena (Authors)**: "We want distraction-free writing. Show us Zen Mode, Weave Matrix context, and No-Generate mode."
- 🪐 **Morgan (Worldbuilder)**: "Give me graph cross-links, timeline chronology, and World Doctor audit tools."

### Arthur's Socratic Grill Pass:
> **Question**: Why 3 tracks instead of 1 static tour?  
> **Answer**: Users log in with distinct intent. Forcing a VTT DM to sit through novel writing tips causes tour abandonment. Role tracks guarantee immediate 100% relevant value.

---

## 2. Design Specification

### 2.1 UI Component (`#welcome-concierge-modal`)
- Add 3 track selector pills inside Welcome Concierge:
  - `🛡️ DM Campaign Prep`
  - `✍️ Literary Author`
  - `🪐 Worldbuilder Architect`
- Selecting a track customizes the 5-step spotlight sequence targets, titles, and descriptions dynamically in `OnboardingManager`.

### 2.2 Track Sequences:
- **DM Track**: 1) Atlas Maps ➔ 2) DM Secrets Filter (`?mode=player`) ➔ 3) Statblocks (`Ctrl+Shift+S`) ➔ 4) Interactive Dice Roller (`/roll`) ➔ 5) Concierge (`Ctrl+Shift+W`).
- **Author Track**: 1) Reader Codex ➔ 2) Zen Mode (`Ctrl+Shift+F`) ➔ 3) Weave Matrix (`Ctrl+Shift+M`) ➔ 4) Tonal Presets & No-Generate Mode ➔ 5) Concierge.
- **Architect Track**: 1) Frontpage Overview ➔ 2) `@` Cross-Linking ➔ 3) Faction Matrix ➔ 4) Timeline Events ➔ 5) World Doctor Audit.
