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
    this.articles = [];
    this.markers = [];
    this.tempCoords = null;
    this.isLayersDrawerOpen = false;
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
          <span id="atlas-reticle-toast" class="atlas-toast" style="display:none;"><i class="fa-solid fa-crosshairs"></i> Click on map to place pin... <button id="atlas-cancel-pin-btn" class="btn-text">Cancel</button></span>
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
              <p>Select a pin on the map to explore linked lore, history, and secret entries.</p>
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
    const dmBtn = document.getElementById('atlas-mode-dm');
    const playerBtn = document.getElementById('atlas-mode-player');
    if (dmBtn) dmBtn.classList.toggle('active', mode === 'dm');
    if (playerBtn) playerBtn.classList.toggle('active', mode === 'player');
    if (this.currentMap) {
      await this.fetchLayers(this.currentMap.id);
      this.renderLayersDrawer();
      await this.loadMapPins(this.currentMap.id);
    }
  }

  togglePinPlacementMode(forceState) {
    this.isPinPlacementActive = forceState !== undefined ? forceState : !this.isPinPlacementActive;
    const btn = document.getElementById('atlas-pin-mode-btn');
    const toast = document.getElementById('atlas-reticle-toast');
    const canvas = document.getElementById('atlas-canvas-container');
    if (btn) btn.classList.toggle('active', this.isPinPlacementActive);
    if (toast) toast.style.display = this.isPinPlacementActive ? 'inline-flex' : 'none';
    if (canvas) canvas.style.cursor = this.isPinPlacementActive ? 'crosshair' : 'grab';
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
      }
    });

    await this.fetchLayers(mapId);
    this.renderLayersDrawer();
    await this.loadMapPins(mapId);
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
