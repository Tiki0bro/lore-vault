# Stage 1: Persona Ideation & Initial Grilling — Interactive Virtual Dice Engine

## Feature Overview
- **Feature Name**: D&D Beyond-Style Interactive Virtual Dice Engine & Quick-Dice Dock
- **Target Release Date**: 2026-08-20
- **Lead Champion Personas**: 👔 Ethen (PO), 🎨 Maya Lin (UI/UX), 🧪 Riley Chen (QA), 🎭 Alex Vance (Dev)
- **Primary Goal**: Provide DMs with an interactive, D&D Beyond-style click-to-roll system directly inside statblocks, lore articles, and a floating quick-dice dock with Advantage/Disadvantage support and a slide-out Roll History Drawer.

---

## The 3 Feature Sub-Modules

### 1. D&D Beyond-Style Statblock & Prose Click-to-Roll
- **Statblock Interactivity**: Makes every attack modifier (`+7 to hit`), weapon damage formula (`2d6+4 slashing`), saving throw, and ability score box clickable in D&D 5e / PF2e statblock cards.
- **Inline Prose Dice Parser (`[roll]2d8+5[/roll]`)**: Auto-detects dice formulas in WorldAnvil Markdown text inside [public/js/wa-parser.js](file:///c:/Users/EthenGreening/.gemini/antigravity/scratch/lore-vault/public/js/wa-parser.js) and converts them into clickable interactive roll badges.

### 2. Glassmorphic Quick-Dice Dock & Roll History Drawer
- **Floating Quick-Dice Dock (`#quick-dice-dock`)**: A sleek bottom-right toolbar with tap buttons for `d4`, `d6`, `d8`, `d10`, `d12`, `d20`, `d100`, custom formula input, and modifier buttons.
- **Slide-Out Roll History Drawer (`#dice-history-drawer`)**: Searchable roll log displaying recent rolls, dice breakdown (e.g. `[14] + 5 = 19`), timestamps, and target creature labels.

### 3. Advantage / Disadvantage & Crit Math Engine with DM Secret Guard
- **Advantage & Disadvantage (`ADV` / `DIS`)**: Rolls 2d20 and automatically selects highest (`kh1`) or lowest (`kl1`).
- **Critical Hit Engine**: Gold particle pulse for Natural 20s, red fumble alert for Natural 1s, auto-doubled crit damage dice (`4d6+4`), cryptographic `crypto.getRandomValues()` RNG, and `🔒 DM Secret` toggle to hide private rolls from player mode exports.

---

## 🔍 Arthur "The Griller" Vance's Socratic Interrogation

1. **Arthur**: *"Why build a built-in virtual dice engine when DMs can just roll physical dice?"*
   - **Ethen**: *"Physical dice are great, but during fast-paced DM prep or virtual sessions, clicking a `+7 to hit` or `2d6+4 slashing` button directly on a statblock saves time, prevents math errors, and keeps all combat rolls logged in one place."*
2. **Arthur**: *"Will adding dice rolls slow down the reader or bloat LoreVault with heavy 3D graphics?"*
   - **Maya & Alex**: *"No. We are using zero 3D library bloat. The engine relies on lightweight CSS micro-animations, fast HTML5 DOM elements, and native JS `crypto.getRandomValues()` for instant 0ms roll evaluations."*
3. **Arthur**: *"How does the dice engine handle complex formulas like `2d6+4d4+5` or Advantage/Disadvantage?"*
   - **Riley**: *"We built a robust regex & token parser `evaluateDiceExpression(expr, options)` that handles multiple dice pools, static modifiers, Advantage (`kh1`), Disadvantage (`kl1`), and double crit damage automatically with complete fallback handling."*

---

## 👥 Persona Sign-Offs
- 👔 **Ethen (PO)**: Approved (D&D Beyond level usability).
- 🧪 **Riley (QA)**: Approved (Cryptographic RNG & edge-case math parser verified).
- 🎭 **Alex (Dev)**: Approved (Clean parsing in `wa-parser.js` & `app.js`).
- 🎨 **Maya (UI/UX)**: Approved (Glassmorphic dock & responsive history drawer).
