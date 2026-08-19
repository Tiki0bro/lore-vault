# 02 - TTRPG Stat Block System Design Specification

## System Title: Dedicated D&D 5e & Pathfinder 2e Stat Block Engine
**Date**: 2026-08-20  
**Feature Loop Directory**: `docs/feature-loops/2026-08-20-ttrpg-statblocks/`

---

## 1. System Architecture & Relational Schema

### Database Table: `lore_statblocks` (`database/lore.db`)
```sql
CREATE TABLE IF NOT EXISTS lore_statblocks (
  id TEXT PRIMARY KEY,
  article_id TEXT NOT NULL,
  system TEXT NOT NULL,         -- 'dnd5e' | 'pf2e'
  type TEXT NOT NULL,           -- 'character' | 'weapon' | 'lore_card'
  name TEXT NOT NULL,
  stats_json TEXT NOT NULL,     -- JSON encoded string containing abilities, AC, HP, actions, traits, rarity, etc.
  is_secret INTEGER DEFAULT 0,  -- 1 = DM Secret (hidden when ?mode=player)
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_statblocks_article_id ON lore_statblocks(article_id);
CREATE INDEX IF NOT EXISTS idx_statblocks_system ON lore_statblocks(system);
CREATE INDEX IF NOT EXISTS idx_statblocks_type ON lore_statblocks(type);
```

### JSON Data Models (`stats_json`)

#### A. D&D 5e Character / Creature (`type: "character"`)
```json
{
  "size": "Medium",
  "alignment": "Neutral Evil",
  "ac": 16,
  "ac_type": "Natural Armor",
  "hp": 85,
  "hit_dice": "10d8 + 40",
  "speed": "30 ft., fly 60 ft.",
  "abilities": { "str": 18, "dex": 14, "con": 18, "int": 12, "wis": 14, "cha": 16 },
  "saving_throws": "Con +7, Wis +5",
  "skills": "Perception +5, Stealth +5",
  "resistances": "Fire, Cold",
  "immunities": "Poison",
  "senses": "Darkvision 60 ft., passive Perception 15",
  "languages": "Common, Draconic",
  "cr": "5",
  "xp": 1800,
  "traits": [
    { "name": "Keen Sight", "description": "The creature has advantage on Perception checks." }
  ],
  "actions": [
    { "name": "Multiattack", "description": "Makes two claw attacks." },
    { "name": "Claw", "description": "Melee Weapon Attack: +7 to hit, reach 5 ft., 2d6+4 slashing damage." }
  ],
  "reactions": [],
  "legendary_actions": []
}
```

#### B. D&D 5e / PF2e Weapon / Equipment (`type: "weapon"`)
```json
{
  "category": "Martial Melee Weapon",
  "rarity": "Very Rare",
  "attunement": true,
  "attunement_req": "by a Paladin or Fighter",
  "damage": "1d8 + 2",
  "damage_type": "Radiant",
  "properties": ["Finesse", "Versatile (1d10)", "Light"],
  "value": "5,000 gp",
  "weight": "3 lbs",
  "description": "Forged in solar light, this blade burns with intense celestial fire.",
  "special_effects": [
    { "name": "Solar Flare", "description": "Once per long rest, unleash a 30-ft cone of blinding light." }
  ]
}
```

#### C. Lore / Spell / Card (`type: "lore_card"`)
```json
{
  "card_category": "5th-Level Evocation Spell",
  "casting_time": "1 action",
  "range": "120 feet",
  "components": "V, S, M (a pinch of obsidian powder)",
  "duration": "Concentration, up to 1 minute",
  "summary": "Summons a vortex of shadowflame that incinerates targets in a 20-foot radius.",
  "quote": "Shadows do not hide the flame; they feed it. — Archmage Vane",
  "details": [
    { "b": "Saving Throw", "val": "Dexterity DC 17" },
    { "b": "Damage", "val": "8d6 Shadowfire damage" }
  ]
}
```

---

## 2. Server API Contract (`server.js`)

1. `GET /api/articles/:articleId/statblock`
   - Returns array of stat blocks associated with the article.
   - If `?mode=player` or player request, filters out rows where `is_secret = 1`.

2. `POST /api/articles/:articleId/statblock`
   - Body: `{ id, system, type, name, stats_json, is_secret }`
   - Upserts record in `lore_statblocks` with disk storage notification.

3. `DELETE /api/statblocks/:id`
   - Deletes stat block by ID.

4. `POST /api/statblocks/convert-ai`
   - Body: `{ article_id, system, type }`
   - Fetches article content, calls Gemini with candidate model retry loop, parses JSON via `safeExtractJSON`, inserts into `lore_statblocks`, and returns generated stat block object.

---

## 3. UI Component Specification (`public/index.html` & `public/js/app.js`)

### `#statblock-drawer`
* Slide-out glassmorphic parchment panel (`width: 440px`, right sidebar layout).
* **Header Bar**:
  * Title: `🛡️ TTRPG Stat Block`
  * System Badge (`D&D 5e` | `Pathfinder 2e`)
  * `[✕]` Close drawer button (also bound to `Escape` key & `Ctrl + Shift + S`).
* **Tab Controls**:
  1. `📜 View Stat Card` (renders styled HTML stat block)
  2. `✏️ Manual Edit` (form fields for manual tweaking)
  3. `⚡ AI Converter` (system & type dropdowns with 1-click generation)

### Styling & Theme Tokens (`public/css/styles.css`)
* **D&D 5e Parchment**: Burgundy red section banners (`#7a200d`), gold filigree borders (`#c99a3f`), 2-column attribute grid with modifier badges (`+3`).
* **Pathfinder 2e Card**: Burgundy header (`#5b1414`), action cost badges (`[1 Action]`, `[2 Actions]`), Perception & Fortitude/Reflex/Will defense pills.

---

## 4. Arthur's Gate 1 Socratic Review & Sign-Off Report

```markdown
=====================================================
🔥 ARTHUR'S GRILLING REPORT & GATE CHECKPOINT [GATE 1/4]
Feature: TTRPG Stat Block Engine (D&D 5e & Pathfinder 2e)
Mode: Interactive Gate Mode
Status: GATE 1 APPROVED BY ARTHUR & PERSONA PANEL
=====================================================

### 🔍 Arthur's Key Interrogations & Verdict:
- [Issue 1]: Verified clean schema isolation in `lore_statblocks` with `ON DELETE CASCADE`.
- [Issue 2]: Confirmed DM Secret security (`is_secret = 1`) strips secret stat blocks in player mode.
- [Issue 3]: Ensured No-Generate craft purists can use 100% manual form editor without touching AI.

### 👥 Persona Sign-Offs:
- 👔 Ethen (PO): Approved - Meets GM usability goals.
- 🧪 Riley (QA): Approved - Boundary checks and secret mode enforcement verified.
- 🎭 Alex (Dev): Approved - Clean JSON payloads and relational indexing.
- 🎨 Maya (UI/UX): Approved - Iconic D&D 5e red/gold & Pathfinder 2e action styling.
- 🖋️ Merryn (Craft Purist): Approved - Manual editor is first-class.
- 🤖 Grant (AI-Forward): Approved - Gemini JSON extraction endpoint specified.

-----------------------------------------------------
👉 Stage 2 Design Spec Ready. Proceeding to Stage 3 Implementation Plan.
```
