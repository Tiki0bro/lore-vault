/**
 * AtlasView Component — Interactive World Atlas & Map Pinning Suite
 */
class AtlasView {
  constructor(containerId, options = {}) {
    this.containerId = containerId;
    this.worldId = options.worldId || 'default';
    this.viewMode = 'dm'; // 'dm' or 'player'
    this.isPinPlacementActive = false;
    this.mapInstance = null;
    this.currentMap = null;
    this.maps = [];
    this.pins = [];
    this.layers = [];
    this.territories = [];
    this.territoryPolygons = [];
    this.isTerritoryDrawingActive = false;
    this.activeDrawVertices = [];
    this.activeDrawPolyline = null;
    this.activeVertexMarkers = [];
    this.selectedTerritory = null;
    this.editingTerritoryId = null;
    this.articles = [];
    this.markers = [];
    this.tempCoords = null;
    this.isLayersDrawerOpen = false;
    this.contestedPairs = [];
    this.aiGhostPolygons = [];
    this.breadcrumbStack = [];
    this.isRulerActive = false;
    this.rulerPoints = [];
    this.rulerPolyline = null;
    this.rulerMarkers = [];
    this.pinSearchQuery = '';
    this.selectedPinCategory = 'all';
    this.routes = [];
    this.routePolylines = [];
    this.isRouteDrawingActive = false;
    this.activeRouteVertices = [];
    this.activeRoutePolyline = null;
    this.activeRouteVertexMarkers = [];
    this.selectedRoute = null;
    this.editingRouteId = null;
    this.genPreset = 'pangaea';
    this.genTheme = 'parchment';
    this.genSeed = 12345;
    this.cartographyEngine = null;
  }

  getCartographyEngine() {
    if (!this.cartographyEngine) {
      const EngineClass = (typeof window !== 'undefined' && window.PerlinCartographyEngine) || (typeof PerlinCartographyEngine !== 'undefined' ? PerlinCartographyEngine : null);
      if (EngineClass) {
        this.cartographyEngine = new EngineClass();
      }
    }
    return this.cartographyEngine;
  }

  destroy() {
    if (this.mapInstance) {
      try {
        this.mapInstance.off();
        this.mapInstance.remove();
      } catch (e) {}
      this.mapInstance = null;
    }
    this.pins = [];
    this.territories = [];
    this.routes = [];
  }

  async init() {
    this.destroy();
    await this.fetchMaps();
    await this.fetchArticles();
    this.renderLayout();
    if (this.maps.length > 0) {
      await this.loadMap(this.maps[0].id);
    }
  }

  async fetchMaps() {
    try {
      const res = await fetch(`/api/worlds/${this.worldId}/maps`);
      const data = await res.json();
      this.maps = data.maps || [];
    } catch (e) {
      console.error('Failed to fetch maps:', e);
      this.maps = [];
    }
  }

  async fetchArticles() {
    try {
      const res = await fetch('/api/articles');
      const data = await res.json();
      this.articles = Array.isArray(data) ? data : (data.articles || []);
    } catch (e) {
      console.error('Failed to fetch articles for pin linking:', e);
      this.articles = [];
    }
  }

