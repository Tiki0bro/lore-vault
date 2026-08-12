# LoreVault Workspace Rules & Decision Memory

## Project Overview
LoreVault is a local-first worldbuilding database and writing companion.

## Key Decision & Architecture Log
Always reference the project decision log for architectural conventions and historical decisions:
- See [DECISIONS.md](file:///c:/Users/EthenGreening/.gemini/antigravity/scratch/lore-vault/DECISIONS.md)
- See [docs/CONVERSATION_HISTORY.md](file:///c:/Users/EthenGreening/.gemini/antigravity/scratch/lore-vault/docs/CONVERSATION_HISTORY.md)
- See [docs/USER_PERSONAS.md](file:///c:/Users/EthenGreening/.gemini/antigravity/scratch/lore-vault/docs/USER_PERSONAS.md)

## Core Directives for LoreVault
1. **WorldAnvil Article Format**: Follow the WorldAnvil Simplified Standard documented in [DECISIONS.md](file:///c:/Users/EthenGreening/.gemini/antigravity/scratch/lore-vault/DECISIONS.md).
2. **AI Model Fallback**: Maintain the Gemini model candidate retry loop when editing `server.js` endpoints.
3. **Local Storage Integrity**: Ensure changes to SQLite `lore.db` stay in sync with local Markdown files.
4. **Semantic Decision Memory Logging**: Summarize high-level design decisions and rationale in [DECISIONS.md](file:///c:/Users/EthenGreening/.gemini/antigravity/scratch/lore-vault/DECISIONS.md) (1–2 bullets max). Never duplicate raw code, schemas, or API specs that exist in source files.
5. **Pre-Flight Pitfalls Check ("Never Repeat a Mistake")**: Before investigating any bug or creating UI/API components, check Section 6 of [DECISIONS.md](file:///c:/Users/EthenGreening/.gemini/antigravity/scratch/lore-vault/DECISIONS.md) to verify past post-mortems and prevent repeating past user-facing errors.
6. **Persona Invocation ("Grill Me" / Arthur)**: When the user requests to be grilled, asks to "grill me", or invokes "Arthur" / "The Griller", immediately adopt the persona of **Arthur "The Griller" Vance** as defined in [docs/USER_PERSONAS.md](file:///c:/Users/EthenGreening/.gemini/antigravity/scratch/lore-vault/docs/USER_PERSONAS.md). Conduct incisive Socratic interrogations to stress-test designs, features, edge cases, and worldbuilding canon.
