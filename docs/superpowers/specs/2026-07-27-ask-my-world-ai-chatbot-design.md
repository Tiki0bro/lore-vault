# Design Specification — Phase 1: "Ask My World" AI Chatbot Drawer

**Date**: 2026-07-27  
**Project**: LoreVault  
**Feature**: "Ask My World" AI Chatbot & Lore Q&A Engine  

---

## 1. Overview
The "Ask My World" AI Chatbot is a collapsible slide-over drawer in LoreVault that allows writers and worldbuilders to ask questions about their active world database (e.g. *"Who are the enemies of House Ravenwing?"* or *"Summarize the history of Belrund Bridge"*). 

The AI retrieves relevant lore articles matching the user's active world and optional category filter, queries Google Gemini API (or Ollama / local fallback), and returns answers with inline `[[WikiLinks]]` that open articles directly when clicked.

---

## 2. User Interface Design

### 2.1 Collapsible Side Drawer (`#ai-chat-drawer`)
- **Header Button**: `💬 Ask AI` button added to the main top navigation header bar.
- **Drawer Layout**: Slide-over panel docked on the right side of the screen (`width: 380px`, `z-index: 900`).
- **Drawer Header**:
  - Title: `💬 Ask My World AI`
  - Category Scope Dropdown: `All Categories`, `Characters`, `Locations`, `Factions`, `Species`, `Magic & Tech`, `History`, `Items`.
  - Close button (`✕`).
- **Chat Body**:
  - Scrollable message stream displaying user questions and AI responses.
  - AI responses parse `[[Article Title]]` syntax into clickable inline links (`<a onclick="window.app.loadArticle('id')">[[Article Title]]</a>`).
- **Chat Footer**:
  - Input textarea for typing questions.
  - Send button (`Send ➔`).
  - Clear Chat button (`🗑️`).

---

## 3. Architecture & Data Flow

```
[User Input in Drawer] ➔ [POST /api/ai/ask]
                             │
                             ├── 1. Filter articles by active world_id & optional category
                             ├── 2. Extract keywords from user question
                             ├── 3. Rank & retrieve top matching lore articles (up to 10)
                             ├── 4. Construct System Prompt + Canonical Lore Context
                             ├── 5. Query LLM (Google Gemini API / Ollama / Local Engine)
                             └── 6. Return response with [[WikiLinks]]
                             │
[Drawer Renders Answer] ◄────┘ (Inline [[WikiLinks]] open articles when clicked)
```

---

## 4. Backend API Specification

### `POST /api/ai/ask`
- **Request Payload**:
  ```json
  {
    "question": "Who are the leaders of House Ravenwing?",
    "world_id": "default",
    "category": "Factions",
    "provider": "gemini",
    "apiKey": "AIzaSy...",
    "model": "gemini-1.5-flash"
  }
  ```
- **Backend Retrieval Logic**:
  1. Executes SQL query filtering by `world_id` and optional `category`.
  2. Ranks articles using title & summary keyword density matching words in `question`.
  3. Formats top 5-10 articles into a clean context payload:
     ```
     --- ARTICLE: House Ravenwing (Category: Factions) ---
     Summary: ...
     Content: ...
     ```
  4. Prompt Template:
     ```
     You are the canonical World Lore Assistant for LoreVault. Use ONLY the following verified world lore to answer the user's question accurately.
     If an article is mentioned, wrap its title in [[WikiLink]] syntax (e.g. [[House Ravenwing]]).
     Be concise, engaging, and faithful to the lore.

     --- VERIFIED LORE CONTEXT ---
     [Context Payload]

     --- USER QUESTION ---
     [Question]
     ```
  5. Calls LLM provider (Gemini API via HTTP, Ollama, OpenAI, or local refiner).
  6. Returns JSON:
     ```json
     {
       "answer": "[[House Ravenwing]] is led by Lord Alistair Ravenwing from his seat at [[Ravenskeep]]...",
       "sources": [
         { "id": "house-ravenwing", "title": "House Ravenwing" }
       ]
     }
     ```

---

## 5. Verification & Testing Plan

1. **Drawer UI Toggle**:
   - Verify clicking `💬 Ask AI` opens and closes the drawer smoothly without overlapping existing editor panels.
2. **Category Scoping Test**:
   - Test asking a question with `Category: Factions` selected and verify only faction articles are included in the search context.
3. **Inline WikiLink Interactivity**:
   - Verify clicking a `[[WikiLink]]` inside a chat response loads that article directly into the main article viewer.
4. **Gemini API & Offline Fallback Test**:
   - Test with valid Gemini API key.
   - Test without API key to verify built-in offline engine fallback handles questions gracefully.
