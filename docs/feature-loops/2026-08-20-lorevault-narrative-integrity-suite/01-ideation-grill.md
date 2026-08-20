# Stage 1: Persona Ideation & Initial Grilling
**Feature**: LoreVault Narrative & Integrity Suite: AI Lore Doctor, Prose Co-Writer & Secret DM Canon Filter
**Date**: 2026-08-20
**Feature Loop Directory**: `docs/feature-loops/2026-08-20-lorevault-narrative-integrity-suite/`

---

## 👥 Persona Team & Master Objectives

1. **AI Lore Doctor & Canon Integrity Auditor** (Ethen & Riley):
   - World health scanner (`#world-doctor-modal`) auditing articles for timeline contradictions, broken `@Title` cross-links, unlinked characters, and dead-end plot hooks.
2. **Weave Matrix Prose Co-Writer & Beat Synthesizer** (Elena & Grant):
   - Interactive drafting assistant in Weave Matrix synthesizing scene outlines into draft prose while honoring character tone chips and world canon.
3. **Secret DM Canon vs Public Player Filter Engine** (Arthur & Marcus):
   - Automated text filter engine stripping `[secret]...[/secret]` blocks and private pins for public player views and exports.

---

## 🔍 Arthur's 5-Whys Interrogation & Architecture Guarantees

1. **How does the AI Lore Doctor scan world health?**
   - REST endpoint `POST /api/worlds/:worldId/audit` parses all Markdown files in `storage/articles/`, checking `@Title` link integrity against SQLite database titles and detecting broken references.
2. **How does Weave Matrix Prose Co-Writer assemble context?**
   - Passes scene steps, character tone chips, pinned lore, and compiled prompt directives to Gemini AI streaming completion endpoint.
3. **How does Secret DM Canon Filter strip secret text?**
   - Helper function `stripSecretBlocks(markdownText)` replaces `[secret]...[/secret]` with empty string or `[Redacted]` placeholder when `is_secret = 1` or player mode is active.

---

**Ideation Verdict**: APPROVED BY ARTHUR VANCE & PERSONA PANEL. Proceeding to Stage 2 (Design Spec).
