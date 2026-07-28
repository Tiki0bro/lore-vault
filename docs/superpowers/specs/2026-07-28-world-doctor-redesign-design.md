# World Doctor & Vault Management Suite — Design Spec

**Date**: 2026-07-28  
**Topic**: World Doctor Redesign & Post-Import Triage Suite  
**Status**: Approved  

---

## Executive Summary
The World Doctor & Vault Management Suite transforms the existing static audit modal into an interactive, intuitive, dual-mode vault repair and world sorting hub. It features a **World Health Scorecard**, a **1-Click Guided Repair Session Wizard**, granular **Diagnostic Issue Tabs**, and an **Automated Post-Import Triage Pipeline** that helps users sort, clean, and organize imported and existing world lore effortlessly.

---

## 1. System Architecture & Components

```
┌────────────────────────────────────────────────────────────────────────┐
│                        User Interface Layer                            │
├──────────────────────────────────┬─────────────────────────────────────┤
│   Post-Import Triage Modal       │   Dual-Mode Doctor & Vault Manager  │
│   (Auto-launches on Zip/JSON)    │   - Health Scorecard & World Selector│
│                                  │   - 1-Click Guided Session Wizard   │
│                                  │   - 5 Granular Issue Tabs           │
└────────────────┬─────────────────┴──────────────────┬──────────────────┘
                 │                                    │
                 ▼                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      Frontend App Controller                           │
│                      (public/js/app.js)                                │
│   - Guided Session Queue Manager (next/prev/apply/skip)                │
│   - Interactive Side-by-Side Diff & Merge Renderer                    │
│   - Multi-World Filter & Transfer State                                │
└────────────────┬────────────────────────────────────┬──────────────────┘
                 │                                    │
                 ▼                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      Backend REST API Layer                            │
│                      (server.js Node/Express)                          │
│                                                                        │
│  GET /api/audit/run?world_id=...     -> Scoped Vault Diagnostic        │
│  GET /api/audit/guided-session       -> Queued 1-by-1 Repair Items     │
│  POST /api/audit/apply-action        -> Granular Fix (merge/recat/stub)│
│  POST /api/audit/deep-ai             -> Gemini Narrative & Timeline    │
│  POST /api/import/zip                -> Smart Import + Auto-Triage Payload│
└────────────────────────────────────────────────────────────────────────┘
```

### Core Components
1. **Multi-World Diagnostic & Scoped Audit Engine (`server.js`)**:
   - Computes dynamic **World Vault Health Score (0–100)** with weighted penalties:
     * Duplicate Title Double-Ups: `-10` pts
     * Narrative/Timeline Conflicts: `-15` pts
     * Misclassified Categories: `-5` pts
     * Empty/Boilerplate Stubs: `-3` pts
     * Unlinked Orphan Lore: `-2` pts
   - Scopes audit scans by `world_id` (`all`, `default`, or specific imported world ID).

2. **Guided Repair Session Engine (`server.js` + `app.js`)**:
   - Compiles a sequential queue of repair items across all issue categories.
   - Executes discrete actions per issue:
     * `recategorize` (Move to suggested category)
     * `merge_duplicates` (Combine 2 duplicate entries into a single master article)
     * `delete_duplicate` (Remove redundant copy)
     * `autocure_stub` (Generate genre-aware lore via LLM)
     * `delete_stub` (Purge empty placeholder)
     * `harmonize_conflict` (Apply AI timeline resolution)
     * `skip` / `dismiss`

3. **Automated Post-Import Triage Pipeline (`server.js` + `app.js`)**:
   - On completing a World Anvil `.zip` or `.json` import, returns an **Instant Triage Payload**.
   - Auto-opens an **Import Diagnostics Modal** displaying imported articles, auto-categorizations, potential cross-world overlaps, and instant repair prompts.

4. **Dual-Mode World Doctor Container (`index.html`, `app.js`, `styles.css`)**:
   - 1024px responsive dashboard container housing World Scope Selector dropdown, Health Metric Scorecard, **"⚡ Launch Guided Doctor Session"** CTA button, and 5 interactive tabs with side-by-side diff previews.

---

## 2. UI Layout & User Experience

### Doctor Dashboard Layout (`#doctor-modal`)
* Header bar with World Scope Dropdown (`All Worlds`, `Primary World`, `Imported World`).
* Health Score gauge (`0-100`) + summary stat cards for Duplicates, Misclassified, Stubs, AI Conflicts, and Orphans.
* Prominent CTA banner: **"⚡ Launch Guided Doctor Session"** with active issue count badge.
* Interactive Tab Navigation: `[ 📊 Overview ] [ 👯 Duplicates ] [ ⚠️ Misclassified ] [ 🧹 Stubs ] [ 🤖 AI Conflicts ] [ 🏝️ Orphans ]`.

### Guided Repair Session Wizard Flow
* Screen transition into a step-by-step repair card with a progress bar (`Issue 3 of 10 - 30%`).
* Two-Column comparison card:
  - **Left Pane**: Current article details (Title, Category, Excerpt, World ID).
  - **Right Pane**: Proposed Doctor Fix (Suggested Category, Duplicate Copy Details, AI Lore Preview, or Timeline Harmonization).
* Action Bar: `[ ✓ Approve Fix ] | [ ✏️ Custom Edit ] | [ ⏩ Skip ]`.
* Completion Card celebrating improved Health Score (`Score improved from 72/100 ➔ 98/100`).

### Automated Post-Import Triage Modal (`#import-triage-modal`)
* Auto-launches post-import with:
  - Summary banner: `Imported N articles into <World Name>`.
  - Diagnostics breakdown: Correctly categorized vs misclassified vs duplicate overlaps.
  - Buttons: `[ ⚡ Run Guided Import Triage ]` | `[ 📚 Go to Lore Library ]`.

---

## 3. REST API Specifications

### `GET /api/audit/run?world_id={worldId}`
Returns scoped vault diagnostic summary, counts, health score, and categorized issue lists.

### `GET /api/audit/guided-session?world_id={worldId}`
Returns an ordered array of queued `GuidedSessionItem` objects for 1-by-1 repair sessions.

### `POST /api/audit/apply-action`
Executes single or batch repair actions (`recategorize`, `merge_duplicates`, `delete_article`, `autocure_stub`, `harmonize_conflict`, `ignore`).

### Updated `POST /api/import/zip` & `POST /api/import/worldanvil`
Returns imported count, image count, and an instant `importAudit` payload.

---

## 4. Verification Plan
1. **Server Diagnostics**: Test API endpoints for clean execution and valid JSON structures under different `world_id` scopes.
2. **UI Audit Dashboard & Tabs**: Verify header score calculations, scope dropdown updates, and tab switching.
3. **Guided Repair Session**: Test stepping through repair queue items 1-by-1, approving fixes, merging duplicates, auto-curing stubs, and verifying health score updates.
4. **Post-Import Triage**: Upload a ZIP/JSON archive and verify the automatic popup of the import triage dialog.
