# Stage 1: Persona Ideation & Initial Grilling — Canon Doctor & Auto-Fixing Engine 2.0

## Feature Overview
- **Feature Name**: Canon Doctor & Auto-Fixing Engine 2.0
- **Target Release Date**: 2026-08-20
- **Lead Champion Personas**: 🤖 Grant Harlow (AI-Forward), 👔 Ethen (PO), 🔍 Arthur Vance (Socratic Architect)
- **Primary Goal**: Upgrade Canon Doctor with **1-Click Auto-Crosslinking Insertion** across all worldbuilding articles and an **AI Continuity Contradiction Checker** (`POST /api/audit/check-continuity`) that uses Gemini to detect timeline conflicts, faction alignment contradictions, or deceased character references.

---

## Technical Specifications & Features

1. **Auto-Crosslinking Engine (`POST /api/audit/auto-crosslink`)**:
   - Scans all articles in a world and automatically wraps unlinked entity mentions (e.g. `High King Roderick`) in `@[High King Roderick](article_id)` tags.

2. **AI Continuity Contradiction Checker (`POST /api/audit/check-continuity`)**:
   - Compares article content against world canon and flags contradictions (e.g. *Character X dies in 1420 but appears in 1435 battle*).

---

## 🔍 Arthur "The Griller" Vance's Socratic Interrogation

1. **Arthur**: *"Will auto-crosslinking accidentally convert common words into links if an article title is short (e.g., 'The')?"*
   - **Riley & Alex**: *"Only titles longer than 3 characters (`length >= 4`) are considered for auto-crosslinking, and word boundaries (`\bTitle\b`) are strictly enforced."*
2. **Arthur**: *"Does AI Continuity Checking work when offline or in No-Generate Mode?"*
   - **Grant & Merryn**: *"If No-Generate Mode is enabled (`no_generate_mode = true`), the API returns HTTP 403 Forbidden with a clear guardrail message."*

---

## 👥 Persona Sign-Offs
- 🤖 **Grant (AI Novelist)**: Approved (AI continuity contradiction detection).
- 👔 **Ethen (PO)**: Approved (1-click auto-crosslinking across world).
- 🔍 **Arthur (Architect)**: Approved (Enforces word length guardrails).
