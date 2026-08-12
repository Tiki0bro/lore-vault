# Design Specification: Public World Wiki Portal & Frontpage Suite

**Document Version**: 1.0.0  
**Date**: 2026-08-10  
**Author**: Ethen (Product Owner) & Antigravity AI  
**Status**: Approved  
**Target Path**: `docs/superpowers/specs/2026-08-10-public-world-wiki-portal-design.md`

---

## 1. Executive Summary & Goal

LoreVault requires a dedicated **Public World Frontpage & Wiki Portal** system—inspired by World Anvil's award-winning public world presentation portals (e.g. *Melior*, *Etheria*) and Obsidian Quartz digital gardens. 

When a visitor opens a shared link (`/view/:shareToken`) or clicks `🌐 World Frontpage`, they are presented with a cinematic, highly structured world landing page featuring:
1. **Cinematic Hero Banner**: Full-width world cover banner, world title, elevator pitch quote, genre badges (*High Fantasy*, *Dark Fantasy*, *Sci-Fi*), and canon status badges.
2. **Action & Metrics Dock Bar**: Quick launchers for `🗺️ Interactive World Atlas`, `🕸️ Knowledge Graph`, `📚 Browse Codex`, `⚡ Ask AI Lore Scholar`, and a 1-click `🔒 Public Player View / DM Canon View` toggle.
3. **Featured Lore Spotlight ("Bookcover Cards")**: Grid of 3–6 pinned pillar articles featuring header images, summaries, tag chips, and instant presentation reading.
4. **Category Wiki Portals ("Bookcover Grid")**: Visual category cards for all 7 primary lore categories (*Races & Species*, *Characters*, *Locations*, *Factions*, *Items & Artifacts*, *Concepts & Magic*, *Histories & Eras*).
5. **Presentation Wiki Reader**: Integrated article reader with category tree accordion sidebar, table of contents navigation, and WorldAnvil Simplified Standard styling.
6. **Social Media OpenGraph Integration**: Injects `<meta property="og:...">` cards for rich visual link embeds on Discord, Twitter/X, and Kickstarter.

---

## 2. System Architecture & Components

```
+-----------------------------------------------------------------------------------+
|                            PUBLIC WORLD WIKI PORTAL                               |
|  +-----------------------------------------------------------------------------+  |
|  | HERO BANNER & SYNOPSIS QUOTE                                                |  |
|  | - Cover image overlay, title, subtitle quote, genre tags                    |  |
|  +-----------------------------------------------------------------------------+  |
|  | ACTION & METRICS DOCK                                                       |  |
|  | [ 🗺️ World Atlas ] [ 🕸️ Knowledge Graph ] [ 🔒 Player Mode / DM Toggle ]     |  |
|  +-----------------------------------------------------------------------------+  |
|  | FEATURED LORE SPOTLIGHT GRID ("Bookcover Cards")                            |  |
|  | [ Pillar Article 1 ] [ Pillar Article 2 ] [ Pillar Article 3 ]               |  |
|  +-----------------------------------------------------------------------------+  |
|  | CATEGORY PORTALS GRID                                                       |  |
|  | [ Races ] [ Characters ] [ Locations ] [ Factions ] [ Items ] [ Concepts ]   |  |
|  +-----------------------------------------------------------------------------+  |
|  | PRESENTATION WIKI READER                                                    |  |
|  | - Category Tree & TOC Sidebar | WorldAnvil Formatted Reader Pane            |  |
|  +-----------------------------------------------------------------------------+  |
+-----------------------------------------------------------------------------------+
```

---

## 3. Database Schema Updates (`lore.db` SQLite)

Four new columns are added to the `worlds` table:

```sql
ALTER TABLE worlds ADD COLUMN banner_image TEXT DEFAULT '/uploads/images/default-banner.png';
ALTER TABLE worlds ADD COLUMN tagline TEXT DEFAULT 'An intricate custom setting waiting to be explored.';
ALTER TABLE worlds ADD COLUMN pinned_article_ids TEXT DEFAULT '[]';
ALTER TABLE worlds ADD COLUMN template_style TEXT DEFAULT 'grand-codex';
```

---

## 4. API Endpoint Contracts

| Method | Endpoint | Description | Request Body / Query | Response Payload |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/worlds/:worldId/frontpage` | Fetch world frontpage payload | Query: `mode=player` or `mode=dm` | `{ world, stats, pinnedArticles, categories }` |
| `PUT` | `/api/worlds/:worldId/frontpage` | Update frontpage settings | JSON: `{ banner_image, tagline, pinned_article_ids, template_style }` | `{ success: true, world }` |
| `GET` | `/view/:shareToken` | Public Gateway (opens World Frontpage) | Query: None | Rendered HTML with OpenGraph tags |

---

## 5. Secret & Spoiler Protection

- In **Public Player View** or on `/view/:shareToken`:
  - `pinnedArticles` that are marked as `visibility = 'private'` or contain secret flags are omitted.
  - Secret text blocks `[secret]...[/secret]` are stripped from article content.
  - Edit, Delete, AI Config, and admin controls are completely hidden from the DOM.

---

## 6. Testing & Quality Assurance Plan

1. **Automated Integration Test (`scratch/test-frontpage-suite.js`)**:
   - Verify frontpage payload assembly (`GET /api/worlds/:worldId/frontpage`).
   - Validate OpenGraph tag insertion on `/view/:shareToken`.
   - Confirm secret content is stripped in player mode.
2. **Visual Layout Verification**:
   - Verify hero banner, featured spotlight bookcover grid, category dock, and theme compatibility (`ancient-codex`, `scifi-fantasy`, `data-mode="light"`).
