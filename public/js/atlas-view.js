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
  }

  async init() {
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
          <button id="atlas-add-map-btn" class="tool-btn"><i class="fa-solid fa-plus"></i> Upload Map</button>
          <button id="atlas-auto-gen-btn" class="tool-btn primary"><i class="fa-solid fa-wand-magic-sparkles"></i> Auto-Generate Map</button>
          <button id="atlas-auto-pin-btn" class="tool-btn"><i class="fa-solid fa-map-pin"></i> Auto-Place Pins</button>
          <button id="atlas-layers-btn" class="tool-btn"><i class="fa-solid fa-layer-group"></i> 🥞 Layers</button>
          <button id="atlas-pin-mode-btn" class="tool-btn"><i class="fa-solid fa-location-crosshairs"></i> Drop Pin</button>
          <button id="atlas-territory-mode-btn" class="tool-btn"><i class="fa-solid fa-draw-polygon"></i> 🗺️ Draw Boundary</button>
          <span id="atlas-reticle-toast" class="atlas-toast" style="display:none;"><i class="fa-solid fa-crosshairs"></i> Click on map to place pin... <button id="atlas-cancel-pin-btn" class="btn-text">Cancel</button></span>
          <span id="atlas-territory-toast" class="atlas-toast" style="display:none;"><i class="fa-solid fa-draw-polygon"></i> Click on map to add vertices... <button id="atlas-complete-territory-btn" class="tool-btn primary btn-sm" style="margin-left:8px; padding:2px 8px; font-size:0.8rem;">[✓ Complete Boundary]</button> <button id="atlas-cancel-territory-btn" class="btn-text" style="margin-left:6px;">[✕ Cancel]</button></span>
        </div>
        <div class="atlas-toolbar-right">
          <div class="segmented-control">
            <button id="atlas-mode-dm" class="segmented-btn ${this.viewMode === 'dm' ? 'active' : ''}">DM Canon View</button>
            <button id="atlas-mode-player" class="segmented-btn ${this.viewMode === 'player' ? 'active' : ''}">Public Player View</button>
          </div>
          <button id="atlas-share-btn" class="tool-btn primary"><i class="fa-solid fa-share-nodes"></i> Share Atlas</button>
          <button id="atlas-export-btn" class="tool-btn"><i class="fa-solid fa-download"></i> Export HTML</button>
        </div>
      </div>
      <div id="atlas-viewport">
        <div id="atlas-canvas-container"></div>
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
      autoGenBtn.addEventListener('click', () => this.autoGenerateMap());
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
  }

  async autoGenerateMap() {
    const title = prompt('Enter a title for the auto-generated map:', 'Procedural Realm Map');
    if (!title) return;

    try {
      const res = await fetch('/api/maps/auto-generate/procedural', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ world_id: this.worldId, title })
      });
      const data = await res.json();
      if (data.success) {
        alert(`Map "${data.map.title}" generated successfully with ${data.pins.length} location markers!`);
        await this.fetchMaps();
        this.renderLayout();
        this.loadMap(data.map.id);
      }
    } catch (e) {
      alert('Failed to auto-generate map.');
    }
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
    }
  }

  togglePinPlacementMode(forceState) {
    this.isPinPlacementActive = forceState !== undefined ? forceState : !this.isPinPlacementActive;
    if (this.isPinPlacementActive && this.isTerritoryDrawingActive) {
      this.toggleTerritoryDrawingMode(false);
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
    if (this.isTerritoryDrawingActive && this.isPinPlacementActive) {
      this.togglePinPlacementMode(false);
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

  async loadMap(mapId) {
    this.currentMap = this.maps.find(m => m.id === mapId) || null;
    if (!this.currentMap) return;

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

    L.imageOverlay(this.currentMap.image_path, bounds).addTo(this.mapInstance);
    this.mapInstance.fitBounds(bounds);

    this.mapInstance.on('click', (e) => {
      if (this.isPinPlacementActive) {
        const x_pct = e.latlng.lng / w;
        const y_pct = e.latlng.lat / h;
        this.openCreatePinModal(x_pct, y_pct);
      } else if (this.isTerritoryDrawingActive) {
        const x_pct = Math.max(0, Math.min(1, e.latlng.lng / w));
        const y_pct = Math.max(0, Math.min(1, e.latlng.lat / h));
        this.addTerritoryDrawingVertex(x_pct, y_pct);
      } else {
        this.clearVertexHandles();
        this.selectedTerritory = null;
      }
    });

    await this.fetchLayers(mapId);
    this.renderLayersDrawer();
    await this.loadMapPins(mapId);
    await this.loadMapTerritories(mapId);
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

    this.pins.forEach(pin => {
      if (pin.layer_id && hiddenLayerIds.has(pin.layer_id)) {
        return;
      }
      const latlng = [pin.y_pct * h, pin.x_pct * w];
      const marker = L.marker(latlng).addTo(this.mapInstance);
      marker.bindTooltip(pin.label, { permanent: false, direction: 'top' });
      marker.on('click', () => this.openArticleDrawer(pin.article_id, pin.label));
      this.markers.push(marker);
    });
  }

  openCreatePinModal(x_pct, y_pct) {
    this.tempCoords = { x_pct, y_pct };
    document.getElementById('pin-label-input').value = '';
    document.getElementById('atlas-pin-modal').style.display = 'flex';
  }

  async savePin() {
    if (!this.currentMap || !this.tempCoords) return;
    const label = document.getElementById('pin-label-input').value.trim();
    if (!label) {
      alert('Please enter a pin label.');
      return;
    }

    const payload = {
      map_id: this.currentMap.id,
      article_id: document.getElementById('pin-article-select').value || null,
      x_pct: this.tempCoords.x_pct,
      y_pct: this.tempCoords.y_pct,
      label: label,
      pin_icon: document.getElementById('pin-icon-select').value,
      pin_color: document.getElementById('pin-color-input').value,
      is_secret: document.getElementById('pin-secret-checkbox').checked ? 1 : 0
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

  async openArticleDrawer(articleId, label) {
    const drawer = document.getElementById('atlas-reader-drawer');
    const content = document.getElementById('atlas-drawer-content');
    if (!drawer || !content) return;

    drawer.style.display = 'block';
    if (!articleId) {
      content.innerHTML = `<h3>${label}</h3><p>No detailed lore article linked to this marker.</p>`;
      return;
    }

    try {
      const res = await fetch(`/api/articles/${articleId}`);
      const article = await res.json();
      content.innerHTML = `
        <div class="article-detail">
          <h2>${article.title}</h2>
          <span class="category-badge">${article.category || 'General'}</span>
          <hr style="border-color: var(--border-color, #334155); margin: 12px 0;">
          <div class="article-body">${article.content || article.summary || 'No content available.'}</div>
        </div>
      `;
    } catch (e) {
      content.innerHTML = `<h3>${label}</h3><p>Error loading article content.</p>`;
    }
  }

  async exportStandaloneHtml() {
    try {
      const res = await fetch(`/api/export/atlas/${this.worldId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: this.viewMode })
      });
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `lore-vault-atlas-${this.worldId}.html`;
      a.click();
    } catch (e) {
      alert('Failed to generate standalone HTML export.');
    }
  }
}

window.AtlasView = AtlasView;
