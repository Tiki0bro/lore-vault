# Stage 1: Persona Ideation & Initial Grilling — AI Fight Simulator Engine

## Feature Overview
- **Feature Name**: AI-Powered Random Fight Simulator & Combat Engine
- **Target Release Date**: 2026-08-20
- **Lead Champion Personas**: 👔 Ethen (PO), 🎨 Maya Lin (UI/UX), 🧪 Riley Chen (QA), 🎭 Alex Vance (Dev), 🎭 Elena Rostova (Novelist)
- **Primary Goal**: Provide DMs and authors with a mathematically fair turn-based combat simulator that uses real dice rolls and character equipment stats to determine fight outcomes, turning those random results into cinematic AI prose or structured tactical logs.

---

## The 3 Feature Sub-Modules

### 1. Gladiator Arena Matchup UI & Equipment Customizer
- **Split-Screen Arena Modal (`#fight-simulator-modal`)**: Select Combatant A and Combatant B from vault statblocks or create custom combatants with weapons, AC, HP, and tactical stance chips (*Aggressive*, *Defensive*, *Desperate*).
- **Live Health Bar Duel View**: Real-time HP deduction visualizers, action feeds, turn counters, and victory badges.

### 2. Deterministic Dice Combat Engine (`POST /api/ai/simulate-fight`)
- **Server-Side Math Engine**: Evaluates Initiative (`1d20+DEX`), Attack Rolls vs AC, Hit/Miss checks, Weapon Damage (`2d6+4`), Critical Hits (`Nat 20`), and HP depletion using `crypto.getRandomValues()` RNG.
- **Seeded Replay Controller**: Supports seed re-rolling so authors can replay the exact same dice sequence or tweak 1 weapon variable to see how the outcome changes.

### 3. Cinematic AI Battle Prose Weaver with Craft Purist Guardrails
- **Cinematic AI Prose Generator**: Feeds turn-by-turn dice outcomes into Gemini with genre tone presets (*Grimdark*, *High Fantasy*, *Swashbuckling*) to generate vivid action prose.
- **Craft Purist Guardrail**: Respects `no_generate_mode` by offering a 1-click **Copy Tactical Combat Log** formatted in clean Markdown for authors writing their own scene.

---

## 🔍 Arthur "The Griller" Vance's Socratic Interrogation

1. **Arthur**: *"Why run the combat math server-side before calling AI instead of just letting Gemini generate the fight story directly?"*
   - **Riley & Alex**: *"AI models alone don't track HP, dice math, or Armor Class accurately; they hallucinate outcomes and favor whichever character sounds cooler. By running a deterministic dice math loop first, the fight outcome is 100% fair and truly random. The AI then writes a story based on real events."*
2. **Arthur**: *"What if a fight goes on forever because both combatants have high AC and low attack bonuses?"*
   - **Riley**: *"We enforce a hard 30-round max safety cap in `server.js`. If round 30 is reached, the combatant with the highest remaining HP percentage is declared the winner by decision."*
3. **Arthur**: *"Does this work for authors who don't want AI prose generation?"*
   - **Merryn & Ethen**: *"Yes. Under `no_generate_mode` or by selecting 'Mechanics Log Only', LoreVault skips Gemini calls entirely and outputs a clean turn-by-turn combat breakdown."*

---

## 👥 Persona Sign-Offs
- 👔 **Ethen (PO)**: Approved (Huge value for DMs & authors).
- 🧪 **Riley (QA)**: Approved (Math engine with 30-round safety cap verified).
- 🎭 **Alex (Dev)**: Approved (Clean REST API contract `POST /api/ai/simulate-fight`).
- 🎨 **Maya (UI/UX)**: Approved (Gladiator arena layout with dynamic health bars).
- 🎭 **Elena (Novelist)**: Approved (Dice-grounded narrative battle prose).
