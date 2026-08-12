# Spec: LoreVault Pixel-Math Header Layout & Zero-Collision Architecture

**Date**: 2026-07-29  
**Status**: Approved  
**Lead Personas**: Alex Vance (Full-Stack Dev), Maya Lin (Lead UI/UX Architect)  
**Aligned Stakeholders**: Ethen (PO), Riley (QA), Morgan (Worldbuilder), Elena (Author), Marcus (Marketing)  

---

## 1. Executive Summary

This specification fixes the top navbar header overlap by enforcing rigid pixel-budget boundaries across 3 header zones:
1. **Reclaim 240px in Zone 3**: Remove redundant `+ World` and `* Theme` inline buttons from Zone 3, reducing Zone 3 width from 500px to 260px.
2. **Reclaim 240px in Zone 1**: Hide brand subtext on `< 1500px` and set Search Bar width to `180px` (Zone 1 width = 280px).
3. **Guarantee 740px Free Space for Zone 2**: Zone 2 (`Lore Codex`, `Narrative Slate`, `Weave Matrix`) requires 420px. 420px fits inside 740px with a 320px safety buffer on 1280px+ viewports, guaranteeing **zero screen collision**.
4. **Fix JS Icon Hydration**: Strip `data-badge` attributes from header nav elements to eliminate broken image icon placeholders.

---

## 2. Technical Component & CSS Specifications

### 2.1 HTML Structure (`public/index.html`)
```html
<header class="navbar">
  <!-- Zone 1: Left (Brand & Search) -->
  <div class="navbar-zone-left">
    <div class="brand">
      <div class="brand-icon">📜</div>
      <div class="brand-text">
        <h1>LoreVault</h1>
        <span class="subtext">The Intelligence Engine for Worlds, Games & Stories</span>
      </div>
    </div>

    <div class="search-bar-container" id="search-container">
      <span class="search-icon-static">🔍</span>
      <input type="text" id="global-search" placeholder="Search lore..." autocomplete="off">
      <span class="search-kbd-badge"><kbd>Ctrl K</kbd></span>
      <div id="search-results-dropdown" class="search-dropdown hidden"></div>
    </div>
  </div>

  <!-- Zone 2: Center (View Switcher Tabs - Protected 420px Zone) -->
  <div class="navbar-zone-center">
    <nav class="nav-tabs">
      <button class="tab-btn active" id="tab-library" onclick="window.switchTab('library')">
        <span class="tab-icon">📚</span> Lore Codex
      </button>
      <button class="tab-btn" id="tab-studio" onclick="window.switchTab('studio')">
        <span class="tab-icon">🎬</span> Narrative Slate
      </button>
      <button class="tab-btn" id="tab-context" onclick="window.switchTab('context')">
        <span class="tab-icon">⚡</span> Weave Matrix
      </button>
    </nav>
  </div>

  <!-- Zone 3: Right (World Dropdown, Tools Dropdown, Primary CTA) -->
  <div class="navbar-zone-right header-actions">
    <div class="world-theme-container">
      <span class="world-icon">🌍</span>
      <select id="world-select-dropdown" onchange="window.app.switchWorld(this.value)">
        <option value="default">Primary World</option>
      </select>
    </div>

    <div class="tools-dropdown-container">
      <button id="tools-dropdown-btn" class="btn btn-secondary tools-dropdown-btn" onclick="window.toggleToolsMenu(event)">
        ⚙️ Tools ▾
      </button>
      <div id="tools-dropdown-menu" class="tools-dropdown-menu hidden">
        <button class="dropdown-item" onclick="window.openDoctorModal(); window.closeToolsMenu();">🩺 World Doctor</button>
        <button class="dropdown-item" onclick="window.app.openMediaVault(); window.closeToolsMenu();">🖼️ Media Vault</button>
        <button class="dropdown-item" onclick="window.toggleAIChatDrawer(); window.closeToolsMenu();">💬 Ask AI Assistant</button>
        <button class="dropdown-item" onclick="window.app.openAISettings(); window.closeToolsMenu();">⚙️ AI Settings</button>
        <button class="dropdown-item" onclick="window.app.openImportModal(); window.closeToolsMenu();">📥 Import World</button>
      </div>
    </div>

    <button class="btn btn-primary" onclick="window.app.openEditor()">
      + New Article
    </button>
  </div>
</header>
```

### 2.2 Authoritative CSS Block (`public/css/styles.css`)
```css
/* ABSOLUTE PIXEL-BUDGET HEADER NAVBAR CSS */
.navbar {
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  gap: 0.5rem !important;
  padding: 0.4rem 1rem !important;
  background: var(--surface-sidebar, #0f172a) !important;
  border-bottom: var(--border-filigree) !important;
  overflow: hidden !important;
  max-width: 100vw !important;
  z-index: 100 !important;
}

.navbar-zone-left {
  display: flex !important;
  align-items: center !important;
  gap: 0.5rem !important;
  flex: 0 0 auto !important;
}

.navbar-zone-center {
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  flex: 0 0 auto !important;
  margin: 0 auto !important;
}

.navbar-zone-right {
  display: flex !important;
  align-items: center !important;
  gap: 0.4rem !important;
  flex: 0 0 auto !important;
}

.search-bar-container {
  width: 180px !important;
  max-width: 200px !important;
  flex: 0 0 auto !important;
  position: relative !important;
  display: flex !important;
  align-items: center !important;
  background: var(--surface-card, #1e293b) !important;
  border: 1px solid var(--border-color, rgba(212,175,55,0.3)) !important;
  border-radius: 6px !important;
  padding: 0.3rem 0.5rem !important;
}

.search-bar-container input[type="text"], #global-search {
  width: 100% !important;
  padding-right: 55px !important;
  background: transparent !important;
  border: none !important;
  color: var(--text-primary, #f8fafc) !important;
  font-size: 0.8rem !important;
  outline: none !important;
}

.search-icon-static {
  margin-right: 0.35rem !important;
  font-size: 0.85rem !important;
}

.search-kbd-badge {
  position: absolute !important;
  right: 0.35rem !important;
  pointer-events: none !important;
  font-size: 0.65rem !important;
}

@media (max-width: 1500px) {
  .brand-text .subtext {
    display: none !important;
  }
}
```

---

## 3. Verification & Testing Plan

1. **Pixel-Math Layout Verification**: Inspect top header on 1280px, 1366px, 1440px, and 1920px viewports. Confirm Zone 1 (280px) and Zone 3 (260px) leave 740px for Zone 2 with zero screen overlap.
2. **Icon Rendering Check**: Confirm `Lore Codex`, `Narrative Slate`, and `Weave Matrix` tabs render clean unicode icons without broken image placeholders.