  renderLayout() {
    const container = document.getElementById(this.containerId);
    if (!container) return;

    container.innerHTML = `
      <div class="atlas-toolbar">
        <div class="atlas-toolbar-left">
          <select id="atlas-map-select" class="toolbar-select">
            ${this.maps.length ? this.maps.map(m => `<option value="${m.id}">${m.title}</option>`).join('') : '<option value="">No Maps Uploaded</option>'}
          </select>
          <button id="atlas-delete-map-btn" class="tool-btn btn-sm danger" style="padding:6px 10px;" title="Delete current map"><i class="fa-solid fa-trash"></i> 🗑️ Delete Map</button>
          <button id="atlas-add-map-btn" class="tool-btn"><i class="fa-solid fa-plus"></i> Upload Map</button>
          <button id="atlas-auto-gen-btn" class="tool-btn primary"><i class="fa-solid fa-wand-magic-sparkles"></i> Auto-Generate Map</button>
          <button id="atlas-auto-pin-btn" class="tool-btn"><i class="fa-solid fa-map-pin"></i> Auto-Place Pins</button>
          <button id="atlas-layers-btn" class="tool-btn"><i class="fa-solid fa-layer-group"></i> 🥞 Layers</button>
          <button id="atlas-ai-detect-btn" class="tool-btn"><i class="fa-solid fa-robot"></i> 🤖 Auto-Detect Borders</button>
          <button id="atlas-ruler-mode-btn" class="tool-btn"><i class="fa-solid fa-ruler-combined"></i> 📏 Ruler & Scale</button>
          <button id="atlas-pin-mode-btn" class="tool-btn"><i class="fa-solid fa-location-crosshairs"></i> Drop Pin</button>
          <button id="atlas-territory-mode-btn" class="tool-btn"><i class="fa-solid fa-draw-polygon"></i> 🗺️ Draw Boundary</button>
          <button id="atlas-route-mode-btn" class="tool-btn"><i class="fa-solid fa-route"></i> ⛺ Draw Route</button>
          <span id="atlas-reticle-toast" class="atlas-toast" style="display:none;"><i class="fa-solid fa-crosshairs"></i> Click on map to place pin... <button id="atlas-cancel-pin-btn" class="btn-text">Cancel</button></span>
          <span id="atlas-territory-toast" class="atlas-toast" style="display:none;"><i class="fa-solid fa-draw-polygon"></i> Click on map to add vertices... <button id="atlas-complete-territory-btn" class="tool-btn primary btn-sm" style="margin-left:8px; padding:2px 8px; font-size:0.8rem;">[✓ Complete Boundary]</button> <button id="atlas-cancel-territory-btn" class="btn-text" style="margin-left:6px;">[✕ Cancel]</button></span>
          <span id="atlas-route-toast" class="atlas-toast" style="display:none;"><i class="fa-solid fa-route"></i> Click on map to add route points... <span id="route-toast-dist" style="margin-left:8px; font-weight:bold;">0.0 miles</span> <button id="atlas-complete-route-btn" class="tool-btn primary btn-sm" style="margin-left:8px; padding:2px 8px; font-size:0.8rem;">[✓ Complete Route]</button> <button id="atlas-cancel-route-btn" class="btn-text" style="margin-left:6px;">[✕ Cancel]</button></span>
        </div>
        <div class="atlas-toolbar-right">
          <div class="atlas-search-wrapper" style="display:inline-flex; align-items:center; gap:6px;">
            <input type="text" id="atlas-pin-search" class="toolbar-input" placeholder="🔍 Search pins & lore..." value="${this.pinSearchQuery || ''}">
            <button id="atlas-pin-clear-filter-btn" class="tool-btn btn-sm danger" style="display:${(this.pinSearchQuery || (this.selectedPinCategory && this.selectedPinCategory !== 'all')) ? 'inline-flex' : 'none'};">[✕ Clear Filter]</button>
          </div>
          <div class="segmented-control">
            <button id="atlas-mode-dm" class="segmented-btn ${this.viewMode === 'dm' ? 'active' : ''}">DM Canon View</button>
            <button id="atlas-mode-player" class="segmented-btn ${this.viewMode === 'player' ? 'active' : ''}">Public Player View</button>
          </div>
          <button id="atlas-share-btn" class="tool-btn primary"><i class="fa-solid fa-share-nodes"></i> Share Atlas</button>
          <button id="atlas-export-btn" class="tool-btn"><i class="fa-solid fa-download"></i> Export HTML</button>
        </div>
      </div>
      <div id="atlas-pin-category-bar" class="atlas-category-bar">
        <button class="atlas-category-chip ${this.selectedPinCategory === 'all' ? 'active' : ''}" data-category="all">All</button>
        <button class="atlas-category-chip ${this.selectedPinCategory === 'settlements' ? 'active' : ''}" data-category="settlements">Settlements</button>
        <button class="atlas-category-chip ${this.selectedPinCategory === 'fortresses' ? 'active' : ''}" data-category="fortresses">Fortresses</button>
        <button class="atlas-category-chip ${this.selectedPinCategory === 'dungeons' ? 'active' : ''}" data-category="dungeons">Dungeons</button>
        <button class="atlas-category-chip ${this.selectedPinCategory === 'natural wonders' ? 'active' : ''}" data-category="natural wonders">Natural Wonders</button>
        <button class="atlas-category-chip ${this.selectedPinCategory === 'quests' ? 'active' : ''}" data-category="quests">Quests</button>
        <button class="atlas-category-chip ${this.selectedPinCategory === 'factions' ? 'active' : ''}" data-category="factions">Factions</button>
        <button class="atlas-category-chip ${this.selectedPinCategory === 'relics' ? 'active' : ''}" data-category="relics">Relics</button>
      </div>
      <div id="atlas-viewport">
        <div id="atlas-breadcrumbs" class="atlas-breadcrumbs" style="display:none;"></div>
        <div id="atlas-canvas-container"></div>
        <div id="atlas-ruler-toast" class="atlas-ruler-toast" style="display:none;">
          <div class="ruler-toast-header">
            <span class="ruler-toast-title"><i class="fa-solid fa-ruler-horizontal"></i> Measuring Tape</span>
            <div class="ruler-toast-actions">
              <button id="atlas-scale-calibrate-btn" class="tool-btn btn-sm"><i class="fa-solid fa-gear"></i> Calibrate Scale</button>
              <button id="atlas-ruler-clear-btn" class="tool-btn btn-sm danger"><i class="fa-solid fa-xmark"></i> Clear</button>
            </div>
          </div>
          <div class="ruler-toast-body">
            <div class="ruler-distance-display">
              <span id="ruler-distance-val">0.0</span> <span id="ruler-distance-unit">miles</span>
            </div>
            <div class="ruler-travel-times">
              <div class="travel-badge" title="On Foot (~30 miles/day)">
                <span class="travel-icon">🚶</span>
                <span class="travel-label">Foot:</span>
                <span id="ruler-time-foot" class="travel-val">0 days</span>
              </div>
              <div class="travel-badge" title="Horseback (~60 miles/day)">
                <span class="travel-icon">🐎</span>
                <span class="travel-label">Horse:</span>
                <span id="ruler-time-horse" class="travel-val">0 days</span>
              </div>
              <div class="travel-badge" title="Sailing (~100 miles/day)">
                <span class="travel-icon">⛵</span>
                <span class="travel-label">Sail:</span>
                <span id="ruler-time-sail" class="travel-val">0 days</span>
              </div>
            </div>
          </div>
        </div>
        <div id="atlas-layers-drawer" class="atlas-layers-drawer" style="display:none;">
          <div class="layers-drawer-header">
            <h4><i class="fa-solid fa-layer-group"></i> Map Layers</h4>
            <button id="atlas-close-layers-btn" class="drawer-close-btn">&times;</button>
          </div>
          <div class="layers-drawer-body">
            <div id="layers-list" class="layers-list"></div>
          </div>
          <div class="layers-drawer-footer">
            <button id="atlas-add-layer-btn" class="tool-btn primary full-width">
              <i class="fa-solid fa-plus"></i> Add Custom Layer
            </button>
          </div>
        </div>
        <div id="atlas-ai-candidates-drawer" class="atlas-ai-candidates-drawer" style="display:none;">
          <div class="ai-drawer-header">
            <h4><i class="fa-solid fa-robot"></i> AI Detected Boundary Candidates</h4>
            <button id="atlas-close-ai-drawer-btn" class="drawer-close-btn">&times;</button>
          </div>
          <div class="ai-drawer-body">
            <div id="ai-candidates-list" class="ai-candidates-list"></div>
          </div>
          <div class="ai-drawer-footer">
            <button id="atlas-approve-candidates-btn" class="tool-btn primary full-width">
              <i class="fa-solid fa-check-double"></i> Approve & Import Selected Boundaries
            </button>
          </div>
        </div>
        <div id="atlas-reader-drawer" class="atlas-drawer">
          <button id="atlas-close-drawer" class="drawer-close-btn">&times;</button>
          <div id="atlas-drawer-content">
            <div class="drawer-placeholder">
              <i class="fa-solid fa-map-location-dot" style="font-size:48px; color:var(--accent-primary, #38bdf8); margin-bottom:16px;"></i>
              <h3>Interactive World Atlas</h3>
              <p>Select a pin or territory on the map to explore linked lore, history, and secret entries.</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Add Pin Modal -->
      <div id="atlas-pin-modal" class="modal-overlay" style="display:none;">
        <div class="modal-card">
          <div class="modal-header">
            <h3><i class="fa-solid fa-map-pin"></i> Add Map Marker</h3>
            <button id="close-pin-modal-btn" class="drawer-close-btn">&times;</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label>Pin Label *</label>
              <input type="text" id="pin-label-input" class="form-control" placeholder="e.g. Oakhaven City Citadel">
            </div>
            <div class="form-group">
              <label>Linked Article</label>
              <select id="pin-article-select" class="form-control">
                <option value="">-- None (Standalone Pin) --</option>
                ${this.articles.map(a => `<option value="${a.id}">${a.title} (${a.category})</option>`).join('')}
              </select>
            </div>
            <div class="form-row" style="display:flex; gap:12px;">
              <div class="form-group" style="flex:1;">
                <label>Icon</label>
                <select id="pin-icon-select" class="form-control">
                  <option value="fa-location-dot">📍 Location Dot</option>
                  <option value="fa-fort-awesome">🏰 Castle / Fort</option>
                  <option value="fa-mountain">⛰️ Mountain / Peak</option>
                  <option value="fa-skull">💀 Dungeon / Ruins</option>
                  <option value="fa-anchor">⚓ Port / Harbor</option>
                  <option value="fa-tree">🌲 Forest / Wilds</option>
                </select>
              </div>
              <div class="form-group" style="flex:1;">
                <label>Color</label>
                <input type="color" id="pin-color-input" class="form-control" value="#d97706" style="height:38px; padding:2px;">
              </div>
            </div>
            <div class="form-group" style="margin-top:12px;">
              <label>Target Sub-Map (Drill Down)</label>
              <select id="pin-submap-select" class="form-control">
                <option value="">-- None (Standard Pin) --</option>
              </select>
            </div>
            <div class="form-group checkbox-group" style="margin-top:12px;">
              <label><input type="checkbox" id="pin-secret-checkbox"> 🔒 DM Secret (Hide from Public Player View)</label>
            </div>
          </div>
          <div class="modal-footer" style="display:flex; justify-content:flex-end; gap:10px; margin-top:16px;">
            <button id="cancel-pin-modal-btn" class="tool-btn">Cancel</button>
            <button id="save-pin-modal-btn" class="tool-btn primary">Save Pin</button>
          </div>
        </div>
      </div>

      <!-- Upload Map Modal -->
      <div id="atlas-map-modal" class="modal-overlay" style="display:none;">
        <div class="modal-card">
          <div class="modal-header">
            <h3><i class="fa-solid fa-map"></i> Upload World Map</h3>
            <button id="close-map-modal-btn" class="drawer-close-btn">&times;</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label>Map Title *</label>
              <input type="text" id="map-title-input" class="form-control" placeholder="e.g. World of Aethelgard">
            </div>
            <div class="form-group">
              <label>Map Image File *</label>
              <input type="file" id="map-file-input" class="form-control" accept="image/*">
            </div>
          </div>
          <div class="modal-footer" style="display:flex; justify-content:flex-end; gap:10px; margin-top:16px;">
            <button id="cancel-map-modal-btn" class="tool-btn">Cancel</button>
            <button id="save-map-modal-btn" class="tool-btn primary">Upload Map</button>
          </div>
        </div>
      </div>

      <!-- Add Layer Modal -->
      <div id="atlas-layer-modal" class="modal-overlay" style="display:none;">
        <div class="modal-card">
          <div class="modal-header">
            <h3><i class="fa-solid fa-layer-group"></i> Add Custom Map Layer</h3>
            <button id="close-layer-modal-btn" class="drawer-close-btn">&times;</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label>Layer Name *</label>
              <input type="text" id="layer-name-input" class="form-control" placeholder="e.g. Political Boundaries, Trade Routes">
            </div>
            <div class="form-group">
              <label>Color Badge</label>
              <input type="color" id="layer-color-input" class="form-control" value="#38bdf8" style="height:38px; padding:2px;">
            </div>
            <div class="form-group checkbox-group" style="margin-top:12px;">
              <label><input type="checkbox" id="layer-secret-checkbox"> 🔒 DM Secret (Hide from Public Player View)</label>
            </div>
          </div>
          <div class="modal-footer" style="display:flex; justify-content:flex-end; gap:10px; margin-top:16px;">
            <button id="cancel-layer-modal-btn" class="tool-btn">Cancel</button>
            <button id="save-layer-modal-btn" class="tool-btn primary">Save Layer</button>
          </div>
        </div>
      </div>

      <!-- Add/Edit Territory Boundary Modal -->
      <div id="atlas-territory-modal" class="modal-overlay" style="display:none;">
        <div class="modal-card" style="max-width: 520px; width: 100%;">
          <div class="modal-header">
            <h3><i class="fa-solid fa-draw-polygon"></i> Configure Territory Boundary</h3>
            <button id="close-territory-modal-btn" class="drawer-close-btn">&times;</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label>Territory / Realm Title *</label>
              <input type="text" id="territory-title-input" class="form-control" placeholder="e.g. Kingdom of Valoria, Whisperwind Forest">
            </div>
            <div class="form-group">
              <label>Linked Layer</label>
              <select id="territory-layer-select" class="form-control">
                <option value="">-- Default / None --</option>
              </select>
            </div>
            <div class="form-group">
              <label>Linked Lore Article</label>
              <select id="territory-article-select" class="form-control">
                <option value="">-- None (Standalone Territory) --</option>
                ${this.articles.map(a => `<option value="${a.id}">${a.title} (${a.category})</option>`).join('')}
              </select>
            </div>
            <div class="form-row" style="display:flex; gap:12px; margin-top:8px;">
              <div class="form-group" style="flex:1;">
                <label>Border Color</label>
                <input type="color" id="territory-stroke-color-input" class="form-control" value="#ef4444" style="height:38px; padding:2px;">
              </div>
              <div class="form-group" style="flex:1;">
                <label>Border Width (px)</label>
                <input type="number" id="territory-stroke-width-input" class="form-control" min="1" max="8" value="3">
              </div>
              <div class="form-group" style="flex:1;">
                <label>Border Style</label>
                <select id="territory-stroke-style-select" class="form-control">
                  <option value="solid">Solid</option>
                  <option value="dashed">Dashed</option>
                  <option value="dotted">Dotted</option>
                </select>
              </div>
            </div>
            <div class="form-row" style="display:flex; gap:12px; margin-top:8px;">
              <div class="form-group" style="flex:1;">
                <label>Fill Color</label>
                <input type="color" id="territory-fill-color-input" class="form-control" value="#ef4444" style="height:38px; padding:2px;">
              </div>
              <div class="form-group" style="flex:1;">
                <label>Fill Opacity (<span id="fill-opacity-val">0.25</span>)</label>
                <input type="range" id="territory-fill-opacity-input" class="form-range" min="0" max="1" step="0.05" value="0.25">
              </div>
            </div>
            <div class="form-group checkbox-group" style="margin-top:12px;">
              <label><input type="checkbox" id="territory-secret-checkbox"> 🔒 DM Secret (Hide from Public Player View)</label>
            </div>
          </div>
          <div class="modal-footer" style="display:flex; justify-content:space-between; align-items:center; margin-top:16px;">
            <button id="delete-territory-modal-btn" class="tool-btn danger" style="display:none;"><i class="fa-solid fa-trash"></i> Delete Territory</button>
            <div style="display:flex; gap:10px; margin-left:auto;">
              <button id="cancel-territory-modal-btn" class="tool-btn">Cancel</button>
              <button id="save-territory-modal-btn" class="tool-btn primary">Save Territory</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Scale Calibration Modal -->
      <div id="atlas-scale-modal" class="modal-overlay" style="display:none;">
        <div class="modal-card">
          <div class="modal-header">
            <h3><i class="fa-solid fa-ruler"></i> Calibrate Map Distance Scale</h3>
            <button id="close-scale-modal-btn" class="drawer-close-btn">&times;</button>
          </div>
          <div class="modal-body">
            <p style="font-size:0.88rem; color:var(--text-secondary); margin-bottom:12px;">
              Set the reference pixel length and corresponding real-world distance unit for this map.
            </p>
            <div class="form-group">
              <label>Reference Pixel Length (px) *</label>
              <input type="number" id="scale-pixels-input" class="form-control" min="1" step="any" value="100" placeholder="e.g. 100">
            </div>
            <div class="form-group">
              <label>Real-World Distance *</label>
              <input type="number" id="scale-distance-input" class="form-control" min="0.01" step="any" value="10" placeholder="e.g. 10">
            </div>
            <div class="form-group">
              <label>Distance Unit *</label>
              <input type="text" id="scale-unit-input" class="form-control" value="miles" placeholder="e.g. miles, km, leagues">
            </div>
            <div id="scale-use-current-box" style="display:none; margin-top:12px; padding:10px; background:rgba(56, 189, 248, 0.1); border:1px dashed var(--accent-primary); border-radius:6px;">
              <button id="scale-use-ruler-btn" class="tool-btn btn-sm full-width"><i class="fa-solid fa-crosshairs"></i> Set Reference Pixels from Current Measuring Tape (<span id="scale-ruler-px-val">0</span> px)</button>
            </div>
          </div>
          <div class="modal-footer" style="display:flex; justify-content:flex-end; gap:10px; margin-top:16px;">
            <button id="cancel-scale-modal-btn" class="tool-btn">Cancel</button>
            <button id="save-scale-modal-btn" class="tool-btn primary">Save Scale Calibration</button>
          </div>
        </div>
      </div>

      <!-- Add/Edit Expedition Route Modal -->
      <div id="atlas-route-modal" class="modal-overlay" style="display:none;">
        <div class="modal-card" style="max-width: 520px; width: 100%;">
          <div class="modal-header">
            <h3><i class="fa-solid fa-route"></i> Expedition Route Properties</h3>
            <button id="close-route-modal-btn" class="drawer-close-btn">&times;</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label>Route Title *</label>
              <input type="text" id="route-title-input" class="form-control" placeholder="e.g. The King's Highway Expedition">
            </div>
            <div class="form-row" style="display:flex; gap:12px;">
              <div class="form-group" style="flex:1;">
                <label>Stroke Color</label>
                <input type="color" id="route-color-input" class="form-control" value="#f59e0b" style="height:38px; padding:2px;">
              </div>
              <div class="form-group" style="flex:1;">
                <label>Stroke Width (px)</label>
                <input type="number" id="route-width-input" class="form-control" min="1" max="10" value="3">
              </div>
              <div class="form-group" style="flex:1;">
                <label>Stroke Style</label>
                <select id="route-style-select" class="form-control">
                  <option value="dashed">Dashed</option>
                  <option value="solid">Solid</option>
                  <option value="dotted">Dotted</option>
                </select>
              </div>
            </div>
            <div class="form-group">
              <label>Assigned Map Layer</label>
              <select id="route-layer-select" class="form-control">
                <option value="">None (Base Map)</option>
              </select>
            </div>
            <div class="form-group" style="margin-top:12px;">
              <div class="ruler-travel-times" style="margin-top:8px; padding:10px; background:rgba(255,255,255,0.03); border-radius:6px; border:1px solid var(--border-color, rgba(255,255,255,0.1));">
                <div style="font-weight:600; font-size:0.85rem; margin-bottom:6px; color:var(--accent-primary, #38bdf8);">Calculated Distance & Travel Estimates:</div>
                <div style="font-size:1.1rem; font-weight:bold; color:#f59e0b; margin-bottom:6px;" id="route-modal-distance">0.0 miles</div>
                <div style="display:flex; gap:12px; font-size:0.8rem;">
                  <span>🚶 Foot: <strong id="route-modal-foot">0 days</strong></span>
                  <span>🐎 Horse: <strong id="route-modal-horse">0 days</strong></span>
                  <span>⛵ Sail: <strong id="route-modal-sail">0 days</strong></span>
                </div>
              </div>
            </div>
            <div class="form-group" style="margin-top:12px;">
              <label class="checkbox-label" style="display:flex; align-items:center; gap:8px; cursor:pointer;">
                <input type="checkbox" id="route-secret-checkbox">
                <span>🔒 DM Secret Route (Hidden from Public Player view)</span>
              </label>
            </div>
          </div>
          <div class="modal-footer" style="display:flex; justify-content:space-between; align-items:center; margin-top:16px;">
            <button id="delete-route-modal-btn" class="tool-btn danger" style="display:none;"><i class="fa-solid fa-trash"></i> Delete Route</button>
            <div style="display:flex; gap:10px; margin-left:auto;">
              <button id="cancel-route-modal-btn" class="tool-btn">Cancel</button>
              <button id="save-route-modal-btn" class="tool-btn primary">Save Route</button>
            </div>
          </div>
        </div>
      </div>

      <div id="atlas-generate-modal" class="modal-overlay" style="display:none;">
        <div class="modal-card atlas-gen-modal-card" style="max-width:680px; width:100%; max-height:85vh; display:flex; flex-direction:column;">
          <div class="modal-header" style="flex-shrink:0;">
            <h3><i class="fa-solid fa-wand-magic-sparkles"></i> Auto-Generate World Map</h3>
            <button id="close-gen-modal-btn" class="drawer-close-btn">&times;</button>
          </div>
          <div class="modal-body" style="display:flex; flex-direction:column; gap:16px; overflow-y:auto; padding:16px;">

            <!-- Engine Mode Selector Tabs -->
            <div class="form-group">
              <label style="font-weight:600; font-size:0.9rem; margin-bottom:6px; display:block;">Map Generation Engine</label>
              <div class="segmented-control" style="display:flex; gap:8px; background:rgba(0,0,0,0.2); padding:4px; border-radius:8px; border:1px solid var(--border-color);">
                <button type="button" class="gen-mode-tab tool-btn primary active" data-mode="ai" style="flex:1;"><i class="fa-solid fa-robot"></i> 🤖 AI Fantasy Art Engine (Gemini / Pollinations)</button>
                <button type="button" class="gen-mode-tab tool-btn" data-mode="procedural" style="flex:1;"><i class="fa-solid fa-bolt"></i> ⚡ Procedural Engine (Instant Canvas)</button>
              </div>
            </div>

            <div class="form-group">
              <label for="gen-map-title" style="font-weight:600; font-size:0.9rem; margin-bottom:6px; display:block;">Map Title *</label>
              <input type="text" id="gen-map-title" class="form-control" value="Realm Map" placeholder="Enter map title...">
            </div>

            <!-- Target Article Checklist (Used for Context & Pin Placement) -->
            <div class="form-group">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                <label style="font-weight:600; font-size:0.9rem; margin:0;">Target Vault Articles (Context & Pin Placement)</label>
                <div style="display:flex; gap:6px;">
                  <button type="button" id="gen-article-select-all" class="tool-btn btn-sm" style="font-size:0.75rem; padding:2px 6px;">Select All</button>
                  <button type="button" id="gen-article-deselect-all" class="tool-btn btn-sm" style="font-size:0.75rem; padding:2px 6px;">Clear All</button>
                </div>
              </div>
              <input type="text" id="gen-article-search" class="form-control" placeholder="🔍 Search location articles to include..." style="margin-bottom:6px; font-size:0.85rem;">
              <div id="gen-article-checklist" style="max-height:130px; overflow-y:auto; border:1px solid var(--border-color); border-radius:6px; padding:6px; background:rgba(0,0,0,0.15); display:flex; flex-direction:column; gap:4px;">
                <!-- Dynamically populated in openGeneratorModal() -->
              </div>
            </div>

            <!-- Procedural Engine Options Container -->
            <div id="gen-procedural-settings">
              <div class="form-group" style="margin-bottom:14px;">
                <label style="font-weight:600; font-size:0.9rem; margin-bottom:6px; display:block;">Geography Preset</label>
                <div class="gen-preset-grid">
                  <div class="gen-preset-card active" data-preset="pangaea">
                    <div class="preset-icon">🌋</div>
                    <div class="preset-details">
                      <div class="preset-title">Pangaea</div>
                      <div class="preset-desc">Single continent with deep oceans</div>
                    </div>
                  </div>
                  <div class="gen-preset-card" data-preset="archipelago">
                    <div class="preset-icon">🏝️</div>
                    <div class="preset-details">
                      <div class="preset-title">Archipelago</div>
                      <div class="preset-desc">Scattered island chains</div>
                    </div>
                  </div>
                  <div class="gen-preset-card" data-preset="inland_sea">
                    <div class="preset-icon">🌊</div>
                    <div class="preset-details">
                      <div class="preset-title">Inland Sea</div>
                      <div class="preset-desc">Ring landmass around sea</div>
                    </div>
                  </div>
                  <div class="gen-preset-card" data-preset="mountain_fjords">
                    <div class="preset-icon">🏔️</div>
                    <div class="preset-details">
                      <div class="preset-title">Mountain Fjords</div>
                      <div class="preset-desc">Rugged valley coastlines</div>
                    </div>
                  </div>
                </div>
              </div>

              <div class="form-group" style="margin-bottom:14px;">
                <label style="font-weight:600; font-size:0.9rem; margin-bottom:6px; display:block;">Cartography Aesthetic Theme</label>
                <div class="gen-theme-chips">
                  <div class="gen-theme-chip active" data-theme="parchment">
                    <span>📜 Vintage Parchment</span>
                  </div>
                  <div class="gen-theme-chip" data-theme="void">
                    <span>🌌 Void Starlight</span>
                  </div>
                  <div class="gen-theme-chip" data-theme="emerald">
                    <span>🌿 Emerald Realm</span>
                  </div>
                </div>
              </div>

              <div class="form-group">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                  <label style="font-weight:600; font-size:0.9rem; margin:0;">Live Map Preview</label>
                  <div style="display:flex; align-items:center; gap:8px;">
                    <label for="gen-seed-input" style="font-size:0.85rem; color:var(--text-muted);">Seed:</label>
                    <input type="number" id="gen-seed-input" class="form-control" value="12345" style="width:100px; padding:4px 8px; font-size:0.85rem;">
                    <button id="gen-reroll-seed-btn" class="tool-btn btn-sm"><i class="fa-solid fa-dice"></i> 🎲 Reroll Seed</button>
                  </div>
                </div>
                <div class="gen-preview-container" style="background:#090d16; border:1px solid var(--border-color); border-radius:8px; padding:8px; display:flex; justify-content:center; align-items:center;">
                  <canvas id="gen-preview-canvas" width="400" height="225" style="width:100%; max-width:400px; height:auto; aspect-ratio:16/9; border-radius:4px; border:1px solid rgba(255,255,255,0.1);"></canvas>
                </div>
              </div>
            </div>

            <!-- AI Engine Options Container -->
            <div id="gen-ai-settings" style="display:none; flex-direction:column; gap:14px;">
              <div class="form-group">
                <label style="font-weight:600; font-size:0.9rem; margin-bottom:6px; display:block;">Map Scope & Scale Preset</label>
                <div class="gen-scope-grid" style="display:grid; grid-template-columns:repeat(3, 1fr); gap:8px;">
                  <div class="gen-scope-card active" data-scope="world" style="border:1px solid var(--border-color); border-radius:6px; padding:8px; cursor:pointer; background:rgba(255,255,255,0.03);">
                    <div style="font-size:1.2rem; margin-bottom:2px;">🌍</div>
                    <div style="font-weight:600; font-size:0.85rem;">World Map</div>
                    <div style="font-size:0.75rem; color:var(--text-muted);">Continental atlas</div>
                  </div>
                  <div class="gen-scope-card" data-scope="region" style="border:1px solid var(--border-color); border-radius:6px; padding:8px; cursor:pointer; background:rgba(255,255,255,0.03);">
                    <div style="font-size:1.2rem; margin-bottom:2px;">🗺️</div>
                    <div style="font-weight:600; font-size:0.85rem;">Region Map</div>
                    <div style="font-size:0.75rem; color:var(--text-muted);">Kingdom / Province</div>
                  </div>
                  <div class="gen-scope-card" data-scope="city" style="border:1px solid var(--border-color); border-radius:6px; padding:8px; cursor:pointer; background:rgba(255,255,255,0.03);">
                    <div style="font-size:1.2rem; margin-bottom:2px;">🏰</div>
                    <div style="font-weight:600; font-size:0.85rem;">City Map</div>
                    <div style="font-size:0.75rem; color:var(--text-muted);">Urban districts</div>
                  </div>
                  <div class="gen-scope-card" data-scope="town" style="border:1px solid var(--border-color); border-radius:6px; padding:8px; cursor:pointer; background:rgba(255,255,255,0.03);">
                    <div style="font-size:1.2rem; margin-bottom:2px;">🏘️</div>
                    <div style="font-weight:600; font-size:0.85rem;">Town / Village</div>
                    <div style="font-size:0.75rem; color:var(--text-muted);">Farmlands & street</div>
                  </div>
                  <div class="gen-scope-card" data-scope="treasure" style="border:1px solid var(--border-color); border-radius:6px; padding:8px; cursor:pointer; background:rgba(255,255,255,0.03);">
                    <div style="font-size:1.2rem; margin-bottom:2px;">📜</div>
                    <div style="font-weight:600; font-size:0.85rem;">Treasure Map</div>
                    <div style="font-size:0.75rem; color:var(--text-muted);">X-marks trail</div>
                  </div>
                  <div class="gen-scope-card" data-scope="battlemap" style="border:1px solid var(--border-color); border-radius:6px; padding:8px; cursor:pointer; background:rgba(255,255,255,0.03);">
                    <div style="font-size:1.2rem; margin-bottom:2px;">⚔️</div>
                    <div style="font-weight:600; font-size:0.85rem;">Battlemap</div>
                    <div style="font-size:0.75rem; color:var(--text-muted);">Tactical 5ft grid</div>
                  </div>
                </div>
              </div>

              <div class="form-group">
                <label style="font-weight:600; font-size:0.9rem; margin-bottom:6px; display:block;">AI Art Style</label>
                <div class="gen-style-chips" style="display:flex; gap:8px; flex-wrap:wrap;">
                  <div class="gen-style-chip active tool-btn btn-sm primary" data-style="sepia">
                    <span>📜 Vintage Sepia Parchment</span>
                  </div>
                  <div class="gen-style-chip tool-btn btn-sm" data-style="codex">
                    <span>🎨 Full-Color Codex</span>
                  </div>
                  <div class="gen-style-chip tool-btn btn-sm" data-style="grimdark">
                    <span>🗡️ Grimdark Fantasy</span>
                  </div>
                  <div class="gen-style-chip tool-btn btn-sm" data-style="blueprint">
                    <span>📐 Architect Blueprint</span>
                  </div>
                </div>
              </div>

              <div class="form-group">
                <label style="font-weight:600; font-size:0.9rem; margin-bottom:6px; display:block;">AI Synthesis Engine Provider</label>
                <div class="gen-provider-chips" style="display:flex; gap:8px;">
                  <div class="gen-provider-chip active tool-btn btn-sm primary" data-provider="pollinations" style="flex:1;">
                    <span>🌸 Pollinations AI (Flux - Free)</span>
                  </div>
                  <div class="gen-provider-chip tool-btn btn-sm" data-provider="gemini" style="flex:1;">
                    <span>🤖 Google Gemini AI</span>
                  </div>
                </div>
              </div>

              <div class="form-group">
                <label style="font-weight:600; font-size:0.9rem; margin-bottom:6px; display:block;">Custom AI Directives & Style Tweaks</label>
                <textarea id="gen-ai-prompt-input" class="form-control" rows="2" placeholder="e.g. Snow-capped peaks to the north, obsidian harbor to the south, intricate border frame..."></textarea>
                <div style="font-size:0.78rem; color:var(--text-muted); margin-top:4px;">
                  💡 <em>Selected Scope + Style + Articles are automatically compiled into the AI context prompt and scale metrics.</em>
                </div>
              </div>

              <div class="form-group">
                <label style="font-weight:600; font-size:0.85rem; color:var(--accent-gold, #f59e0b); margin-bottom:4px; display:block;">👁️ AI Prompt Synthesis Preview</label>
                <div id="gen-prompt-preview" style="font-family:monospace; font-size:0.78rem; background:rgba(0,0,0,0.3); border:1px solid var(--border-color); border-radius:6px; padding:8px; color:var(--text-muted); max-height:80px; overflow-y:auto; word-break:break-word;">
                  Loading prompt preview...
                </div>
              </div>
            </div>

            <div id="gen-modal-status" style="display:none; color:var(--accent-gold); font-size:0.9rem; align-items:center; gap:8px;">
              <i class="fa-solid fa-spinner fa-spin"></i> Generating 1920x1080 high-res cartography & uploading map...
            </div>
          </div>
          <div class="modal-footer" style="display:flex; justify-content:flex-end; gap:10px; margin-top:16px;">
            <button id="cancel-gen-modal-btn" class="tool-btn">Cancel</button>
            <button id="submit-gen-modal-btn" class="tool-btn primary"><i class="fa-solid fa-wand-magic-sparkles"></i> Generate Map</button>
          </div>
        </div>
      </div>

    `;

    this.bindEvents();
  }

