# Spec: LoreVault UI/UX Layout Redesign & Zero-Overflow Engine

**Date**: 2026-07-29  
**Status**: Approved  
**Lead Designer Persona**: Maya Lin (Lead UI/UX Architect)  
**Aligned Stakeholders**: Ethen (PO), Riley (QA), Alex (VTT Dev), Morgan (Worldbuilder), Elena (Author), Marcus (Marketing)  

---

## 1. Executive Summary

Based on the screenshot audit and Maya Lin's UI/UX review, LoreVault's top navigation header currently experiences severe horizontal overflow clipping on screens under 1600px, cutting off critical tools like `Ask AI`, `AI Settings`, and `World Doctor`. 

This redesign restructures the header into 3 clean, balanced zones using progressive disclosure, encapsulates article reader actions into a parchment toolbar, condenses tag cloud sprawl into collapsible accordions, and enforces a strict **Zero-Overflow Layout Contract (`overflow-x: hidden`)** across all viewports.

---

## 2. Key Objectives & Design Directives

1. **Header Navbar Restructuring (Fixing Screen Clipping)**:
   - **Zone 1 (Left - Brand & Search)**: Brand logo icon + "LoreVault" title + compact global search bar (`max-width: 280px`).
   - **Zone 2 (Center - View Switcher)**: `📜 Lore Codex`, `🎬 Narrative Slate`, `⚡ Weave Matrix`.
   - **Zone 3 (Right - World, Tools & Primary CTA)**:
     - **World & Theme Menu**: Combined `🌍 Primary World ▾` dropdown button with theme options inside.
     - **Consolidated `⚙️ Tools & Utilities ▾` Dropdown**: Clean dropdown grouping `🩺 World Doctor`, `🖼️ Media Vault`, `💬 Ask AI`, `⚙️ AI Settings`, `📥 Import World`.
     - **Primary Action CTA (`+ New Article`)**: High-contrast, bold primary button.
2. **Left Sidebar Tag Cloud Accordion**:
   - Wrap vertical tag lists into a collapsible `#tags-accordion-toggle` (`🏷️ Tags (26)`). Default to collapsed or capped view so Categories remain fully visible without scrolling.
3. **Encapsulated Parchment Article Reader Toolbar**:
   - Move `Move to World...`, `Edit`, and `Delete` into a styled `.article-viewer-toolbar` pane aligned to the top-right of the article reader.
4. **Responsive Layout Contract**:
   - Set `max-width: 100vw; overflow-x: hidden;` on body and container frames.
   - Enforce responsive media queries for screens `1024px`, `1366px`, `1600px`, and `4K`.

---

## 3. Technical Breakdown & Component Changes

### 3.1 Top Header Structure (`public/index.html` & `public/css/styles.css`)
- **Header Actions Structure**:
  ```html
  <header class="navbar">
    <div class="brand">
      <div class="brand-icon" data-badge="scroll">📜</div>
      <div class="brand-text">
        <h1>LoreVault</h1>
        <span class="subtext">Offline World & Context Engine</span>
      </div>
    </div>

    <div class="search-bar-container">
      <span class="search-icon">🔍</span>
      <input type="text" id="global-search" placeholder="Search world lore..." oninput="window.app.handleSearch(this.value)">
    </div>

    <nav class="nav-tabs">
      <button class="tab-btn active" id="tab-library" onclick="window.switchTab('library')">
        <span data-badge="scroll">📜</span> Lore Codex
      </button>
      <button class="tab-btn" id="tab-studio" onclick="window.switchTab('studio')">
        <span data-badge="shield">🎬</span> Narrative Slate
      </button>
      <button class="tab-btn" id="tab-context" onclick="window.switchTab('context')">
        <span data-badge="crystal">⚡</span> Weave Matrix
      </button>
    </nav>

    <div class="header-actions">
      <!-- Combined World & Theme Selector -->
      <div class="world-theme-compact-select">
        <span data-badge="compass">🌍</span>
        <select id="world-select-dropdown" onchange="window.app.switchWorld(this.value)">
          <option value="default">Primary World</option>
        </select>
        <button class="btn-text" onclick="window.openEditWorldModal()" title="Edit Theme">⚙️</button>
      </div>

      <!-- Tools Dropdown -->
      <div class="tools-dropdown-container">
        <button class="btn btn-secondary tools-dropdown-btn" onclick="window.app.toggleToolsMenu()">
          <span>⚙️ Tools ▾</span>
        </button>
        <div id="tools-dropdown-menu" class="dropdown-menu hidden">
          <button onclick="window.openDoctorModal(); window.app.closeToolsMenu();"><span>🩺</span> World Doctor</button>
          <button onclick="window.app.openMediaVault(); window.app.closeToolsMenu();"><span>🖼️</span> Media Vault</button>
          <button onclick="window.toggleAIChatDrawer(); window.app.closeToolsMenu();"><span>💬</span> Ask AI Assistant</button>
          <button onclick="window.app.openAISettings(); window.app.closeToolsMenu();"><span>⚙️</span> AI Settings</button>
          <button onclick="window.app.openImportModal(); window.app.closeToolsMenu();"><span>📥</span> Import World</button>
        </div>
      </div>

      <!-- Primary Action Button -->
      <button class="btn btn-primary" onclick="window.app.openEditor()">
        <span data-badge="quill">+</span> New Article
      </button>
    </div>
  </header>
  ```

### 3.2 Sidebar Accordion (`public/index.html` & `public/js/app.js`)
- Add `#tags-accordion-header` with click handler `window.app.toggleTagsAccordion()`.

### 3.3 CSS Rules (`public/css/styles.css`)
- Style `.tools-dropdown-container`, `.dropdown-menu`, `.world-theme-compact-select`, `.article-viewer-toolbar`, and responsive media queries (`@media (max-width: 1400px)` and `@media (max-width: 1100px)`).

---

## 4. Verification & Testing Plan

1. **Screen Clipping Test**: Inspect header navigation across 1024px, 1280px, 1440px, and 1920px screen widths. Confirm all buttons, tools, and options are 100% visible with zero horizontal scrollbars or clipping.
2. **Tools Dropdown Test**: Click `⚙️ Tools ▾` menu and verify `World Doctor`, `Media Vault`, `Ask AI`, `AI Settings`, and `Import World` execute properly.
3. **Tags Accordion Test**: Toggle tags accordion and verify categories stay visible without long vertical scrolling.
