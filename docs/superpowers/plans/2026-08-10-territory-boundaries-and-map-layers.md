# Territory Boundaries, Custom Map Layers, and AI Auto-Cartography Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build interactive territory boundary polygons with draggable vertex handles, contested zone conflict detection, custom map layer management, hybrid DM secrets, and Gemini Vision AI territory auto-detection for LoreVault's World Atlas.

**Architecture:** Extend Leaflet.js in `public/js/atlas-view.js` using `L.Polygon`, `L.LayerGroup`, and SVG pattern overlays. Update SQLite schema in `database/lore.db` and add Express API endpoints in `server.js` for layer/territory CRUD and Gemini Vision AI boundary extraction.

**Tech Stack:** Node.js, Express, SQLite (`better-sqlite3`), Leaflet.js, Vanilla CSS, Gemini Multimodal AI API (`@google/genai`).

## Global Constraints

- Follow the WorldAnvil Simplified Standard documented in `DECISIONS.md`.
- Preserve Gemini candidate retry loop in `server.js`.
- Store polygon vertices as normalized percentage float coordinates `[x_pct, y_pct]` (0.0 to 1.0).
- Maintain 100% backward compatibility with existing map pins and standalone HTML atlas exporter.

---

### Task 1: Database Schema & Layer/Territory REST API Endpoints

**Files:**
- Modify: `server.js`
- Test: `scratch/test-atlas-territories.js`

**Interfaces:**
- Consumes: Existing Express app setup and SQLite DB handle in `server.js`.
- Produces: `GET/POST/DELETE /api/maps/:mapId/layers`, `GET/POST/PUT/DELETE /api/maps/:mapId/territories`.

- [ ] **Step 1: Write the failing API integration test**

Create `scratch/test-atlas-territories.js`:
```javascript
const http = require('http');

function makeRequest(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path,
      method,
      headers: { 'Content-Type': 'application/json' }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
        catch (e) { resolve({ status: res.statusCode, data }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runTests() {
  console.log('Testing Map Layers and Territories API...');
  
  // Test Layer Creation
  const layerRes = await makeRequest('/api/maps/default/layers', 'POST', {
    name: 'Political Borders 3rd Era',
    color_badge: '#38bdf8'
  });
  console.assert(layerRes.status === 200, `Expected 200, got ${layerRes.status}`);
  console.assert(layerRes.data.layer.name === 'Political Borders 3rd Era', 'Layer name mismatch');
  
  // Test Territory Creation
  const terrRes = await makeRequest('/api/maps/default/territories', 'POST', {
    title: 'Valorian Empire',
    points_json: JSON.stringify([[0.1, 0.1], [0.2, 0.1], [0.2, 0.2]]),
    stroke_color: '#ef4444',
    fill_color: '#ef4444',
    fill_opacity: 0.3
  });
  console.assert(terrRes.status === 200, `Expected 200, got ${terrRes.status}`);
  console.assert(terrRes.data.territory.title === 'Valorian Empire', 'Territory title mismatch');
  
  console.log('✅ API Tests Passed Successfully!');
}

runTests().catch(console.error);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node scratch/test-atlas-territories.js`  
Expected: FAIL (404 Not Found)

- [ ] **Step 3: Implement SQLite migrations and Express REST routes in `server.js`**

