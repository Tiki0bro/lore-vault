# Stage 3: Implementation Plan — Interactive Virtual Dice Engine

## Task Breakdown & Order of Implementation

### Task 1: Core Dice Math Engine & Evaluation Logic ([public/js/app.js](file:///c:/Users/EthenGreening/.gemini/antigravity/scratch/lore-vault/public/js/app.js))
- Refactor and expand `rollDiceExpression(expression, label, options)` with `crypto.getRandomValues()` RNG.
- Add support for Advantage (`kh1`), Disadvantage (`kl1`), Natural 20 critical detection, Natural 1 fumble detection, and double crit damage.
- Maintain `this.diceHistory` array in `LoreVaultApp` state.

### Task 2: Floating Quick-Dice Dock & Roll History Drawer Markup ([public/index.html](file:///c:/Users/EthenGreening/.gemini/antigravity/scratch/lore-vault/public/index.html))
- Add `#quick-dice-dock` fixed bottom-right toolbar with `d4`, `d6`, `d8`, `d10`, `d12`, `d20`, `d100` quick buttons, formula input, and `ADV`/`DIS` toggle chips.
- Add slide-out `#dice-history-drawer` overlay for roll history logs.

### Task 3: Inline Markdown & BBCode Dice Parser ([public/js/wa-parser.js](file:///c:/Users/EthenGreening/.gemini/antigravity/scratch/lore-vault/public/js/wa-parser.js))
- Update WorldAnvil parser regex to recognize `[roll]2d6+4[/roll]`, `[roll=Label]1d20+5[/roll]`, and `[[2d6+3]]`.
- Output interactive `<button class="dice-roll-badge">` elements calling `window.app.rollDiceExpression(...)`.

### Task 4: UI Micro-Interactions & Styling ([public/css/styles.css](file:///c:/Users/EthenGreening/.gemini/antigravity/scratch/lore-vault/public/css/styles.css))
- Style `.quick-dice-dock`, `.dice-history-drawer`, `.dice-roll-badge`, `.nat20-pulse`, and `.nat1-fumble` micro-animations.

### Task 5: Automated Integration Tests ([test/api-suite.js](file:///c:/Users/EthenGreening/.gemini/antigravity/scratch/lore-vault/test/api-suite.js))
- Add test assertions verifying dice evaluation helper math, advantage/disadvantage logic, and zero silent errors.
