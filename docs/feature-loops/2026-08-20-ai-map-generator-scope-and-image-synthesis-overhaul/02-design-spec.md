# Stage 2: Design Spec & Gap Remediation Loop
**Feature**: AI Map Generator Scope Calibration & Multi-Provider Image Synthesis Overhaul
**Date**: 2026-08-20
**Feature Loop Directory**: `docs/feature-loops/2026-08-20-ai-map-generator-scope-and-image-synthesis-overhaul/`

---

## 🛠️ Technical Design Specification

### 1. UI/UX Modal Enhancement (`public/js/atlas-view.js` & `public/css/styles.css`)
- **AI Provider Selector Bar**:
  - Add explicit provider selection buttons inside `#gen-ai-settings`:
    - `🌸 Pollinations AI (Flux Model - Free / Keyless)` [Default]
    - `🤖 Google Gemini AI (Imagen 4.0 / Interactions API)`
- **Scope Cards Auto-Suggestion**:
  - When searching/selecting an article in the target checklist:
    - If article category is `Dungeons`, `Ruins`, `Fortresses`, `Sanctuaries`, auto-select `⚔️ Battlemap` scope!
    - If article category is `Settlements`, `Cities`, `Towns`, auto-select `🏰 City Map` or `🏡 Town Map` scope!
    - If article category is `Regions`, `Provinces`, `Kingdoms`, auto-select `🗺️ Region Map` scope!
- **Live AI Prompt Preview Box**:
  - Render an interactive `<div id="gen-prompt-preview">` in the modal that dynamically updates as the user clicks Scope Cards, Style Chips, or checks Target Articles.
  - Gives 100% visibility into what prompt will be sent to the AI!

### 2. Express Backend Prompt & Pin Placement Engine (`server.js`)
- **Enhanced `buildAIPromptPayload` Helper Function**:
  - Construct distinct, highly detailed prompts for each map scope:
    - **Battlemap**: `"Top-down 2D tactical combat battlemap grid, overhead 90-degree angle view, encounter map layout, stone ruins, tactical terrain features of {title}, {styleDirective}, {customPrompt}, no text, crisp detail, high contrast"`
    - **City**: `"Top-down urban city map plan, stone perimeter walls, cobblestone streets, district buildings, docks, overhead cartography view of {title}, {styleDirective}, {customPrompt}, no text"`
    - **Town**: `"Top-down village settlement map, rural farmlands, tavern, blacksmith, surrounding woodland glade, overhead cartography of {title}, {styleDirective}, {customPrompt}, no text"`
    - **Region**: `"Regional province fantasy map, trade roads, rivers, kingdom borders, county fortresses around {title}, {styleDirective}, {customPrompt}, hand-inked cartography"`
    - **World**: `"Grand continental fantasy world map, vast oceans, tectonic mountain ranges, empire borders around {title}, {styleDirective}, {customPrompt}, Tolkien-style cartography"`
    - **Treasure**: `"Weathered parchment treasure map, hand-drawn X marks the spot, dotted trail path, compass rose for {title}, {styleDirective}, {customPrompt}"`
- **Pin Isolation & Placement Rules**:
  - If `selectedArticleIds.length === 1`:
    - Create exactly **1 PIN** centered at `(x_pct: 0.50, y_pct: 0.50)` linked to that target article.
    - Do NOT query or place unrelated location pins.
  - If `selectedArticleIds.length > 1`:
    - Create pins for ONLY the checked target articles using force-directed layout.
  - If `selectedArticleIds` is empty/omitted:
    - Default to placing pins for checked location articles, or prompt user to check at least 1 location.

### 3. Multi-Provider Synthesis Pipeline
1. If Provider is `pollinations` (or Gemini returns 429/404 fallback):
   - Query `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1920&height=1080&seed=${seed}&model=flux&nologo=true`
2. If Provider is `gemini` and `GEMINI_API_KEY` is present:
   - Query Google Interactions API (`https://generativelanguage.googleapis.com/v1beta/interactions`) across `gemini-3.1-flash-image`, `nano-banana-pro-preview`, `imagen-4.0-generate-001`.

---

## 🔍 Arthur's Line-by-Line Spec Interrogation

- **Arthur**: *"Maya, how does the user know what prompt is actually being generated before spending 5 seconds waiting?"*
- **Maya**: *"We are adding a live `👁️ AI Prompt Synthesis Preview` directly above the Generate button. As you select 'Battlemap' and 'Grimdark', the text box updates in real-time!"*
- **Arthur**: *"Alex, what happens when a DM creates a map for 'Twin Pine Garrison'? Do they get 18 pins for distant cities on their garrison map?"*
- **Alex**: *"No. When 1 location article is checked, the backend isolates pin placement to ONLY that 1 article, placing it cleanly at the center of the garrison map."*
- **Arthur**: *"Riley, what if Pollinations AI is slow or times out?"*
- **Riley**: *"We set a strict 15-second timeout with progress indicators, and if both AI engines fail, we show a clean, high-contrast procedural cartography map with explicit notifications."*

---

**Gate 1 Verdict**: APPROVED BY ARTHUR VANCE & TEAM. Proceeding to Stage 3 (Implementation Plan).
