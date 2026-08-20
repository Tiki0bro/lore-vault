# Stage 2: Design Specification — AI Fight Simulator Engine

## Executive Summary
This document specifies the technical design, REST API contract, UI components, combat math simulation loop, and AI prose synthesis for LoreVault's **AI Fight Simulator Engine**.

---

## 1. REST API Contract (`POST /api/ai/simulate-fight` in `server.js`)

### 1.1 Request Payload
```json
{
  "combatant_a": {
    "name": "Sir Cedric",
    "hp": 45,
    "ac": 18,
    "attack_bonus": 6,
    "damage_dice": "1d8+4",
    "stance": "aggressive"
  },
  "combatant_b": {
    "name": "Gorgar the Orc Warlord",
    "hp": 52,
    "ac": 15,
    "attack_bonus": 5,
    "damage_dice": "2d6+3",
    "stance": "defensive"
  },
  "environment": "Midnight Castle Ramparts",
  "tone_preset": "grimdark",
  "generate_prose": true
}
```

### 1.2 Combat Simulation Algorithm
1. **Initiative Roll**: Roll `1d20 + DEX` modifier for both combatants to determine turn order.
2. **Round Loop** (max 30 rounds):
   - Attacker rolls `1d20 + attack_bonus`.
   - If `Nat 20`: Critical hit (doubles damage dice).
   - If `Nat 1`: Automatic miss / fumble.
   - If `roll >= defender.ac`: Hit! Roll damage dice (e.g. `1d8+4`), subtract from defender's HP.
   - If `defender.hp <= 0`: Defender is defeated. Break loop.
3. **AI Narrative Synthesis**:
   - If `generate_prose` is true and `no_generate_mode` is false: pass round-by-round log into Gemini with `callGeminiApi()` fallback retry loop to generate 3-4 paragraphs of battle narrative.

### 1.3 Response Payload
```json
{
  "success": true,
  "winner": "Sir Cedric",
  "total_rounds": 5,
  "combatants": {
    "a": { "name": "Sir Cedric", "remaining_hp": 18, "max_hp": 45 },
    "b": { "name": "Gorgar the Orc Warlord", "remaining_hp": 0, "max_hp": 52 }
  },
  "turn_log": [
    { "round": 1, "attacker": "Sir Cedric", "roll": 22, "hit": true, "damage": 9, "defender_hp": 43, "isNat20": false },
    { "round": 1, "attacker": "Gorgar", "roll": 14, "hit": false, "damage": 0, "defender_hp": 45, "isNat20": false }
  ],
  "narrative_prose": "Rain lashed against the granite battlements of Castle Ravenwatch as Sir Cedric drew his broadsword...",
  "mechanics_summary": "Sir Cedric defeated Gorgar the Orc Warlord in 5 rounds (18 HP remaining)."
}
```

---

## 2. Frontend UI Components (`public/index.html` & `public/js/app.js`)

### 2.1 Arena Modal (`#fight-simulator-modal`)
- Segmented Combatant Pickers: Select from vault statblocks or load custom templates.
- Equipment Config Inputs: `HP`, `AC`, `Attack Bonus (+X)`, `Damage Formula (e.g. 2d6+4)`.
- Environment & Stance Chips: `[ 🏰 Midnight Ramparts | 🌋 Lava Chasm | 🌲 Haunted Forest ]`.
- Action Buttons: `[ ⚔️ Simulate Fight | 📋 Copy Tactical Log ]`.

### 2.2 Duel Visualizer Drawer (`#fight-results-card`)
- Dynamic dual health bars (`#combatant-a-hp-bar` and `#combatant-b-hp-bar`).
- Victory Spotlight Banner (`🏆 SIR CEDRIC TRIUMPHANT`).
- Turn-by-Turn Dice Feed + AI Battle Prose Story View.
