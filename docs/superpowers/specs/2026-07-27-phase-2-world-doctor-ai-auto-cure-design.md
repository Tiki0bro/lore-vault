# Design Specification — Phase 2: Advanced World Doctor & AI Auto-Cure Suite

**Date**: 2026-07-27  
**Project**: LoreVault  
**Feature**: Advanced World Doctor, World Health Score, Deep Gemini AI Audit, Harmonize Auto-Patcher, Genre-Aware Auto-Cure Stubs, Smart Cross-Linker  

---

## 1. Overview
Phase 2 elevates the World Doctor from a diagnostic scanner into a **Deep LLM-Powered Worldbuilding Advisor**. It introduces:
1. **World Health Score Card & AI Executive Summary**: Overall vault health metric (`85 / 100`) with a 1-sentence breakdown of world strengths and missing lore gaps.
2. **Deep Gemini AI Narrative Audit**: Scans active world lore to detect narrative contradictions, timeline conflicts, and tone shifts.
3. **"One-Click AI Harmonize" (Conflict Auto-Patcher)**: Automatically rewrites conflicting statements across articles into a cohesive narrative with side-by-side diff previews.
4. **Genre-Aware AI Auto-Cure for Empty Stubs**: Generates rich 2-paragraph lore entries for empty stubs matching your selected genre (`High Fantasy`, `Dark & Gritty`, `Sci-Fi / Cyberpunk`, `Gothic Horror`).
5. **Smart Cross-Linker with Confidence Badges**: Scans orphaned articles with 0 links, assigns confidence indicators (`🟢 High`, `🟡 Medium`), and auto-inserts `[[WikiLinks]]`.

---

## 2. User Interface Design

### 2.1 World Doctor Modal Extensions (`#doctor-modal`)
- **Header Card — World Health Score & Executive Summary**:
  - Visual Score Badge: e.g. `Score: 88 / 100` (Color-coded: Green ≥90, Amber 70-89, Red <70).
  - AI Summary Banner: *"Your world has rich Location and Character lore, but lacks Magic Systems (2) and has 1 timeline contradiction."*
- **Deep AI Audit Tab**:
  - Button: `🤖 Run Deep AI Audit (Gemini)`.
  - Conflict Cards displaying severity (`🔴 Critical Conflict`, `🟡 Inconsistency`), affected articles, conflict details, and a `🪄 Harmonize with AI` button (opens side-by-side diff resolution preview).
- **Empty Stubs Section**:
  - Genre Selector per stub (`High Fantasy`, `Dark & Gritty`, `Sci-Fi / Cyberpunk`, `Gothic Horror`).
  - Action buttons: `🪄 Flesh Out with AI` (opens preview modal) and `🗑️ Delete`.
  - Header Action: `🪄 Bulk Auto-Cure All Stubs`.
- **Orphaned Articles Section**:
  - Link Suggestions list with confidence tags (`🟢 High Confidence`, `🟡 Medium Confidence`).
  - Header Action: `🔗 Auto-Link All Orphaned Lore`.

### 2.2 Stub Flesh Out Preview Modal (`#stub-preview-modal`)
- Genre & Tone Dropdown (`High Fantasy`, `Dark & Gritty`, `Sci-Fi / Cyberpunk`, `Gothic Horror`).
- Live preview rendered in WorldAnvil Simplified Standard syntax (`[quote]`, `[row]`/`[col]`, `[h2]`, `[b]`).
- Buttons: `Accept & Save Lore`, `🔄 Regenerate`, `Cancel`.

### 2.3 Conflict Harmonize Diff Modal (`#harmonize-diff-modal`)
- Side-by-side comparison showing:
  - **Original Article Text** (with conflicting statement highlighted in red).
  - **Harmonized AI Text** (with resolved statement highlighted in green).
- Button: `Apply Harmonized Lore`.

### 2.4 Inline Article Warning Banners (`#article-viewer`)
- Warning banner rendered at top of `#article-viewer` when opening an article with flagged narrative conflicts:
  - `⚠️ World Doctor Alert: Timeline conflict detected with [[King Valen]] — [🪄 Harmonize with AI]`

---

## 3. Backend API Specifications

### 3.1 `POST /api/audit/deep-ai`
- **Purpose**: Runs Gemini 1.5 over articles in the active world to compute Health Score and detect narrative contradictions.
- **Request**: `{ "world_id": "default", "provider": "gemini", "apiKey": "..." }`
- **Response**:
  ```json
  {
    "healthScore": 88,
    "summary": "Your world has rich Location and Character lore, but lacks Magic Systems (2) and has 1 timeline contradiction.",
    "conflicts": [
      {
        "id": "conflict-1",
        "type": "timeline_conflict",
        "severity": "critical",
        "articleId1": "king-valen",
        "articleTitle1": "King Valen",
        "articleId2": "siege-of-belrund",
        "articleTitle2": "Siege of Belrund",
        "description": "Article 'King Valen' states he died in 1402, but 'Siege of Belrund' states he signed a treaty in 1410.",
        "harmonizedText1": "King Valen abdicated his throne in 1402 due to failing health...",
        "harmonizedText2": "During the Siege of Belrund in 1410, Valen's son signed the treaty..."
      }
    ]
  }
  ```

### 3.2 `POST /api/audit/harmonize`
- **Purpose**: Applies AI-harmonized resolution text to conflicting articles.
- **Request**: `{ "conflictId": "conflict-1", "articleId1": "king-valen", "newContent1": "...", "articleId2": "siege-of-belrund", "newContent2": "..." }`
- **Response**: `{ "message": "Lore harmonized successfully across both articles!" }`

### 3.3 `POST /api/audit/flesh-out-stub`
- **Purpose**: Generates genre-aware lore for an empty stub.
- **Request**: `{ "stubId": "fort-redcliff", "title": "Fort Redcliff", "category": "Locations", "genre": "Dark & Gritty", "world_id": "default" }`
- **Response**:
  ```json
  {
    "id": "fort-redcliff",
    "title": "Fort Redcliff",
    "content": "[quote]“Blood waters the stones of Redcliff.” | — Garrison War Journal[/quote]\n\n[row]\n[col]\n[h1]Fort Redcliff[/h1]\nFort Redcliff is a grim mountain citadel..."
  }
  ```

### 3.4 `POST /api/audit/auto-crosslink`
- **Purpose**: Detects mentions of vault entities in orphaned articles and assigns confidence badges.
- **Request**: `{ "articleId": "merton-village", "world_id": "default" }`
- **Response**:
  ```json
  {
    "articleId": "merton-village",
    "suggestions": [
      { "targetTitle": "Belrund Bridge", "confidence": "high", "matchText": "Belrund Bridge" },
      { "targetTitle": "House Ravenwing", "confidence": "medium", "matchText": "Ravenwing" }
    ],
    "updatedContent": "Merton Village is located south of [[Belrund Bridge]]..."
  }
  ```

---

## 4. Verification & Testing Plan

1. **Health Score & Executive Summary Test**:
   - Verify `POST /api/audit/deep-ai` calculates score correctly and renders health card in Doctor Modal.
2. **Conflict Harmonize Test**:
   - Verify clicking `🪄 Harmonize with AI` opens the side-by-side diff modal and updates SQLite & Markdown files upon approval.
3. **Genre-Aware Stub Test**:
   - Verify selecting `Dark & Gritty` vs `Sci-Fi` changes the tone of generated stubs in `#stub-preview-modal`.
4. **Smart Cross-Linker Test**:
   - Verify confidence badges (`🟢 High`, `🟡 Medium`) appear next to link suggestions and `Auto-Link All` updates knowledge web.
