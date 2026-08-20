# Stage 1: Persona Ideation & Initial Grilling — Template Builder, Revision History & Theme Studio

## Feature Overview
- **Feature Name**: Custom Templates, Article Revision History & Theme Studio Suite
- **Target Release Date**: 2026-08-20
- **Lead Champion Personas**: 🎭 Morgan Reed (World Anvil Migrator), 🔍 Arthur Vance (Socratic Architect), 🎨 Maya Lin (UI/UX)
- **Primary Goal**: Expand LoreVault's worldbuilding capabilities with custom article templates, guarantee data safety with automatic disk revision history & 1-click rollbacks, and provide visual aesthetic customization with the Parchment & Codex Theme Studio.

---

## The 3 Feature Sub-Modules

### 1. Custom Article Template & Category Schema Builder
- **SQLite Table & REST APIs**: `lore_templates` table storing custom category schemas and custom sidebar key-value field definitions (`/api/templates`).
- **Template Builder UI (`#template-builder-modal`)**: Visual editor to define custom categories (*Religions*, *Magic Systems*, *Technologies*, *Vehicles*) with pre-filled WorldAnvil BBCode headers and custom sidebar tables.

### 2. Local Markdown Revision History & 1-Click Rollback Engine
- **Automatic Disk Snapshots**: Saves non-destructive Markdown snapshots into `/storage/history/${article_id}/${timestamp}.md` every time an article is edited or saved via dual-sync.
- **Revision History Modal (`#revision-history-modal`)**: Displays version list with timestamps, word counts, side-by-side diff previews, and a 1-click `↩ Restore Revision` button.

### 3. Parchment & Codex Visual Theme Studio Drawer
- **Theme Studio Drawer (`#theme-studio-drawer`)**: Slide-out panel allowing users to customize CSS theme tokens (`--accent-primary`, `--bg-main`, `--surface-card`, `--font-heading`) with real-time live preview.
- **Genre Presets**: Instant 1-click presets (*Ancient Codex*, *Gothic Grimdark*, *Aetherpunk*, *Scholar Ivory*) persisted in `localStorage`.

---

## 🔍 Arthur "The Griller" Vance's Socratic Interrogation

1. **Arthur**: *"Why build a revision history on disk instead of relying on git?"*
   - **Arthur & Alex**: *"Not all LoreVault users use git from the terminal. Storing revision snapshots directly in `/storage/history/${article_id}/` ensures 100% offline data protection for every user, allowing instant 1-click rollback of bad AI overwrites or accidental deletes."*
2. **Arthur**: *"Will custom templates break our WorldAnvil Simplified Standard formatting directives?"*
   - **Morgan & Ethen**: *"No. Custom templates generate WorldAnvil Simplified Standard syntax by default: `[quote]` header, `[row]` two-column layout with `[h1]` overview on the left, and custom sidebar `[table]` on the right. Zero FontAwesome icons, clean standard markup."*
3. **Arthur**: *"Does changing theme tokens in the Theme Studio persist across page reloads?"*
   - **Maya**: *"Yes. Theme custom tokens are saved to `localStorage` under `lorevault_custom_theme` and automatically applied to `:root` on initial startup."*

---

## 👥 Persona Sign-Offs
- 👔 **Ethen (PO)**: Approved (High user value across all 3 modules).
- 🧪 **Riley (QA)**: Approved (Non-destructive disk history & schema safety verified).
- 🎭 **Morgan (World Anvil)**: Approved (Custom template schemas fit WorldAnvil standard).
- 🎨 **Maya (UI/UX)**: Approved (Theme Studio drawer with real-time live CSS token binding).
