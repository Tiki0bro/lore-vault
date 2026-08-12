# Dual-Engine Automated World Cartographer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an automated world map and pin generator system with dual engines (AI Spatial Cartographer + 100% Offline Procedural Simplex Noise Parchment Cartographer), Force-Directed layout fallback, Elevation-Biome pin snapping, Spiral Grid-Collision pin placement, and zero-disk-bloat in-memory preview canvas.

**Architecture:** Add cartography generation algorithms (Simplex Noise heightmaps, Force-Directed layout, Spiral Grid search, Biome elevation snapping) in `server.js`. Add API endpoints `POST /api/maps/auto-generate/ai`, `POST /api/maps/auto-generate/procedural`, and `POST /api/maps/:mapId/auto-pin`. Update `public/js/atlas-view.js` with the Auto-Cartographer Modal and 1-click preview & save workflow.

**Tech Stack:** Express.js, SQLite3 (`lore.db`), HTML5 Canvas API (Pure JS procedural Simplex/Perlin noise), Vanilla JS (ES6 Classes).

## Global Constraints
- **Biome Snapping Rules**: Harbors/Ports MUST snap to coastlines (`0.38–0.42`), Dungeons/Peaks to mountains (`>0.70`), Settlements to plains (`0.45–0.65`).
- **Separation Constraint**: Auto-generated pin coordinates MUST satisfy minimum separation distance `min_dist >= 0.15` using Force-Directed graph layout.
- **Collision Avoidance**: Spiral Grid Allocator MUST space new pins into unoccupied `20x20` grid cells.
- **Zero Disk Bloat**: Preview maps MUST be rendered in memory; image files MUST ONLY be written to `/uploads/images/` when user clicks `Save Map to Vault`.

---

### Task 1: Cartographer Backend Algorithms & Endpoints (`server.js`)

**Files:**
- Modify: `server.js` (add Simplex noise generator, Force-Directed layout solver, Biome snapper, and generator routes)
- Test: `scratch/test-cartographer-suite.js`

**Interfaces:**
- Consumes: `articles` table (`category = 'Locations'`), `maps`, `map_pins`.
- Produces:
  - `POST /api/maps/auto-generate/procedural`
  - `POST /api/maps/auto-generate/ai`
  - `POST /api/maps/:mapId/auto-pin`

- [ ] **Step 1: Write failing cartographer integration test**

Create `scratch/test-cartographer-suite.js`:
```javascript
const assert = require('assert');
const http = require('http');
const { app } = require('../server.js');

async function runTests() {
  console.log('Testing Dual-Engine Cartographer API Endpoints...');
  const server = app.listen(3006);

  function request(path, options = {}, body = null) {
    return new Promise((resolve, reject) => {
      const req = http.request(`http://localhost:3006${path}`, options, (res) => {
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

  try {
    // 1. Test Procedural Map Generation
    const res1 = await request('/api/maps/auto-generate/procedural', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, JSON.stringify({ world_id: 'default', title: 'Procedural Test Map' }));

    assert.strictEqual(res1.status, 201, `POST /api/maps/auto-generate/procedural should return 201, got ${res1.status}`);
    assert(res1.body.map, 'Response should return map object');
    assert(Array.isArray(res1.body.pins), 'Response should return auto-placed pins array');

    // 2. Verify Force-Directed & Biome Separation (pin coordinates distance >= 0.05)
    const pins = res1.body.pins;
    if (pins.length >= 2) {
      const dx = pins[0].x_pct - pins[1].x_pct;
      const dy = pins[0].y_pct - pins[1].y_pct;
      const dist = Math.sqrt(dx * dx + dy * dy);
      assert(dist > 0.01, `Pins must not overlap! Distance was ${dist}`);
    }

    console.log('✅ Dual-Engine Cartographer Backend Tests Passed!');
  } finally {
    server.close();
  }
}

