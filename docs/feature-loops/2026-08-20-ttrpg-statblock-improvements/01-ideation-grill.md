# 01 - Ideation & Arthur's Socratic Grilling

## Feature Title: TTRPG Stat Block Engine Improvements (Interactive Dice Roller, VTT Exporters, Bestiary Index & Article Embeds)
**Date**: 2026-08-20  
**Feature Loop Directory**: `docs/feature-loops/2026-08-20-ttrpg-statblock-improvements/`

---

## Persona Ideation & Value Proposition

* **🎭 Alex (Dev & VTT Specialist)**: "Now that we have structured stat block data in SQLite, DMs need an **Interactive Dice Roller** (click `2d8 + 4` or `+7 to hit` to roll with advantage/disadvantage) and a **VTT Exporter** (`Foundry VTT JSON` & `5eTools JSON`) to instantly bring monsters into their digital gaming sessions."
* **🎨 Maya (Lead UI/UX Designer)**: "We should add a **Vault Bestiary & Armory View** to filter monsters by Challenge Rating (CR 0–30), filter weapons by rarity (*Rare*, *Legendary*), and browse lore spells across the entire active world."
* **🎭 Morgan (World Anvil Migrator)**: "DMs want the option to embed stat cards directly inside article text using an inline `[statblock]` or `[statblock id="..."]` tag parsed by [wa-parser.js](file:///c:/Users/EthenGreening/.gemini/antigravity/scratch/lore-vault/public/js/wa-parser.js)."
* **🤖 Grant (AI-Forward Novelist)**: "We can add an **AI Encounter Generator** into the Bestiary view that constructs balanced encounter slates based on selected vault monsters and party level."
* **🧪 Riley (QA Lead)**: "Dice rolling logic must handle complex expressions (`1d8 + 4 + 2d6 fire`), critical hit math, and zero silent NaN errors. Inline stat block embeds must respect DM secret mode (`is_secret = 1`)."

---

## 🔍 Arthur "The Griller" Vance's Incisive Interrogations

### Question 1: Dice Rolling Mechanics & Complexity Tax
> **Arthur**: "Are we writing a full physics-based 3D dice engine, or a lightweight, instant mathematical dice roller with visual feedback?"
* **Alex's Defense**: "A lightweight, instant JS dice parser (`parseDiceExpression('2d8+4')`) with animated roll result badges, crit indicators (Natural 20 / Natural 1), and Advantage/Disadvantage toggles delivers maximum speed at the table without heavy 3D WebGL bundle bloat."
* **Arthur's Verdict**: *Approved.* Lightweight mathematical dice parser avoids WebGL performance tax while giving DMs instant table utility.

### Question 2: VTT Export Format Standards
> **Arthur**: "Foundry VTT and Roll20 have different JSON schemas. How do we prevent export code sprawl?"
* **Alex's Defense**: "We build a modular `VTTSerializer` with distinct target format adapters (`foundry5e`, `roll20`, `json`). It maps our `lore_statblocks` JSON structure into standard Foundry VTT v11/v12 Actor JSON items."
* **Arthur's Verdict**: *Approved.* Modular adapter pattern prevents monolithic file growth.

### Question 3: Inline BBCode Embedding vs Drawer Performance
> **Arthur**: "If an article embeds 5 stat blocks via `[statblock]` tags, will it cause duplicate DB queries or layout shifts?"
* **Morgan's Defense**: "When fetching an article details payload from `GET /api/articles/:id`, the server attaches the article's `statblocks` array. `wa-parser.js` renders embedded stat cards synchronously without extra client-side fetch calls."
* **Arthur's Verdict**: *Approved.* Server-side payload bundling eliminates N+1 fetch cascades.

---

## Consensus & Stage 1 Sign-Off
Arthur and the 10-persona panel unanimously approve advancing to **Stage 2: Design Specification**.