Add table migrations and routes in `server.js`:
```javascript
// SQLite Table Migrations for Map Layers & Territories
db.exec(`
  CREATE TABLE IF NOT EXISTS map_layers (
    id TEXT PRIMARY KEY,
    map_id TEXT NOT NULL,
    name TEXT NOT NULL,
    color_badge TEXT DEFAULT '#38bdf8',
    is_visible INTEGER DEFAULT 1,
    is_secret INTEGER DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS map_territories (
    id TEXT PRIMARY KEY,
    map_id TEXT NOT NULL,
    layer_id TEXT,
    article_id TEXT,
    title TEXT NOT NULL,
    points_json TEXT NOT NULL,
    stroke_color TEXT DEFAULT '#ef4444',
    stroke_width INTEGER DEFAULT 3,
    stroke_style TEXT DEFAULT 'solid',
    fill_color TEXT DEFAULT '#ef4444',
    fill_opacity REAL DEFAULT 0.25,
    is_contested INTEGER DEFAULT 0,
    contested_article_id TEXT,
    is_secret INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
`);

// API Routes
app.get('/api/maps/:mapId/layers', (req, res) => {
  const layers = db.prepare('SELECT * FROM map_layers WHERE map_id = ? ORDER BY sort_order ASC').all(req.params.mapId);
  res.json({ layers });
});

app.post('/api/maps/:mapId/layers', (req, res) => {
  const { name, color_badge, is_secret } = req.body;
  const id = 'layer_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
  db.prepare('INSERT INTO map_layers (id, map_id, name, color_badge, is_secret) VALUES (?, ?, ?, ?, ?)').run(id, req.params.mapId, name, color_badge || '#38bdf8', is_secret ? 1 : 0);
  const layer = db.prepare('SELECT * FROM map_layers WHERE id = ?').get(id);
  res.json({ layer });
});

app.delete('/api/maps/:mapId/layers/:layerId', (req, res) => {
  db.prepare('DELETE FROM map_layers WHERE id = ? AND map_id = ?').run(req.params.layerId, req.params.mapId);
  res.json({ success: true });
});

app.get('/api/maps/:mapId/territories', (req, res) => {
  const territories = db.prepare('SELECT * FROM map_territories WHERE map_id = ?').all(req.params.mapId);
  res.json({ territories });
});

app.post('/api/maps/:mapId/territories', (req, res) => {
  const { title, layer_id, article_id, points_json, stroke_color, stroke_width, stroke_style, fill_color, fill_opacity, is_secret } = req.body;
  const id = 'terr_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
  db.prepare(`
    INSERT INTO map_territories (id, map_id, layer_id, article_id, title, points_json, stroke_color, stroke_width, stroke_style, fill_color, fill_opacity, is_secret)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, req.params.mapId, layer_id || null, article_id || null, title, points_json, stroke_color || '#ef4444', stroke_width || 3, stroke_style || 'solid', fill_color || '#ef4444', fill_opacity !== undefined ? fill_opacity : 0.25, is_secret ? 1 : 0);
  const territory = db.prepare('SELECT * FROM map_territories WHERE id = ?').get(id);
  res.json({ territory });
});

app.put('/api/maps/:mapId/territories/:territoryId', (req, res) => {
  const { title, layer_id, article_id, points_json, stroke_color, stroke_width, stroke_style, fill_color, fill_opacity, is_contested, contested_article_id, is_secret } = req.body;
  db.prepare(`
    UPDATE map_territories SET
      title = COALESCE(?, title),
      layer_id = ?,
      article_id = ?,
      points_json = COALESCE(?, points_json),
      stroke_color = COALESCE(?, stroke_color),
      stroke_width = COALESCE(?, stroke_width),
      stroke_style = COALESCE(?, stroke_style),
      fill_color = COALESCE(?, fill_color),
      fill_opacity = COALESCE(?, fill_opacity),
      is_contested = COALESCE(?, is_contested),
      contested_article_id = ?,
      is_secret = COALESCE(?, is_secret)
    WHERE id = ? AND map_id = ?
  `).run(title, layer_id || null, article_id || null, points_json, stroke_color, stroke_width, stroke_style, fill_color, fill_opacity, is_contested, contested_article_id || null, is_secret, req.params.territoryId, req.params.mapId);
  const territory = db.prepare('SELECT * FROM map_territories WHERE id = ?').get(req.params.territoryId);
  res.json({ territory });
});

