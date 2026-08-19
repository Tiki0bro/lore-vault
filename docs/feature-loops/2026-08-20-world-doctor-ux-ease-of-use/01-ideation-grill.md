# Stage 1: Persona Ideation & Initial Grilling

**Feature Title**: World Doctor UX Ease-of-Use & Dismissal Suite
**Date**: 2026-08-20
**Mode**: Persona-Driven Feature Loop

---

## 👥 Persona Synthesis & Initial Perspectives

- 🔍 **Arthur "The Griller" Vance**: "Our user discovery panel identified 3 critical usability bottlenecks in World Doctor:
  1. Beginners get overwhelmed by giant lists of 20+ issues without knowing where to start.
  2. Craft purists (Merryn) get penalized for intentional placeholder stubs that they haven't written yet.
  3. Authors (Marcus & Elena) have no quick way to copy a clean markdown health summary for readers or editors.
  We will solve all 3 in this sprint."

- 🎨 **Maya (Lead UI/UX Designer)**: "The 'Top 3 Quick-Fixes Hero Card' provides immediate clarity by presenting the top 3 highest-value actions with projected health score point gains (`+12 pts`)."

- 🖋️ **Merryn (Craft Purist)**: "The 'Ignore / Suppress Issue' button lets me mark intentional stubs as ignored so my health score stays at 100% without forcing me to add dummy text."

- 📢 **Marcus (Marketing Strategist)**: "The 1-click 'Copy Markdown Summary' button lets me instantly copy my world health metrics to Discord or Obsidian."

- 🧪 **Riley (QA Lead)**: "Ignored issues must persist in SQLite / local config so they remain suppressed across browser reloads."

- 🎭 **Alex (Dev & VTT Specialist)**: "We will store dismissed audit IDs in SQLite database table `ignored_audit_issues` or setting table and filter them out during `/api/audit/run` calculations."

---

## 🔥 Arthur's Grilling Sign-Off
**Arthur's Verdict**: PASSED. Clear user value, zero friction, robust DB persistence. Proceed to Stage 2 (Design Spec).
