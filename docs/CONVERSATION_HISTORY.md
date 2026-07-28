# LoreVault Development History & Project Architecture Log

**Last Updated**: 2026-07-27  
**Project Path**: `C:\Users\EthenGreening\.gemini\antigravity\scratch\lore-vault`  

---

## 1. Executive Summary & Vision
LoreVault is a state-of-the-art, local-first worldbuilding database and writing companion for fiction authors, tabletop campaign managers, and worldbuilders. It adheres strictly to the **WorldAnvil Simplified Standard** and integrates Google Gemini 1.5/2.0 LLMs for Q&A, diagnostic narrative auditing, conflict resolution, and genre-aware stub generation.

---

## 2. LoreVault 2.0 Roadmap Status

### ✅ Phase 1: "Ask My World" AI Chatbot Drawer & Lore Q&A Engine (COMPLETED)
- **Collapsible Slide-Over Drawer**: `#ai-chat-drawer` in `public/index.html`.
- **Top Header Toggle**: `💬 Ask AI` button.
- **Backend Endpoint**: `POST /api/ai/ask` in `server.js`.
- **Full Vault Context Retrieval**: Searches top-15 context articles by keyword stemming and passes them to Gemini LLM.
- **`[[WikiLink]]` Parsing**: Interactive inline links in chat responses open target articles directly in `#article-viewer`.
- **Permanent Server-Side AI Settings**: `GET /api/ai/config` & `POST /api/ai/config` persist API key and model selection into `config/ai-config.json`.
- **Candidate Model Fallback Loop**: Automatically retries across `gemini-flash-latest`, `gemini-2.0-flash`, `gemini-3.1-pro-preview`, `gemini-pro-latest` if a model string yields a deprecation or 404 error.
- **`world_id = 'all'` Handling**: Bypasses SQLite world filters when "All Worlds" is active so queries search across the entire vault.

### 🚀 Phase 2: Advanced World Doctor & AI Auto-Cure Suite (COMPLETED)
- **World Health Score Card (`85 / 100`)**: Visual health score badge + AI Executive Summary banner at top of `#doctor-modal`.
- **Deep Gemini AI Narrative Audit (`POST /api/audit/deep-ai`)**: Detects timeline contradictions, conflicting historical dates, and character state errors between articles.
- **One-Click AI Harmonize (`POST /api/audit/harmonize`)**: Opens a side-by-side diff modal (`#harmonize-diff-modal`) comparing original conflicting articles with AI-harmonized resolution text.
- **Genre-Aware Stub Auto-Cure (`POST /api/audit/flesh-out-stub`)**: Generates rich 2-paragraph WorldAnvil standard articles tailored to selected genre (`High Fantasy`, `Dark & Gritty`, `Sci-Fi / Cyberpunk`, `Gothic Horror`) with an individual preview modal (`#stub-preview-modal`) and `Bulk Auto-Cure All` button.
- **Smart Cross-Linker (`POST /api/audit/auto-crosslink`)**: Identifies orphaned articles (0 connections) and tags link suggestions with `🟢 High Confidence` or `🟡 Medium Confidence` badges.

### ⏳ Phase 3: AI Scene Co-Writer & Chapter Studio (QUEUED)
- Scene Generator with lore context.
- Live `[[WikiLink]]` auto-complete editor.

### ⏳ Phase 4: Vault Export & Backup Suite (QUEUED)
- Obsidian Markdown export.
- PDF/ePub compilation.

---

## 3. WorldAnvil Formatting Directives (Simplified Standard)

All generated articles and templates MUST follow these exact rules:
1. **Thematic Quote**: `[quote]“Quote text” | — Source[/quote]`.
2. **Top Section**: `[row]` with two `[col]`.
3. **Left Column**: `[h1]Title[/h1]` followed by overview text.
4. **Right Column**: `[h3]Sidebar Title[/h3]` followed by standard `[table]` (plain text headers, NO FontAwesome icons).
5. **Separator**: `[hr]` after the top section.
6. **Main Sections**: `[h2]I. Section Name[/h2]`.
7. **Detail Items**: `[b]Label:[/b]` for emphasis.
8. **WikiLinks**: Cross-link using `[[Article Title]]` or `@[Title](template:id)` syntax.
9. **Clean Containers**: NO FontAwesome icons (`[i]fa-...[/i]`), NO `[box]` or `[section]` tags.

---

## 4. Key Server Endpoints & Data Model

- `GET /api/articles`: Retrieves articles filtered by `world_id` or `category`.
- `POST /api/ai/ask`: Q&A synthesis using Gemini LLM context retrieval.
- `POST /api/ai/config`: Saves AI Settings (`provider`, `apiKey`, `model`) to `config/ai-config.json`.
- `POST /api/audit/deep-ai`: Runs Gemini LLM narrative audit and calculates health score.
- `POST /api/audit/flesh-out-stub`: Generates 2-paragraph lore entry for stubs.
- `POST /api/audit/harmonize`: Updates SQLite & Markdown storage to resolve lore contradictions.

---

## 5. File Structure Reference
```
lore-vault/
├── config/
│   └── ai-config.json       # Permanent server AI settings
├── docs/
│   ├── CONVERSATION_HISTORY.md
│   └── superpowers/
│       ├── specs/           # Design specs
│       └── plans/           # Implementation plans
├── data/                    # Markdown storage files
├── public/
│   ├── css/styles.css       # App styling & chat drawer CSS
│   ├── js/app.js            # Frontend application controller
│   ├── js/wa-parser.js      # WorldAnvil & WikiLink markdown parser
│   └── index.html           # Main HTML UI layout
├── lore.db                  # SQLite database
├── server.js                # Express backend server
└── package.json
```
