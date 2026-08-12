# Lore Marketing Engine Design Specification

**Date**: 2026-07-29  
**Status**: Approved  
**Author**: Antigravity & LoreVault Core Team  
**Target Feature**: Option C — Lore Marketing Engine  
**Target Personas**: Marcus Sterling (Marketing Strategist), Ethen (Product Owner)

---

## 1. Executive Summary
The Lore Marketing Engine converts raw world lore into high-converting, public-safe promotional copy for Kickstarter, serial fiction notes, and VTT stores, while guaranteeing zero DM spoilers are leaked.

## 2. Backend Engine (`server.js`)
* **Endpoint**: `POST /api/marketing/generate`
* **Payload**: `{ article_ids, preset, tone_chip, cta_type }`
* **Safety Layer**: Passes queried articles through `stripSecretBlocks()` and `filterArticleVisibility()` to completely omit `dm_only` articles and `[secret]` blocks from the context before hitting the LLM.
* **Prompt Assembly**: Wraps sanitized lore in preset-specific instruction templates and calls Gemini LLM.

## 3. Frontend Global Dashboard (`#marketing-view`)
* Main header tab `📢 Marketing` opens the dashboard.
* **Left Panel**: Multi-select campaign builder, Preset dropdown, Tone chips, CTA toggle.
* **Right Panel**: Output generation preview and `📋 Copy` button.

## 4. Article Quick-Action Modal (`#marketing-quick-modal`)
* Article viewer toolbar button `📢 Quick Promo Copy`.
* Opens a lightweight modal that auto-selects the current article ID and offers fast Preset/Tone dropdowns for quick generation.

## 5. Verification Plan
* Create `scratch/test-marketing-engine.js` to test `POST /api/marketing/generate`.
* Execute strict security test verifying that `[secret]...[/secret]` blocks do not appear in generated LLM copy.
