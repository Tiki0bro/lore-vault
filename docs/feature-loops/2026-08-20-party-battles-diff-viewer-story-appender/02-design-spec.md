# Stage 2: Design Specification — Party Battles, Diff Viewer & Story Appender

## Executive Summary
This document specifies the technical design, API payloads, visual diff formatting, and template exchange mechanisms for LoreVault's **Party Battles, Visual Diff Viewer & Story Appender Suite**.

---

## 1. REST API Contracts & Endpoint Specifications

### 1.1 Multi-Combatant Party Battle (`POST /api/ai/simulate-fight` Expansion)
- Accepts single combatants `combatant_a`/`combatant_b` OR arrays `party_a`/`party_b`.
- Each combatant object supports:
  - `name`, `hp`, `max_hp`, `ac`, `attack_bonus`, `damage_dice`, `stance`
  - `special_ability`: `{ name: "Dragon Breath", damage_dice: "6d6", hp_trigger_pct: 50 }`
- Evaluates group initiative, executes party turn loop, logs damage dealt by individual team members, and evaluates surviving party.

### 1.2 Reversible Rollback Guard (`POST /api/articles/:id/rollback`)
- Before writing `rawContent` to `/storage/articles/${articleId}.md`, reads current article file content and saves non-destructive snapshot `storage/articles/history/${articleId}/${timestamp}_prerollback_rev.md`.

### 1.3 Template Import & Export Exchange
- `GET /api/templates/export` — Serializes all rows from `lore_templates` table into a downloadable JSON bundle.
- `POST /api/templates/import` — Accepts `{ templates: [...] }`, inserts new custom templates into `lore_templates`, and returns count of imported entries.

---

## 2. Frontend UI Enhancements

### 2.1 1-Click Story Appender (`#fight-simulator-modal`)
- Button: `✍️ Append Battle Narrative to Article`
- Action: Appends `\n\n[h2]⚔️ Battle Outcome: ${winner}[/h2]\n\n${narrative_prose}` to editor text and triggers dual-sync save.

### 2.2 Visual Line-by-Line Diff Viewer (`#revision-history-modal`)
- Renders green background/text for added lines (`+ `) and red background/text for deleted lines (`- `) when comparing target snapshot against current article content.
