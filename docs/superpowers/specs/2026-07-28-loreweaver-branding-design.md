# LoreWeaver & The Weave Matrix — Brand & Feature Architecture Design Spec

**Date**: 2026-07-28  
**Author**: Marcus Sterling (Marketing Lead) & Product Team  
**Status**: Approved  

---

## 1. Executive Summary

This document establishes the overarching brand identity and feature architecture for **LoreWeaver** (formerly *Lore-Vault*) and its core engine, **The Weave Matrix** (formerly *LLM Context Builder*). 

This rebranding replaces static, passive database terminology ("vault", "context builder") with a dynamic, evocative narrative ecosystem designed to resonate deeply across three primary target segments:
1. **TTRPG Game Masters & Publishers** (Campaign prep, quickstart lead magnets, actual play kits).
2. **VTT Creators & Developers** (Foundry VTT / Roll20 / DTRPG module packaging, API context formatting).
3. **Indie & Serial Fiction Authors** (Royal Road, Substack, Amazon KDP, BookTok reader magnets and chapter slates).

---

## 2. Brand Ecosystem & Nomenclature

```
                   +---------------------------------------+
                   |              LOREWEAVER               |
                   |   (The Platform & World Ecosystem)    |
                   +---------------------------------------+
                                       |
        +------------------------------+------------------------------+
        |                              |                              |
+---------------+              +---------------+              +---------------+
|   LORE CODEX  | ------------>| WEAVE MATRIX  |<------------ |  NARRATIVE    |
| (World Graph) |  (Lore       |  (The Context |  (Scene &    |    SLATE      |
+---------------+   Threads)   |   Compiler)   |   Beats)     +---------------+
        |                      +---------------+                      |
        |                              |                              |
        +--------------------->+---------------+<---------------------+
                               |  CANON GUARD  |
                               | (Validation & |
                               |   Secrets)    |
                               +---------------+
```

### Core Terminology Mapping

| Old Terminology | New Brand Terminology | Description & Mental Model |
|---|---|---|
| **Lore-Vault** | **LoreWeaver** | The master platform and AI intelligence engine for worlds, games, and stories. |
| **LLM Context Builder** | **The Weave Matrix** | The multi-dimensional workspace where lore threads, tone rules, graph depth, and token budgets are assembled. |
| **World Doctor** | **Canon Guard** | The diagnostic sentinel auditing cross-link integrity, detecting circular references, and enforcing DM secret filters. |
| **Scene Studio** | **Narrative Slate** | The writing & prep workspace for drafting novel scenes, managing active casts, and outlining chapter beats. |
| **Lore Library** | **Lore Codex** | The relational knowledge graph cataloging world articles, categories, factions, timelines, and items. |
| **World Articles** | **Lore Threads** | Individual entity nodes in the world graph. |
| **Prompt Presets** | **Weave Patterns** | One-click workflow slates (*Session Prep*, *Chapter Drafting*, *Kickstarter Teaser*, *Developer API*). |

---

## 3. Persona Alignment & Value Proposition

### Marcus Sterling (Marketing & Growth)
* **Value**: Gives the product a high-converting, unique market positioning that stands out against generic AI writing assistants. "Weave Patterns" serve as shareable, downloadable community assets.

### Elena Rostova (Novelist & Author)
* **Value**: Replaces dry technical jargon with intuitive storytelling metaphors ("weaving narrative threads", "Narrative Slate", "Context Loom").

### Morgan "Gifford" Reed (World Anvil Migrator & GM)
* **Value**: "LoreWeaver" accurately reflects relational `@cross-linked` worldbuilding, while "Canon Guard" addresses his core anxiety of AI lore hallucinations and spoiler leaks.

### Alex Vance (VTT Dev & Tech GM)
* **Value**: "The Weave Matrix" provides a clear model for multi-dimensional token budgeting, priority stackers, graph hop depth, and multi-format serialization (XML, JSON, YAML, Markdown).

### Riley "Solder" Chen (QA Automation Lead)
* **Value**: Clean sub-system boundary definitions ("Canon Guard Diagnostic Suite") ensuring deterministic error codes and robust integration test coverage.

---

## 4. Verification & Implementation Roadmap

1. **Documentation Integration**: Updated [`docs/USER_PERSONAS.md`](file:///c:/Users/EthenGreening/.gemini/antigravity/scratch/lore-vault/docs/USER_PERSONAS.md) with Marcus's persona profile and LoreWeaver terminology.
2. **UI & Codebase Refactoring Plan**: Rename UI navigation elements, page titles, and API endpoint descriptions in upcoming feature slates to reflect **LoreWeaver**, **The Weave Matrix**, **Canon Guard**, **Narrative Slate**, and **Lore Codex**.
