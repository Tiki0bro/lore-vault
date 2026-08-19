# Stage 2: Design Spec & Gap Remediation Loop

**Feature Title**: World Doctor & Vault Health Suite Overhaul
**Date**: 2026-08-20

---

## 1. Executive Summary

This specification overhauls LoreVault's **World Doctor & Vault Management Suite** to deliver advanced multi-factor canon diagnostics, 1-click batch automated repair, strict craft purist `no_generate_mode` compliance, dynamic severity-filtered UI tabs, and an exportable World Health Audit Report.

---

## 2. API Contract & Architectural Specifications

### 2.1 Extended Canon Diagnostics & Multi-Factor Health Score (`/api/audit/run`, `/api/audit/scan`)
- **Query / Body Parameter**: `world_id` (`'all'` or specific UUID).
- **Audit Checks**:
  1. **Stubs**: Articles with `< 50` non-boilerplate chars or template placeholders.
  2. **Misclassifications**: Articles whose title/content strongly match a different category (`smartCategorizeArticle`).
  3. **Duplicates**: Normalized title matches within the same world scope.
  4. **Orphans**: Articles with `0` relations and no `@[Title]` / `[[Title]]` cross-links.
  5. **Dead Cross-Links**: Articles containing `@[Title](template:id)` or `[[Title]]` referencing non-existent titles.
  6. **Circular Relationships**: Character/Faction/Location relations in SQLite forming closed loops (A -> B -> A).
- **Health Score Formula**:
  `Score = Math.max(0, Math.min(100, 100 - (deadLinks * 12 + duplicates * 10 + circularRels * 8 + misclassified * 5 + stubs * 3 + orphans * 2)))`

### 2.2 `no_generate_mode` & Tone-Aware Stub Auto-Cure (`POST /api/audit/flesh-out-stub`)
- **Input**: `{ stubId, title, category, genre, tone_preset }`
- **Behavior**:
  - If AI config has `no_generate_mode: true`, returns a **WorldAnvil Structural Outline** (table header + bulleted prompts for human writing) without invoking AI LLM prose generation.
  - If `no_generate_mode: false`, invokes Gemini LLM candidate loop with `genre` and `tone_preset` (`high_fantasy`, `grimdark`, `cyberpunk`, `analytical_audit`) to produce a rich 2-paragraph WorldAnvil standard article.

### 2.3 Bulk Batch Repair Endpoint (`POST /api/audit/batch-repair`)
- **Input**: `{ world_id, actions: ['fix_misclassified', 'crosslink_orphans', 'clean_stubs'] }`
- **Behavior**:
  - `fix_misclassified`: Updates SQLite `category` and `sub_category` to match `smartCategorizeArticle` predictions for all flagged articles, syncing Markdown storage.
  - `crosslink_orphans`: Auto-injects top candidate cross-links for orphaned articles based on title matches, syncing Markdown storage.
  - `clean_stubs`: Removes empty template boilerplate stubs or converts them to structured outlines.
- **Output**: `{ success: true, processedCount, updatedArticleIds: [] }`

### 2.4 Exportable World Health Report (`GET /api/audit/export-report`)
- **Input Query**: `world_id`
- **Behavior**: Compiles a comprehensive Markdown report containing:
  - World Title & Health Score Gauge
  - Category Breakdown & Word Counts
  - Issue Log (Critical, Warnings, Optimizations)
  - Relationship Graph Metrics
- **Output**: `{ filename, markdownContent }`

---

## 3. UI/UX Design & Dashboard Extensions (`#doctor-modal`)

1. **Dynamic Severity Filter Tabs**:
   - `All Issues`
   - `🔴 Critical` (Dead Links, Timeline Conflicts, Circular Rels)
   - `🟡 Warnings` (Misclassifications, Boilerplate Stubs)
   - `🟢 Optimizations` (Orphans, Missing Tags)
2. **Interactive Health Score Gauge**:
   - Dynamic SVG meter with HSL color interpolation (Green `>90`, Amber `>70`, Red `<70`).
3. **1-Click CTA Bar**:
   - `⚡ Launch Guided Repair Session`
   - `🪄 Batch Auto-Fix All`
   - `📄 Export Health Report`

---

## 🔥 Arthur's Grilling Remediation Log (Stage 2 Gate 1)
- **Question**: "How do you handle dead cross-links without breaking Markdown files on disk?"
- **Remediation**: The scanner parses all article titles in the DB into a set. Any `@[Title]` references not in the set are flagged as dead links. The repair action gives users the option to create a stub article for the missing target or strip the dead link bracket.
- **Question**: "What prevents `POST /api/audit/flesh-out-stub` from crashing if Gemini API key is missing?"
- **Remediation**: Hardcoded local WorldAnvil standard fallback template ensures 100% reliable execution even offline.
