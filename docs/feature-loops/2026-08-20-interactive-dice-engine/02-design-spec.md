# Stage 2: Design Specification — Interactive Virtual Dice Engine

## Executive Summary
This document specifies the technical design, UI components, math evaluation parser, and event integration for LoreVault's **Interactive Virtual Dice Engine**.

---

## 1. Core Dice Math & Parsing Engine (`public/js/app.js` & `public/js/wa-parser.js`)

### 1.1 `evaluateDiceExpression(expression, options)`
- **Parameters**:
  - `expression` (string): e.g. `'1d20+7'`, `'2d6+4'`, `'1d20'`, `'3d8+5'`.
  - `options` (object): `{ advantage: false, disadvantage: false, isCrit: false, isSecret: false, label: '' }`.
- **RNG**: Uses `crypto.getRandomValues(new Uint32Array(1))` for cryptographically fair randomness.
- **Advantage / Disadvantage**:
  - If `options.advantage` is true for a `1d20` roll: rolls 2d20, keeps highest (`kh1`), returns breakdown `[18, 7] -> 18`.
  - If `options.disadvantage` is true for a `1d20` roll: rolls 2d20, keeps lowest (`kl1`), returns breakdown `[18, 7] -> 7`.
- **Critical Hits**:
  - Natural 20 on d20: Flags `isNat20 = true`, triggers gold particle pulse animation.
  - Natural 1 on d20: Flags `isNat1 = true`, triggers red fumble alert.
  - If `isCrit` is true: doubles number of damage dice (e.g. `2d6+4` -> `4d6+4`).
- **Return Object**:
  ```json
  {
    "expression": "1d20+7",
    "total": 25,
    "rolls": [18],
    "modifier": 7,
    "breakdown": "1d20(18) + 7 = 25",
    "isNat20": true,
    "isNat1": false,
    "isSecret": false,
    "label": "Greataxe Attack",
    "timestamp": 1789012345
  }
  ```

### 1.2 `[roll]` BBCode & Markdown Parser (`public/js/wa-parser.js`)
- Recognizes `[roll]2d6+4[/roll]`, `[roll=Shortsword]1d20+5[/roll]`, and `[[2d20+3]]`.
- Converts matched regex into interactive HTML badges:
  ```html
  <button class="dice-roll-badge" onclick="window.app.rollDiceExpression('2d6+4', 'Shortsword')">🎲 2d6+4</button>
  ```

---

## 2. UI Components & Layout Spec

### 2.1 Floating Quick-Dice Dock (`#quick-dice-dock`)
- **Location**: Bottom-right of viewport (`position: fixed; bottom: 20px; right: 20px; z-index: 999;`).
- **Elements**:
  - Polyhedral Dice Tap Buttons: `[d4] [d6] [d8] [d10] [d12] [d20] [d100]`
  - Advantage / Disadvantage Toggle Chips: `[ ADV ] [ DIS ]`
  - Formula Input Bar: `<input id="quick-dice-input" placeholder="e.g. 2d6+4" />`
  - Roll Button: `<button onclick="window.app.rollCustomDiceInput()">🎲 Roll</button>`
  - History Drawer Toggle: `<button onclick="window.app.toggleDiceHistoryDrawer()">📜 History (<span id="dice-history-count">0</span>)</button>`

### 2.2 Slide-Out Roll History Drawer (`#dice-history-drawer`)
- **Location**: Slide-out panel from the right edge.
- **Contents**:
  - Clear History button (`🗑️ Clear Log`)
  - Privacy Filter (`[ 👁️ All Rolls | 🔒 DM Private ]`)
  - Dynamic Roll Cards with Nat 20 gold borders and Nat 1 red borders.

### 2.3 Statblock Click-to-Roll Badges ([public/index.html](file:///c:/Users/EthenGreening/.gemini/antigravity/scratch/lore-vault/public/index.html))
- All statblock action attacks (`+7 to hit`, `2d6+4 slashing`), hit points (`85 (10d10+30)`), and ability score boxes (STR, DEX, CON, INT, WIS, CHA) attach `onclick="window.app.rollDiceExpression(...)"` event handlers.
