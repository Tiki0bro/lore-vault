# Stage 1 & Stage 2: Ideation Grill & Design Spec — Scholar's Progress Dock

**Feature**: Scholar's First-World Progress Dock & Action Tasks  
**Date**: 2026-08-20  
**Author**: Arthur "The Griller" Vance & Persona Panel  

---

## 1. Persona Ideation & Socratic Grilling

### Persona Feedback:
- 🎨 **Maya (UI/UX)**: "Keep the widget collapsible and compact in the bottom corner so it never obstructs writing or map navigation."
- 📢 **Marcus (Marketing)**: "Rewarding completed onboarding tasks with a badge toast generates excitement and builds long-term retention."

### Arthur's Socratic Grill Pass:
> **Question**: How do we track real user task execution without polling or heavy event listeners?  
> **Answer**: Hook task checkers directly into app state transitions (`switchTab`, `saveArticle`, `toggleCommandPalette`, `openAISettingsModal`). Update task state in `localStorage` and trigger visual checkmarks dynamically.

---

## 2. Design Specification

### 2.1 UI Component (`#scholars-progress-dock`)
- A floating glassmorphic dock card in the bottom-right corner:
  - Header: `🎓 SCHOLAR'S JOURNEY` (`1/4 Completed`)
  - Checklist:
    - `[✓] 1. Explore your first map`
    - `[ ] 2. Create your first lore article`
    - `[ ] 3. Try @ cross-linking two entities`
    - `[ ] 4. Open Universal Search (Ctrl + K)`
  - Controls: `[Minimize _]`, `[Dismiss ✕]`

### 2.2 Task Tracker Engine (`public/js/app.js`)
- Checks completion flags in `localStorage.getItem('lorevault_scholar_tasks')`.
- Displays celebration toast (`🎉 Apprentice Scholar Badge Unlocked! All onboarding tasks completed!`) when all 4 tasks are finished.
