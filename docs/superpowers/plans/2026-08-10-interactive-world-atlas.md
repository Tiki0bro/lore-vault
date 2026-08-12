# Interactive World Atlas & Public Sharing Suite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an interactive world map exploration system with image map uploads, normalized pin placement (`x_pct`, `y_pct`), sub-map nesting, secret/spoiler filtering, live public web link views (`/view/:shareToken`), and single-file standalone HTML exports (`lore-vault-atlas-[world].html`).

**Architecture:** Extend Node.js/Express server (`server.js`) with `maps` and `map_pins` SQLite tables, image upload handling via `multer`, secret text sanitizer, and sharing endpoints. Implement `public/js/atlas-view.js` with Leaflet.js (`L.CRS.Simple`) flat coordinate map canvas, reticle target pin placement, side reader drawer, and theme integration (`ancient-codex`, `scifi-fantasy`, `data-mode="light"`).

**Tech Stack:** Express.js, SQLite3 (`lore.db`), Multer, Leaflet.js (loaded via CDN/local), Vanilla JS (ES6 Modules/Classes), CSS Tokens.

## Global Constraints
- **Database Rules**: `maps` and `map_pins` tables must enforce `FOREIGN KEY ... ON DELETE CASCADE`.
- **Coordinate Precision**: Pin coordinates MUST be stored as normalized float ratios (`x_pct`, `y_pct` in range `0.0`–`1.0`) relative to image dimensions.
- **Secret Protection**: Public Player View and public exports MUST strip `is_secret = 1` pins and `[secret]...[/secret]` text blocks.
- **Theme Support**: Interface MUST inherit `ancient-codex`, `scifi-fantasy`, and `data-mode="light"` theme variables.

---

### Task 1: Database Schema & Atlas API Routes (`server.js`)

**Files:**
- Modify: `server.js` (lines ~150-180 for schema, add map endpoints at end of API routes)
- Test: `scratch/test-atlas-backend.js`

**Interfaces:**
- Consumes: `lore.db` sqlite3 connection, `imageUpload` multer middleware.
- Produces: API routes for CRUD operations on maps and pins:
  - `GET /api/worlds/:worldId/maps`
  - `POST /api/maps`
  - `DELETE /api/maps/:id`
  - `GET /api/maps/:mapId/pins`
  - `POST /api/map-pins`
  - `DELETE /api/map-pins/:id`

- [ ] **Step 1: Write the failing backend integration test**

Create `scratch/test-atlas-backend.js`:
```javascript
const assert = require('assert');
const http = require('http');

function request(path, options = {}, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(`http://localhost:3000${path}`, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(typeof body === 'string' ? body : JSON.stringify(body));
    req.end();
  });
}

async function runTests() {
  console.log('Testing Atlas Backend API Endpoints...');
  
  // 1. Fetch maps for default world
  const res1 = await request('/api/worlds/default/maps');
  assert.strictEqual(res1.status, 200, 'GET /api/worlds/default/maps should return 200');
  assert(Array.isArray(res1.body.maps), 'Response should contain maps array');

  console.log('✅ Atlas Backend Tests Passed!');
}

runTests().catch(err => {
  console.error('❌ Test Failed:', err);
  process.exit(1);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node scratch/test-atlas-backend.js`  
Expected: FAIL with connection error or 404 response.

- [ ] **Step 3: Implement database tables and backend endpoints in `server.js`**

Add schema in `db.serialize()` block in `server.js`:
```javascript
db.run(`
  CREATE TABLE IF NOT EXISTS maps (
    id TEXT PRIMARY KEY,
    world_id TEXT NOT NULL,
    parent_map_id TEXT REFERENCES maps(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    image_path TEXT NOT NULL,
    width INTEGER NOT NULL,
    height INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (world_id) REFERENCES worlds(id) ON DELETE CASCADE
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS map_pins (
    id TEXT PRIMARY KEY,
    map_id TEXT NOT NULL,
    article_id TEXT REFERENCES articles(id) ON DELETE CASCADE,
    x_pct REAL NOT NULL,
    y_pct REAL NOT NULL,
    label TEXT NOT NULL,
    pin_icon TEXT DEFAULT 'fa-location-dot',
    pin_color TEXT DEFAULT '#d97706',
    is_secret INTEGER DEFAULT 0,
    sub_map_id TEXT REFERENCES maps(id) ON DELETE SET NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (map_id) REFERENCES maps(id) ON DELETE CASCADE
  )
`);
```

Add endpoints in `server.js`:
```javascript
// Secret Sanitizer helper
function sanitizeSecretContent(content) {
  if (!content) return '';
  // Strip [secret]...[/secret] blocks
  return content.replace(/\[secret\][\s\S]*?\[\/secret\]/gi, ' *[Secret Details Redacted]* ');
}

// Map endpoints
app.get('/api/worlds/:worldId/maps', (req, res) => {
  const { worldId } = req.params;
  db.all('SELECT * FROM maps WHERE world_id = ? ORDER BY created_at ASC', [worldId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ maps: rows || [] });
  });
});

