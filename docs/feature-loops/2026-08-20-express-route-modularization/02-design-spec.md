# Stage 2: Design Specification — Express Route Modularization

## Architecture Overview
This document specifies the module structure and file layout for decomposing `server.js` (8,245 lines) into cohesive Express routers and service utilities under `src/`.

---

## Directory & File Layout

```
lore-vault/
├── server.js                        # Main Express entry point (~150 lines)
└── src/
    ├── db.js                        # SQLite database initialization & migrations
    ├── helpers/
    │   ├── markdown-helpers.js      # Frontmatter parser, WorldAnvil serializers, cross-links
    │   └── ai-helpers.js            # Gemini model fallback candidate loop & AI config
    └── routes/
        ├── articles.js              # Article CRUD, Revision History, Statblocks
        ├── ai.js                    # AI Assist, Fight Simulator, Concierge Router
        ├── vtt.js                   # VTT Export (Foundry, Roll20, FGU)
        ├── atlas.js                 # Maps, Pins, Routes, Canvas Nodes
        ├── audit.js                 # Canon Guard, Secret Scanner, Batch Repair
        ├── templates.js             # Custom Templates & Package Exchange
        ├── simulation.js            # Era Simulation & Rumors
        └── worlds.js                # World CRUD, Relationships, Timeline, Demo Seeder
```

---

## Service Contracts

### `src/db.js`
- Exports `db` (SQLite connection instance).
- Executes schema table creation queries (`articles`, `worlds`, `maps`, `map_pins`, `lore_relationships`, `lore_templates`, `timeline_events`).

### `src/helpers/markdown-helpers.js`
- Exports `storageDir`, `syncFileToStorage`, `extractCrossLinks`, `parseMarkdownWithFrontmatter`, `serializeMarkdown`, `serializeXML`, `serializeJSON`, `serializeYAML`, `serializeContext`, `filterArticleVisibility`.

### `src/helpers/ai-helpers.js`
- Exports `callGeminiApiWithFallback`, `getAIConfig`, `saveAIConfig`, `getCastPersonaContext`, `maskApiKey`.
