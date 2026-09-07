# Design Specification — Triple Feature Sprint (Spotlight FTS5, NPC Dialogue Simulator, Census Dashboard)

**Topic**: Triple Feature Sprint (Features 5, 6, 7)  
**Date**: 2026-08-21  
**Status**: APPROVED DESIGN  

---

## 1. Overview

This sprint implements 3 high-impact features selected by the Product Lead:
1. **Enhanced Spotlight Search Palette (`Ctrl+K` FTS5 Snippets)**: Real-time fuzzy search with contextual text snippets, category chips, and keyboard navigation.
2. **NPC Interactive Dialogue Simulator**: AI-powered roleplay sandbox allowing authors and DMs to converse with NPCs in character based on lore traits.
3. **World Statistics & Demographics Census Dashboard**: Visual analytics tab showing category distributions, word count metrics, and demographic health indices.

---

## 2. API Endpoints & Specifications (`server.js`)

### 2.1 Spotlight Search (`GET /api/search/fts`)
- **Query Params**: `q` (search string), `world_id` (optional scope)
- **Response**:
  ```json
  {
    "query": "dragon",
    "totalMatches": 4,
    "results": [
      {
        "id": "art-101",
        "title": "Ancient Red Dragon",
        "category": "Races & Species",
        "sub_category": "Monsters",
        "snippet": "...a terrifying fire-breathing <mark>dragon</mark> residing in the volcanic...",
        "wordCount": 850
      }
    ]
  }
  ```

### 2.2 NPC Dialogue Simulator (`POST /api/simulation/npc-dialogue`)
- **Payload**: `{ character_id, user_message, dialogue_history, world_id }`
- **Response**:
  ```json
  {
    "characterId": "char-101",
    "characterName": "Lord Malakor",
    "reply": "You dare enter my sanctum unannounced?",
    "emotion": "suspicious",
    "dialogueHistory": [...]
  }
  ```

### 2.3 World Census Dashboard (`GET /api/census/stats`)
- **Query Params**: `world_id` (optional scope)
- **Response**:
  ```json
  {
    "world_id": "default",
    "totalArticles": 42,
    "totalWords": 34500,
    "avgWordsPerArticle": 821,
    "completenessScore": 94,
    "categoryBreakdown": [
      { "category": "Locations", "count": 14, "percentage": 33, "totalWords": 14200 }
    ],
    "healthMetrics": { "stubs": 2, "orphans": 3, "unmappedLocations": 1 }
  }
  ```

---

## 3. Frontend Component Structure (`public/index.html`, `public/js/app.js`)

1. **Spotlight Search (`#command-palette`)**:
   - Live debounced input listener searching `/api/search/fts`.
   - Renders search result list with snippet HTML highlights and category badges.
2. **NPC Dialogue Simulator (`#npc-dialogue-modal`)**:
   - Modal chat window with NPC portrait/avatar, emotion chip (`😠 Hostile`, `🤔 Suspicious`, `😊 Friendly`), message thread, and prompt input.
3. **World Census Dashboard (`#tab-census` & `view-census`)**:
   - Navbar button `<button class="tab-btn" id="tab-census" onclick="window.switchTab('census')">📊 World Census</button>`.
   - Dashboard grid with high-level metric cards, category word count distribution bars, and completeness progress rings.

---

## 4. Verification & Testing Strategy

1. **Automated Integration Tests (`test/api-suite.js`)**:
   - Test `GET /api/search/fts` returns highlighted snippets.
   - Test `POST /api/simulation/npc-dialogue` returns valid in-character response.
   - Test `GET /api/census/stats` returns accurate demographic counts.
2. **Empirical Verification**: Run `npm test` and verify green execution.