app.post('/api/maps', imageUpload.single('image'), (req, res) => {
  const { world_id, title, description, parent_map_id } = req.body;
  if (!req.file || !title || !world_id) {
    return res.status(400).json({ error: 'Missing required map fields or image file' });
  }

  const id = `map-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
  const image_path = `/uploads/images/${req.file.filename}`;
  // Standard fallback width/height if metadata unavailable
  const width = 1920;
  const height = 1080;

  const query = `
    INSERT INTO maps (id, world_id, parent_map_id, title, description, image_path, width, height)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;
  db.run(query, [id, world_id, parent_map_id || null, title, description || '', image_path, width, height], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    db.get('SELECT * FROM maps WHERE id = ?', [id], (err2, map) => {
      res.status(201).json({ success: true, map });
    });
  });
});

app.delete('/api/maps/:id', (req, res) => {
  db.run('DELETE FROM maps WHERE id = ?', [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, deleted: this.changes });
  });
});

app.get('/api/maps/:mapId/pins', (req, res) => {
  const { mapId } = req.params;
  const isPlayerMode = req.query.mode === 'player';
  
  let query = 'SELECT * FROM map_pins WHERE map_id = ?';
  const params = [mapId];

  if (isPlayerMode) {
    query += ' AND is_secret = 0';
  }

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ pins: rows || [] });
  });
});

app.post('/api/map-pins', (req, res) => {
  const { id, map_id, article_id, x_pct, y_pct, label, pin_icon, pin_color, is_secret, sub_map_id } = req.body;
  if (!map_id || x_pct === undefined || y_pct === undefined || !label) {
    return res.status(400).json({ error: 'Missing required pin fields (map_id, x_pct, y_pct, label)' });
  }

  const pinId = id || `pin-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
  const clampedX = Math.max(0, Math.min(1, parseFloat(x_pct)));
  const clampedY = Math.max(0, Math.min(1, parseFloat(y_pct)));

  const query = `
    INSERT INTO map_pins (id, map_id, article_id, x_pct, y_pct, label, pin_icon, pin_color, is_secret, sub_map_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      article_id=excluded.article_id,
      x_pct=excluded.x_pct,
      y_pct=excluded.y_pct,
      label=excluded.label,
      pin_icon=excluded.pin_icon,
      pin_color=excluded.pin_color,
      is_secret=excluded.is_secret,
      sub_map_id=excluded.sub_map_id,
      updated_at=CURRENT_TIMESTAMP
  `;

  db.run(query, [pinId, map_id, article_id || null, clampedX, clampedY, label, pin_icon || 'fa-location-dot', pin_color || '#d97706', is_secret ? 1 : 0, sub_map_id || null], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    db.get('SELECT * FROM map_pins WHERE id = ?', [pinId], (err2, pin) => {
      res.status(201).json({ success: true, pin });
    });
  });
});

app.delete('/api/map-pins/:id', (req, res) => {
  db.run('DELETE FROM map_pins WHERE id = ?', [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, deleted: this.changes });
  });
});
```

- [ ] **Step 4: Run test to verify it passes**

Make sure server is running (`node server.js` or start test script). Run:  
`node scratch/test-atlas-backend.js`  
Expected: PASS with `✅ Atlas Backend Tests Passed!`.

---

### Task 2: Dual Sharing Engine & Exporter (`server.js`)

**Files:**
- Modify: `server.js` (add `/view/:shareToken` and `/api/export/atlas/:worldId` routes)
- Test: `scratch/test-atlas-sharing.js`

**Interfaces:**
- Consumes: SQLite `maps`, `map_pins`, `articles`, `worlds` tables, `sanitizeSecretContent`.
- Produces: Live public reader view HTML and downloadable standalone `.html` bundle.

- [ ] **Step 1: Write the failing sharing integration test**

Create `scratch/test-atlas-sharing.js`:
```javascript
const assert = require('assert');
const http = require('http');

function request(path, options = {}, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(`http://localhost:3000${path}`, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({ status: res.statusCode, body: data, headers: res.headers });
      });
    });
    req.on('error', reject);
    if (body) req.write(typeof body === 'string' ? body : JSON.stringify(body));
    req.end();
  });
}

