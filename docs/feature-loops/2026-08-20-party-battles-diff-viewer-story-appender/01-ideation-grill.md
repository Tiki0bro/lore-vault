# Stage 1: Persona Ideation & Initial Grilling — Party Battles, Diff Viewer & Story Appender

## Feature Overview
- **Feature Name**: Multi-Combatant Party Battles, Visual Diff Viewer & Story Appender Suite
- **Target Release Date**: 2026-08-20
- **Lead Champion Personas**: 🎭 Elena Rostova (Novelist), 🧪 Riley Chen (QA), 👔 Ethen (PO), 🔍 Arthur Vance (Socratic Architect)
- **Primary Goal**: Deepen LoreVault's feature set by adding multi-combatant party battle simulation with spell/special abilities, visual red/green inline diff viewing for revision rollbacks with a reversible safety guard, and 1-click fight narrative insertion into current articles with JSON template import/export.

---

## The 3 Feature Sub-Modules

### 1. Multi-Combatant Party Battle & Dynamic Spell Ability Simulator
- **Multi-Combatant Engine (`POST /api/ai/simulate-fight`)**: Accepts arrays of combatants for `party_a` and `party_b` (up to 4 vs 4), sorts group initiative, evaluates spell/recharge abilities (*Dragon Breath 6d6*, *Heal 2d8+4*), and simulates group combat.

### 2. Visual Red/Green Inline Diff Viewer & Reversible Rollback Guard
- **Visual Diff Renderer**: Renders clear green line additions (`+`) and red deletions (`-`) inside `#revision-history-modal`.
- **Reversible Rollback Safety Guard**: Automatically creates a timestamped pre-rollback snapshot before overwriting files so rollbacks themselves can be undone.

### 3. 1-Click Fight Story Appender & Custom Template Package Exchange
- **1-Click Story Appender (`✍️ Append to Current Article`)**: Appends generated fight narrative prose and dice logs directly to the active article in the editor with dual-sync disk saving.
- **Template Exchange (`/api/templates/export` & `/api/templates/import`)**: 1-click JSON export and import of custom category templates.

---

## 🔍 Arthur "The Griller" Vance's Socratic Interrogation

1. **Arthur**: *"Will party battles (e.g. 4 adventurers vs 1 dragon) cause the 30-round safety cap to trigger too often?"*
   - **Riley**: *"No; more combatants actually increase total damage dealt per round. The 30-round safety cap still protects against high-AC stalemates while party battles resolve in 4-8 rounds."*
2. **Arthur**: *"What happens if a user accidentally rolls back to an old revision they didn't mean to?"*
   - **Merryn & Arthur**: *"The Reversible Rollback Guard creates a pre-rollback snapshot file (`${timestamp}_prerollback_rev.md`) on disk before modifying the article. The user can simply open Revisions and revert back to the pre-rollback state instantly."*
3. **Arthur**: *"How does the 1-Click Story Appender format appended text?"*
   - **Ethen & Elena**: *"It appends a clean WorldAnvil section at the bottom of the article: `[h2]⚔️ Simulated Battle Outcome[/h2]` followed by the Gemini battle prose and collapsible dice breakdown."*

---

## 👥 Persona Sign-Offs
- 👔 **Ethen (PO)**: Approved (Eliminates manual copy-pasting & deepens combat).
- 🧪 **Riley (QA)**: Approved (Reversible rollback guard & diff test assertions ready).
- 🎭 **Elena (Novelist)**: Approved (Multi-combatant party fights with spell abilities).
- 🔍 **Arthur (Architect)**: Approved (100% fail-safe revision control).
