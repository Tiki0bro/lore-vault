# Spec: LoreVault Joint Alex & Maya Header Architecture & Zero-Collision Layout

**Date**: 2026-07-29  
**Status**: Approved  
**Lead Personas**: Alex Vance (Full-Stack Dev), Maya Lin (Lead UI/UX Architect)  
**Aligned Stakeholders**: Ethen (PO), Riley (QA), Morgan (Worldbuilder), Elena (Author), Marcus (Marketing)  

---

## 1. Executive Summary

This spec consolidates and fixes the top navbar header architecture based on Alex Vance's technical developer audit and Maya Lin's UI/UX layout standards:
1. **Clean Static Icon Rendering**: Replace JS-injected badge tags in core nav tabs with static inline icons (`📚 Lore Codex`, `🎬 Narrative Slate`, `⚡ Weave Matrix`) for zero render delay and zero broken images.
2. **Spacious 260px Search Bar**: Set search container to `flex: 0 1 260px; min-width: 200px; max-width: 280px;` with `padding-right: 70px !important;` on input text so placeholder/queries never truncate.
3. **Strict Flex Zone Isolation**:
   - `Zone 1 (Left)`: `flex: 0 1 auto; gap: 0.75rem;` (Brand Logo + 260px Search Bar). Subtitle hidden on screens `< 1400px`.
   - `Zone 2 (Center)`: `flex: 0 0 auto; margin: 0 auto;` (Nav Tabs). Protected from all horizontal squeeze.
   - `Zone 3 (Right)`: `flex: 0 0 auto; gap: 0.5rem;` (`🌍 World ▾`, `⚙️ Tools ▾`, `+ New Article`).
4. **CSS Consolidation**: Single authoritative stylesheet block in `public/css/styles.css` with clean specificity.

---

## 2. Technical Component & CSS Specifications

### 2.1 Markup Structure (`public/index.html`)
```html
<header class="navbar">
  <!-- Zone 1: Brand & Search -->
  <div class="navbar-zone-left">
    <div class="brand">
      <div class="brand-icon">📜</div>
      <div class="brand-text">
        <h1>LoreVault</h1>
        <span class="subtext">The Intelligence Engine for Worlds, Games & Stories</span>
      </div>
    </div>

    <div class="search-bar-container" id="search-container">
      <span class="search-icon">🔍</span>
      <input type="text" id="global-search" placeholder="Search lore (Ctrl+K)..." autocomplete="off">
      <span class="search-kbd-badge"><kbd>Ctrl</kbd> <kbd>K</kbd></span>
      <div id="search-results-dropdown" class="search-dropdown hidden"></div>
    </div>
  </div>

  <!-- Zone 2: Protected View Switcher Tabs -->
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

  <!-- Zone 3: World & Tools Actions -->
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

### 2.2 CSS Rules (`public/css/styles.css`)
```css
/* AUTHORITATIVE HEADER NAVBAR LAYOUT */
.navbar {
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  gap: 0.75rem !important;
  padding: 0.5rem 1.25rem !important;
  background: var(--surface-sidebar, #0f172a) !important;
  border-bottom: var(--border-filigree) !important;
  overflow: hidden !important;
  max-width: 100vw !important;
  z-index: 100 !important;
}

.navbar-zone-left {
  display: flex !important;
  align-items: center !important;
  gap: 0.75rem !important;
  flex: 0 1 auto !important;
  min-width: 0 !important;
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
  gap: 0.5rem !important;
  flex: 0 0 auto !important;
}

.search-bar-container {
  width: 260px !important;
  min-width: 200px !important;
  max-width: 280px !important;
  flex: 0 1 auto !important;
  position: relative !important;
  display: flex !important;
  align-items: center !important;
  background: var(--surface-card, #1e293b) !important;
  border: 1px solid var(--border-color, rgba(212,175,55,0.3)) !important;
  border-radius: 6px !important;
  padding: 0.35rem 0.65rem !important;
}

.search-bar-container input[type="text"], #global-search {
  width: 100% !important;
  padding-right: 70px !important;
  background: transparent !important;
  border: none !important;
  color: var(--text-primary, #f8fafc) !important;
  font-size: 0.82rem !important;
  outline: none !important;
}

.search-kbd-badge {
  position: absolute !important;
  right: 0.5rem !important;
  pointer-events: none !important;
}

.nav-tabs {
  display: flex !important;
  gap: 0.35rem !important;
  background: var(--surface-sidebar, #0f172a) !important;
  padding: 0.25rem !important;
  border-radius: var(--radius-md) !important;
  border: 1px solid var(--border-color) !important;
  flex-shrink: 0 !important;
}

.tab-btn {
  white-space: nowrap !important;
  display: flex !important;
  align-items: center !important;
  gap: 0.4rem !important;
  padding: 0.45rem 0.85rem !important;
  font-size: 0.82rem !important;
  font-weight: 600 !important;
}

@media (max-width: 1400px) {
  .brand-text .subtext {
    display: none !important;
  }
}
```

---

## 3. Verification & Testing Plan

1. **Static Icon Verification**: Open app and confirm `Lore Codex`, `Narrative Slate`, and `Weave Matrix` display crisp icons without broken image boxes.
2. **Search Input Reading Test**: Type `The Sun-Forge Citadel` into `#global-search` and confirm text is 100% visible and unclipped.
3. **Viewport Collision Test**: Inspect navbar header at 1200px, 1366px, 1440px, and 1920px widths to confirm 0 overlap between Search Bar and nav tabs.
