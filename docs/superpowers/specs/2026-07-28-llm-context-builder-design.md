# LLM Context Builder Subsystem Design

## 1. Overview & Vision
The **LLM Context Builder** is Lore-Vault's central context compilation engine. It transforms raw world articles, character personas, relationship matrices, system instructions, and chapter beats into structured, token-optimized context packs formatted for LLMs (OpenAI, Anthropic Claude, Ollama, LM Studio).

It caters to 4 distinct user archetypes:
1. **Ethen (Product Owner)**: Needs progressive disclosure UI, workflow presets (`Session Prep`, `Co-Writer Slate`, `Developer API Mode`), and token/cost transparency.
2. **Alex (VTT / App Developer)**: Needs serializer adapters (XML, JSON, YAML, Markdown), graph BFS/DFS traversal, priority token budgeting, and developer prompt inspection.
3. **Morgan (World Anvil Migrator)**: Needs automatic `@Cross-Link` resolution, category/tag scoping filters, DM spoiler toggles (`#dm-secret`), and visual active context trays.
4. **Elena (Novelist / Author)**: Needs 4-bucket context slates (Tone, Story Bible, Active Slate, Chapter Beats), character relationship matrices, tone chips, and saved context snapshots.

---

## 2. Architecture & Data Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        User Interface Layer                             │
│  ┌────────────────────────┐  ┌────────────────┐  ┌───────────────────┐  │
│  │ Preset Selector        │  │ 4-Bucket Slate │  │ Context Tray      │  │
│  │ (Session Prep, Slate)  │  │ (Tone, World)  │  │ (Pin/Unpin Cards) │  │
│  └───────────┬────────────┘  └───────┬────────┘  └─────────┬─────────┘  │
└──────────────┼───────────────────────┼─────────────────────┼────────────┘
               │                       │                     │
               ▼                       ▼                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      POST /api/context/compile                          │
│                      POST /api/context/preview                          │
└──────────────────────────────────┬──────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     Context Engine Pipeline                             │
│  1. Spoiler & Secret Guardrails Filter (#dm-secret, [box=secret])      │
│  2. Graph Traversal & Cross-Link Extractor (@[Entity])                  │
│  3. Character Persona & Relationship Matrix Integrator                  │
│  4. Priority Waterfall Token Allocator                                  │
│  5. Serializer Adapter (Markdown | XML | JSON | YAML)                   │
└──────────────────────────────────┬──────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     Compiled Context Payload                             │
│        (Used by Ask-My-World Chatbot, Scene Studio & Copy UI)           │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Database Schema

A new table `context_snapshots` will be created in `database/init.js` to store named context presets:

```sql
CREATE TABLE IF NOT EXISTS context_snapshots (
  id TEXT PRIMARY KEY,
  world_id TEXT,
  name TEXT NOT NULL,
  preset_type TEXT NOT NULL, -- 'session_prep' | 'cowriter_slate' | 'custom'
  config_json TEXT NOT NULL,  -- JSON string of ContextConfig
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## 4. Pipeline Components

### 4.1 4-Bucket Context Pipeline (`ContextConfig`)
The pipeline accepts a `ContextConfig` payload:
* **Bucket 1 (`system`)**: System instructions, tone chips (*Gritty*, *Whimsical*, *Action*), target LLM format choice.
* **Bucket 2 (`world`)**: Category filters, tag filters, max graph hop depth (0, 1, 2), spoiler filter flag (`includeSecrets: false`).
* **Bucket 3 (`slate`)**: Array of pinned article IDs, character relationship toggle, persona toggle.
* **Bucket 4 (`workingState`)**: Recent chapter beats, active scene goals, user prompt / query.

### 4.2 Serializer Adapters
Abstract `ContextSerializer` formats context into the user's chosen syntax:
* **MarkdownSerializer**: Clean headings (`# System Instructions`, `## Active Slate`, `### Characters`).
* **XmlSerializer**: Strict tags (`<system_instructions>`, `<world_lore>`, `<character_persona>`, `<chapter_beats>`) optimized for Claude 3.5.
* **JsonSerializer**: Structured JSON object suitable for OpenAI function calling.
* **YamlSerializer**: Compact key-value YAML blocks for token density.

### 4.3 Graph Traversal & Cross-Link Resolution
When articles in `slate` contain `@[Entity Title](template:id)` syntax:
1. Extract referenced article IDs.
2. If `graphHops >= 1`, query SQLite for those referenced articles.
3. Automatically append summaries of referenced articles into Hop-1 context.

### 4.4 Spoiler Guardrails Filter
If `includeSecrets === false`:
* Strip articles tagged `#dm-secret` or marked with `category = 'Secrets'`.
* Strip inline secret blocks like `[box=secret]...[/box]` or `[secret]...[/secret]` from article text content before sending to token budget.

---

## 5. API Endpoints

- `POST /api/context/compile` - Compiles a full prompt payload based on `ContextConfig`. Returns `{ compiledPrompt, tokenStats, sources }`.
- `POST /api/context/preview` - Returns raw string preview and token breakdown per bucket for developer inspection.
- `GET /api/context/snapshots` - Fetches saved context snapshots for the active world.
- `POST /api/context/snapshots` - Saves a new context snapshot.
- `DELETE /api/context/snapshots/:id` - Deletes a snapshot.

---

## 6. Frontend UI Enhancements (`public/js/context-builder.js` & `index.html`)

1. **Preset Header**: Dropdown with options:
   * 🎲 *Session Prep (Worldbuilder)*
   * ✍️ *Co-Writer Slate (Author)*
   * 🛠️ *Developer API Mode (Custom)*
2. **Visual Slate Tray & Token Gauge**:
   * Drag-and-drop / checkbox article list with `#secret` badges.
   * Color-coded progress bar for token usage (`0 - 4,096 Tokens`).
   * Spoiler toggle (`🛡️ Exclude DM Secrets`).
3. **4-Bucket Tabbed Interface**:
   * *Bucket 1*: System Tone Chips & Custom Instructions.
   * *Bucket 2*: Category & Tag Filters.
   * *Bucket 3*: Active Pinned Entities & Character Persona toggles.
   * *Bucket 4*: Chapter Beats / Active Scene Notes.
4. **Developer Inspector Tab**:
   * Serializer selector (`Markdown`, `XML`, `JSON`, `YAML`).
   * Raw prompt output text area with one-click copy.
   * Token breakdown per bucket.
   * Saved Snapshots dropdown with "Save Current Slate" modal.

---

## 7. Self-Review Checklist
- [x] Clear boundaries: Modular pipeline with separate serializers and database snapshot table.
- [x] Persona alignment: Ethen (Presets/UX), Alex (Serializers/Dev Mode), Morgan (Cross-links/Secrets/Tray), Elena (4-Buckets/Tone/Snapshots).
- [x] Backward Compatibility: Enhances existing `/api/context/compile` endpoint without breaking existing features.