  bindEvents() {
    const mapSelect = document.getElementById('atlas-map-select');
    if (mapSelect) {
      mapSelect.addEventListener('change', (e) => this.loadMap(e.target.value));
    }

    const modeDmBtn = document.getElementById('atlas-mode-dm');
    const modePlayerBtn = document.getElementById('atlas-mode-player');
    if (modeDmBtn && modePlayerBtn) {
      modeDmBtn.addEventListener('click', () => this.setViewMode('dm'));
      modePlayerBtn.addEventListener('click', () => this.setViewMode('player'));
    }

    const pinModeBtn = document.getElementById('atlas-pin-mode-btn');
    if (pinModeBtn) {
      pinModeBtn.addEventListener('click', () => this.togglePinPlacementMode());
    }

    const cancelPinBtn = document.getElementById('atlas-cancel-pin-btn');
    if (cancelPinBtn) {
      cancelPinBtn.addEventListener('click', () => this.togglePinPlacementMode(false));
    }

    const closeDrawerBtn = document.getElementById('atlas-close-drawer');
    if (closeDrawerBtn) {
      closeDrawerBtn.addEventListener('click', () => {
        document.getElementById('atlas-reader-drawer').style.display = 'none';
        this.clearVertexHandles();
      });
    }

    const shareBtn = document.getElementById('atlas-share-btn');
    if (shareBtn) {
      shareBtn.addEventListener('click', () => {
        const url = `${window.location.origin}/view/${this.worldId}`;
        navigator.clipboard.writeText(url);
        alert(`Interactive Atlas Public Link copied to clipboard:\n${url}`);
      });
    }

    const exportBtn = document.getElementById('atlas-export-btn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => this.exportStandaloneHtml());
    }

    // Map deletion trigger
    const deleteMapBtn = document.getElementById('atlas-delete-map-btn');
    if (deleteMapBtn) {
      deleteMapBtn.addEventListener('click', () => this.deleteCurrentMap());
    }

    // Map upload modal triggers
    const addMapBtn = document.getElementById('atlas-add-map-btn');
    if (addMapBtn) {
      addMapBtn.addEventListener('click', () => {
        document.getElementById('atlas-map-modal').style.display = 'flex';
      });
    }

    const closeMapModalBtn = document.getElementById('close-map-modal-btn');
    const cancelMapModalBtn = document.getElementById('cancel-map-modal-btn');
    if (closeMapModalBtn) closeMapModalBtn.addEventListener('click', () => document.getElementById('atlas-map-modal').style.display = 'none');
    if (cancelMapModalBtn) cancelMapModalBtn.addEventListener('click', () => document.getElementById('atlas-map-modal').style.display = 'none');

    const saveMapModalBtn = document.getElementById('save-map-modal-btn');
    if (saveMapModalBtn) {
      saveMapModalBtn.addEventListener('click', () => this.uploadMap());
    }

    // Pin creation modal triggers
    const closePinModalBtn = document.getElementById('close-pin-modal-btn');
    const cancelPinModalBtn = document.getElementById('cancel-pin-modal-btn');
    if (closePinModalBtn) closePinModalBtn.addEventListener('click', () => document.getElementById('atlas-pin-modal').style.display = 'none');
    if (cancelPinModalBtn) cancelPinModalBtn.addEventListener('click', () => document.getElementById('atlas-pin-modal').style.display = 'none');

    const savePinModalBtn = document.getElementById('save-pin-modal-btn');
    if (savePinModalBtn) {
      savePinModalBtn.addEventListener('click', () => this.savePin());
    }

    const autoGenBtn = document.getElementById('atlas-auto-gen-btn');
    if (autoGenBtn) {
      autoGenBtn.addEventListener('click', () => this.openGeneratorModal());
    }

    const modalGen = document.getElementById('atlas-generate-modal');
    const closeGenModalBtn = document.getElementById('close-gen-modal-btn');
    const cancelGenModalBtn = document.getElementById('cancel-gen-modal-btn');
    if (closeGenModalBtn && modalGen) {
      closeGenModalBtn.addEventListener('click', () => { modalGen.style.display = 'none'; });
    }
    if (cancelGenModalBtn && modalGen) {
      cancelGenModalBtn.addEventListener('click', () => { modalGen.style.display = 'none'; });
    }

    const submitGenModalBtn = document.getElementById('submit-gen-modal-btn');
    if (submitGenModalBtn) {
      submitGenModalBtn.addEventListener('click', () => this.submitGeneratorModal());
    }

    const modeTabs = document.querySelectorAll('.gen-mode-tab');
    modeTabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        modeTabs.forEach(t => t.classList.remove('active', 'primary'));
        const target = e.currentTarget;
        target.classList.add('active', 'primary');
        this.genMode = target.getAttribute('data-mode') || 'procedural';

        const procSettings = document.getElementById('gen-procedural-settings');
        const aiSettings = document.getElementById('gen-ai-settings');
        if (this.genMode === 'ai') {
          if (procSettings) procSettings.style.display = 'none';
          if (aiSettings) aiSettings.style.display = 'flex';
        } else {
          if (procSettings) procSettings.style.display = 'block';
          if (aiSettings) aiSettings.style.display = 'none';
          this.updateGeneratorPreview();
        }
      });
    });

    const articleSearch = document.getElementById('gen-article-search');
    if (articleSearch) {
      articleSearch.addEventListener('input', (e) => {
        const q = (e.target.value || '').trim().toLowerCase();
        const labels = document.querySelectorAll('.gen-article-label');
        let visibleMatches = [];

        labels.forEach(l => {
          const title = (l.getAttribute('data-title') || '').toLowerCase();
          const matches = q === '' || title.includes(q);
          l.style.display = matches ? 'flex' : 'none';
          if (q !== '' && matches) {
            const cb = l.querySelector('.gen-article-checkbox');
            if (cb) visibleMatches.push({ cb, title: l.querySelector('strong') ? l.querySelector('strong').textContent : '' });
          }
        });

        if (q !== '' && visibleMatches.length > 0) {
          document.querySelectorAll('.gen-article-checkbox').forEach(cb => cb.checked = false);
          visibleMatches.forEach(item => item.cb.checked = true);
          if (visibleMatches.length === 1) {
            const titleInput = document.getElementById('gen-map-title');
            if (titleInput) {
              titleInput.value = `${visibleMatches[0].title} Map`;
            }
          }
        }
      });
    }

    const selectAllBtn = document.getElementById('gen-article-select-all');
    if (selectAllBtn) {
      selectAllBtn.addEventListener('click', () => {
        document.querySelectorAll('.gen-article-checkbox').forEach(cb => cb.checked = true);
      });
    }

    const deselectAllBtn = document.getElementById('gen-article-deselect-all');
    if (deselectAllBtn) {
      deselectAllBtn.addEventListener('click', () => {
        document.querySelectorAll('.gen-article-checkbox').forEach(cb => cb.checked = false);
      });
    }

    const rerollSeedBtn = document.getElementById('gen-reroll-seed-btn');
    if (rerollSeedBtn) {
      rerollSeedBtn.addEventListener('click', () => {
        this.genSeed = Math.floor(Math.random() * 900000) + 10000;
        const seedInput = document.getElementById('gen-seed-input');
        if (seedInput) seedInput.value = this.genSeed;
        this.updateGeneratorPreview();
      });
    }

    const seedInput = document.getElementById('gen-seed-input');
    if (seedInput) {
      seedInput.addEventListener('input', (e) => {
        this.genSeed = parseInt(e.target.value, 10) || 12345;
        this.updateGeneratorPreview();
      });
    }

    if (modalGen) {
      const presetCards = modalGen.querySelectorAll('.gen-preset-card');
      presetCards.forEach(card => {
        card.addEventListener('click', () => {
          presetCards.forEach(c => c.classList.remove('active'));
          card.classList.add('active');
          this.genPreset = card.getAttribute('data-preset') || 'pangaea';
          this.updateGeneratorPreview();
        });
      });

      const scopeCards = modalGen.querySelectorAll('.gen-scope-card');
      scopeCards.forEach(card => {
        card.addEventListener('click', () => {
          scopeCards.forEach(c => c.classList.remove('active'));
          card.classList.add('active');
          this.mapScope = card.getAttribute('data-scope') || 'world';
          this.updateAIPromptPreview();
        });
      });

      const styleChips = modalGen.querySelectorAll('.gen-style-chip');
      styleChips.forEach(chip => {
        chip.addEventListener('click', () => {
          styleChips.forEach(c => c.classList.remove('active', 'primary'));
          chip.classList.add('active', 'primary');
          this.mapStyle = chip.getAttribute('data-style') || 'sepia';
          this.updateAIPromptPreview();
        });
      });

      const providerChips = modalGen.querySelectorAll('.gen-provider-chip');
      providerChips.forEach(chip => {
        chip.addEventListener('click', () => {
          providerChips.forEach(c => c.classList.remove('active', 'primary'));
          chip.classList.add('active', 'primary');
          this.aiProvider = chip.getAttribute('data-provider') || 'pollinations';
          this.updateAIPromptPreview();
        });
      });

      const themeChips = modalGen.querySelectorAll('.gen-theme-chip');
      themeChips.forEach(chip => {
        chip.addEventListener('click', () => {
          themeChips.forEach(c => c.classList.remove('active'));
          chip.classList.add('active');
          this.genTheme = chip.getAttribute('data-theme') || 'parchment';
          this.updateGeneratorPreview();
        });
      });

      const genTitleInput = document.getElementById('gen-map-title');
      if (genTitleInput) {
        genTitleInput.addEventListener('input', () => this.updateAIPromptPreview());
      }
      const genAiPromptInput = document.getElementById('gen-ai-prompt-input');
      if (genAiPromptInput) {
        genAiPromptInput.addEventListener('input', () => this.updateAIPromptPreview());
      }
    }

    const autoPinBtn = document.getElementById('atlas-auto-pin-btn');
    if (autoPinBtn) {
      autoPinBtn.addEventListener('click', () => this.autoPlacePins());
    }

    // Map layer controls and modal triggers
    const layersBtn = document.getElementById('atlas-layers-btn');
    if (layersBtn) {
      layersBtn.addEventListener('click', () => this.toggleLayersDrawer());
    }

    const aiDetectBtn = document.getElementById('atlas-ai-detect-btn');
    if (aiDetectBtn) {
      aiDetectBtn.addEventListener('click', () => this.triggerAiBorderDetection());
    }

    const closeAiDrawerBtn = document.getElementById('atlas-close-ai-drawer-btn');
    if (closeAiDrawerBtn) {
      closeAiDrawerBtn.addEventListener('click', () => this.closeAiCandidatesDrawer());
    }

    const approveCandidatesBtn = document.getElementById('atlas-approve-candidates-btn');
    if (approveCandidatesBtn) {
      approveCandidatesBtn.addEventListener('click', () => this.approveSelectedAiCandidates());
    }

    const closeLayersBtn = document.getElementById('atlas-close-layers-btn');
    if (closeLayersBtn) {
      closeLayersBtn.addEventListener('click', () => this.toggleLayersDrawer(false));
    }

    const addLayerBtn = document.getElementById('atlas-add-layer-btn');
    if (addLayerBtn) {
      addLayerBtn.addEventListener('click', () => {
        document.getElementById('atlas-layer-modal').style.display = 'flex';
      });
    }

    const closeLayerModalBtn = document.getElementById('close-layer-modal-btn');
    const cancelLayerModalBtn = document.getElementById('cancel-layer-modal-btn');
    if (closeLayerModalBtn) closeLayerModalBtn.addEventListener('click', () => document.getElementById('atlas-layer-modal').style.display = 'none');
    if (cancelLayerModalBtn) cancelLayerModalBtn.addEventListener('click', () => document.getElementById('atlas-layer-modal').style.display = 'none');

    const saveLayerModalBtn = document.getElementById('save-layer-modal-btn');
    if (saveLayerModalBtn) {
      saveLayerModalBtn.addEventListener('click', () => this.saveLayer());
    }

    // Territory drawing mode triggers
    const territoryModeBtn = document.getElementById('atlas-territory-mode-btn');
    if (territoryModeBtn) {
      territoryModeBtn.addEventListener('click', () => this.toggleTerritoryDrawingMode());
    }

    const completeTerritoryBtn = document.getElementById('atlas-complete-territory-btn');
    if (completeTerritoryBtn) {
      completeTerritoryBtn.addEventListener('click', () => this.completeTerritoryDrawing());
    }

    const cancelTerritoryBtn = document.getElementById('atlas-cancel-territory-btn');
    if (cancelTerritoryBtn) {
      cancelTerritoryBtn.addEventListener('click', () => this.toggleTerritoryDrawingMode(false));
    }

    // Territory modal triggers
    const closeTerritoryModalBtn = document.getElementById('close-territory-modal-btn');
    const cancelTerritoryModalBtn = document.getElementById('cancel-territory-modal-btn');
    if (closeTerritoryModalBtn) closeTerritoryModalBtn.addEventListener('click', () => this.closeTerritoryModal());
    if (cancelTerritoryModalBtn) cancelTerritoryModalBtn.addEventListener('click', () => this.closeTerritoryModal());

    const saveTerritoryModalBtn = document.getElementById('save-territory-modal-btn');
    if (saveTerritoryModalBtn) {
      saveTerritoryModalBtn.addEventListener('click', () => this.saveTerritory());
    }

    const deleteTerritoryModalBtn = document.getElementById('delete-territory-modal-btn');
    if (deleteTerritoryModalBtn) {
      deleteTerritoryModalBtn.addEventListener('click', () => this.deleteTerritory());
    }

    const opacityInput = document.getElementById('territory-fill-opacity-input');
    const opacityVal = document.getElementById('fill-opacity-val');
    if (opacityInput && opacityVal) {
      opacityInput.addEventListener('input', (e) => {
        opacityVal.textContent = e.target.value;
      });
    }

    // Ruler & Scale mode triggers
    const rulerModeBtn = document.getElementById('atlas-ruler-mode-btn');
    if (rulerModeBtn) {
      rulerModeBtn.addEventListener('click', () => this.toggleRulerMode());
    }

    const scaleCalibrateBtn = document.getElementById('atlas-scale-calibrate-btn');
    if (scaleCalibrateBtn) {
      scaleCalibrateBtn.addEventListener('click', () => this.openScaleModal());
    }

    const rulerClearBtn = document.getElementById('atlas-ruler-clear-btn');
    if (rulerClearBtn) {
      rulerClearBtn.addEventListener('click', () => this.clearRulerTape());
    }

    const closeScaleModalBtn = document.getElementById('close-scale-modal-btn');
    const cancelScaleModalBtn = document.getElementById('cancel-scale-modal-btn');
    if (closeScaleModalBtn) closeScaleModalBtn.addEventListener('click', () => this.closeScaleModal());
    if (cancelScaleModalBtn) cancelScaleModalBtn.addEventListener('click', () => this.closeScaleModal());

    const saveScaleModalBtn = document.getElementById('save-scale-modal-btn');
    if (saveScaleModalBtn) {
      saveScaleModalBtn.addEventListener('click', () => this.saveScaleModal());
    }

    // Route drawing mode triggers
    const routeModeBtn = document.getElementById('atlas-route-mode-btn');
    if (routeModeBtn) {
      routeModeBtn.addEventListener('click', () => this.toggleRouteDrawingMode());
    }

    const completeRouteBtn = document.getElementById('atlas-complete-route-btn');
    if (completeRouteBtn) {
      completeRouteBtn.addEventListener('click', () => this.openCreateRouteModal());
    }

    const cancelRouteBtn = document.getElementById('atlas-cancel-route-btn');
    if (cancelRouteBtn) {
      cancelRouteBtn.addEventListener('click', () => this.toggleRouteDrawingMode(false));
    }

    // Route modal triggers
    const closeRouteModalBtn = document.getElementById('close-route-modal-btn');
    const cancelRouteModalBtn = document.getElementById('cancel-route-modal-btn');
    if (closeRouteModalBtn) closeRouteModalBtn.addEventListener('click', () => document.getElementById('atlas-route-modal').style.display = 'none');
    if (cancelRouteModalBtn) cancelRouteModalBtn.addEventListener('click', () => document.getElementById('atlas-route-modal').style.display = 'none');

    const saveRouteModalBtn = document.getElementById('save-route-modal-btn');
    if (saveRouteModalBtn) {
      saveRouteModalBtn.addEventListener('click', () => this.saveRoute());
    }

    const deleteRouteModalBtn = document.getElementById('delete-route-modal-btn');
    if (deleteRouteModalBtn) {
      deleteRouteModalBtn.addEventListener('click', () => {
        if (this.editingRouteId) this.deleteRoute(this.editingRouteId);
      });
    }

    const scaleUseRulerBtn = document.getElementById('scale-use-ruler-btn');
    if (scaleUseRulerBtn) {
      scaleUseRulerBtn.addEventListener('click', () => {
        const pxDist = this.calculatePixelDistance(this.rulerPoints);
        if (pxDist > 0) {
          const pixelsInput = document.getElementById('scale-pixels-input');
          if (pixelsInput) pixelsInput.value = Math.round(pxDist);
        }
      });
    }

    // Pin Search Input Listener
    const pinSearchInput = document.getElementById('atlas-pin-search');
    if (pinSearchInput) {
      pinSearchInput.addEventListener('input', (e) => {
        this.pinSearchQuery = e.target.value;
        this.updateClearFilterBtnVisibility();
        this.renderPinsOnCanvas();
      });
    }

    // Category Filter Chips Listener
    const categoryBar = document.getElementById('atlas-pin-category-bar');
    if (categoryBar) {
      categoryBar.addEventListener('click', (e) => {
        const chip = e.target.closest('.atlas-category-chip');
        if (chip) {
          const category = chip.getAttribute('data-category');
          if (category) {
            this.selectedPinCategory = category;
            categoryBar.querySelectorAll('.atlas-category-chip').forEach(c => {
              c.classList.toggle('active', c.getAttribute('data-category') === category);
            });
            this.updateClearFilterBtnVisibility();
            this.renderPinsOnCanvas();
          }
        }
      });
    }

    // Clear Filter Button Listener
    const clearFilterBtn = document.getElementById('atlas-pin-clear-filter-btn');
    if (clearFilterBtn) {
      clearFilterBtn.addEventListener('click', () => {
        this.clearPinFilters();
      });
    }
  }

  updateClearFilterBtnVisibility() {
    const clearBtn = document.getElementById('atlas-pin-clear-filter-btn');
    if (clearBtn) {
      const isFiltered = (this.pinSearchQuery && this.pinSearchQuery.trim() !== '') || (this.selectedPinCategory && this.selectedPinCategory !== 'all');
      clearBtn.style.display = isFiltered ? 'inline-flex' : 'none';
    }
  }

  clearPinFilters() {
    this.pinSearchQuery = '';
    this.selectedPinCategory = 'all';
    const searchInput = document.getElementById('atlas-pin-search');
    if (searchInput) searchInput.value = '';

    const categoryBar = document.getElementById('atlas-pin-category-bar');
    if (categoryBar) {
      categoryBar.querySelectorAll('.atlas-category-chip').forEach(c => {
        c.classList.toggle('active', c.getAttribute('data-category') === 'all');
      });
    }

    this.updateClearFilterBtnVisibility();
    this.renderPinsOnCanvas();
  }

  async openGeneratorModal() {
    const modal = document.getElementById('atlas-generate-modal');
    if (!modal) return;

    modal.style.display = 'flex';
    this.genMode = this.genMode || 'ai';

    // Sync tab UI states
    const modeTabs = modal.querySelectorAll('.gen-mode-tab');
    modeTabs.forEach(tab => {
      const mode = tab.getAttribute('data-mode');
      if (mode === this.genMode) {
        tab.classList.add('active', 'primary');
      } else {
        tab.classList.remove('active', 'primary');
      }
    });

    const procSettings = document.getElementById('gen-procedural-settings');
    const aiSettings = document.getElementById('gen-ai-settings');
    if (this.genMode === 'ai') {
      if (procSettings) procSettings.style.display = 'none';
      if (aiSettings) aiSettings.style.display = 'flex';
    } else {
      if (procSettings) procSettings.style.display = 'block';
      if (aiSettings) aiSettings.style.display = 'none';
    }

    if (!this.articles || this.articles.length === 0) {
      await this.fetchArticles();
    }
    this.populateArticleChecklist();
    if (this.genMode === 'procedural') {
      this.updateGeneratorPreview();
    }
    this.updateAIPromptPreview();
  }

  updateAIPromptPreview() {
    const previewEl = document.getElementById('gen-prompt-preview');
    if (!previewEl) return;

    const titleInput = document.getElementById('gen-map-title');
    const title = titleInput ? titleInput.value.trim() : 'Realm Map';
    const modal = document.getElementById('atlas-generate-modal');

    let scope = 'world';
    let style = 'sepia';
    let provider = this.aiProvider || 'pollinations';

    if (modal) {
      const activeScope = modal.querySelector('.gen-scope-card.active');
      if (activeScope) scope = activeScope.getAttribute('data-scope') || 'world';
      const activeStyle = modal.querySelector('.gen-style-chip.active');
      if (activeStyle) style = activeStyle.getAttribute('data-style') || 'sepia';
      const activeProvider = modal.querySelector('.gen-provider-chip.active');
      if (activeProvider) provider = activeProvider.getAttribute('data-provider') || 'pollinations';
    }

    const customPromptInput = document.getElementById('gen-ai-prompt-input');
    const customPrompt = customPromptInput ? customPromptInput.value.trim() : '';

    const scopePrompts = {
      world: 'Grand continental fantasy world map, vast oceans, tectonic mountain ranges, empire borders, hand-inked cartography',
      region: 'Regional province fantasy map, trade roads, rivers, kingdom borders, county fortresses',
      city: 'Top-down urban city map plan, stone perimeter walls, cobblestone streets, district buildings, docks',
      town: 'Top-down village settlement map, rural farmlands, tavern, blacksmith, surrounding woodland glade',
      treasure: 'Weathered parchment treasure map, hand-drawn X marks the spot, dotted trail path, compass rose',
      battlemap: 'Top-down 2D tactical combat battlemap grid, overhead 90-degree angle view, encounter map layout, stone ruins, tactical terrain features'
    };

    const stylePrompts = {
      sepia: 'vintage sepia parchment paper, hand-inked cartography, Tolkien-style hatching, subtle aged vignetting',
      codex: 'full-color fantasy watercolor, rich emerald forests, sapphire waters, golden compass highlights',
      grimdark: 'moody dark fantasy, charcoal and granite tones, weathered parchment, obsidian rivers',
      blueprint: 'architectural blueprint, technical linework, 5ft grid overlay, crisp monochrome ink'
    };

    const providerTag = (provider === 'pollinations') ? '[Provider: Pollinations AI (Flux)]' : '[Provider: Google Gemini AI]';
    const promptText = `${providerTag} High resolution fantasy cartography map: ${scopePrompts[scope] || scopePrompts.world}, ${stylePrompts[style] || stylePrompts.sepia}, featuring ${title}. ${customPrompt ? customPrompt + '. ' : ''}No text labels, top-down perspective.`;

    previewEl.textContent = promptText;
  }

  populateArticleChecklist() {
    const checklist = document.getElementById('gen-article-checklist');
    if (!checklist) return;

    if (!this.articles || this.articles.length === 0) {
      checklist.innerHTML = '<div style="font-size:0.85rem; color:var(--text-muted); padding:4px;">No vault articles found. Generic map markers will be placed.</div>';
      return;
    }

    const locationArticles = this.articles.filter(a => a.category === 'Locations' || !a.category);
    const articlesToDisplay = locationArticles.length ? locationArticles : this.articles;

    checklist.innerHTML = articlesToDisplay.map(a => `
      <label class="gen-article-label" data-title="${(a.title || '').toLowerCase()}" style="display:flex; align-items:center; gap:8px; font-size:0.85rem; padding:4px 6px; border-radius:4px; cursor:pointer; background:rgba(255,255,255,0.03);">
        <input type="checkbox" class="gen-article-checkbox" value="${a.id}" data-title="${a.title}">
        <span><strong>${a.title}</strong> <span style="font-size:0.75rem; color:var(--text-muted);">(${a.category || 'General'})</span></span>
      </label>
    `).join('');

    const checkboxes = checklist.querySelectorAll('.gen-article-checkbox');
    if (checkboxes.length > 0) {
      checkboxes[0].checked = true; // Check first article by default
      const titleInput = document.getElementById('gen-map-title');
      if (titleInput && (!titleInput.value || titleInput.value === 'Realm Map')) {
        titleInput.value = `${checkboxes[0].getAttribute('data-title')} Map`;
      }
    }

    checkboxes.forEach(cb => {
      cb.addEventListener('change', () => {
        const checked = checklist.querySelectorAll('.gen-article-checkbox:checked');
        if (checked.length === 1) {
          const titleInput = document.getElementById('gen-map-title');
          if (titleInput) {
            titleInput.value = `${checked[0].getAttribute('data-title')} Map`;
          }
        }
      });
    });
  }

  updateGeneratorPreview() {
    const canvas = document.getElementById('gen-preview-canvas');
    if (!canvas) return;
    const engine = this.getCartographyEngine();
    if (engine) {
      engine.renderToCanvas(canvas, {
        seed: this.genSeed,
        preset: this.genPreset,
        theme: this.genTheme
      });
    }
  }

  async submitGeneratorModal() {
    const titleInput = document.getElementById('gen-map-title');
    const title = titleInput ? titleInput.value.trim() : 'Realm Map';
    const statusEl = document.getElementById('gen-modal-status');
    const submitBtn = document.getElementById('submit-gen-modal-btn');
    if (statusEl) statusEl.style.display = 'flex';
    if (submitBtn) submitBtn.disabled = true;

    try {
      // Gather selected target article IDs
      const checkedBoxes = document.querySelectorAll('.gen-article-checkbox:checked');
      const selectedArticleIds = Array.from(checkedBoxes).map(cb => cb.value);

      if (selectedArticleIds.length === 0) {
        if (statusEl) statusEl.style.display = 'none';
        if (submitBtn) submitBtn.disabled = false;
        if (typeof alert === 'function') {
          alert('Please check at least 1 target article in the "Target Vault Articles" list to focus your map generation.');
        }
        return;
      }

      const modal = document.getElementById('atlas-generate-modal');
      if (modal) {
        const activeScope = modal.querySelector('.gen-scope-card.active');
        if (activeScope) {
          this.mapScope = activeScope.getAttribute('data-scope') || 'world';
        }
        const activeStyle = modal.querySelector('.gen-style-chip.active');
        if (activeStyle) {
          this.mapStyle = activeStyle.getAttribute('data-style') || 'sepia';
        }
      }

      const isAi = (this.genMode === 'ai');
      const endpoint = isAi ? '/api/maps/generate/ai' : '/api/maps/generate/procedural';

      let effectivePreset = this.genPreset || 'pangaea';
      let effectiveTheme = this.genTheme || 'parchment';

      if (this.mapScope === 'battlemap' || this.mapScope === 'city' || this.mapScope === 'town') {
        effectivePreset = 'mountain_fjords';
      } else if (this.mapScope === 'treasure' || this.mapScope === 'region') {
        effectivePreset = 'archipelago';
      }

      if (this.mapStyle === 'grimdark') {
        effectiveTheme = 'void';
      } else if (this.mapStyle === 'blueprint') {
        effectiveTheme = 'blueprint';
      } else if (this.mapStyle === 'codex') {
        effectiveTheme = 'emerald';
      } else if (this.mapStyle === 'sepia') {
        effectiveTheme = 'parchment';
      }

      const formData = new FormData();
      formData.append('world_id', this.worldId);
      formData.append('title', title || (isAi ? 'AI Realm Map' : 'Procedural Realm Map'));
      formData.append('preset', effectivePreset);
      formData.append('map_scope', this.mapScope || 'world');
      formData.append('map_style', this.mapStyle || 'sepia');
      formData.append('ai_provider', this.aiProvider || 'pollinations');
      formData.append('theme', effectiveTheme);
      formData.append('seed', this.genSeed);
      formData.append('selected_article_ids', JSON.stringify(selectedArticleIds));

      const aiPromptInput = document.getElementById('gen-ai-prompt-input');
      if (aiPromptInput && aiPromptInput.value.trim()) {
        formData.append('custom_prompt', aiPromptInput.value.trim());
      }

      if (!isAi) {
        const engine = this.getCartographyEngine();
        let offscreenCanvas = null;
        if (typeof document !== 'undefined' && document.createElement) {
          offscreenCanvas = document.createElement('canvas');
          offscreenCanvas.width = 1920;
          offscreenCanvas.height = 1080;
        }

        if (engine && offscreenCanvas) {
          engine.renderToCanvas(offscreenCanvas, {
            seed: this.genSeed,
            preset: effectivePreset,
            theme: effectiveTheme
          });
        }

        let blob = null;
        if (engine && offscreenCanvas) {
          blob = await engine.exportToBlob(offscreenCanvas);
        }
        if (blob) {
          formData.append('image', blob, 'map.png');
        }
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      if (data.success && data.map) {
        const modal = document.getElementById('atlas-generate-modal');
        if (modal) modal.style.display = 'none';

        await this.fetchMaps();

        const mapSelect = document.getElementById('atlas-map-select');
        if (mapSelect && this.maps.length) {
          mapSelect.innerHTML = this.maps.map(m => `<option value="${m.id}" ${m.id === data.map.id ? 'selected' : ''}>${m.title}</option>`).join('');
          mapSelect.value = data.map.id;
        }

        if (data.map.id) {
          await this.loadMap(data.map.id);
        }

        if (data.warning && typeof alert === 'function') {
          alert(`⚠️ AI Generation Notice:\n\n${data.warning}`);
        } else if (data.notice && typeof alert === 'function') {
          alert(`✨ AI Map Generated:\n\n${data.notice}`);
        }
      } else {
        alert((data && data.error) ? data.error : 'Failed to generate map.');
      }
    } catch (err) {
      console.error('Error submitting generator modal:', err);
      alert('Error generating map: ' + err.message);
    } finally {
      if (statusEl) statusEl.style.display = 'none';
      if (submitBtn) submitBtn.disabled = false;
    }
  }

  autoGenerateMap() {
    this.openGeneratorModal();
  }

  async autoPlacePins() {
    if (!this.currentMap) {
      alert('Please select or upload a map first.');
      return;
    }

    try {
      const res = await fetch(`/api/maps/${this.currentMap.id}/auto-pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ world_id: this.worldId })
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message || `Auto-placed ${data.addedPins.length} unpinned location markers onto this map!`);
        await this.loadMapPins(this.currentMap.id);
      }
    } catch (e) {
      alert('Failed to auto-place pins.');
    }
  }

  async setViewMode(mode) {
    this.viewMode = mode;
    this.clearVertexHandles();
    this.selectedTerritory = null;
    const dmBtn = document.getElementById('atlas-mode-dm');
    const playerBtn = document.getElementById('atlas-mode-player');
    if (dmBtn) dmBtn.classList.toggle('active', mode === 'dm');
    if (playerBtn) playerBtn.classList.toggle('active', mode === 'player');
    if (this.currentMap) {
      await this.fetchLayers(this.currentMap.id);
      this.renderLayersDrawer();
      await this.loadMapPins(this.currentMap.id);
      await this.loadMapTerritories(this.currentMap.id);
      await this.loadMapRoutes(this.currentMap.id);
    }
  }

  togglePinPlacementMode(forceState) {
    this.isPinPlacementActive = forceState !== undefined ? forceState : !this.isPinPlacementActive;
    if (this.isPinPlacementActive) {
      if (this.isTerritoryDrawingActive) this.toggleTerritoryDrawingMode(false);
      if (this.isRulerActive) this.toggleRulerMode(false);
      if (this.isRouteDrawingActive) this.toggleRouteDrawingMode(false);
    }
    const btn = document.getElementById('atlas-pin-mode-btn');
    const toast = document.getElementById('atlas-reticle-toast');
    const canvas = document.getElementById('atlas-canvas-container');
    if (btn) btn.classList.toggle('active', this.isPinPlacementActive);
    if (toast) toast.style.display = this.isPinPlacementActive ? 'inline-flex' : 'none';
    if (canvas) canvas.style.cursor = this.isPinPlacementActive ? 'crosshair' : 'grab';
  }

  toggleTerritoryDrawingMode(forceState) {
    this.isTerritoryDrawingActive = forceState !== undefined ? forceState : !this.isTerritoryDrawingActive;
    if (this.isTerritoryDrawingActive) {
      if (this.isPinPlacementActive) this.togglePinPlacementMode(false);
      if (this.isRulerActive) this.toggleRulerMode(false);
      if (this.isRouteDrawingActive) this.toggleRouteDrawingMode(false);
    }

    const btn = document.getElementById('atlas-territory-mode-btn');
    const toast = document.getElementById('atlas-territory-toast');
    const canvas = document.getElementById('atlas-canvas-container');

    if (btn) btn.classList.toggle('active', this.isTerritoryDrawingActive);
    if (toast) toast.style.display = this.isTerritoryDrawingActive ? 'inline-flex' : 'none';
    if (canvas) canvas.style.cursor = this.isTerritoryDrawingActive ? 'crosshair' : 'grab';

    if (this.isTerritoryDrawingActive) {
      this.activeDrawVertices = [];
      if (this.activeDrawPolyline) {
        this.activeDrawPolyline.remove();
        this.activeDrawPolyline = null;
      }
      this.clearVertexHandles();
    } else {
      if (this.activeDrawPolyline) {
        this.activeDrawPolyline.remove();
        this.activeDrawPolyline = null;
      }
      this.activeDrawVertices = [];
    }
  }

  toggleRulerMode(forceState) {
    this.isRulerActive = forceState !== undefined ? forceState : !this.isRulerActive;
    if (this.isRulerActive) {
      if (this.isPinPlacementActive) this.togglePinPlacementMode(false);
      if (this.isTerritoryDrawingActive) this.toggleTerritoryDrawingMode(false);
      if (this.isRouteDrawingActive) this.toggleRouteDrawingMode(false);
    }
    const btn = document.getElementById('atlas-ruler-mode-btn');
    const toast = document.getElementById('atlas-ruler-toast');
    const canvas = document.getElementById('atlas-canvas-container');
    if (btn) btn.classList.toggle('active', this.isRulerActive);
    if (toast) toast.style.display = this.isRulerActive ? 'flex' : 'none';
    if (canvas) canvas.style.cursor = this.isRulerActive ? 'crosshair' : 'grab';

    if (!this.isRulerActive) {
      this.clearRulerTape();
    }
  }

  toggleRouteDrawingMode(forceState) {
    this.isRouteDrawingActive = forceState !== undefined ? forceState : !this.isRouteDrawingActive;
    if (this.isRouteDrawingActive) {
      if (this.isPinPlacementActive) this.togglePinPlacementMode(false);
      if (this.isTerritoryDrawingActive) this.toggleTerritoryDrawingMode(false);
      if (this.isRulerActive) this.toggleRulerMode(false);
    }
    const btn = document.getElementById('atlas-route-mode-btn');
    const toast = document.getElementById('atlas-route-toast');
    const canvas = document.getElementById('atlas-canvas-container');
    if (btn) btn.classList.toggle('active', this.isRouteDrawingActive);
    if (toast) toast.style.display = this.isRouteDrawingActive ? 'inline-flex' : 'none';
    if (canvas) canvas.style.cursor = this.isRouteDrawingActive ? 'crosshair' : 'grab';

    if (this.isRouteDrawingActive) {
      this.activeRouteVertices = [];
      if (this.activeRoutePolyline) {
        this.activeRoutePolyline.remove();
        this.activeRoutePolyline = null;
      }
      this.clearRouteVertexMarkers();
      this.updateRouteToast();
    } else {
      if (this.activeRoutePolyline) {
        this.activeRoutePolyline.remove();
        this.activeRoutePolyline = null;
      }
      this.clearRouteVertexMarkers();
      this.activeRouteVertices = [];
    }
  }

  clearRouteVertexMarkers() {
    if (Array.isArray(this.activeRouteVertexMarkers)) {
      this.activeRouteVertexMarkers.forEach(m => {
        if (m && typeof m.remove === 'function') m.remove();
      });
    }
    this.activeRouteVertexMarkers = [];
  }

  clearRulerTape() {
    this.rulerPoints = [];
    if (this.rulerPolyline) {
      this.rulerPolyline.remove();
      this.rulerPolyline = null;
    }
    if (Array.isArray(this.rulerMarkers)) {
      this.rulerMarkers.forEach(m => {
        if (m && typeof m.remove === 'function') m.remove();
      });
    }
    this.rulerMarkers = [];
    this.updateRulerToast();
  }

  addRulerPoint(x_px, y_px) {
    this.rulerPoints.push([x_px, y_px]);
    if (!this.mapInstance || typeof L === 'undefined') {
      this.updateRulerToast();
      return;
    }

    const latlngs = this.rulerPoints.map(pt => [pt[1], pt[0]]);

    if (!this.rulerPolyline) {
      this.rulerPolyline = L.polyline(latlngs, {
        color: '#06b6d4',
        weight: 4,
        dashArray: '8, 8'
      }).addTo(this.mapInstance);
    } else {
      this.rulerPolyline.setLatLngs(latlngs);
    }

    const marker = L.marker([y_px, x_px], {
      icon: L.divIcon({
        className: 'ruler-point-handle',
        html: `<div class="ruler-node" title="Measurement Point ${this.rulerPoints.length}"></div>`,
        iconSize: [12, 12],
        iconAnchor: [6, 6]
      })
    }).addTo(this.mapInstance);

    this.rulerMarkers.push(marker);
    this.updateRulerToast();
  }

  calculatePixelDistance(points) {
    if (!Array.isArray(points) || points.length < 2) return 0;
    let totalPx = 0;
    for (let i = 0; i < points.length - 1; i++) {
      const dx = points[i + 1][0] - points[i][0];
      const dy = points[i + 1][1] - points[i][1];
      totalPx += Math.sqrt(dx * dx + dy * dy);
    }
    return totalPx;
  }

  calculateRealDistance(pixelDist, scale_pixels, scale_distance) {
    const sPx = (scale_pixels !== undefined && parseFloat(scale_pixels) > 0) ? parseFloat(scale_pixels) : 100.0;
    const sDist = (scale_distance !== undefined && parseFloat(scale_distance) > 0) ? parseFloat(scale_distance) : 10.0;
    return (pixelDist / sPx) * sDist;
  }

  calculateTravelTimes(distance) {
    const d = parseFloat(distance) || 0;
    return {
      footDays: d / 30,
      horseDays: d / 60,
      sailDays: d / 100
    };
  }

  async deleteCurrentMap() {
    if (!this.currentMap) {
      alert('No map currently selected to delete.');
      return;
    }
    if (!confirm(`Are you sure you want to delete map "${this.currentMap.title}"? This will also remove associated pins, territories, layers, and routes. This action cannot be undone.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/maps/${this.currentMap.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        await this.fetchMaps();
        this.renderLayout();
        if (this.maps.length > 0) {
          await this.loadMap(this.maps[0].id);
        } else {
          this.currentMap = null;
          const container = document.getElementById('atlas-canvas-container');
          if (container) {
            container.innerHTML = '<div style="display:flex; align-items:center; justify-content:center; height:100%; color:var(--text-muted, #94a3b8); font-size:1.2rem;">No Maps Available. Click [Upload Map] or [Auto-Generate Map] to create one.</div>';
          }
        }
      } else {
        alert('Failed to delete map: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      console.error('Delete map error:', err);
      alert('Failed to delete map: ' + err.message);
    }
  }

  formatTravelTime(days) {
    const d = parseFloat(days) || 0;
    if (d <= 0) return '0 days';
    if (d < 1) {
      const hrs = Math.round(d * 24);
      return hrs <= 1 ? `${hrs || 1} hr` : `${hrs} hrs`;
    }
    return `${d.toFixed(1)} days`;
  }

  updateRulerToast() {
    const distValEl = document.getElementById('ruler-distance-val');
    const distUnitEl = document.getElementById('ruler-distance-unit');
    const footEl = document.getElementById('ruler-time-foot');
    const horseEl = document.getElementById('ruler-time-horse');
    const sailEl = document.getElementById('ruler-time-sail');

    const pxDist = this.calculatePixelDistance(this.rulerPoints);
    const sPx = (this.currentMap && this.currentMap.scale_pixels) || 100.0;
    const sDist = (this.currentMap && this.currentMap.scale_distance) || 10.0;
    const sUnit = (this.currentMap && this.currentMap.scale_unit) || 'miles';

    const realDist = this.calculateRealDistance(pxDist, sPx, sDist);
    const travel = this.calculateTravelTimes(realDist);

    if (distValEl) distValEl.textContent = realDist.toFixed(1);
    if (distUnitEl) distUnitEl.textContent = sUnit;
    if (footEl) footEl.textContent = this.formatTravelTime(travel.footDays);
    if (horseEl) horseEl.textContent = this.formatTravelTime(travel.horseDays);
    if (sailEl) sailEl.textContent = this.formatTravelTime(travel.sailDays);
  }

  openScaleModal() {
    if (this.currentMap) {
      const pxInput = document.getElementById('scale-pixels-input');
      const distInput = document.getElementById('scale-distance-input');
      const unitInput = document.getElementById('scale-unit-input');

      if (pxInput) pxInput.value = this.currentMap.scale_pixels || 100.0;
      if (distInput) distInput.value = this.currentMap.scale_distance || 10.0;
      if (unitInput) unitInput.value = this.currentMap.scale_unit || 'miles';
    }

    const useBox = document.getElementById('scale-use-current-box');
    const rulerPxVal = document.getElementById('scale-ruler-px-val');
    const pxDist = this.calculatePixelDistance(this.rulerPoints);

    if (pxDist > 0) {
      if (useBox) useBox.style.display = 'block';
      if (rulerPxVal) rulerPxVal.textContent = Math.round(pxDist);
    } else {
      if (useBox) useBox.style.display = 'none';
    }

    const modal = document.getElementById('atlas-scale-modal');
    if (modal) modal.style.display = 'flex';
  }

  closeScaleModal() {
    const modal = document.getElementById('atlas-scale-modal');
    if (modal) modal.style.display = 'none';
  }

  async saveMapScale() {
    if (!this.currentMap) {
      alert('Please select or upload a map first.');
      return;
    }

    const pxInput = document.getElementById('scale-pixels-input');
    const distInput = document.getElementById('scale-distance-input');
    const unitInput = document.getElementById('scale-unit-input');

    const scale_pixels = pxInput ? parseFloat(pxInput.value) : 100.0;
    const scale_distance = distInput ? parseFloat(distInput.value) : 10.0;
    const scale_unit = unitInput ? unitInput.value.trim() : 'miles';

    if (isNaN(scale_pixels) || scale_pixels <= 0) {
      alert('Please enter a valid positive number for reference pixels.');
      return;
    }
    if (isNaN(scale_distance) || scale_distance <= 0) {
      alert('Please enter a valid positive number for real-world distance.');
      return;
    }
    if (!scale_unit) {
      alert('Please enter a valid distance unit (e.g., miles).');
      return;
    }

    try {
      const res = await fetch(`/api/maps/${this.currentMap.id}/scale`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scale_pixels, scale_distance, scale_unit })
      });

      const data = await res.json();
      if (data.map || data.success) {
        const updated = data.map || data;
        this.currentMap.scale_pixels = updated.scale_pixels || scale_pixels;
        this.currentMap.scale_distance = updated.scale_distance || scale_distance;
        this.currentMap.scale_unit = updated.scale_unit || scale_unit;

        const mapInList = this.maps.find(m => m.id === this.currentMap.id);
        if (mapInList) {
          mapInList.scale_pixels = this.currentMap.scale_pixels;
          mapInList.scale_distance = this.currentMap.scale_distance;
          mapInList.scale_unit = this.currentMap.scale_unit;
        }

        this.closeScaleModal();
        this.updateRulerToast();
      } else {
        alert(data.error || 'Failed to update map scale.');
      }
    } catch (e) {
      alert(`Failed to update map scale: ${e.message}`);
    }
  }

  async fetchMapTree(mapId) {
    if (!mapId) return null;
    try {
      const res = await fetch(`/api/maps/${mapId}/tree`);
      if (!res.ok) return null;
      const data = await res.json();
      return data;
    } catch (e) {
      console.error('Failed to fetch map tree:', e);
      return null;
    }
  }

  renderBreadcrumbs() {
    const container = document.getElementById('atlas-breadcrumbs');
    if (!container) return;

    if (!this.breadcrumbStack || this.breadcrumbStack.length === 0) {
      container.style.display = 'none';
      container.innerHTML = '';
      return;
    }

    container.style.display = 'flex';
    const html = `
      <span class="breadcrumb-icon" title="Map Hierarchy"><i class="fa-solid fa-compass"></i></span>
      ${this.breadcrumbStack.map((m, index) => {
        const isLast = index === this.breadcrumbStack.length - 1;
        const separator = index > 0 ? `<span class="breadcrumb-separator"><i class="fa-solid fa-chevron-right"></i></span>` : '';
        if (isLast) {
          return `${separator}<span class="breadcrumb-item active">${m.title}</span>`;
        } else {
          return `${separator}<a href="#" class="breadcrumb-item breadcrumb-link" data-map-id="${m.id}">${m.title}</a>`;
        }
      }).join('')}
    `;

    container.innerHTML = html;

    container.querySelectorAll('.breadcrumb-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetMapId = link.getAttribute('data-map-id');
        if (targetMapId) {
          this.loadMap(targetMapId);
        }
      });
    });
  }

  async loadMap(mapId) {
    this.currentMap = this.maps.find(m => m.id === mapId) || null;
    if (!this.currentMap) return;

    const treeData = await this.fetchMapTree(mapId);
    if (treeData && treeData.map) {
      const ancestors = Array.isArray(treeData.ancestors) ? treeData.ancestors : [];
      this.breadcrumbStack = [...ancestors, treeData.map];
    } else {
      this.breadcrumbStack = [this.currentMap];
    }
    this.renderBreadcrumbs();

    const mapSelect = document.getElementById('atlas-map-select');
    if (mapSelect && mapSelect.value !== mapId) {
      mapSelect.value = mapId;
    }

    this.clearAiGhostPolygons();
    this.closeAiCandidatesDrawer();

    if (this.mapInstance) {
      this.mapInstance.remove();
      this.mapInstance = null;
    }

    const container = document.getElementById('atlas-canvas-container');
    if (!container || typeof L === 'undefined') return;

    const w = this.currentMap.width || 1920;
    const h = this.currentMap.height || 1080;
    const bounds = [[0, 0], [h, w]];

    this.mapInstance = L.map('atlas-canvas-container', {
      crs: L.CRS.Simple,
      minZoom: -2,
      maxZoom: 2,
      zoomSnap: 0.5
    });

    const imgOverlay = L.imageOverlay(this.currentMap.image_path || '/uploads/images/default-map.png', bounds).addTo(this.mapInstance);
    if (imgOverlay && typeof imgOverlay.getElement === 'function' && imgOverlay.getElement()) {
      imgOverlay.getElement().onerror = () => {
        console.warn(`[Atlas] Map image '${this.currentMap.image_path}' failed to load. Falling back to default map.`);
        if (typeof imgOverlay.setUrl === 'function') {
          imgOverlay.setUrl('/uploads/images/default-map.png');
        }
      };
    }
    this.mapInstance.fitBounds(bounds);

    this.mapInstance.on('click', (e) => {
      if (this.isRulerActive) {
        const x_px = e.latlng.lng;
        const y_px = e.latlng.lat;
        this.addRulerPoint(x_px, y_px);
      } else if (this.isPinPlacementActive) {
        const x_pct = e.latlng.lng / w;
        const y_pct = e.latlng.lat / h;
        this.openCreatePinModal(x_pct, y_pct);
      } else if (this.isTerritoryDrawingActive) {
        const x_pct = Math.max(0, Math.min(1, e.latlng.lng / w));
        const y_pct = Math.max(0, Math.min(1, e.latlng.lat / h));
        this.addTerritoryDrawingVertex(x_pct, y_pct);
      } else if (this.isRouteDrawingActive) {
        const x_pct = Math.max(0, Math.min(1, e.latlng.lng / w));
        const y_pct = Math.max(0, Math.min(1, e.latlng.lat / h));
        this.addRouteDrawingVertex(x_pct, y_pct);
      } else {
        this.clearVertexHandles();
        this.selectedTerritory = null;
      }
    });

    await this.fetchLayers(mapId);
    this.renderLayersDrawer();
    await this.loadMapPins(mapId);
    await this.loadMapTerritories(mapId);
    await this.loadMapRoutes(mapId);
  }

  addTerritoryDrawingVertex(x_pct, y_pct) {
    this.activeDrawVertices.push([x_pct, y_pct]);
    if (!this.currentMap || !this.mapInstance || typeof L === 'undefined') return;

    const w = this.currentMap.width || 1920;
    const h = this.currentMap.height || 1080;
    const latlngs = this.activeDrawVertices.map(v => [v[1] * h, v[0] * w]);

    if (!this.activeDrawPolyline) {
      this.activeDrawPolyline = L.polyline(latlngs, {
        color: '#38bdf8',
        weight: 2,
        dashArray: '5, 5'
      }).addTo(this.mapInstance);
    } else {
      this.activeDrawPolyline.setLatLngs(latlngs);
    }
  }

  completeTerritoryDrawing() {
    if (this.activeDrawVertices.length < 3) {
      alert('A territory boundary requires at least 3 vertices.');
      return;
    }
    this.openTerritoryModal();
  }

  openTerritoryModal(territory = null) {
    const layerSelect = document.getElementById('territory-layer-select');
    if (layerSelect) {
      layerSelect.innerHTML = `<option value="">-- Default / None --</option>` +
        this.layers.map(l => `<option value="${l.id}">${l.name}</option>`).join('');
    }

    const deleteBtn = document.getElementById('delete-territory-modal-btn');

    if (territory) {
      this.editingTerritoryId = territory.id;
      document.getElementById('territory-title-input').value = territory.title || '';
      if (layerSelect) layerSelect.value = territory.layer_id || '';
      document.getElementById('territory-article-select').value = territory.article_id || '';
      document.getElementById('territory-stroke-color-input').value = territory.stroke_color || '#ef4444';
      document.getElementById('territory-stroke-width-input').value = territory.stroke_width || 3;
      document.getElementById('territory-stroke-style-select').value = territory.stroke_style || 'solid';
      document.getElementById('territory-fill-color-input').value = territory.fill_color || '#ef4444';
      const opacity = territory.fill_opacity !== undefined ? territory.fill_opacity : 0.25;
      document.getElementById('territory-fill-opacity-input').value = opacity;
      const opacityVal = document.getElementById('fill-opacity-val');
      if (opacityVal) opacityVal.textContent = opacity;
      document.getElementById('territory-secret-checkbox').checked = territory.is_secret === 1;
      if (deleteBtn) deleteBtn.style.display = 'inline-block';
    } else {
      this.editingTerritoryId = null;
      document.getElementById('territory-title-input').value = '';
      if (layerSelect) layerSelect.value = '';
      document.getElementById('territory-article-select').value = '';
      document.getElementById('territory-stroke-color-input').value = '#ef4444';
      document.getElementById('territory-stroke-width-input').value = 3;
      document.getElementById('territory-stroke-style-select').value = 'solid';
      document.getElementById('territory-fill-color-input').value = '#ef4444';
      document.getElementById('territory-fill-opacity-input').value = 0.25;
      const opacityVal = document.getElementById('fill-opacity-val');
      if (opacityVal) opacityVal.textContent = '0.25';
      document.getElementById('territory-secret-checkbox').checked = false;
      if (deleteBtn) deleteBtn.style.display = 'none';
    }

    const modal = document.getElementById('atlas-territory-modal');
    if (modal) modal.style.display = 'flex';
  }

  closeTerritoryModal() {
    const modal = document.getElementById('atlas-territory-modal');
    if (modal) modal.style.display = 'none';
  }

  async saveTerritory() {
    if (!this.currentMap) {
      alert('Please select or upload a map first.');
      return;
    }

    const title = document.getElementById('territory-title-input').value.trim();
    if (!title) {
      alert('Please enter a territory title.');
      return;
    }

    const payload = {
      title,
      layer_id: document.getElementById('territory-layer-select').value || null,
      article_id: document.getElementById('territory-article-select').value || null,
      stroke_color: document.getElementById('territory-stroke-color-input').value,
      stroke_width: parseInt(document.getElementById('territory-stroke-width-input').value, 10) || 3,
      stroke_style: document.getElementById('territory-stroke-style-select').value,
      fill_color: document.getElementById('territory-fill-color-input').value,
      fill_opacity: parseFloat(document.getElementById('territory-fill-opacity-input').value) || 0.25,
      is_secret: document.getElementById('territory-secret-checkbox').checked ? 1 : 0
    };

    try {
      let res;
      if (!this.editingTerritoryId) {
        payload.points_json = JSON.stringify(this.activeDrawVertices);
        res = await fetch(`/api/maps/${this.currentMap.id}/territories`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch(`/api/maps/${this.currentMap.id}/territories/${this.editingTerritoryId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      const data = await res.json();
      if (data.success || data.territory) {
        this.closeTerritoryModal();
        this.toggleTerritoryDrawingMode(false);
        this.editingTerritoryId = null;
        await this.loadMapTerritories(this.currentMap.id);
      } else {
        alert(data.error || 'Failed to save territory.');
      }
    } catch (e) {
      alert(`Failed to save territory: ${e.message}`);
    }
  }

  async deleteTerritory(territoryId) {
    const targetId = territoryId || this.editingTerritoryId;
    if (!this.currentMap || !targetId) return;

    const territory = this.territories.find(t => t.id === targetId);
    const title = territory ? territory.title : 'this territory';
    if (!confirm(`Are you sure you want to delete "${title}"?`)) return;

    try {
      const res = await fetch(`/api/maps/${this.currentMap.id}/territories/${targetId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        this.closeTerritoryModal();
        const drawer = document.getElementById('atlas-reader-drawer');
        if (drawer) drawer.style.display = 'none';
        this.clearVertexHandles();
        this.selectedTerritory = null;
        await this.loadMapTerritories(this.currentMap.id);
      } else {
        alert(data.error || 'Failed to delete territory.');
      }
    } catch (e) {
      alert(`Failed to delete territory: ${e.message}`);
    }
  }

  async loadMapTerritories(mapId) {
    const targetMapId = mapId || (this.currentMap ? this.currentMap.id : null);
    if (!targetMapId) {
      this.territories = [];
      return;
    }

    try {
      const res = await fetch(`/api/maps/${targetMapId}/territories?mode=${this.viewMode}`);
      const data = await res.json();
      this.territories = data.territories || [];
      this.renderTerritoriesOnCanvas();
    } catch (e) {
      console.error('Failed to load map territories:', e);
      this.territories = [];
    }
  }

  renderTerritoriesOnCanvas() {
    this.territoryPolygons.forEach(p => p.remove());
    this.territoryPolygons = [];

    if (!this.currentMap || !this.mapInstance || typeof L === 'undefined') return;
    const w = this.currentMap.width || 1920;
    const h = this.currentMap.height || 1080;

    const hiddenLayerIds = new Set(this.layers.filter(l => !l.is_visible).map(l => l.id));

    this.territories.forEach(t => {
      if (t.layer_id && hiddenLayerIds.has(t.layer_id)) {
        return;
      }

      let points = [];
      try {
        points = typeof t.points_json === 'string' ? JSON.parse(t.points_json) : (t.points_json || []);
      } catch (e) {
        points = [];
      }

      if (!Array.isArray(points) || points.length < 3) return;

      const latlngs = points.map(pt => [pt[1] * h, pt[0] * w]);
      let dashArray = null;
      if (t.stroke_style === 'dashed') dashArray = '6, 6';
      if (t.stroke_style === 'dotted') dashArray = '2, 4';

      const poly = L.polygon(latlngs, {
        color: t.stroke_color || '#ef4444',
        weight: t.stroke_width || 3,
        dashArray: dashArray,
        fillColor: t.fill_color || '#ef4444',
        fillOpacity: t.fill_opacity !== undefined ? t.fill_opacity : 0.25
      }).addTo(this.mapInstance);

      poly.bindTooltip(t.title, { permanent: false, direction: 'center' });
      poly._territoryId = t.id;

      poly.on('click', (e) => {
        if (L.DomEvent && L.DomEvent.stopPropagation) L.DomEvent.stopPropagation(e);
        if (t.is_contested) {
          this.openContestedConflictDrawer(t);
        } else if (this.viewMode === 'dm') {
          this.selectTerritoryForEditing(t);
        } else {
          this.openArticleDrawer(t.article_id, t.title);
        }
      });

      this.territoryPolygons.push(poly);
    });

    this.injectSvgPatterns();
    this.checkTerritoryIntersections();
  }

  injectSvgPatterns() {
    if (!this.mapInstance) return;
    const container = document.getElementById(this.containerId);
    const svg = container ? container.querySelector('svg') : document.querySelector('.leaflet-container svg');
    if (!svg) return;

    let defs = svg.querySelector('defs');
    if (!defs) {
      defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
      svg.insertBefore(defs, svg.firstChild);
    }
    if (!defs.querySelector('#pattern-stripe')) {
      const pattern = document.createElementNS('http://www.w3.org/2000/svg', 'pattern');
      pattern.setAttribute('id', 'pattern-stripe');
      pattern.setAttribute('width', '12');
      pattern.setAttribute('height', '12');
      pattern.setAttribute('patternUnits', 'userSpaceOnUse');
      pattern.setAttribute('patternTransform', 'rotate(45)');
      pattern.innerHTML = `
        <line x1="0" y1="0" x2="0" y2="12" stroke="#ef4444" stroke-width="4" opacity="0.6" />
        <line x1="6" y1="0" x2="6" y2="12" stroke="#f59e0b" stroke-width="4" opacity="0.6" />
      `;
      defs.appendChild(pattern);
    }
  }

  checkTerritoryIntersections() {
    this.contestedPairs = [];

    const getBBox = (pts) => {
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      pts.forEach(p => {
        if (p[0] < minX) minX = p[0];
        if (p[0] > maxX) maxX = p[0];
        if (p[1] < minY) minY = p[1];
        if (p[1] > maxY) maxY = p[1];
      });
      return { minX, maxX, minY, maxY };
    };

    const segmentsIntersect = (p1, q1, p2, q2) => {
      const ccw = (a, b, c) => (c[1] - a[1]) * (b[0] - a[0]) > (b[1] - a[1]) * (c[0] - a[0]);
      return (ccw(p1, p2, q2) !== ccw(q1, p2, q2)) && (ccw(p1, q1, p2) !== ccw(p1, q1, q2));
    };

    const pointInPoly = (point, pts) => {
      const x = point[0], y = point[1];
      let inside = false;
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const xi = pts[i][0], yi = pts[i][1];
        const xj = pts[j][0], yj = pts[j][1];
        const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
      }
      return inside;
    };

    const doPolysIntersect = (pts1, pts2) => {
      const b1 = getBBox(pts1);
      const b2 = getBBox(pts2);
      if (b1.maxX < b2.minX || b1.minX > b2.maxX || b1.maxY < b2.minY || b1.minY > b2.maxY) {
        return false;
      }
      for (let i = 0; i < pts1.length; i++) {
        const p1 = pts1[i];
        const q1 = pts1[(i + 1) % pts1.length];
        for (let j = 0; j < pts2.length; j++) {
          const p2 = pts2[j];
          const q2 = pts2[(j + 1) % pts2.length];
          if (segmentsIntersect(p1, q1, p2, q2)) return true;
        }
      }
      if (pts1.some(pt => pointInPoly(pt, pts2))) return true;
      if (pts2.some(pt => pointInPoly(pt, pts1))) return true;
      return false;
    };

    const hiddenLayerIds = new Set(this.layers.filter(l => !l.is_visible).map(l => l.id));
    const visibleTerritories = this.territories.filter(t => !t.layer_id || !hiddenLayerIds.has(t.layer_id));

    visibleTerritories.forEach(t => { t.is_contested = false; });

    for (let i = 0; i < visibleTerritories.length; i++) {
      for (let j = i + 1; j < visibleTerritories.length; j++) {
        const t1 = visibleTerritories[i];
        const t2 = visibleTerritories[j];

        let pts1 = [], pts2 = [];
        try {
          pts1 = typeof t1.points_json === 'string' ? JSON.parse(t1.points_json) : (t1.points_json || []);
          pts2 = typeof t2.points_json === 'string' ? JSON.parse(t2.points_json) : (t2.points_json || []);
        } catch (e) {}

        if (pts1.length >= 3 && pts2.length >= 3) {
          if (doPolysIntersect(pts1, pts2)) {
            t1.is_contested = true;
            t2.is_contested = true;
            this.contestedPairs.push({ t1, t2 });
          }
        }
      }
    }

    this.territoryPolygons.forEach(poly => {
      const terr = visibleTerritories.find(t => t.id === poly._territoryId);
      if (terr && terr.is_contested) {
        poly.setStyle({
          fillColor: 'url(#pattern-stripe)',
          fillOpacity: Math.max(terr.fill_opacity !== undefined ? terr.fill_opacity : 0.25, 0.45)
        });
        if (poly._path && typeof poly._path.setAttribute === 'function') {
          poly._path.setAttribute('fill', 'url(#pattern-stripe)');
        }
      }
    });
  }

  getOverlappingTerritories(territory) {
    const overlapping = [];
    if (!this.contestedPairs) return overlapping;
    this.contestedPairs.forEach(pair => {
      if (pair.t1.id === territory.id) overlapping.push(pair.t2);
      else if (pair.t2.id === territory.id) overlapping.push(pair.t1);
    });
    return overlapping;
  }

  async openContestedConflictDrawer(territory) {
    const drawer = document.getElementById('atlas-reader-drawer');
    const content = document.getElementById('atlas-drawer-content');
    if (!drawer || !content) return;

    drawer.style.display = 'block';
    const overlapping = this.getOverlappingTerritories(territory);

    const mainArticle = this.articles.find(a => a.id === territory.article_id);

    let cardsHtml = `
      <div class="conflict-faction-card">
        <div class="faction-title"><i class="fa-solid fa-flag"></i> ${territory.title}</div>
        <div class="faction-meta">
          ${mainArticle ? `<a href="#" class="conflict-article-link" data-article-id="${mainArticle.id}">📄 ${mainArticle.title}</a>` : '<em>No linked article</em>'}
        </div>
      </div>
    `;

    overlapping.forEach(ov => {
      const ovArticle = this.articles.find(a => a.id === ov.article_id);
      cardsHtml += `
        <div class="conflict-faction-card">
          <div class="faction-title"><i class="fa-solid fa-flag"></i> ${ov.title}</div>
          <div class="faction-meta">
            ${ovArticle ? `<a href="#" class="conflict-article-link" data-article-id="${ovArticle.id}">📄 ${ovArticle.title}</a>` : '<em>No linked article</em>'}
          </div>
        </div>
      `;
    });

    content.innerHTML = `
      <div class="contested-detail-drawer">
        <div class="contested-badge">⚔️ Contested Territory Zone</div>
        <h3 style="margin:4px 0 12px 0; font-family:var(--font-heading); color:#ef4444;">${territory.title} Overlap</h3>
        
        <div class="conflict-factions-container">
          <label style="font-weight:600; font-size:0.85rem; color:var(--text-secondary); margin-bottom:6px; display:block;">Overlapping Factions & Realms:</label>
          ${cardsHtml}
        </div>

        <div class="form-group" style="margin-top:14px;">
          <label style="font-weight:600; font-size:0.85rem; color:var(--text-secondary);">Linked Border War / Conflict Article:</label>
          <select id="contested-article-select" class="form-control" style="margin-top:4px;">
            <option value="">-- None (Unlinked Conflict) --</option>
            ${this.articles.map(a => `<option value="${a.id}" ${territory.contested_article_id === a.id ? 'selected' : ''}>${a.title} (${a.category || 'General'})</option>`).join('')}
          </select>
          <button id="save-contested-article-btn" class="tool-btn btn-sm" style="margin-top:8px; width:100%;"><i class="fa-solid fa-link"></i> Save Conflict Link</button>
        </div>

        <div class="ai-conflict-generator" style="margin-top:16px;">
          <button id="ai-draft-conflict-btn" class="tool-btn primary ai-draft-btn full-width">
            <i class="fa-solid fa-wand-magic-sparkles"></i> 🤖 AI Draft Border Conflict History
          </button>
          <div id="ai-draft-conflict-output" style="margin-top:12px; display:none; padding:12px; background:rgba(0,0,0,0.2); border:1px dashed var(--border-color); border-radius:6px; font-size:0.85rem; line-height:1.5;"></div>
        </div>

        ${territory.contested_article_id ? `
          <div class="linked-conflict-preview" style="margin-top:16px; padding-top:12px; border-top:1px solid var(--border-color);">
            <button id="view-linked-conflict-article-btn" class="tool-btn full-width"><i class="fa-solid fa-book-open"></i> Read Linked Conflict Article</button>
          </div>
        ` : ''}

        ${this.viewMode === 'dm' ? `
          <div style="margin-top:16px; padding-top:12px; border-top:1px solid var(--border-color);">
            <button id="edit-contested-props-btn" class="tool-btn full-width"><i class="fa-solid fa-pen"></i> Edit Territory Properties</button>
          </div>
        ` : ''}
      </div>
    `;

    // Event listeners
    content.querySelectorAll('.conflict-article-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const artId = link.getAttribute('data-article-id');
        if (artId) this.openArticleDrawer(artId, 'Lore Article');
      });
    });

    const saveConflictBtn = document.getElementById('save-contested-article-btn');
    if (saveConflictBtn) {
      saveConflictBtn.addEventListener('click', async () => {
        const select = document.getElementById('contested-article-select');
        const selectedArtId = select ? select.value : null;
        try {
          const res = await fetch(`/api/maps/${this.currentMap.id}/territories/${territory.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contested_article_id: selectedArtId || null })
          });
          const data = await res.json();
          if (data.territory || data.success) {
            territory.contested_article_id = selectedArtId || null;
            alert('Linked conflict article saved!');
          }
        } catch (e) {
          alert('Failed to save conflict link.');
        }
      });
    }

    const aiDraftBtn = document.getElementById('ai-draft-conflict-btn');
    const aiOutput = document.getElementById('ai-draft-conflict-output');
    if (aiDraftBtn && aiOutput) {
      aiDraftBtn.addEventListener('click', async () => {
        aiOutput.style.display = 'block';
        aiOutput.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Generating 2-paragraph WorldAnvil border war history via Gemini AI...`;
        
        const otherTitle = overlapping.length ? overlapping[0].title : 'Neighboring Realm';
        const draftTitle = `Border Conflict: ${territory.title} vs ${otherTitle}`;

        try {
          // 1. Call Gemini AI stub generator
          const stubRes = await fetch('/api/audit/flesh-out-stub', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: draftTitle,
              category: 'Military & History',
              genre: 'High Fantasy'
            })
          });
          const stubData = await stubRes.json();
          const draftContent = stubData.content;

          // 2. Save created conflict article
          const artRes = await fetch('/api/articles', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: draftTitle,
              category: 'Military & History',
              content: draftContent
            })
          });
          const artData = await artRes.json();
          const newArticleId = (artData.article && artData.article.id) || artData.id || stubData.id;

          // 3. Link new article to territory
          if (newArticleId && this.currentMap) {
            await fetch(`/api/maps/${this.currentMap.id}/territories/${territory.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ contested_article_id: newArticleId })
            });
            territory.contested_article_id = newArticleId;
          }

          // Refresh articles list
          await this.fetchArticles();

          // Render response in drawer
          aiOutput.innerHTML = `
            <div style="color:var(--accent-primary, #38bdf8); font-weight:bold; margin-bottom:8px;">✅ Border War Article Drafted & Linked!</div>
            <div class="article-body-mini" style="white-space:pre-wrap;">${draftContent}</div>
          `;
        } catch (e) {
          aiOutput.innerHTML = `<span style="color:#ef4444;">Failed to generate AI conflict history: ${e.message}</span>`;
        }
      });
    }

    const viewLinkedBtn = document.getElementById('view-linked-conflict-article-btn');
    if (viewLinkedBtn) {
      viewLinkedBtn.addEventListener('click', () => {
        if (territory.contested_article_id) {
          this.openArticleDrawer(territory.contested_article_id, 'Border Conflict Article');
        }
      });
    }

    const editPropsBtn = document.getElementById('edit-contested-props-btn');
    if (editPropsBtn) {
      editPropsBtn.addEventListener('click', () => {
        this.openTerritoryModal(territory);
      });
    }
  }

  selectTerritoryForEditing(territory) {
    this.selectedTerritory = territory;
    this.renderVertexHandles(territory);
    this.openTerritoryDrawer(territory);
  }

  clearVertexHandles() {
    this.activeVertexMarkers.forEach(m => m.remove());
    this.activeVertexMarkers = [];
  }

  renderVertexHandles(territory) {
    this.clearVertexHandles();
    if (!territory || !this.currentMap || !this.mapInstance || typeof L === 'undefined') return;

    const w = this.currentMap.width || 1920;
    const h = this.currentMap.height || 1080;

    let points = [];
    try {
      points = typeof territory.points_json === 'string' ? JSON.parse(territory.points_json) : (territory.points_json || []);
    } catch (e) {
      points = [];
    }

    if (!Array.isArray(points) || points.length < 3) return;

    for (let i = 0; i < points.length; i++) {
      const lat = points[i][1] * h;
      const lng = points[i][0] * w;

      const handleMarker = L.marker([lat, lng], {
        draggable: true,
        icon: L.divIcon({
          className: 'atlas-vertex-handle',
          html: `<div class="vertex-node" title="Drag to move vertex. Right-click to delete node."></div>`,
          iconSize: [14, 14],
          iconAnchor: [7, 7]
        })
      }).addTo(this.mapInstance);

      handleMarker._vertexIndex = i;

      handleMarker.on('drag', (e) => {
        const newPos = e.target.getLatLng();
        points[i] = [
          Math.max(0, Math.min(1, newPos.lng / w)),
          Math.max(0, Math.min(1, newPos.lat / h))
        ];
        this.updatePolygonShape(territory.id, points);
        this.updateMidpointHandlePositions(territory.id, points);
      });

      handleMarker.on('dragend', async () => {
        territory.points_json = JSON.stringify(points);
        await this.updateTerritoryVertices(territory.id, points);
      });

      handleMarker.on('contextmenu', async (e) => {
        if (e && e.originalEvent && e.originalEvent.preventDefault) e.originalEvent.preventDefault();
        if (points.length <= 3) {
          alert('A territory boundary must have at least 3 vertices.');
          return;
        }
        points.splice(i, 1);
        territory.points_json = JSON.stringify(points);
        await this.updateTerritoryVertices(territory.id, points);
        this.renderTerritoriesOnCanvas();
        this.selectTerritoryForEditing(territory);
      });

      this.activeVertexMarkers.push(handleMarker);

      // Midpoint insertion handle between point i and next point
      const nextIdx = (i + 1) % points.length;
      const mid_x = (points[i][0] + points[nextIdx][0]) / 2;
      const mid_y = (points[i][1] + points[nextIdx][1]) / 2;

      const midMarker = L.marker([mid_y * h, mid_x * w], {
        icon: L.divIcon({
          className: 'atlas-midpoint-handle',
          html: `<div class="midpoint-node" title="Click to insert new vertex here."></div>`,
          iconSize: [10, 10],
          iconAnchor: [5, 5]
        })
      }).addTo(this.mapInstance);

      midMarker._midIndex = i;

      midMarker.on('click', async (e) => {
        if (L.DomEvent && L.DomEvent.stopPropagation) L.DomEvent.stopPropagation(e);
        points.splice(i + 1, 0, [mid_x, mid_y]);
        territory.points_json = JSON.stringify(points);
        await this.updateTerritoryVertices(territory.id, points);
        this.renderTerritoriesOnCanvas();
        this.selectTerritoryForEditing(territory);
      });

      this.activeVertexMarkers.push(midMarker);
    }
  }

  updatePolygonShape(territoryId, points) {
    if (!this.currentMap) return;
    const w = this.currentMap.width || 1920;
    const h = this.currentMap.height || 1080;
    const poly = this.territoryPolygons.find(p => p._territoryId === territoryId);
    if (poly) poly.setLatLngs(points.map(pt => [pt[1] * h, pt[0] * w]));
  }

  updateMidpointHandlePositions(territoryId, points) {
    if (!this.currentMap) return;
    const w = this.currentMap.width || 1920;
    const h = this.currentMap.height || 1080;

    for (let i = 0; i < points.length; i++) {
      const nextIdx = (i + 1) % points.length;
      const mid_x = (points[i][0] + points[nextIdx][0]) / 2;
      const mid_y = (points[i][1] + points[nextIdx][1]) / 2;

      const midMarker = this.activeVertexMarkers.find(m => m._midIndex === i);
      if (midMarker && typeof midMarker.setLatLng === 'function') {
        midMarker.setLatLng([mid_y * h, mid_x * w]);
      }
    }
  }

  async updateTerritoryVertices(territoryId, points) {
    if (!this.currentMap || !territoryId) return;
    try {
      const res = await fetch(`/api/maps/${this.currentMap.id}/territories/${territoryId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ points_json: JSON.stringify(points) })
      });
      const data = await res.json();
      if (!data.territory) {
        console.error('Failed to update territory vertices:', data.error);
      }
    } catch (e) {
      console.error('Error updating territory vertices:', e);
    }
  }

  openTerritoryDrawer(territory) {
    const drawer = document.getElementById('atlas-reader-drawer');
    const content = document.getElementById('atlas-drawer-content');
    if (!drawer || !content) return;

    drawer.style.display = 'block';

    let points = [];
    try {
      points = typeof territory.points_json === 'string' ? JSON.parse(territory.points_json) : (territory.points_json || []);
    } catch (e) {
      points = [];
    }

    const layer = this.layers.find(l => l.id === territory.layer_id);
    const layerName = layer ? layer.name : 'Default Layer';

    content.innerHTML = `
      <div class="territory-detail-drawer">
        <div class="drawer-header" style="display:flex; justify-content:space-between; align-items:center;">
          <h3 style="margin:0; font-family:var(--font-heading); color:var(--accent-primary, #38bdf8);"><i class="fa-solid fa-draw-polygon"></i> ${territory.title}</h3>
        </div>
        <div style="margin: 12px 0; display:flex; gap:6px; flex-wrap:wrap;">
          <span class="category-badge" style="background:${territory.stroke_color || '#ef4444'}; color:#fff;">${layerName}</span>
          ${territory.is_secret ? '<span class="category-badge" style="background:#a855f7; color:#fff;">🔒 DM Secret</span>' : ''}
        </div>
        <div class="territory-info-body" style="font-size:0.88rem; color:var(--text-secondary, #94a3b8); margin-bottom:20px; line-height:1.6;">
          <p><strong>Vertices:</strong> ${points.length} boundary nodes</p>
          <p><strong>Border Style:</strong> ${territory.stroke_style || 'solid'} (${territory.stroke_width || 3}px)</p>
          <p><strong>Fill Opacity:</strong> ${Math.round((territory.fill_opacity !== undefined ? territory.fill_opacity : 0.25) * 100)}%</p>
        </div>
        <div class="territory-actions" style="display:flex; flex-direction:column; gap:10px;">
          <button id="edit-territory-props-btn" class="tool-btn primary full-width"><i class="fa-solid fa-pen"></i> Edit Territory Properties</button>
          <button id="redraw-territory-btn" class="tool-btn full-width"><i class="fa-solid fa-rotate-left"></i> Redraw Boundary</button>
          <button id="delete-territory-drawer-btn" class="tool-btn danger full-width"><i class="fa-solid fa-trash"></i> Delete Territory</button>
        </div>
      </div>
    `;

    const editBtn = document.getElementById('edit-territory-props-btn');
    if (editBtn) {
      editBtn.addEventListener('click', () => this.openTerritoryModal(territory));
    }

    const redrawBtn = document.getElementById('redraw-territory-btn');
    if (redrawBtn) {
      redrawBtn.addEventListener('click', () => {
        this.editingTerritoryId = territory.id;
        this.clearVertexHandles();
        drawer.style.display = 'none';
        this.toggleTerritoryDrawingMode(true);
      });
    }

    const deleteBtn = document.getElementById('delete-territory-drawer-btn');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', () => this.deleteTerritory(territory.id));
    }
  }

  async fetchLayers(mapId) {
    const targetMapId = mapId || (this.currentMap ? this.currentMap.id : null);
    if (!targetMapId) {
      this.layers = [];
      return;
    }

    try {
      const res = await fetch(`/api/maps/${targetMapId}/layers?mode=${this.viewMode}`);
      const data = await res.json();
      this.layers = data.layers || [];
    } catch (e) {
      console.error('Failed to fetch map layers:', e);
      this.layers = [];
    }
  }

  toggleLayersDrawer(forceState) {
    this.isLayersDrawerOpen = forceState !== undefined ? forceState : !this.isLayersDrawerOpen;
    const drawer = document.getElementById('atlas-layers-drawer');
    const btn = document.getElementById('atlas-layers-btn');
    if (drawer) drawer.style.display = this.isLayersDrawerOpen ? 'flex' : 'none';
    if (btn) btn.classList.toggle('active', this.isLayersDrawerOpen);
  }

  renderLayersDrawer() {
    const listContainer = document.getElementById('layers-list');
    if (!listContainer) return;

    if (this.layers.length === 0) {
      listContainer.innerHTML = `<div class="empty-layers-msg" style="color: var(--text-secondary, #94a3b8); font-size: 0.85rem; text-align: center; padding: 12px 0;">No layers configured for this map.</div>`;
      return;
    }

    listContainer.innerHTML = this.layers.map(layer => `
      <div class="layer-item ${layer.is_visible ? '' : 'layer-hidden'}" data-layer-id="${layer.id}">
        <label class="layer-visibility-toggle" title="Toggle Visibility">
          <input type="checkbox" class="layer-visibility-checkbox" ${layer.is_visible ? 'checked' : ''} data-layer-id="${layer.id}">
          <span class="layer-vis-icon">${layer.is_visible ? '👁️' : '🙈'}</span>
        </label>
        <span class="layer-color-badge layer-badge-dot" style="background-color: ${layer.color_badge || '#38bdf8'};"></span>
        <span class="layer-name" title="${layer.name}">${layer.name}</span>
        ${layer.is_secret ? '<span class="layer-secret-badge" title="DM Secret Layer">🔒</span>' : ''}
        <button class="layer-delete-btn" data-layer-id="${layer.id}" title="Delete Layer">🗑️</button>
      </div>
    `).join('');

    listContainer.querySelectorAll('.layer-visibility-checkbox').forEach(chk => {
      chk.addEventListener('change', (e) => {
        const layerId = e.target.getAttribute('data-layer-id');
        const layer = this.layers.find(l => l.id === layerId);
        if (layer) {
          layer.is_visible = e.target.checked ? 1 : 0;
          this.renderLayersDrawer();
          this.onLayersChanged();
        }
      });
    });

    listContainer.querySelectorAll('.layer-delete-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const layerId = e.target.getAttribute('data-layer-id');
        this.deleteLayer(layerId);
      });
    });
  }

  onLayersChanged() {
    this.renderPinsOnCanvas();
    if (typeof this.renderTerritoriesOnCanvas === 'function') {
      this.renderTerritoriesOnCanvas();
    }
  }

  async saveLayer() {
    if (!this.currentMap) {
      alert('Please select or upload a map first.');
      return;
    }

    const name = document.getElementById('layer-name-input').value.trim();
    if (!name) {
      alert('Please enter a layer name.');
      return;
    }

    const color_badge = document.getElementById('layer-color-input').value;
    const is_secret = document.getElementById('layer-secret-checkbox').checked ? 1 : 0;

    try {
      const res = await fetch(`/api/maps/${this.currentMap.id}/layers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          color_badge,
          is_secret,
          is_visible: 1,
          sort_order: this.layers.length
        })
      });
      const data = await res.json();
      if (data.success) {
        document.getElementById('atlas-layer-modal').style.display = 'none';
        document.getElementById('layer-name-input').value = '';
        await this.fetchLayers(this.currentMap.id);
        this.renderLayersDrawer();
        this.onLayersChanged();
      } else {
        alert(data.error || 'Failed to save layer.');
      }
    } catch (e) {
      alert(`Failed to save layer: ${e.message}`);
    }
  }

  async deleteLayer(layerId) {
    if (!this.currentMap || !layerId) return;
    const layer = this.layers.find(l => l.id === layerId);
    const layerName = layer ? layer.name : 'this layer';
    if (!confirm(`Are you sure you want to delete "${layerName}"?`)) return;

    try {
      const res = await fetch(`/api/maps/${this.currentMap.id}/layers/${layerId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        await this.fetchLayers(this.currentMap.id);
        this.renderLayersDrawer();
        this.onLayersChanged();
      } else {
        alert(data.error || 'Failed to delete layer.');
      }
    } catch (e) {
      alert(`Failed to delete layer: ${e.message}`);
    }
  }

  async loadMapPins(mapId) {
    try {
      const res = await fetch(`/api/maps/${mapId}/pins?mode=${this.viewMode}`);
      const data = await res.json();
      this.pins = data.pins || [];
      this.renderPinsOnCanvas();
    } catch (e) {
      console.error('Failed to load map pins:', e);
    }
  }

  renderPinsOnCanvas() {
    this.markers.forEach(m => m.remove());
    this.markers = [];

    if (!this.currentMap || !this.mapInstance || typeof L === 'undefined') return;
    const w = this.currentMap.width || 1920;
    const h = this.currentMap.height || 1080;

    const hiddenLayerIds = new Set(this.layers.filter(l => !l.is_visible).map(l => l.id));

    const selectedCat = (this.selectedPinCategory || 'all').toLowerCase();
    const query = (this.pinSearchQuery || '').trim().toLowerCase();

    const matchingPins = [];

    this.pins.forEach(pin => {
      // 1. Layer visibility check
      if (pin.layer_id && hiddenLayerIds.has(pin.layer_id)) {
        return;
      }

      // 2. Linked article lookup
      const linkedArticle = Array.isArray(this.articles) ? this.articles.find(a => a.id === pin.article_id) : null;

      // 3. Category matching (check pin.category, linkedArticle.category, or pin.label)
      const pinCat = (pin.category || (linkedArticle && linkedArticle.category) || '').toLowerCase();
      const matchesCategory = selectedCat === 'all' ||
                              pinCat.includes(selectedCat) ||
                              (pin.label && pin.label.toLowerCase().includes(selectedCat));

      if (!matchesCategory) return;

      // 4. Text Search Query matching (case-insensitive substring match on pin label or linked article title/summary/content)
      const labelMatch = pin.label && pin.label.toLowerCase().includes(query);
      const articleMatch = linkedArticle && (
        (linkedArticle.title && linkedArticle.title.toLowerCase().includes(query)) ||
        (linkedArticle.summary && linkedArticle.summary.toLowerCase().includes(query)) ||
        (linkedArticle.content && linkedArticle.content.toLowerCase().includes(query))
      );

      const matchesSearch = !query || labelMatch || articleMatch;

      if (!matchesSearch) return;

      matchingPins.push(pin);

      // 5. Marker Creation & Search Highlight
      const latlng = [(pin.y_pct || 0) * h, (pin.x_pct || 0) * w];
      const isSearchActive = query !== '';
      const isHighlighted = isSearchActive && matchesSearch;
      const highlightClass = isHighlighted ? ' pin-search-highlight' : '';

      let markerIcon = null;
      if (typeof L.divIcon === 'function') {
        markerIcon = L.divIcon({
          className: `atlas-pin-marker${highlightClass}`,
          html: `<div class="atlas-pin-icon" style="background-color:${pin.pin_color || '#d97706'};"><i class="fa-solid ${pin.pin_icon || 'fa-location-dot'}"></i></div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 28]
        });
      }

      const isDraggable = (this.viewMode === 'dm');
      const markerOpts = { draggable: isDraggable };
      if (markerIcon) markerOpts.icon = markerIcon;

      const marker = L.marker(latlng, markerOpts).addTo(this.mapInstance);
      const targetSubMapId = pin.target_sub_map_id || pin.sub_map_id;
      const tooltipLabel = targetSubMapId ? `🗺️ ${pin.label}` : pin.label;
      marker.bindTooltip(tooltipLabel, { permanent: false, direction: 'top' });

      let isDraggingThisPin = false;
      if (isDraggable) {
        marker.on('dragstart', () => {
          isDraggingThisPin = true;
        });

        marker.on('dragend', async (e) => {
          const newLatLng = e.target.getLatLng();
          const newX = Math.max(0, Math.min(1, newLatLng.lng / w));
          const newY = Math.max(0, Math.min(1, newLatLng.lat / h));

          pin.x_pct = newX;
          pin.y_pct = newY;

          try {
            const res = await fetch(`/api/map-pins/${pin.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ x_pct: newX, y_pct: newY })
            });
            const data = await res.json();
            if (data.success) {
              console.log(`[Atlas Pin Drag] Pin ${pin.id} updated coordinates to (${newX.toFixed(3)}, ${newY.toFixed(3)})`);
            }
          } catch (err) {
            console.error('Failed to update pin location:', err);
          }

          setTimeout(() => { isDraggingThisPin = false; }, 200);
        });
      }

      marker.on('click', () => {
        if (isDraggingThisPin) return;
        this.openArticleDrawer(pin.article_id, pin.label, pin);
      });

      marker._pinData = pin;
      marker._isHighlighted = isHighlighted;
      if (isHighlighted && marker._icon && typeof marker._icon.classList?.add === 'function') {
        marker._icon.classList.add('pin-search-highlight');
      }

      this.markers.push(marker);
    });

    // 6. Auto-pan map to target pin if single search result matches
    if (query !== '' && matchingPins.length === 1) {
      const targetPin = matchingPins[0];
      const panLat = (targetPin.y_pct || 0) * h;
      const panLng = (targetPin.x_pct || 0) * w;
      if (this.mapInstance && typeof this.mapInstance.panTo === 'function') {
        this.mapInstance.panTo([panLat, panLng]);
      } else if (this.mapInstance && typeof this.mapInstance.setView === 'function') {
        this.mapInstance.setView([panLat, panLng]);
      }
    }
  }

  openCreatePinModal(x_pct, y_pct) {
    this.tempCoords = { x_pct, y_pct };
    document.getElementById('pin-label-input').value = '';
    const subMapSelect = document.getElementById('pin-submap-select');
    if (subMapSelect) {
      subMapSelect.innerHTML = `<option value="">-- None (Standard Pin) --</option>` +
        this.maps.filter(m => !this.currentMap || m.id !== this.currentMap.id).map(m => `<option value="${m.id}">${m.title}</option>`).join('');
      subMapSelect.value = '';
    }
    document.getElementById('atlas-pin-modal').style.display = 'flex';
  }

  async savePin() {
    if (!this.currentMap || !this.tempCoords) return;
    const label = document.getElementById('pin-label-input').value.trim();
    if (!label) {
      alert('Please enter a pin label.');
      return;
    }
    const subMapSelect = document.getElementById('pin-submap-select');
    const targetSubMapId = subMapSelect ? (subMapSelect.value || null) : null;

    const payload = {
      map_id: this.currentMap.id,
      article_id: document.getElementById('pin-article-select').value || null,
      x_pct: this.tempCoords.x_pct,
      y_pct: this.tempCoords.y_pct,
      label: label,
      pin_icon: document.getElementById('pin-icon-select').value,
      pin_color: document.getElementById('pin-color-input').value,
      is_secret: document.getElementById('pin-secret-checkbox').checked ? 1 : 0,
      target_sub_map_id: targetSubMapId,
      sub_map_id: targetSubMapId
    };

    try {
      const res = await fetch('/api/map-pins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        document.getElementById('atlas-pin-modal').style.display = 'none';
        this.togglePinPlacementMode(false);
        await this.loadMapPins(this.currentMap.id);
      }
    } catch (e) {
      alert('Failed to save pin marker.');
    }
  }

  async uploadMap() {
    const title = document.getElementById('map-title-input').value.trim();
    const fileInput = document.getElementById('map-file-input');
    if (!title || !fileInput.files.length) {
      alert('Please enter a map title and select an image file.');
      return;
    }

    const formData = new FormData();
    formData.append('world_id', this.worldId);
    formData.append('title', title);
    formData.append('image', fileInput.files[0]);

    try {
      const res = await fetch('/api/maps', {
        method: 'POST',
        body: formData
      });
      if (!res.ok) {
        const text = await res.text();
        let msg = 'Server returned error status ' + res.status;
        try {
          const parsed = JSON.parse(text);
          if (parsed.error) msg = parsed.error;
        } catch (e) {}
        alert(`Failed to upload map: ${msg}`);
        return;
      }
      const data = await res.json();
      if (data.success) {
        document.getElementById('atlas-map-modal').style.display = 'none';
        await this.fetchMaps();
        this.renderLayout();
        this.loadMap(data.map.id);
      }
    } catch (e) {
      alert(`Failed to upload map: ${e.message}`);
    }
  }

  async openArticleDrawer(articleId, label, pin = null) {
    const drawer = document.getElementById('atlas-reader-drawer');
    const content = document.getElementById('atlas-drawer-content');
    if (!drawer || !content) return;

    drawer.style.display = 'block';

    const targetSubMapId = pin ? (pin.target_sub_map_id || pin.sub_map_id) : null;
    const drilldownHtml = `
      <div class="submap-drilldown-box" style="margin-top: 16px; padding: 12px; background: rgba(56, 189, 248, 0.1); border: 1px solid var(--accent-primary, #38bdf8); border-radius: 8px; display:flex; flex-direction:column; gap:8px;">
        ${targetSubMapId ? `
          <div style="font-size: 0.85rem; font-weight: 600; color: var(--accent-primary, #38bdf8);">
            <i class="fa-solid fa-sitemap"></i> Nested Sub-Map Available
          </div>
          <button id="atlas-drilldown-btn" class="tool-btn primary full-width" data-submap-id="${targetSubMapId}">
            <i class="fa-solid fa-map-location-dot"></i> 🗺️ Drill Down into Sub-Map
          </button>
        ` : ''}
        <button id="atlas-gen-battlemap-btn" class="tool-btn full-width" style="background:rgba(245,158,11,0.15); border:1px solid var(--accent-gold);">
          <i class="fa-solid fa-wand-magic-sparkles"></i> ⚔️ Auto-Generate Tactical Battlemap
        </button>
      </div>
    `;

    if (!articleId) {
      content.innerHTML = `
        <div class="pin-detail">
          <h3 style="margin-top:0; font-family:var(--font-heading);">${label}</h3>
          <p style="color:var(--text-secondary, #94a3b8); font-size:0.9rem;">No detailed lore article linked to this marker.</p>
          ${drilldownHtml}
        </div>
      `;
    } else {
      try {
        const res = await fetch(`/api/articles/${articleId}`);
        const article = await res.json();
        content.innerHTML = `
          <div class="article-detail">
            <h2 style="margin-top:0; font-family:var(--font-heading);">${article.title}</h2>
            <span class="category-badge">${article.category || 'General'}</span>
            <hr style="border-color: var(--border-color, #334155); margin: 12px 0;">
            <div class="article-body" style="font-size:0.9rem; line-height:1.6; color:var(--text-primary);">${article.content || article.summary || 'No content available.'}</div>
            ${drilldownHtml}
          </div>
        `;
      } catch (e) {
        content.innerHTML = `
          <div class="pin-detail">
            <h3>${label}</h3>
            <p>Error loading article content.</p>
            ${drilldownHtml}
          </div>
        `;
      }
    }

    if (targetSubMapId) {
      const drillBtn = document.getElementById('atlas-drilldown-btn');
      if (drillBtn) {
        drillBtn.addEventListener('click', () => {
          const subMapId = drillBtn.getAttribute('data-submap-id');
          if (subMapId) {
            this.loadMap(subMapId);
          }
        });
      }
    }

    const genBattlemapBtn = document.getElementById('atlas-gen-battlemap-btn');
    if (genBattlemapBtn) {
      genBattlemapBtn.addEventListener('click', () => {
        this.closeArticleDrawer();
        this.openGeneratorModal();
        const titleInput = document.getElementById('gen-map-title');
        if (titleInput) titleInput.value = `${label} Battlemap`;
        const modal = document.getElementById('atlas-generate-modal');
        if (modal) {
          const scopeCard = modal.querySelector('.gen-scope-card[data-scope="battlemap"]');
          if (scopeCard) scopeCard.click();
        }
      });
    }
  }

  initMinimap() {
    const minimapContainer = document.getElementById('atlas-minimap');
    if (!minimapContainer || !this.currentMap) return;

    const imgEl = document.getElementById('minimap-img');
    if (imgEl) imgEl.src = this.currentMap.image_path;

    if (!this._minimapBound) {
      this._minimapBound = true;
      minimapContainer.addEventListener('click', (e) => {
        const rect = minimapContainer.getBoundingClientRect();
        const clickX = (e.clientX - rect.left) / rect.width;
        const clickY = (e.clientY - rect.top) / rect.height;

        const w = this.currentMap.width || 1920;
        const h = this.currentMap.height || 1080;
        const targetLat = clickY * h;
        const targetLng = clickX * w;

        if (this.mapInstance && typeof this.mapInstance.panTo === 'function') {
          this.mapInstance.panTo([targetLat, targetLng]);
        }
      });

      if (this.mapInstance) {
        this.mapInstance.on('move zoom resize', () => this.syncMinimapViewport());
      }
    }

    this.syncMinimapViewport();
  }

  syncMinimapViewport() {
    const minimapContainer = document.getElementById('atlas-minimap');
    const rectEl = document.getElementById('minimap-viewport-rect');
    if (!minimapContainer || !rectEl || !this.mapInstance || !this.currentMap) return;

    const bounds = this.mapInstance.getBounds();
    const w = this.currentMap.width || 1920;
    const h = this.currentMap.height || 1080;

    const westPct = Math.max(0, Math.min(1, bounds.getWest() / w));
    const eastPct = Math.max(0, Math.min(1, bounds.getEast() / w));
    const southPct = Math.max(0, Math.min(1, bounds.getSouth() / h));
    const northPct = Math.max(0, Math.min(1, bounds.getNorth() / h));

    const leftPct = westPct * 100;
    const topPct = southPct * 100;
    const widthPct = Math.max(5, (eastPct - westPct) * 100);
    const heightPct = Math.max(5, (northPct - southPct) * 100);

    rectEl.style.left = `${leftPct}%`;
    rectEl.style.top = `${topPct}%`;
    rectEl.style.width = `${widthPct}%`;
    rectEl.style.height = `${heightPct}%`;
  }

  animateRouteExpedition(route) {
    if (!route || !Array.isArray(route.points) || route.points.length < 2) {
      alert('Invalid route for expedition animation.');
      return;
    }
    if (typeof L === 'undefined' || !this.mapInstance) return;

    if (this._activeTravelAnimation) {
      cancelAnimationFrame(this._activeTravelAnimation);
      this._activeTravelAnimation = null;
    }

    if (this._travelPartyMarker) {
      this.mapInstance.removeLayer(this._travelPartyMarker);
      this._travelPartyMarker = null;
    }

    const w = this.currentMap.width || 1920;
    const h = this.currentMap.height || 1080;
    const pointsPx = route.points.map(pt => [pt[1] * h, pt[0] * w]);

    const partyIcon = L.divIcon({
      className: 'expedition-party-token',
      html: `<div class="party-token-node" style="font-size:1.4rem; filter:drop-shadow(0 0 6px rgba(245,158,11,0.8));">⛵</div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });

    this._travelPartyMarker = L.marker(pointsPx[0], { icon: partyIcon }).addTo(this.mapInstance);

    let startTime = null;
    const durationMs = Math.max(3000, pointsPx.length * 1500);

    const animateStep = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(1.0, elapsed / durationMs);

      const totalSegments = pointsPx.length - 1;
      const segmentIndex = Math.min(totalSegments - 1, Math.floor(progress * totalSegments));
      const segmentProgress = (progress * totalSegments) - segmentIndex;

      const p1 = pointsPx[segmentIndex];
      const p2 = pointsPx[segmentIndex + 1];

      const currentLat = p1[0] + (p2[0] - p1[0]) * segmentProgress;
      const currentLng = p1[1] + (p2[1] - p1[1]) * segmentProgress;

      this._travelPartyMarker.setLatLng([currentLat, currentLng]);

      if (progress < 1.0) {
        this._activeTravelAnimation = requestAnimationFrame(animateStep);
      } else {
        console.log('[Atlas Expedition] Party travel animation completed!');
      }
    };

    this._activeTravelAnimation = requestAnimationFrame(animateStep);
  }

  async triggerAiBorderDetection() {
    if (!this.currentMap) {
      alert('Please select or upload a map first.');
      return;
    }

    let toast = document.getElementById('atlas-ai-detect-toast');
    if (!toast) {
      toast = document.createElement('span');
      toast.id = 'atlas-ai-detect-toast';
      toast.className = 'atlas-toast';
      const toolbarLeft = document.querySelector('.atlas-toolbar-left');
      if (toolbarLeft) toolbarLeft.appendChild(toast);
    }
    toast.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 🤖 Gemini Vision analyzing map artwork & lore context...';
    toast.style.display = 'inline-flex';

    try {
      const res = await fetch(`/api/maps/${this.currentMap.id}/ai-auto-boundaries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ world_id: this.worldId })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${res.status}`);
      }

      const data = await res.json();
      this.aiCandidates = data.candidates || [];

      toast.style.display = 'none';

      if (this.aiCandidates.length === 0) {
        alert('No boundary candidates were detected.');
        return;
      }

      this.renderAiGhostPolygons(this.aiCandidates);
      this.openAiCandidatesDrawer(this.aiCandidates);

    } catch (err) {
      toast.style.display = 'none';
      console.error('AI Border Detection failed:', err);
      alert(`AI Border Detection failed: ${err.message}`);
    }
  }

  renderAiGhostPolygons(candidates) {
    this.clearAiGhostPolygons();
    if (!this.currentMap || !this.mapInstance || typeof L === 'undefined') return;

    const w = this.currentMap.width || 1920;
    const h = this.currentMap.height || 1080;

    (candidates || []).forEach(c => {
      if (!Array.isArray(c.points) || c.points.length < 3) return;
      const latlngs = c.points.map(pt => [pt[1] * h, pt[0] * w]);

      const poly = L.polygon(latlngs, {
        color: c.stroke_color || '#38bdf8',
        weight: 3,
        dashArray: '8, 8',
        fillColor: c.fill_color || '#38bdf8',
        fillOpacity: 0.35,
        className: 'ai-ghost-polygon'
      }).addTo(this.mapInstance);

      poly.bindTooltip(`🤖 AI Candidate: ${c.title}`, { permanent: false, direction: 'center' });
      poly._candidateId = c.id;
      this.aiGhostPolygons.push(poly);
    });
  }

  clearAiGhostPolygons() {
    if (Array.isArray(this.aiGhostPolygons)) {
      this.aiGhostPolygons.forEach(p => {
        if (p && typeof p.remove === 'function') p.remove();
      });
    }
    this.aiGhostPolygons = [];
  }

  openAiCandidatesDrawer(candidates) {
    const drawer = document.getElementById('atlas-ai-candidates-drawer');
    const listEl = document.getElementById('ai-candidates-list');
    if (!drawer || !listEl) return;

    listEl.innerHTML = (candidates || []).map(c => {
      const linkedArt = this.articles.find(a => a.id === c.article_id);
      const artLabel = linkedArt ? `Linked: ${linkedArt.title}` : 'Unlinked';
      return `
        <div class="ai-candidate-card" data-id="${c.id}">
          <label class="candidate-card-checkbox">
            <input type="checkbox" class="ai-candidate-checkbox" value="${c.id}" checked>
            <span class="candidate-color-swatch" style="background-color: ${c.stroke_color || '#38bdf8'};"></span>
          </label>
          <div class="candidate-card-info">
            <div class="candidate-card-title">${c.title}</div>
            <div class="candidate-card-meta">
              <span class="meta-article"><i class="fa-solid fa-link"></i> ${artLabel}</span> &bull; 
              <span class="meta-points">${(c.points || []).length} vertices</span>
            </div>
          </div>
        </div>
      `;
    }).join('');

    drawer.style.display = 'flex';
  }

  closeAiCandidatesDrawer() {
    const drawer = document.getElementById('atlas-ai-candidates-drawer');
    if (drawer) drawer.style.display = 'none';
    this.clearAiGhostPolygons();
  }

  async approveSelectedAiCandidates() {
    const checkboxes = document.querySelectorAll('#ai-candidates-list .ai-candidate-checkbox:checked');
    const selectedIds = Array.from(checkboxes).map(cb => cb.value);

    if (selectedIds.length === 0) {
      alert('Please select at least one candidate boundary to import.');
      return;
    }

    const selectedCandidates = (this.aiCandidates || []).filter(c => selectedIds.includes(c.id));
    let importedCount = 0;

    for (const c of selectedCandidates) {
      try {
        const payload = {
          title: c.title,
          article_id: c.article_id || null,
          points_json: JSON.stringify(c.points),
          stroke_color: c.stroke_color || '#38bdf8',
          stroke_width: 3,
          stroke_style: 'solid',
          fill_color: c.fill_color || '#38bdf8',
          fill_opacity: 0.25,
          is_secret: 0
        };

        const res = await fetch(`/api/maps/${this.currentMap.id}/territories`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          importedCount++;
        }
      } catch (err) {
        console.error(`Failed to import candidate ${c.title}:`, err);
      }
    }

    alert(`Successfully imported ${importedCount} territory boundaries!`);
    this.closeAiCandidatesDrawer();
    await this.loadMapTerritories(this.currentMap.id);
  }

  addRouteDrawingVertex(x_pct, y_pct) {
    this.activeRouteVertices.push([x_pct, y_pct]);
    if (!this.currentMap || !this.mapInstance || typeof L === 'undefined') return;

    const w = this.currentMap.width || 1920;
    const h = this.currentMap.height || 1080;
    const latlngs = this.activeRouteVertices.map(v => [v[1] * h, v[0] * w]);

    if (!this.activeRoutePolyline) {
      this.activeRoutePolyline = L.polyline(latlngs, {
        color: '#f59e0b',
        weight: 3,
        dashArray: '6, 6'
      }).addTo(this.mapInstance);
    } else {
      this.activeRoutePolyline.setLatLngs(latlngs);
    }

    const marker = L.marker([y_pct * h, x_pct * w], {
      icon: L.divIcon({
        className: 'route-point-handle',
        html: `<div class="route-node" title="Route Vertex ${this.activeRouteVertices.length}"></div>`,
        iconSize: [12, 12],
        iconAnchor: [6, 6]
      })
    }).addTo(this.mapInstance);

    this.activeRouteVertexMarkers.push(marker);
    this.updateRouteToast();
  }

  calculateRouteDistance(vertices) {
    if (!this.currentMap || !Array.isArray(vertices) || vertices.length < 2) return 0;
    const w = this.currentMap.width || 1920;
    const h = this.currentMap.height || 1080;
    const pointsPx = vertices.map(v => [v[0] * w, v[1] * h]);
    const pxDist = this.calculatePixelDistance(pointsPx);
    return this.calculateRealDistance(pxDist, this.currentMap.scale_pixels, this.currentMap.scale_distance);
  }

  updateRouteToast() {
    const distEl = document.getElementById('route-toast-dist');
    if (!distEl) return;
    const dist = this.calculateRouteDistance(this.activeRouteVertices);
    const unit = (this.currentMap && this.currentMap.scale_unit) || 'miles';
    distEl.innerText = `${dist.toFixed(1)} ${unit}`;
  }

  openCreateRouteModal() {
    if (!Array.isArray(this.activeRouteVertices) || this.activeRouteVertices.length < 2) {
      alert('Please click at least 2 points on the map to draw a route.');
      return;
    }
    this.editingRouteId = null;
    const dist = this.calculateRouteDistance(this.activeRouteVertices);
    const unit = (this.currentMap && this.currentMap.scale_unit) || 'miles';
    const travel = this.calculateTravelTimes(dist);

    const titleInput = document.getElementById('route-title-input');
    const distModal = document.getElementById('route-modal-distance');
    const footModal = document.getElementById('route-modal-foot');
    const horseModal = document.getElementById('route-modal-horse');
    const sailModal = document.getElementById('route-modal-sail');
    const colorInput = document.getElementById('route-color-input');
    const widthInput = document.getElementById('route-width-input');
    const styleSelect = document.getElementById('route-style-select');
    const layerSelect = document.getElementById('route-layer-select');
    const secretChk = document.getElementById('route-secret-checkbox');
    const deleteBtn = document.getElementById('delete-route-modal-btn');

    if (titleInput) titleInput.value = `Expedition Route ${this.routes.length + 1}`;
    if (distModal) distModal.innerText = `${dist.toFixed(1)} ${unit}`;
    if (footModal) footModal.innerText = this.formatTravelTime(travel.footDays);
    if (horseModal) horseModal.innerText = this.formatTravelTime(travel.horseDays);
    if (sailModal) sailModal.innerText = this.formatTravelTime(travel.sailDays);
    if (colorInput) colorInput.value = '#f59e0b';
    if (widthInput) widthInput.value = 3;
    if (styleSelect) styleSelect.value = 'dashed';
    if (secretChk) secretChk.checked = false;
    if (deleteBtn) deleteBtn.style.display = 'none';

    if (layerSelect) {
      layerSelect.innerHTML = '<option value="">None (Base Map)</option>' +
        (this.layers || []).map(l => `<option value="${l.id}">${this.escapeHtml(l.name)}</option>`).join('');
    }

    const modal = document.getElementById('atlas-route-modal');
    if (modal) modal.style.display = 'flex';
  }

  openEditRouteModal(r) {
    this.editingRouteId = r.id;
    let vertices = [];
    try {
      vertices = typeof r.points_json === 'string' ? JSON.parse(r.points_json) : (r.points_json || []);
    } catch (e) { vertices = []; }

    const dist = r.calculated_distance ? parseFloat(r.calculated_distance) : this.calculateRouteDistance(vertices);
    const unit = (this.currentMap && this.currentMap.scale_unit) || 'miles';
    const travel = this.calculateTravelTimes(dist);

    const titleInput = document.getElementById('route-title-input');
    const distModal = document.getElementById('route-modal-distance');
    const footModal = document.getElementById('route-modal-foot');
    const horseModal = document.getElementById('route-modal-horse');
    const sailModal = document.getElementById('route-modal-sail');
    const colorInput = document.getElementById('route-color-input');
    const widthInput = document.getElementById('route-width-input');
    const styleSelect = document.getElementById('route-style-select');
    const layerSelect = document.getElementById('route-layer-select');
    const secretChk = document.getElementById('route-secret-checkbox');
    const deleteBtn = document.getElementById('delete-route-modal-btn');

    if (titleInput) titleInput.value = r.title || '';
    if (distModal) distModal.innerText = `${dist.toFixed(1)} ${unit}`;
    if (footModal) footModal.innerText = this.formatTravelTime(travel.footDays);
    if (horseModal) horseModal.innerText = this.formatTravelTime(travel.horseDays);
    if (sailModal) sailModal.innerText = this.formatTravelTime(travel.sailDays);
    if (colorInput) colorInput.value = r.stroke_color || '#f59e0b';
    if (widthInput) widthInput.value = r.stroke_width || 3;
    if (styleSelect) styleSelect.value = r.stroke_style || 'dashed';
    if (secretChk) secretChk.checked = !!r.is_secret;
    if (deleteBtn) deleteBtn.style.display = 'inline-flex';

    if (layerSelect) {
      layerSelect.innerHTML = '<option value="">None (Base Map)</option>' +
        (this.layers || []).map(l => `<option value="${l.id}" ${l.id === r.layer_id ? 'selected' : ''}>${this.escapeHtml(l.name)}</option>`).join('');
    }

    const modal = document.getElementById('atlas-route-modal');
    if (modal) modal.style.display = 'flex';
  }

  async saveRoute() {
    if (!this.currentMap) return;
    const title = document.getElementById('route-title-input').value.trim() || 'Expedition Route';
    const stroke_color = document.getElementById('route-color-input').value || '#f59e0b';
    const stroke_width = parseInt(document.getElementById('route-width-input').value, 10) || 3;
    const stroke_style = document.getElementById('route-style-select').value || 'dashed';
    const layer_id = document.getElementById('route-layer-select').value || null;
    const is_secret = document.getElementById('route-secret-checkbox').checked ? 1 : 0;

    let points_json = null;
    let calculated_distance = 0;

    if (this.editingRouteId) {
      const existing = this.routes.find(r => r.id === this.editingRouteId);
      points_json = existing ? existing.points_json : JSON.stringify(this.activeRouteVertices);
      calculated_distance = existing ? existing.calculated_distance : this.calculateRouteDistance(this.activeRouteVertices);
    } else {
      points_json = JSON.stringify(this.activeRouteVertices);
      calculated_distance = this.calculateRouteDistance(this.activeRouteVertices);
    }

    try {
      const res = await fetch(`/api/maps/${this.currentMap.id}/routes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: this.editingRouteId || undefined,
          title,
          points_json,
          stroke_color,
          stroke_width,
          stroke_style,
          calculated_distance,
          is_secret,
          layer_id
        })
      });
      if (!res.ok) throw new Error('Failed to save route');
      document.getElementById('atlas-route-modal').style.display = 'none';
      this.toggleRouteDrawingMode(false);
      await this.loadMapRoutes(this.currentMap.id);
    } catch (e) {
      console.error('Error saving route:', e);
      alert('Failed to save route: ' + e.message);
    }
  }

  async deleteRoute(routeId) {
    if (!this.currentMap || !routeId) return;
    if (!confirm('Are you sure you want to delete this route?')) return;
    try {
      const res = await fetch(`/api/maps/${this.currentMap.id}/routes/${routeId}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to delete route');
      document.getElementById('atlas-route-modal').style.display = 'none';
      document.getElementById('atlas-reader-drawer').style.display = 'none';
      await this.loadMapRoutes(this.currentMap.id);
    } catch (e) {
      console.error('Error deleting route:', e);
      alert('Failed to delete route.');
    }
  }

  async loadMapRoutes(mapId) {
    try {
      const res = await fetch(`/api/maps/${mapId}/routes?mode=${this.viewMode}`);
      const data = await res.json();
      this.routes = data.routes || [];
      this.renderRoutes();
    } catch (e) {
      console.error('Failed to load map routes:', e);
      this.routes = [];
      this.renderRoutes();
    }
  }

  renderRoutes() {
    if (Array.isArray(this.routePolylines)) {
      this.routePolylines.forEach(p => p.remove());
    }
    this.routePolylines = [];
    if (!this.mapInstance || !this.currentMap || typeof L === 'undefined') return;

    const w = this.currentMap.width || 1920;
    const h = this.currentMap.height || 1080;
    const unit = this.currentMap.scale_unit || 'miles';

    (this.routes || []).forEach(r => {
      if (r.layer_id && Array.isArray(this.layers)) {
        const lObj = this.layers.find(l => l.id === r.layer_id);
        if (lObj && !lObj.is_visible) return;
      }

      let points = [];
      try {
        points = typeof r.points_json === 'string' ? JSON.parse(r.points_json) : (r.points_json || []);
      } catch (e) { points = []; }

      if (!Array.isArray(points) || points.length < 2) return;

      const latlngs = points.map(pt => [pt[1] * h, pt[0] * w]);
      let dashArray = null;
      if (r.stroke_style === 'dashed') dashArray = '6, 6';
      if (r.stroke_style === 'dotted') dashArray = '2, 4';

      const distVal = r.calculated_distance ? parseFloat(r.calculated_distance).toFixed(1) : '0.0';

      const poly = L.polyline(latlngs, {
        color: r.stroke_color || '#f59e0b',
        weight: r.stroke_width || 3,
        dashArray: dashArray
      }).addTo(this.mapInstance);

      poly.bindTooltip(`⛺ ${r.title} (${distVal} ${unit})`, { permanent: false, direction: 'top' });

      poly.on('click', () => {
        this.openRouteDetails(r);
      });

      this.routePolylines.push(poly);
    });
  }

  openRouteDetails(r) {
    this.selectedRoute = r;
    const drawer = document.getElementById('atlas-reader-drawer');
    const content = document.getElementById('atlas-drawer-content');
    if (!drawer || !content) return;

    const unit = (this.currentMap && this.currentMap.scale_unit) || 'miles';
    const dist = parseFloat(r.calculated_distance) || 0;
    const travel = this.calculateTravelTimes(dist);

    let layerName = 'Base Map';
    if (r.layer_id && Array.isArray(this.layers)) {
      const lObj = this.layers.find(l => l.id === r.layer_id);
      if (lObj) layerName = lObj.name;
    }

    let html = `
      <div class="drawer-header-row" style="margin-bottom:12px;">
        <span class="tag-badge" style="background:rgba(245,158,11,0.15); color:#f59e0b; border:1px solid rgba(245,158,11,0.3);">Expedition Route</span>
        ${r.is_secret ? '<span class="tag-badge" style="background:rgba(239,68,68,0.15); color:#ef4444; border:1px solid rgba(239,68,68,0.3); margin-left:6px;"><i class="fa-solid fa-lock"></i> DM Secret</span>' : ''}
      </div>
      <h2 style="margin:0 0 8px 0; color:var(--accent-primary, #38bdf8);">${this.escapeHtml(r.title)}</h2>
      <div style="font-size:0.85rem; color:var(--text-muted); margin-bottom:16px;">
        Layer: <strong>${this.escapeHtml(layerName)}</strong>
      </div>
      <div class="ruler-travel-times" style="padding:12px; background:rgba(255,255,255,0.03); border-radius:8px; border:1px solid var(--border-color); margin-bottom:16px;">
        <div style="font-weight:600; font-size:0.85rem; margin-bottom:6px; color:var(--accent-primary, #38bdf8);">Route Distance:</div>
        <div style="font-size:1.4rem; font-weight:bold; color:#f59e0b; margin-bottom:8px;">${dist.toFixed(1)} ${unit}</div>
        <div style="display:flex; flex-direction:column; gap:6px; font-size:0.85rem;">
          <div>🚶 Foot Travel: <strong>${this.formatTravelTime(travel.footDays)}</strong> (~30 ${unit}/day)</div>
          <div>🐎 Horseback: <strong>${this.formatTravelTime(travel.horseDays)}</strong> (~60 ${unit}/day)</div>
          <div>⛵ Sailing: <strong>${this.formatTravelTime(travel.sailDays)}</strong> (~100 ${unit}/day)</div>
        </div>
      </div>
    `;

    if (this.viewMode === 'dm') {
      html += `
        <div style="display:flex; gap:10px; margin-top:16px;">
          <button id="atlas-edit-route-btn" class="tool-btn" style="flex:1;"><i class="fa-solid fa-pen-to-square"></i> Edit Route</button>
          <button id="atlas-delete-route-btn" class="tool-btn danger"><i class="fa-solid fa-trash"></i> Delete</button>
        </div>
      `;
    }

    content.innerHTML = html;
    drawer.style.display = 'block';

    if (this.viewMode === 'dm') {
      const editBtn = document.getElementById('atlas-edit-route-btn');
      const deleteBtn = document.getElementById('atlas-delete-route-btn');
      if (editBtn) {
        editBtn.addEventListener('click', () => {
          this.openEditRouteModal(r);
        });
      }
      if (deleteBtn) {
        deleteBtn.addEventListener('click', () => {
          this.deleteRoute(r.id);
        });
      }
    }
  }

  async exportStandaloneHtml() {
    try {
      const worldId = this.worldId || 'default';
      const mapId = this.currentMap ? this.currentMap.id : null;
      const res = await fetch(`/api/export/atlas/${worldId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: this.viewMode || 'dm',
          mapId: mapId
        })
      });
      if (!res.ok) {
        throw new Error(`Export request failed with status ${res.status}`);
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `lore-vault-atlas-${worldId}.html`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Export HTML error:', e);
      alert('Failed to generate standalone HTML export.');
    }
  }
}

window.AtlasView = AtlasView;