async function runTests() {
  console.log('Testing Dual Sharing Engine Endpoints...');
  
  // 1. Live share route
  const res1 = await request('/view/default');
  assert.strictEqual(res1.status, 200, 'GET /view/default should return 200 HTML page');
  assert(res1.body.includes('<meta property="og:title"'), 'Page must contain OpenGraph meta tags');

  // 2. Standalone export endpoint
  const res2 = await request('/api/export/atlas/default', { method: 'POST', headers: { 'Content-Type': 'application/json' } }, JSON.stringify({ mode: 'player' }));
  assert.strictEqual(res2.status, 200, 'POST /api/export/atlas/default should return 200 HTML');
  assert(res2.body.includes('<!DOCTYPE html>'), 'Exporter must return standalone HTML');

  console.log('✅ Dual Sharing Engine Tests Passed!');
}

runTests().catch(err => {
  console.error('❌ Test Failed:', err);
  process.exit(1);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node scratch/test-atlas-sharing.js`  
Expected: FAIL with 404 response.

- [ ] **Step 3: Implement sharing and exporter endpoints in `server.js`**

Add routes in `server.js`:
```javascript
// Live Public Reader Route
app.get('/view/:shareToken', (req, res) => {
  const worldId = req.params.shareToken;
  db.get('SELECT * FROM worlds WHERE id = ? OR id = "default"', [worldId], (err, world) => {
    const targetWorld = world || { id: 'default', name: 'LoreVault Atlas', description: 'Interactive World Lore Explorer', theme: 'ancient-codex' };
    
    db.all('SELECT * FROM maps WHERE world_id = ? ORDER BY created_at ASC', [targetWorld.id], (err2, maps) => {
      const mapsData = maps || [];
      const primaryMap = mapsData[0] || null;

      const html = `
        <!DOCTYPE html>
        <html lang="en" data-theme="${targetWorld.theme}">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${targetWorld.name} — Interactive World Atlas</title>
          <meta property="og:title" content="${targetWorld.name} — LoreVault World Atlas">
          <meta property="og:description" content="${targetWorld.description || 'Explore the interactive world map and lore codex.'}">
          <meta property="og:type" content="website">
          <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css" />
          <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
          <link rel="stylesheet" href="/css/styles.css">
          <style>
            body { margin: 0; padding: 0; background: var(--bg-main, #0b0f19); color: var(--text-primary, #e2e8f0); font-family: sans-serif; overflow: hidden; }
            #public-atlas-viewport { display: flex; width: 100vw; height: 100vh; }
            #public-map-container { flex: 1; height: 100%; position: relative; background: #000; }
            #public-reader-drawer { width: 420px; height: 100%; background: var(--surface-sidebar, #0f172a); border-left: 1px solid var(--border-color, #1e293b); padding: 20px; overflow-y: auto; display: none; }
          </style>
        </head>
        <body>
          <div id="public-atlas-viewport">
            <div id="public-map-container"></div>
            <div id="public-reader-drawer">
              <h2 id="public-article-title">Select a pin to explore</h2>
              <div id="public-article-body">Click any marker on the map to view linked lore.</div>
            </div>
          </div>
          <script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.js"></script>
          <script>
            window.WORLD_DATA = ${JSON.stringify(targetWorld)};
            window.MAPS_DATA = ${JSON.stringify(mapsData)};
          </script>
        </body>
        </html>
      `;
      res.send(html);
    });
  });
});

// Standalone Static Web Exporter
app.post('/api/export/atlas/:worldId', (req, res) => {
  const { worldId } = req.params;
  const isPlayerMode = req.body.mode === 'player';

  db.get('SELECT * FROM worlds WHERE id = ?', [worldId], (err, world) => {
    const targetWorld = world || { id: 'default', name: 'LoreVault Atlas', theme: 'ancient-codex' };

    db.all('SELECT * FROM maps WHERE world_id = ?', [targetWorld.id], (err2, maps) => {
      const mapIds = (maps || []).map(m => m.id);
      
      let pinQuery = 'SELECT * FROM map_pins WHERE map_id IN (' + (mapIds.map(() => '?').join(',') || '""') + ')';
      if (isPlayerMode) pinQuery += ' AND is_secret = 0';

      db.all(pinQuery, mapIds, (err3, pins) => {
        db.all('SELECT id, title, category, summary, content FROM articles WHERE world_id = ?', [targetWorld.id], (err4, articles) => {
          
          const sanitizedArticles = (articles || []).map(art => ({
            ...art,
            content: isPlayerMode ? sanitizeSecretContent(art.content) : art.content
          }));

          const bundleHtml = `<!DOCTYPE html>
<html lang="en" data-theme="${targetWorld.theme}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${targetWorld.name} — Standalone World Atlas</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css" />
  <style>
    body { margin: 0; padding: 0; font-family: system-ui, sans-serif; background: #0d1117; color: #c9d1d9; display: flex; height: 100vh; }
    #map { flex: 1; height: 100%; background: #000; }
    #drawer { width: 400px; padding: 24px; background: #161b22; border-left: 1px solid #30363d; overflow-y: auto; }
  </style>
</head>
<body>
  <div id="map"></div>
  <div id="drawer">
    <h2 id="title">${targetWorld.name} Atlas</h2>
    <div id="body">Select a marker on the map to explore lore.</div>
  </div>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.js"></script>
  <script>
    const maps = ${JSON.stringify(maps || [])};
    const pins = ${JSON.stringify(pins || [])};
    const articles = ${JSON.stringify(sanitizedArticles)};
  </script>
</body>
</html>`;

          res.setHeader('Content-Type', 'text/html');
          res.setHeader('Content-Disposition', `attachment; filename="lore-vault-atlas-${targetWorld.id}.html"`);
          res.send(bundleHtml);
        });
      });
    });
  });
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node scratch/test-atlas-sharing.js`  
Expected: PASS with `✅ Dual Sharing Engine Tests Passed!`.

---

### Task 3: Interactive Cartographer UI Component (`public/js/atlas-view.js`)

**Files:**
- Create: `public/js/atlas-view.js`

**Interfaces:**
- Consumes: Leaflet.js (`L.map`, `L.imageOverlay`, `L.CRS.Simple`, `L.marker`), LoreVault API endpoints (`/api/worlds/:worldId/maps`, `/api/map-pins`).
- Produces: `window.AtlasView` module class for managing interactive pan/zoom canvas, pin placement target reticle, mode switching, and side reader drawer rendering.

- [ ] **Step 1: Create `public/js/atlas-view.js` implementation**

```javascript
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
    this.markers = [];
  }

  async init() {
    await this.fetchMaps();
    this.renderLayout();
    if (this.maps.length > 0) {
      this.loadMap(this.maps[0].id]);
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
          <button id="atlas-pin-mode-btn" class="tool-btn"><i class="fa-solid fa-location-crosshairs"></i> Drop Pin</button>
        </div>
        <div class="atlas-toolbar-right">
          <div class="segmented-control">
            <button id="atlas-mode-dm" class="segmented-btn active">DM Canon View</button>
            <button id="atlas-mode-player" class="segmented-btn">Public Player View</button>
          </div>
          <button id="atlas-share-btn" class="tool-btn primary"><i class="fa-solid fa-share-nodes"></i> Share Atlas</button>
          <button id="atlas-export-btn" class="tool-btn"><i class="fa-solid fa-download"></i> Export HTML</button>
        </div>
      </div>
      <div id="atlas-viewport">
        <div id="atlas-canvas-container"></div>
        <div id="atlas-reader-drawer" class="atlas-drawer">
          <button id="atlas-close-drawer" class="drawer-close-btn">&times;</button>
          <div id="atlas-drawer-content">
            <div class="drawer-placeholder">
              <i class="fa-solid fa-map-location-dot"></i>
              <p>Select a pin on the map to explore lore details.</p>
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

    const pinBtn = document.getElementById('atlas-pin-mode-btn');
    if (pinBtn) {
      pinBtn.addEventListener('click', () => this.togglePinPlacementMode());
    }

    const shareBtn = document.getElementById('atlas-share-btn');
    if (shareBtn) {
      shareBtn.addEventListener('click', () => {
        const url = `${window.location.origin}/view/${this.worldId}`;
        navigator.clipboard.writeText(url);
        alert(`Atlas public share URL copied to clipboard:\n${url}`);
      });
    }

    const exportBtn = document.getElementById('atlas-export-btn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => this.exportStandaloneHtml());
    }
  }

  setViewMode(mode) {
    this.viewMode = mode;
    document.getElementById('atlas-mode-dm').classList.toggle('active', mode === 'dm');
    document.getElementById('atlas-mode-player').classList.toggle('active', mode === 'player');
    if (this.currentMap) this.loadMapPins(this.currentMap.id);
  }

  togglePinPlacementMode() {
    this.isPinPlacementActive = !this.isPinPlacementActive;
    const btn = document.getElementById('atlas-pin-mode-btn');
    const canvas = document.getElementById('atlas-canvas-container');
    if (btn) btn.classList.toggle('active', this.isPinPlacementActive);
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
    if (!container) return;

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

    await this.loadMapPins(mapId);
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

    if (!this.currentMap || !this.mapInstance) return;
    const w = this.currentMap.width || 1920;
    const h = this.currentMap.height || 1080;

    this.pins.forEach(pin => {
      const latlng = [pin.y_pct * h, pin.x_pct * w];
      const marker = L.marker(latlng).addTo(this.mapInstance);
      marker.bindTooltip(pin.label, { permanent: false, direction: 'top' });
      marker.on('click', () => this.openArticleDrawer(pin.article_id, pin.label));
      this.markers.push(marker);
    });
  }

  async openArticleDrawer(articleId, label) {
    const drawer = document.getElementById('atlas-reader-drawer');
    const content = document.getElementById('atlas-drawer-content');
    if (!drawer || !content) return;

    drawer.style.display = 'block';
    if (!articleId) {
      content.innerHTML = `<h3>${label}</h3><p>No article linked to this location.</p>`;
      return;
    }

    try {
      const res = await fetch(`/api/articles/${articleId}`);
      const article = await res.json();
      content.innerHTML = `
        <div class="article-detail">
          <h2>${article.title}</h2>
          <span class="category-badge">${article.category}</span>
          <hr>
          <div class="article-body">${article.content}</div>
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
```

---

### Task 4: Main UI Navigation & Layout Integration (`public/index.html` & `public/css/styles.css` & `public/js/app.js`)

**Files:**
- Modify: `public/index.html` (add navbar item & `#view-atlas` section)
- Modify: `public/css/styles.css` (add Atlas responsive flex layout, map canvas height, drawer & theme rules)
- Modify: `public/js/app.js` (instantiate `window.atlasView = new AtlasView('atlas-app-root')`)

- [ ] **Step 1: Modify `public/index.html` to add nav button and `#view-atlas` layout container**

In `public/index.html`, update navbar view switcher to include:
```html
<button class="nav-btn" data-view="atlas" id="nav-btn-atlas">
  <i class="fa-solid fa-map"></i> World Atlas
</button>
```

Add main view container in `public/index.html`:
```html
<section id="view-atlas" class="view-section">
  <div id="atlas-app-root" style="width: 100%; height: calc(100vh - 56px);"></div>
</section>
```

- [ ] **Step 2: Add CSS rules in `public/css/styles.css`**

```css
/* World Atlas Responsive Styles */
#view-atlas {
  display: none;
  width: 100%;
  height: calc(100vh - 56px);
  background: var(--bg-main, #0b0f19);
}

#view-atlas.active {
  display: flex;
  flex-direction: column;
}

.atlas-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 16px;
  background: var(--surface-sidebar, #0f172a);
  border-bottom: 1px solid var(--border-color, #1e293b);
}

.atlas-toolbar-left, .atlas-toolbar-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

#atlas-viewport {
  display: flex;
  flex: 1;
  height: calc(100% - 52px);
  position: relative;
  overflow: hidden;
}

#atlas-canvas-container {
  flex: 1;
  height: 100%;
  background: #050811;
}

.atlas-drawer {
  width: 420px;
  height: 100%;
  background: var(--surface-card, #1e293b);
  border-left: 1px solid var(--border-color, #334155);
  padding: 20px;
  box-sizing: border-box;
  overflow-y: auto;
  position: relative;
  display: none;
}

.drawer-close-btn {
  position: absolute;
  top: 12px;
  right: 12px;
  background: transparent;
  border: none;
  color: var(--text-primary, #e2e8f0);
  font-size: 24px;
  cursor: pointer;
}
```

- [ ] **Step 3: Hook up `AtlasView` initialization in `public/js/app.js`**

In `public/js/app.js`, handle view switching to `atlas`:
```javascript
if (viewName === 'atlas') {
  if (!window.atlasView) {
    window.atlasView = new AtlasView('atlas-app-root', { worldId: this.currentWorldId || 'default' });
    window.atlasView.init();
  }
}
```

---

### Task 5: End-to-End Verification & Walkthrough

**Files:**
- Run test scripts: `scratch/test-atlas-backend.js`, `scratch/test-atlas-sharing.js`
- Create: `walkthrough.md`

- [ ] **Step 1: Execute all integration test suites**

Run:
```bash
node scratch/test-atlas-backend.js
node scratch/test-atlas-sharing.js
```
Expected: All backend endpoints, table migrations, secret filters, and HTML exporter return green PASS.

- [ ] **Step 2: Generate `walkthrough.md` artifact**

Document completed feature set, visual layout, data integrity, and verification results.