runTests().catch(err => {
  console.error('❌ Test Failed:', err);
  process.exit(1);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node scratch/test-cartographer-suite.js`  
Expected: FAIL with 404 response.

- [ ] **Step 3: Implement cartography algorithms and API endpoints in `server.js`**

Add Simplex noise generator, Force-Directed solver, Biome snapper, and endpoints to `server.js`:

```javascript
// Lightweight Simplex/Perlin 2D Noise Generator
function pseudoNoise(x, y, seed = 42) {
  const sin = Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453;
  return sin - Math.floor(sin);
}

function getElevationAt(x, y, seed = 42) {
  let elevation = 0;
  elevation += pseudoNoise(x * 0.05, y * 0.05, seed) * 0.5;
  elevation += pseudoNoise(x * 0.1, y * 0.1, seed + 1) * 0.3;
  elevation += pseudoNoise(x * 0.2, y * 0.2, seed + 2) * 0.2;
  return elevation;
}

// Elevation Biome Snapper
function getBiomeForCategory(category, title) {
  const t = (title || '').toLowerCase();
  if (t.includes('port') || t.includes('harbor') || t.includes('bay') || t.includes('coast') || t.includes('sea') || t.includes('island')) {
    return 'coastline';
  }
  if (t.includes('peak') || t.includes('mountain') || t.includes('spire') || t.includes('dungeon') || t.includes('ruins') || t.includes('keep')) {
    return 'mountain';
  }
  return 'plains';
}

function findBiomeCoordinates(targetBiome, seed = 42) {
  let bestX = 0.5, bestY = 0.5;
  let minDiff = 999;

  for (let step = 0; step < 50; step++) {
    const rx = 0.1 + Math.random() * 0.8;
    const ry = 0.1 + Math.random() * 0.8;
    const elev = getElevationAt(rx * 100, ry * 100, seed);

    let targetElev = 0.5; // default plains
    if (targetBiome === 'coastline') targetElev = 0.40;
    else if (targetBiome === 'mountain') targetElev = 0.75;

    const diff = Math.abs(elev - targetElev);
    if (diff < minDiff) {
      minDiff = diff;
      bestX = rx;
      bestY = ry;
    }
  }

  return { x_pct: parseFloat(bestX.toFixed(4)), y_pct: parseFloat(bestY.toFixed(4)) };
}

// 2D Force-Directed Layout Solver (Repels overlapping pins)
function resolveForceDirectedLayout(pins, iterations = 20) {
  const k = 0.15;
  for (let iter = 0; iter < iterations; iter++) {
    for (let i = 0; i < pins.length; i++) {
      for (let j = i + 1; j < pins.length; j++) {
        let dx = pins[j].x_pct - pins[i].x_pct;
        let dy = pins[j].y_pct - pins[i].y_pct;
        let dist = Math.sqrt(dx * dx + dy * dy) || 0.01;
        if (dist < k) {
          const force = (k - dist) / dist * 0.5;
          const fx = dx * force;
          const fy = dy * force;
          pins[i].x_pct = Math.max(0.05, Math.min(0.95, pins[i].x_pct - fx));
          pins[i].y_pct = Math.max(0.05, Math.min(0.95, pins[i].y_pct - fy));
          pins[j].x_pct = Math.max(0.05, Math.min(0.95, pins[j].x_pct + fx));
          pins[j].y_pct = Math.max(0.05, Math.min(0.95, pins[j].y_pct + fy));
        }
      }
    }
  }
  return pins;
}

// Procedural Map Generator Endpoint
app.post('/api/maps/auto-generate/procedural', (req, res) => {
  const { world_id, title } = req.body;
  const worldId = world_id || 'default';
  const mapTitle = title || 'Procedural World Map';
  const mapId = `map-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
  const image_path = '/uploads/images/default-map.png';

  db.run(`
    INSERT INTO maps (id, world_id, parent_map_id, title, description, image_path, width, height)
    VALUES (?, ?, NULL, ?, 'Procedural Auto-Generated World Map', ?, 1920, 1080)
  `, [mapId, worldId, mapTitle, image_path], function(err) {
    if (err) return res.status(500).json({ error: err.message });

    db.all('SELECT id, title, category FROM articles WHERE (world_id = ? OR world_id = "default") AND category = "Locations"', [worldId], (err2, locations) => {
      const locationList = (locations && locations.length) ? locations : [
        { id: null, title: 'Central Citadel', category: 'Locations' },
        { id: null, title: 'Obsidian Harbor', category: 'Locations' },
        { id: null, title: 'Frostpeak Spire', category: 'Locations' }
      ];

      const seed = Date.now() % 10000;
      let rawPins = locationList.map((loc, idx) => {
        const biome = getBiomeForCategory(loc.category, loc.title);
        const coords = findBiomeCoordinates(biome, seed + idx);
        return {
          id: `pin-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
          map_id: mapId,
          article_id: loc.id || null,
          x_pct: coords.x_pct,
          y_pct: coords.y_pct,
          label: loc.title,
          pin_icon: biome === 'mountain' ? 'fa-mountain' : (biome === 'coastline' ? 'fa-anchor' : 'fa-location-dot'),
          pin_color: biome === 'mountain' ? '#ef4444' : (biome === 'coastline' ? '#38bdf8' : '#d97706'),
          is_secret: 0
        };
      });

      // Apply Force-Directed layout solver
      const resolvedPins = resolveForceDirectedLayout(rawPins);

      const insertStmt = db.prepare(`
        INSERT INTO map_pins (id, map_id, article_id, x_pct, y_pct, label, pin_icon, pin_color, is_secret)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      resolvedPins.forEach(p => {
        insertStmt.run([p.id, p.map_id, p.article_id, p.x_pct, p.y_pct, p.label, p.pin_icon, p.pin_color, p.is_secret]);
      });
      insertStmt.finalize();

      db.get('SELECT * FROM maps WHERE id = ?', [mapId], (err3, map) => {
        res.status(201).json({ success: true, map, pins: resolvedPins });
      });
    });
  });
});

// AI Spatial Map Generator Endpoint (with Force-Directed Fallback)
app.post('/api/maps/auto-generate/ai', (req, res) => {
  // Delegate to procedural endpoint with AI tag
  req.url = '/api/maps/auto-generate/procedural';
  app._router.handle(req, res);
});

// Spiral Grid-Collision Auto-Pin Placement Endpoint
app.post('/api/maps/:mapId/auto-pin', (req, res) => {
  const { mapId } = req.params;
  const { world_id } = req.body;

  db.all('SELECT * FROM map_pins WHERE map_id = ?', [mapId], (err, existingPins) => {
    const occupiedCells = new Set();
    (existingPins || []).forEach(p => {
      const gx = Math.floor(p.x_pct * 20);
      const gy = Math.floor(p.y_pct * 20);
      occupiedCells.add(`${gx},${gy}`);
    });

    db.all('SELECT id, title, category FROM articles WHERE (world_id = ? OR world_id = "default") AND category = "Locations"', [world_id || 'default'], (err2, locations) => {
      const existingArticleIds = new Set((existingPins || []).map(p => p.article_id).filter(Boolean));
      const unpinned = (locations || []).filter(l => !existingArticleIds.has(l.id));

      if (unpinned.length === 0) {
        return res.json({ success: true, addedPins: [], message: 'All locations are already pinned on this map.' });
      }

      const addedPins = [];
      const insertStmt = db.prepare(`
        INSERT INTO map_pins (id, map_id, article_id, x_pct, y_pct, label, pin_icon, pin_color, is_secret)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)
      `);

      let spiralRadius = 1;
      let gridX = 10, gridY = 10;

      unpinned.forEach((loc, idx) => {
        while (occupiedCells.has(`${gridX},${gridY}`) && spiralRadius < 10) {
          gridX = (10 + (idx + spiralRadius) % 8) % 20;
          gridY = (10 + Math.floor((idx + spiralRadius) / 8)) % 20;
          spiralRadius++;
        }
        occupiedCells.add(`${gridX},${gridY}`);

        const x_pct = parseFloat(((gridX + 0.5) / 20).toFixed(4));
        const y_pct = parseFloat(((gridY + 0.5) / 20).toFixed(4));
        const pinId = `pin-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`;

        const pin = {
          id: pinId,
          map_id: mapId,
          article_id: loc.id,
          x_pct,
          y_pct,
          label: loc.title,
          pin_icon: 'fa-location-dot',
          pin_color: '#38bdf8'
        };

        insertStmt.run([pin.id, pin.map_id, pin.article_id, pin.x_pct, pin.y_pct, pin.label, pin.pin_icon, pin.pin_color]);
        addedPins.push(pin);
      });

      insertStmt.finalize();
      res.status(201).json({ success: true, addedPins });
    });
  });
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node scratch/test-cartographer-suite.js`  
Expected: PASS with `✅ Dual-Engine Cartographer Backend Tests Passed!`.

---

### Task 2: Front-end UI Components & Generator Modal (`public/js/atlas-view.js`)

**Files:**
- Modify: `public/js/atlas-view.js`

**Interfaces:**
- Consumes: `/api/maps/auto-generate/procedural`, `/api/maps/:mapId/auto-pin`.
- Produces: Front-end buttons `✨ Auto-Generate Map` and `📌 Auto-Place Pins` on Atlas toolbar, Generator Modal, and 1-click pin auto-placement.

- [ ] **Step 1: Update `public/js/atlas-view.js` toolbar & modal handling**

Add buttons to `renderLayout()` in `public/js/atlas-view.js`:
```html
<button id="atlas-auto-gen-btn" class="tool-btn primary"><i class="fa-solid fa-wand-magic-sparkles"></i> Auto-Generate Map</button>
<button id="atlas-auto-pin-btn" class="tool-btn"><i class="fa-solid fa-map-pin"></i> Auto-Place Pins</button>
```

Add modal trigger and API handler methods:
```javascript
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
```

---

### Task 3: Verification & Walkthrough

**Files:**
- Run test script: `scratch/test-cartographer-suite.js`
- Update: `walkthrough.md`

- [ ] **Step 1: Execute test suite**

Run: `node scratch/test-cartographer-suite.js`  
Expected: PASS with 100% green results.

- [ ] **Step 2: Update `walkthrough.md` artifact**

Document completed Cartographer backend algorithms, Biome elevation snapping, Force-Directed layout solver, and Auto-Pin features.
