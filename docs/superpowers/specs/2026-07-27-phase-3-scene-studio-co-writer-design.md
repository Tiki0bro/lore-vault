# Design Specification — Phase 3: AI Scene Co-Writer, Character Personas & Chapter Studio

**Date**: 2026-07-27  
**Project**: LoreVault  
**Feature**: AI Scene Studio, Chapter Manuscript Editor, Character Personas & History Log, "POV Perspective Invoker", Character Persona Interview & Chat, Live `[[WikiLink]]` Auto-Complete & Lore Card Sync, AI Beat Prompter  

---

## 1. Overview
Phase 3 introduces an intelligent, lore-grounded writing studio designed specifically for novelists, campaign authors, and worldbuilders. Key capabilities:
1. **Dual Access Views**: Full-screen `🎬 Scene Studio` tab for dedicated writing sessions + quick slide-over `🎬 Scene Drawer` for writing alongside reference lore.
2. **Character Personas & Dynamic History Log**:
   - **Persona Engine**: Store character thoughts, desires (wants), core vulnerabilities (needs), and speech mannerisms.
   - **Dynamic History Log**: Append chronological story events to tagged characters' history logs as your manuscript progresses.
3. **"Prompt & Interview Persona" (`💬 Persona Interviewer`)**:
   - Pose questions directly to any character persona (e.g., *"Roland, how do you feel about traveling towards Fort Redcliff after Merton?"*).
   - Gemini adopts their thoughts, speech mannerisms, and history log to respond 100% in-character.
   - 1-click `✨ Insert Response into Scene Dialogue` button.
4. **"Invoke Character Perspective" (POV Co-Writer)**: Re-writes or co-writes scenes through a specific character's psychological lens and persona (`👁️ View Through Persona`).
5. **Live `[[WikiLink]]` Auto-Complete Editor**: Typing `[[` inside the manuscript opens a floating popover of vault entities. Selecting an entry inserts `[[Entity Name]]` and syncs live reference cards in the sidebar.
6. **AI Scene Beat Prompter (`POST /api/scene/suggest-beats`)**: Analyzes current scene prose, active cast, and location context to offer 3 lore-grounded narrative choices.

---

## 2. User Interface Design

### 2.1 Character Persona & Interviewer Tab (`🎭 Character Personas & Chat`)
- **Persona Profile Editor**:
  - Fields: **Inner Thoughts & Worldview**, **Wants & Desires**, **Needs & Vulnerabilities**, **Speech & Mannerisms**.
- **Dynamic History Log**: Chronological timeline of character events.
- **💬 "Interview Persona" Chat Console**:
  - Select Character Dropdown (e.g. `Roland Braxton`).
  - Question Input: e.g. *"What are you planning to do when we reach Fort Redcliff?"*
  - In-Character Chat History displaying responses styled in character voice.
  - Action Button per response: `✨ Insert Dialogue into Scene`.

### 2.2 Main Navigation Tab (`🎬 Scene Studio`)
- Header Navigation Button: `🎬 Scene Studio` (alongside `🌍 World Vault` and `🕸️ Knowledge Web`).
- **Layout**: Split-screen Studio View.
  - **Left Sidebar**:
    - **Chapter & Scene Outline**: List of chapters and scene cards with word counts.
    - **Active Persona & Interviewer Panel**: Quick chat console to prompt present characters during scene drafting.
    - **Live Lore Card Sync**: Displays mini lore card and persona summary when a `[[WikiLink]]` is hovered or selected in the editor.
  - **Right Main Studio**:
    - Manuscript Title & Word Count indicator.
    - **Rich Scene Editor**: Supports live `[[WikiLink]]` floating auto-complete popover.
    - **AI Toolbar**:
      - `🤖 Suggest 3 Scene Beats`
      - `👁️ Re-write Scene in [Character]'s POV`
      - `💬 Interview Character Persona`
      - `📜 Append Event to Character History`

---

## 3. Backend API Specifications

### 3.1 `POST /api/personas/interview`
- **Purpose**: Poses user questions to a character persona. Gemini LLM responds 100% in-character matching persona traits, speech mannerisms, history log, and world lore.
- **Request**:
  ```json
  {
    "characterId": "roland-braxton",
    "question": "What are you planning to do when we reach Fort Redcliff?",
    "persona": {
      "thoughts": "Calculative military captain, distrustful of magic",
      "wants": "Protect the Silverhawks",
      "needs": "Overcome grief of lost brother",
      "speech": "Short, gruff, military tone"
    },
    "history": [
      "Witnessed Shadar-Kai attack at Merton Village"
    ],
    "world_id": "default"
  }
  ```
- **Response**:
  ```json
  {
    "characterName": "Roland Braxton",
    "reply": "First thing we do? We double the perimeter guards and inspect the armory. If those Shadar-Kai bastards think they can breach Redcliff like they did Merton, they've got another thing coming."
  }
  ```

### 3.2 `POST /api/scene/pov-rewrite`
- **Purpose**: Uses Gemini 1.5 to re-write a scene or lore passage strictly through a chosen character's persona and emotional lens.

### 3.3 `POST /api/personas` & `GET /api/personas/:character_id`
- **Purpose**: Store and retrieve character persona profiles and history logs in SQLite (`character_personas` and `character_history` tables).

---

## 4. Verification & Testing Plan

1. **Persona Interviewer Test**:
   - Verify `POST /api/personas/interview` returns in-character responses matching speech mannerisms and history logs.
   - Verify `✨ Insert Dialogue into Scene` appends the response into the editor.
2. **Character Persona & History Storage Test**:
   - Verify creating a persona and appending history entries saves to SQLite and displays in the sidebar.
3. **POV Perspective Invoker Test**:
   - Verify `POST /api/scene/pov-rewrite` uses persona attributes to re-write scene prose into POV perspective.
4. **`[[WikiLink]]` Auto-Complete & Card Sync Test**:
   - Verify typing `[[` opens the floating popover, selects entities, and updates the sidebar reference card.
