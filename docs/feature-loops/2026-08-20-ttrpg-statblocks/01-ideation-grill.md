# 01 - Ideation & Arthur's Socratic Grilling

## Feature Title: D&D 5e & Pathfinder 2e Stat Block Engine
**Date**: 2026-08-20  
**Feature Loop Directory**: `docs/feature-loops/2026-08-20-ttrpg-statblocks/`

---

## Persona Ideation & Value Proposition

* **👔 Ethen (Product Owner)**: "Worldbuilders and DMs need an effortless way to convert narrative lore into ready-to-play game mechanics for D&D 5e and Pathfinder 2e without clogging their core article text. A dedicated drawer with interactive stat blocks gives DMs instant table usability."
* **🎭 Alex (Dev & VTT Specialist)**: "We need a clean relational schema (`lore_statblocks`) with a validated JSON payload structure for attributes, AC, HP, actions, damage rolls, and traits so stats can easily be serialized, edited, and queried."
* **🎨 Maya (Lead UI/UX Designer)**: "The stat blocks must look and feel iconic! D&D 5e stat cards must feature red header bars, gold filigree dividers, and 2-column attribute boxes. Pathfinder 2e stat cards need official action icons (`[1 Action]`, `[2 Actions]`, `[Reaction]`) and defense pills."
* **🤖 Grant (AI-Forward Novelist)**: "The `POST /api/statblocks/convert-ai` endpoint should analyze the article lore text using Gemini and automatically extract accurate CR, ability scores, hit points, spells, and weapon properties."
* **🖋️ Merryn (Craft Purist)**: "The manual editor MUST be as first-class as the AI converter! If No-Generate mode is on, or a DM wants exact homebrew numbers, they must have 100% manual control over every field."
* **🧪 Riley (QA Lead)**: "What happens when an article has no stat block? What if Gemini returns invalid JSON? What if a user switches between D&D 5e and Pathfinder 2e? DM secret filtering (`is_secret = 1`) must prevent players from seeing monster stats in public view mode (`?mode=player`)."

---

## 🔍 Arthur "The Griller" Vance's Incisive Interrogations

### Question 1: YAGNI & Database Bloat
> **Arthur**: "Why introduce a new database table `lore_statblocks` instead of just saving stat blocks as BBCode in the article Markdown?"
* **Alex's Defense**: "If stat blocks are stored in a relational SQLite table, we can index by Challenge Rating (`cr`), Game System (`dnd5e`/`pf2e`), and Entity Type (`character`/`weapon`/`lore_card`). A DM can quickly filter all CR 5 monsters in their world. Storing structured JSON in SQLite while keeping Markdown narrative clean is the optimal hybrid architecture."
* **Arthur's Verdict**: *Approved.* Relational indexing for CR and system types justifies the SQLite table, provided cascade deletion (`ON DELETE CASCADE`) prevents orphaned stat blocks when articles are deleted.

### Question 2: AI Hallucination & Rule Accuracy
> **Arthur**: "How do you ensure Gemini generates valid D&D 5e / PF2e stat blocks instead of making up fake rules or malformed JSON?"
* **Grant's Defense**: "We enforce strict JSON schemas in the system prompt for `/api/statblocks/convert-ai`, fallback model retry loops (`callGeminiApi`), and runtime validation via `safeExtractJSON`. If any required fields are missing, sensible default fallbacks are injected."
* **Arthur's Verdict**: *Approved.* Model retry loops + JSON boundary extraction (`safeExtractJSON`) + manual editor overrides eliminate AI lock-in.

### Question 3: Player Mode Privacy (DM Secrets)
> **Arthur**: "If a player visits the public shared atlas or web portal, can they see the DM's monster stat block and secret legendary actions?"
* **Riley's Defense**: "No. The `lore_statblocks` table includes `is_secret INTEGER DEFAULT 0`. All `GET /api/articles/:articleId/statblock` endpoints evaluate `?mode=player` or share token states. When `mode=player` and `is_secret=1`, the API returns `404 Not Found` or strips secret actions."
* **Arthur's Verdict**: *Approved.* DM secrecy is respected at the backend API layer.

---

## Consensus & Stage 1 Sign-Off
Arthur and the 10-persona panel unanimously approve advancing to **Stage 2: Design Specification**.
