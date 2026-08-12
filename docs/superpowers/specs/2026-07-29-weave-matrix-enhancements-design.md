# The Weave Matrix Enhancements & Context Compiler Engine Design Specification

**Date**: 2026-07-29  
**Status**: Approved  
**Author**: Antigravity & LoreVault Core Team  
**Target Feature**: Option A — The Weave Matrix Context Compiler Pipeline  
**Target Personas**: Alex Vance (VTT Dev), Morgan Reed (WorldAnvil Power User), Ethen (Product Owner), Maya Lin (UI/UX Architect), Riley Chen (QA Specialist)

---

## 1. Executive Summary & Core Objectives

The Weave Matrix is LoreVault's context compilation engine responsible for gathering, filtering, serializing, and budgeting world lore into structured LLM prompts. This specification introduces three major enhancements to The Weave Matrix:

1. **Hybrid Secret & Spoiler Filtering**: Support for article-level visibility metadata (`public` vs `dm_only`) combined with inline block parsing (`[secret]...[/secret]` and `[dm]...[/dm]`) to generate player-safe or author-only prompts dynamically.
2. **Structured Serializer Adapters**: Multi-format compilation supporting **Markdown**, **XML** (`<entity>` tags), **JSON** schema, and **YAML** trees for maximum compatibility across OpenAI, Anthropic, and local LLMs (Ollama/LM Studio).
3. **Three-Tier Priority Token Stacking**: Algorithmic token budgeting that prioritizes **Tier 1 (Pinned Lore & Active Slate)**, **Tier 2 (1-Hop Linked Neighbors)**, and **Tier 3 (Keyword/Search Context)** within user-defined token limits (500 – 32,000 tokens).
4. **Standalone API & UI Control Drawer**: A dedicated backend endpoint (`POST /api/context/compile`) paired with a slide-over control drawer (`#weave-matrix-drawer`) in the frontend UI.

---

## 2. Architectural Design & Component Breakdown

### 2.1 Database & Data Schema Updates (`lore.db`)
* **SQLite Table Alteration**:
  Add `visibility` column to the `articles` table:
  ```sql
  ALTER TABLE articles ADD COLUMN visibility TEXT DEFAULT 'public';
  ```
* **Indexed Values**:
  * `'public'`: Safe for player-facing summaries, exported context, and public slates.
  * `'dm_only'`: Restricted to DM/Author full-canon mode. Excluded automatically when `visibility === 'public'`.

### 2.2 Hybrid Secret Filtering Engine (`server.js`)
* **Inline Secret Parser**:
  Regex block extractor stripping sensitive text sections when compiling under `public` mode:
  ```javascript
  function stripSecretBlocks(content) {
    if (!content) return '';
    return content.replace(/\[(secret|dm)\][\s\S]*?\[\/(secret|dm)\]/gi, '');
  }
  ```
* **Article & Content Compilation Pipeline**:
  ```javascript
  function filterArticleVisibility(article, visibilityMode) {
    if (visibilityMode === 'public' && article.visibility === 'dm_only') {
      return null; // Entire article excluded
    }
    const cleanContent = (visibilityMode === 'public')
      ? stripSecretBlocks(article.content)
      : article.content;
    return { ...article, content: cleanContent };
  }
  ```

---

## 3. Serializer Formats & Output Schemas

The context compiler transforms raw WorldAnvil Markdown articles into four distinct output formats:

### 3.1 Markdown (`format: 'markdown'`)
```markdown
# Entity: Empire of Valoria (Category: Factions)
> Summary: A powerful military empire.

## Content
[Clean Article Body]
```

### 3.2 XML (`format: 'xml'`)
```xml
<context>
  <entity id="valoria-empire" category="Factions" visibility="public">
    <title>Empire of Valoria</title>
    <summary>A powerful military empire.</summary>
    <content><![CDATA[[Clean Article Body]]]></content>
  </entity>
</context>
```

### 3.3 JSON (`format: 'json'`)
```json
{
  "world_id": "all",
  "format": "json",
  "visibility": "public",
  "entities": [
    {
      "id": "valoria-empire",
      "title": "Empire of Valoria",
      "category": "Factions",
      "summary": "A powerful military empire.",
      "content": "[Clean Article Body]",
      "cross_links": ["house-ravenwing"]
    }
  ]
}
```

### 3.4 YAML (`format: 'yaml'`)
```yaml
context:
  world_id: all
  entities:
    - id: valoria-empire
      title: Empire of Valoria
      category: Factions
      summary: A powerful military empire.
      content: |
        [Clean Article Body]
```

---

## 4. Priority Tier Token Stacking Engine

### 4.1 Tier Hierarchy
1. **Tier 1 (Pinned & Active Slate)**: Explicitly selected articles. Packed first into context budget without truncation.
2. **Tier 2 (1-Hop Linked Neighbors)**: Articles referenced by `@Cross-Link` or `[[WikiLink]]` inside Tier 1 entities. Extracted via cross-link parser and packed second.
3. **Tier 3 (Search & Category Context)**: Ranked keyword search results filling remaining token budget.

### 4.2 Token Estimation & Metrics
* **Token Ratio**: 1 token ≈ 4 characters (with 5% safety margin).
* **Return Metrics**:
  ```json
  {
    "total_tokens": 3450,
    "max_budget": 4000,
    "tier1_tokens": 1400,
    "tier2_tokens": 1600,
    "tier3_tokens": 450
  }
  ```

---

## 5. API Specification & Frontend UI Control Drawer

### 5.1 Backend API Endpoint
* **Route**: `POST /api/context/compile`
* **Request Body**:
  ```json
  {
    "world_id": "all",
    "pinned_ids": ["valoria-empire"],
    "query": "smuggling rings near the border",
    "format": "xml",
    "visibility": "public",
    "max_tokens": 4000
  }
  ```
* **Response Payload**:
  ```json
  {
    "status": "success",
    "format": "xml",
    "visibility": "public",
    "compiled_context": "<context>...</context>",
    "token_metrics": {
      "total_tokens": 3450,
      "max_budget": 4000,
      "tier1_tokens": 1400,
      "tier2_tokens": 1600,
      "tier3_tokens": 450
    }
  }
  ```

### 5.2 Frontend UI Component (`#weave-matrix-drawer`)
* **Navigation Bar Action**: Top toolbar button `🕸️ Weave Matrix`.
* **Drawer Panels**:
  * **Format Selector**: Chips for `[ Markdown | XML | JSON | YAML ]`.
  * **Visibility Toggle**: `[ 🌐 Public | 🔒 DM-Only ]`.
  * **Token Budget Slider**: Interactive range (500 – 32,000 tokens) with color-coded tier progress bar.
  * **Pinned Lore Drawer**: List of pinned articles with quick add/remove controls.
  * **Live Inspector**: Code preview block with a `📋 Copy Compiled Context` action.

---

## 6. Verification & Test Plan

1. **Secret Block Unit Test**: Verify `stripSecretBlocks()` removes `[secret]...[/secret]` and `[dm]...[/dm]` blocks without breaking valid markdown headers.
2. **SQLite Migration Check**: Verify `visibility` column is added safely on server startup if not present.
3. **Serializer Schema Test**: Validate output of `POST /api/context/compile` against XML, JSON, and YAML schemas.
4. **Token Budget Boundary Test**: Verify compiler stops packing items when `max_tokens` budget is reached.
5. **E2E UI Test**: Open `#weave-matrix-drawer`, toggle formats and visibility, adjust token slider, and copy compiled context.
