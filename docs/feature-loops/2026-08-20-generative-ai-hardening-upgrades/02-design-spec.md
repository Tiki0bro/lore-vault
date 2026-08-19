# Stage 2: Design Specification & Architecture

**Feature Title**: Generative AI Hardening, Tonal Controls & Parsing Resilience
**Date**: 2026-08-20
**Mode**: Autonomous Fast-Track (`--auto`)

---

## 1. Technical Architecture & Component Upgrades

### Fix 1: Robust `safeExtractJSON(text)` Utility
- In `server.js`:
  - Implement `safeExtractJSON(text)` using boundary search (`[` to `]` or `{` to `}`) and `JSON.parse`.
  - Replace brittle string replacements in `/api/relationships/auto-extract` and `/api/relationships/spark-conflict`.

### Fix 2: Tonal Controls (`tone_preset`) in `/api/ai/assist`
- In `server.js`:
  - Expand `/api/ai/assist` to process `tone_preset`:
    - `grimdark`: "Write in a gritty, high-stakes, visceral dark fantasy tone."
    - `high_fantasy`: "Write in an epic, grand, mythic fantasy tone."
    - `cyberpunk`: "Write in a sleek, high-tech, neon-drenched cyberpunk noir tone."
    - `marketing_teaser`: "Write in an evocative, high-converting promotional teaser tone."
    - `analytical_audit`: "Provide precise, bulleted analytical insights without narrative prose."

### Fix 3: Global `no_generate_mode` Guardrail
- In `server.js`:
  - Check `req.body.no_generate_mode` or server config in `/api/ai/assist`.
  - When `no_generate_mode === true` and action is generative prose (`expand_lore`, `format_worldanvil`), return HTTP `403 Forbidden` with diagnostic explanation, while allowing analytical actions.

---

## 2. Arthur's Design Interrogation & Gate 1 Auto-Pass

> **Arthur**: *"Does `safeExtractJSON` gracefully handle cases where no valid JSON array or object exists in the string?"*
> 
> **Alex (Dev)**: *"Yes. If no JSON brackets are found or parsing fails, `safeExtractJSON` catches the error and returns `null` or an empty array fallback."*

**Arthur's Verdict**: PASSED (Auto-Approved for Stage 3).
