# Stage 1: Persona Ideation & Initial Grilling
**Feature**: AI Map Generator Scope Calibration & Multi-Provider Image Synthesis Overhaul
**Date**: 2026-08-20
**Feature Loop Directory**: `docs/feature-loops/2026-08-20-ai-map-generator-scope-and-image-synthesis-overhaul/`

---

## 👥 Persona Team Assembly

- 👔 **Ethen (Product Owner)**: "Users want to select an article like *Twin Pine Garrison* or *Ancient Ruins of Aethelgard*, pick *Battlemap* or *City Map*, click generate, and get a crisp, localized tactical map or city plan for THAT specific location—not a giant world continent with 18 random pins!"
- 🎨 **Maya (Lead UI/UX)**: "The Generator modal needs crystal-clear provider indicators (`🌸 Pollinations AI (Flux)` vs `🤖 Google Gemini`), an explicit AI Prompt Preview box showing the exact prompt being sent, and an interactive Scope Selector (`⚔️ Tactical Battlemap`, `🏰 Urban City`, `🏡 Rural Town`, `🗺️ Regional Province`, `🌐 Grand World`)."
- 🤖 **Grant (AI Novelist)**: "The AI prompt synthesis logic must dynamically inject scope-specific art keywords: top-down grid for battlemaps, district stonework for cities, regional trade roads for provinces. And if Google Gemini API hits rate limits, Pollinations AI (Flux) must step in seamlessly with full prompt fidelity!"
- 🧪 **Riley (QA Lead)**: "Zero silent fallbacks. If a user selects 1 location article (e.g. *Ancient Ruins of Aethelgard*), we must NOT scatter 18 random pins across a 50ft battlemap! The map must either feature 1 centered focus pin or sub-location pins."
- 🔍 **Arthur "The Griller" Vance (Socratic Architect)**: "Let's grill this down to the core. Why was the user frustrated? Because the prompt generator was sending generic continent descriptions, the UI gave no preview of the prompt, and the pin placer was dumping world pins onto local encounter grids! We need surgical scope prompt synthesis, clean pin scoping, and bulletproof provider selection."

---

## 🔍 Arthur's 5-Whys Interrogation & Root Value Analysis

1. **Why is the feature still frustrating the user?**
   - Because when a user wants a map of a dungeon/ruin (*Ancient Ruins of Aethelgard*), selecting *Battlemap* was still generating a macro continental map image with 18 world pins scattered across it!
2. **Why was it generating a continent?**
   - The AI prompt builder was using generic fallback strings, and the active scope card selection was not dynamically building distinct prompts for localized scopes (*battlemap*, *city*, *town*) vs macro scopes (*region*, *world*).
3. **Why were 18 pins appearing on a battlemap?**
   - The pin placement engine defaulted to fetching ALL 18 world location articles whenever article checkboxes weren't explicitly filtered to 1 single location.
4. **What is the exact target user experience?**
   - Selecting a location article auto-selects its article checkbox, auto-fills the map title, sets the ideal scope (*battlemap* for dungeons/ruins/fortresses, *city* for settlements), builds a rich localized AI prompt, and renders a stunning, focused map with 1 centered location pin or zero scatter!
5. **How do we prove it works empirically?**
   - Integration tests verifying prompt synthesis strings for all 6 scopes (`battlemap`, `city`, `town`, `region`, `world`, `treasure`), single-pin placement logic, and multi-provider AI image generation.

---

## 📋 Key Agreed Requirements & Architecture

1. **Explicit AI Prompt Builder & Live Preview**:
   - Add a collapsible `👁️ AI Prompt Synthesis Preview` in `#atlas-generate-modal` showing the exact text sent to Pollinations/Gemini.
2. **Dedicated Scope Prompt Directives**:
   - `battlemap`: `"Top-down 2D tactical combat battlemap grid, overhead 90-degree angle, encounter layout, ruins/fortress of {title}, high contrast combat map, no text, crisp detail"`
   - `city`: `"Top-down urban city map plan, stone perimeter walls, cobblestone streets, district buildings, docks, overhead cartography view of {title}, no text"`
   - `town`: `"Top-down village map, farmlands, tavern, blacksmith, surrounding woodland glade, overhead cartography of {title}, no text"`
   - `region`: `"Regional province map, trade roads, rivers, kingdom borders, county fortresses around {title}"`
   - `world`: `"Grand continental fantasy world map, tectonic mountain ranges, vast oceans, empire borders"`
   - `treasure`: `"Weathered parchment treasure map, hand-drawn X marks the spot, dotted trail path, compass rose"`
3. **Single Location Pin Scoping**:
   - When 1 location article is checked, place ONLY 1 centered pin at `(50%, 50%)` labeled with the location title. Do NOT query or place unrelated world location pins.
4. **Multi-Provider Agility**:
   - Support `🌸 Pollinations AI (Flux - Keyless Free)` and `🤖 Google Gemini (Imagen 4.0 / 3.1 Flash)`.

---

**Ideation Verdict**: APPROVED BY ARTHUR VANCE & PERSONA PANEL. Proceeding to Stage 2 (Design Spec).