app.delete('/api/maps/:mapId/territories/:territoryId', (req, res) => {
  db.prepare('DELETE FROM map_territories WHERE id = ? AND map_id = ?').run(req.params.territoryId, req.params.mapId);
  res.json({ success: true });
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node scratch/test-atlas-territories.js`  
Expected: PASS (All API tests green)

- [ ] **Step 5: Commit changes**

```bash
git add server.js scratch/test-atlas-territories.js
git commit -m "feat: add map layers and territories REST API endpoints"
```

---

### Task 2: Atlas Layer Manager & Floating Viewport Controls

**Files:**
- Modify: `public/js/atlas-view.js`
- Modify: `public/css/styles.css`

**Interfaces:**
- Consumes: `GET/POST/DELETE /api/maps/:mapId/layers`.
- Produces: Interactive Layer Control drawer in Leaflet canvas viewport.

- [ ] **Step 1: Update `atlas-view.js` layout and state for layers**

In `public/js/atlas-view.js`:
- Add `this.layers = []` to `AtlasView` constructor.
- Add `fetchLayers()` method and invoke in `init()`.
- Add `[🥞 Layers]` button to `.atlas-toolbar-left`.
- Render `#atlas-layers-drawer` container in `#atlas-viewport`.

- [ ] **Step 2: Add CSS rules for Atlas Layer Control**

In `public/css/styles.css`:
```css
.atlas-layers-drawer {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 260px;
  background: var(--surface-card, rgba(15, 23, 42, 0.9));
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
  border-radius: 8px;
  padding: 12px;
  backdrop-filter: blur(12px);
  z-index: 1000;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
}

.layer-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 4px;
  margin-bottom: 4px;
  background: rgba(255, 255, 255, 0.03);
}
```

- [ ] **Step 3: Test Layer Manager creation & visibility toggling**

Verify layer checkbox toggling hides/shows assigned pins and territories.

- [ ] **Step 4: Commit changes**

```bash
git add public/js/atlas-view.js public/css/styles.css
git commit -m "feat: add floating layer manager panel to atlas view"
```

---

### Task 3: Interactive Territory Vector Drawing & Vertex Handles

**Files:**
- Modify: `public/js/atlas-view.js`
- Modify: `public/css/styles.css`

**Interfaces:**
- Consumes: Leaflet `L.Polygon`, `L.Polyline`, `L.CircleMarker`.
- Produces: Vector boundary drawing and vertex node manipulation.

- [ ] **Step 1: Add Territory Drawing Mode state & click handlers**

In `public/js/atlas-view.js`:
- Add `this.isTerritoryDrawingActive = false`, `this.activeVertices = []`, `this.activePolyline = null`.
- Add `[🗺️ Draw Boundary]` toolbar button.
- On canvas click in drawing mode: append `[lat, lng]` normalized floats to `activeVertices`, update live `L.polyline`.
- Show floating toast with `[✓ Complete Boundary]` button.

- [ ] **Step 2: Add Territory Modal & Styling Controls**

In `public/js/atlas-view.js`:
- Render `#atlas-territory-modal` dialog with title input, article select, layer select, stroke color picker, stroke width slider, stroke style dropdown (`solid`, `dashed`, `dotted`), fill color picker, fill opacity slider, and DM secret checkbox.

- [ ] **Step 3: Add Interactive Vertex Handle Dragging**

In `public/js/atlas-view.js`:
- When clicking a territory in DM Edit mode: render `L.CircleMarker` on each vertex point with `draggable: true`.
- Update polygon bounds on `drag` event.
- Allow double-click / right-click to delete node, and click midpoint handle to split edge and add node.

- [ ] **Step 4: Test territory creation, vertex dragging, and editing**

Verify created territory persists in SQLite database and scales accurately across zooms.

- [ ] **Step 5: Commit changes**

```bash
git add public/js/atlas-view.js public/css/styles.css
git commit -m "feat: add vector boundary drawing and vertex handle editing"
```

---

### Task 4: Contested Overlap Geometry Check & Conflict Lore Drawer

**Files:**
- Modify: `public/js/atlas-view.js`
- Modify: `public/css/styles.css`

**Interfaces:**
- Consumes: Leaflet territory polygons.
- Produces: SVG cross-hatch pattern fill (`pattern-stripe`) and Contested Zone Lore drawer.

- [ ] **Step 1: Add SVG Cross-Hatch Pattern Definition to Leaflet Canvas**

In `public/js/atlas-view.js`:
Inject `<pattern id="pattern-stripe" ...>` SVG definition into Leaflet SVG root container.

- [ ] **Step 2: Implement Client-Side Polygon Overlap Check**

Add `checkTerritoryIntersections()` method that calculates bounding box overlaps and sets `is_contested = true` on intersecting territory layers, applying `fill: url(#pattern-stripe)`.

- [ ] **Step 3: Render Contested Conflict Drawer**

When clicking inside an overlapping contested region:
- Display both nation articles.
- Provide a `[+ Link War Article]` input and a `[🤖 AI Draft Border Conflict History]` button.

- [ ] **Step 4: Commit changes**

```bash
git add public/js/atlas-view.js public/css/styles.css
git commit -m "feat: add contested zone overlap detection and conflict lore drawer"
```

---

### Task 5: Gemini Multimodal Vision Territory Auto-Detection

**Files:**
- Modify: `server.js`
- Modify: `public/js/atlas-view.js`

**Interfaces:**
- Consumes: `POST /api/maps/:mapId/ai-auto-boundaries`, map image file, `@google/genai` vision prompt.
- Produces: Ghost Candidate Boundary objects rendered in Atlas UI.

- [ ] **Step 1: Add `POST /api/maps/:mapId/ai-auto-boundaries` endpoint in `server.js`**

Implement Gemini Vision call passing the map image file + articles summary:
```javascript
app.post('/api/maps/:mapId/ai-auto-boundaries', async (req, res) => {
  try {
    const map = db.prepare('SELECT * FROM maps WHERE id = ?').get(req.params.mapId);
    if (!map) return res.status(404).json({ error: 'Map not found' });
    
    const articles = db.prepare("SELECT id, title, category, content FROM articles WHERE category IN ('Factions & Nations', 'Geography & Landmarks', 'Races & Species')").all();
    
    // Call Gemini candidate model loop with map image base64 & prompt
    const prompt = `Analyze this fantasy world map artwork and the provided lore articles. Return a JSON object with key "territories" containing candidate territory boundaries with normalized float percentage coordinates [x_pct, y_pct] (0.0 to 1.0) covering nations or regions mentioned in the lore. Format: {"territories": [{"title": "...", "article_id": "...", "points": [[0.1, 0.2], ...], "stroke_color": "#...", "fill_color": "#..."}]}`;
    
    // Call candidate retry loop in server.js...
    const result = await generateContentWithFallback(prompt, map.image_path);
    res.json({ candidates: result.territories || [] });
  } catch (e) {
    res.status(500).json({ error: 'AI Auto-Detection failed', details: e.message });
  }
});
```

- [ ] **Step 2: Add AI Auto-Detect UI & Ghost Candidate Preview Drawer**

In `public/js/atlas-view.js`:
- Add `[🤖 Auto-Detect Borders]` toolbar button.
- Render candidate ghost polygons with dashed cyan borders.
- Provide batch import drawer with checkboxes and `[✓ Approve Candidate Boundaries]` button.

- [ ] **Step 3: Commit changes**

```bash
git add server.js public/js/atlas-view.js
git commit -m "feat: add Gemini vision territory auto-detection and ghost candidate preview"
```

---

### Task 6: Offline HTML Atlas Exporter Update & E2E Verification

**Files:**
- Modify: `public/js/atlas-view.js`
- Test: `scratch/test-atlas-territories.js`

**Interfaces:**
- Consumes: All territory and layer data.
- Produces: Single-file HTML bundle exporter containing Leaflet polygons and layer controls.

- [ ] **Step 1: Update `exportStandaloneHtml()` in `public/js/atlas-view.js`**

Include `map_layers` and `map_territories` datasets into the generated HTML script block.

- [ ] **Step 2: Run End-to-End Verification Suite**

Run: `node scratch/test-atlas-territories.js`  
Expected: PASS (All integration tests green)

- [ ] **Step 3: Commit changes**

```bash
git add public/js/atlas-view.js
git commit -m "feat: include territories and layers in offline standalone HTML exporter"
```
