# Stage 1: Persona Ideation & Initial Grilling

**Feature Title**: World Doctor & Vault Health Suite Overhaul
**Date**: 2026-08-20
**Mode**: Persona-Driven Feature Loop

---

## 👥 Persona Synthesis & Initial Perspectives

- 🔍 **Arthur "The Griller" Vance**: "Our existing World Doctor was a decent prototype, but it has 5 glaring vulnerabilities:
  1. It ignores `no_generate_mode`, violating Merryn's craft purist boundary when auto-curing stubs.
  2. Audit scanning is limited to basic stub/duplicate/orphan checks and LLM timeline conflicts—it misses dead cross-links, circular relationship dependencies, and tag mismatches.
  3. No bulk batch-repair endpoint exists, forcing users to click repair items one-by-one.
  4. Health scores are hardcoded static numbers rather than dynamic multi-factor metrics with severity breakdowns.
  5. There is no exportable World Health Report for worldbuilders or campaign managers.
  We will address all 5 flaws in this loop."

- 👔 **Ethen (PO)**: "I want a 1-click 'Batch Auto-Fix' button in the Doctor modal so users can clean up misclassifications and orphans in seconds, plus a downloadable Health Report."

- 🧪 **Riley (QA Lead)**: "Every audit action must be atomic and update both SQLite and Markdown files on disk without silent fails. All API errors must be wrapped in `sendApiError`."

- 🎭 **Alex (Dev & VTT Specialist)**: "We need structured endpoints: `POST /api/audit/batch-repair`, `GET /api/audit/export-report`, and enhanced `POST /api/audit/deep-ai` with dead-link and circular dependency detection."

- 🎭 **Morgan (World Anvil Migrator)**: "Post-import triage needs automatic dead-link scanning to highlight broken cross-links resulting from partial imports."

- 🖋️ **Merryn (Craft Purist)**: "If `no_generate_mode` is enabled, stub flesh-out MUST NOT generate AI prose. It must return a clean WorldAnvil structural outline with field prompts so I can write my own lore."

- 🎨 **Maya (Lead UI/UX Designer)**: "The Doctor modal needs dynamic severity tabs (Critical, Warnings, Optimizations), an interactive Health Score Gauge with HSL color scaling, and inline diff previews."

- 🤖 **Grant (AI-Forward Novelist)**: "AI Harmonization must support custom `tone_preset` inputs and fallback across Gemini candidate models cleanly."

- 📢 **Marcus (Marketing Strategist)**: "The exportable World Health Report in Markdown gives DMs and worldbuilders a shareable overview of their setting."

---

## 🔥 Arthur's Grilling Sign-Off
**Arthur's Verdict**: PASSED. The scope addresses all core user personas, respects craft purist guardrails, and hardens the audit engine. Proceed to Stage 2 (Design Spec).
