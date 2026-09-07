# Stage 1 & Stage 2: Ideation Grill & Design Spec — Character Persona & AI NPC Chat

**Feature**: Character Persona Matrix & Interactive AI NPC Dialogue Simulator  
**Date**: 2026-08-21  
**Author**: Arthur "The Griller" Vance & Persona Panel  

---

## 1. Persona Ideation & Socratic Grilling

### Persona Feedback:
- 🎭 **Elena Rostova (Novelist)**: "I need to define my characters' internal Wants, Needs, and Speech Mannerisms so their dialogue stays authentic."
- 🤖 **Grant Harlow (AI Novelist)**: "A live chat modal where DMs and authors can roleplay directly with NPCs using their full lore context is a game changer."

### Arthur's Socratic Grill Pass:
> **Question**: How do we ensure the AI NPC doesn't break character or invent non-canon facts?  
> **Answer**: The system prompt injects character persona attributes (`thoughts`, `wants`, `needs`, `speech_mannerisms`) alongside article lore summary, and enforces in-character roleplay guardrails.

---

## 2. Design Specification

### 2.1 Backend SQLite Schema & REST Endpoints
- Table `character_personas` (`character_id TEXT PRIMARY KEY, thoughts TEXT, wants TEXT, needs TEXT, speech_mannerisms TEXT, updated_at DATETIME`).
- `GET /api/articles/:id/persona`: Returns persona details.
- `POST /api/articles/:id/persona`: Upserts persona details.
- `POST /api/ai/npc-chat`: Accepts `{ character_id, user_message, chat_history }` and returns AI in-character reply.

### 2.2 UI Component (`#ai-npc-chat-modal`)
- Live chat modal in `public/index.html` with chat message stream, message input box, `[💬 Send Message]`, and `[📋 Copy Dialogue]` actions.
- Form fields in article editor for persona fields (`Thoughts`, `Wants`, `Needs`, `Mannerisms`).
