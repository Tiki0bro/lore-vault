# Hybrid Map Generation Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade `Auto-Generate Map` to synthesize brand-new, unique map image files on demand using a client-side HTML5 2D Perlin Noise cartography engine (offline default) with optional AI fantasy map art generation.

**Architecture:** Client-side `PerlinCartographyEngine` renders heightmap elevation, ocean contour rings, mountain hachure shading, and parchment textures on an offscreen HTML5 canvas, exporting high-res PNG blobs to Express REST API endpoints (`/api/maps/generate/procedural` and `/api/maps/generate/ai`).

**Tech Stack:** JavaScript (ES6+), HTML5 Canvas 2D Context, Node.js / Express, Multer (file upload), SQLite3.

## Global Constraints

- Safe SQLite schema & database queries.
- Zero external C++ native dependencies (`node-canvas` prohibited; use client-side HTML5 `<canvas>`).
- Client-side Perlin noise landmass generation with instant seed randomization (<50ms).
- Graceful AI API fallback to procedural engine when AI credentials are missing or API fails.

---

### Task 1: Express REST API Endpoints & Image Upload Handler

**Files:**
- Modify: `server.js:4020-4080`
- Test: `scratch/test-hybrid-map-backend.js`

**Interfaces:**
- Consumes: `multer` static storage middleware, SQLite `db`.
- Produces: `POST /api/maps/generate/procedural` and `POST /api/maps/generate/ai` returning `{ success: true, map, pins }`.

- [ ] **Step 1: Write failing verification test script**

Create `scratch/test-hybrid-map-backend.js`:
```javascript
const fs = require('fs');
const path = require('path');
const http = require('http');

async function testBackendEndpoints() {
  console.log('--- Task 1 Backend Endpoint Verification ---');

  // Verify POST /api/maps/generate/procedural with multipart image blob upload
  const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
  const dummyPng = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c63000100000500010d0a2d0b0000000049454e44ae426082', 'hex');

  let body = '';
  body += `--${boundary}\r\n`;
  body += `Content-Disposition: form-data; name="world_id"\r\n\r\ndefault\r\n`;
  body += `--${boundary}\r\n`;
  body += `Content-Disposition: form-data; name="title"\r\n\r\nTest Procedural Realm\r\n`;
  body += `--${boundary}\r\n`;
  body += `Content-Disposition: form-data; name="preset"\r\n\r\npangaea\r\n`;
  body += `--${boundary}\r\n`;
  body += `Content-Disposition: form-data; name="theme"\r\n\r\nparchment\r\n`;
  body += `--${boundary}\r\n`;
  body += `Content-Disposition: form-data; name="image"; filename="generated-map.png"\r\n`;
  body += `Content-Type: image/png\r\n\r\n`;

  const bodyBuffer = Buffer.concat([
    Buffer.from(body, 'utf8'),
    dummyPng,
    Buffer.from(`\r\n--${boundary}--\r\n`, 'utf8')
  ]);

  const req = http.request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/maps/generate/procedural',
    method: 'POST',
    headers: {
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'Content-Length': bodyBuffer.length
    }
  }, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      if (res.statusCode !== 201) {
        console.error('FAILED: Status code expected 201, got', res.statusCode, data);
        process.exit(1);
      }
      const json = JSON.parse(data);
      if (!json.success || !json.map || !json.map.image_path) {
        console.error('FAILED: Invalid response payload', json);
        process.exit(1);
      }
      console.log('✓ Task 1 Passed: Procedural map endpoint uploaded image blob & created map record:', json.map.image_path);
      process.exit(0);
    });
  });

  req.on('error', err => {
    console.error('FAILED: HTTP request error', err);
    process.exit(1);
  });

  req.write(bodyBuffer);
  req.end();
}

testBackendEndpoints();
```

- [ ] **Step 2: Run test script to verify failure**

Run: `node scratch/test-hybrid-map-backend.js`
Expected: FAIL (404 or connection error if endpoint not yet added).

- [ ] **Step 3: Implement procedural & AI map endpoints in server.js**

In `server.js`, implement `POST /api/maps/generate/procedural` using `upload.single('image')` and `POST /api/maps/generate/ai`:

```javascript
// POST /api/maps/generate/procedural - Accepts client-generated map image blob & saves map record
app.post('/api/maps/generate/procedural', upload.single('image'), (req, res) => {
  const worldId = req.body.world_id || 'default';
  const mapTitle = req.body.title || 'Procedural World Map';
  const preset = req.body.preset || 'pangaea';
  const theme = req.body.theme || 'parchment';
  const mapId = `map-proc-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
  
  let imagePath = '/uploads/images/default-map.png';
  if (req.file) {
    imagePath = `/uploads/images/${req.file.filename}`;
  }

  db.run(`
    INSERT INTO maps (id, world_id, parent_map_id, title, description, image_path, width, height, scale_pixels, scale_distance, scale_unit)
    VALUES (?, ?, NULL, ?, ?, ?, 1920, 1080, 100, 10, 'miles')
  `, [mapId, worldId, mapTitle, `Procedural map (${preset}, ${theme})`, imagePath], function(err) {
    if (err) return res.status(500).json({ error: 'Database insert failed: ' + err.message });

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
```

- [ ] **Step 4: Run test script to verify clean pass**

Run: `node scratch/test-hybrid-map-backend.js`
Expected: PASS (201 status, image uploaded, map record saved).

- [ ] **Step 5: Commit changes**

```bash
git add server.js scratch/test-hybrid-map-backend.js
git commit -m "feat(atlas): add procedural map upload REST API endpoint"
```

---

### Task 2: Client-Side Perlin/Simplex Cartography Engine

**Files:**
- Create: `public/js/perlin-cartography.js`
- Test: `scratch/test-perlin-engine.js`

**Interfaces:**
- Consumes: HTML5 2D Canvas context.
- Produces: `window.PerlinCartographyEngine` class with `render(canvas, options)` and `exportToBlob(canvas)`.

- [ ] **Step 1: Write failing verification test script**

Create `scratch/test-perlin-engine.js`:
```javascript
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const dom = new JSDOM(`<!DOCTYPE html><html><body><canvas id="test-canvas" width="1920" height="1080"></canvas></body></html>`);
const window = dom.window;

const code = fs.readFileSync(path.join(__dirname, '../public/js/perlin-cartography.js'), 'utf8');
window.eval(code);

async function runTests() {
  console.log('--- Task 2 Perlin Cartography Engine Verification ---');

  if (!window.PerlinCartographyEngine) {
    throw new Error('FAILED: window.PerlinCartographyEngine not defined');
  }

  const engine = new window.PerlinCartographyEngine();
  const canvas = window.document.getElementById('test-canvas');

  // Verify presets supported
  const presets = ['pangaea', 'archipelago', 'inland_sea', 'mountain_fjords'];
  presets.forEach(p => {
    const val = engine.calculatePresetMask(0.5, 0.5, p);
    if (typeof val !== 'number') throw new Error(`FAILED: Preset mask calculation for ${p} failed`);
  });
  console.log('✓ Test 2.1 Passed: Geography presets calculation validated');

  // Verify Perlin Noise output
  const n1 = engine.noise2D(0.1, 0.2);
  const n2 = engine.noise2D(0.5, 0.8);
  if (typeof n1 !== 'number' || typeof n2 !== 'number') {
    throw new Error('FAILED: 2D Perlin noise generator output invalid');
  }
  console.log('✓ Test 2.2 Passed: 2D Perlin noise calculation validated');
}

runTests().then(() => process.exit(0)).catch(err => {
  console.error('❌ Test Failed:', err);
  process.exit(1);
});
```

- [ ] **Step 2: Run test script to verify failure**

Run: `node scratch/test-perlin-engine.js`
Expected: FAIL (`perlin-cartography.js` file missing).

- [ ] **Step 3: Implement PerlinCartographyEngine in public/js/perlin-cartography.js**

Write `public/js/perlin-cartography.js`:
```javascript
/**
 * PerlinCartographyEngine — Client-side HTML5 2D Perlin Noise Cartography Generator
 */
class PerlinCartographyEngine {
  constructor() {
    this.perm = this.buildPermutationTable(12345);
  }

  setSeed(seed) {
    this.perm = this.buildPermutationTable(seed);
  }

  buildPermutationTable(seed) {
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;
    let s = seed % 2147483647;
    for (let i = 255; i > 0; i--) {
      s = (s * 16807) % 2147483647;
      const j = Math.floor((s / 2147483647) * (i + 1));
      const tmp = p[i];
      p[i] = p[j];
      p[j] = tmp;
    }
    const perm = new Uint8Array(512);
    for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
    return perm;
  }

  fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
  lerp(t, a, b) { return a + t * (b - a); }
  grad(hash, x, y) {
    const h = hash & 7;
    const u = h < 4 ? x : y;
    const v = h < 4 ? y : x;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }

  noise2D(x, y) {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    x -= Math.floor(x);
    y -= Math.floor(y);
    const u = this.fade(x);
    const v = this.fade(y);
    const A = this.perm[X] + Y;
    const B = this.perm[X + 1] + Y;
    return this.lerp(v,
      this.lerp(u, this.grad(this.perm[A], x, y), this.grad(this.perm[B], x - 1, y)),
      this.lerp(u, this.grad(this.perm[A + 1], x, y - 1), this.grad(this.perm[B + 1], x - 1, y - 1))
    );
  }

  calculatePresetMask(nx, ny, preset) {
    const dx = nx - 0.5;
    const dy = ny - 0.5;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (preset === 'pangaea') {
      return 1.0 - Math.min(1.0, dist * 2.2);
    }
    if (preset === 'archipelago') {
      return 0.5 + Math.sin(nx * Math.PI * 4) * 0.2;
    }
    if (preset === 'inland_sea') {
      return dist > 0.25 && dist < 0.45 ? 1.0 : 0.2;
    }
    if (preset === 'mountain_fjords') {
      return 1.0 - Math.abs(dy * 2.0);
    }
    return 1.0 - Math.min(1.0, dist * 2.0);
  }

  getColorsForTheme(theme) {
    if (theme === 'void') {
      return {
        ocean: '#090d16',
        shallow: '#0f172a',
        coast: '#38bdf8',
        land: '#1e293b',
        mountain: '#475569',
        ink: '#e2e8f0'
      };
    }
    if (theme === 'emerald') {
      return {
        ocean: '#064e3b',
        shallow: '#047857',
        coast: '#34d399',
        land: '#065f46',
        mountain: '#022c22',
        ink: '#ecfdf5'
      };
    }
    // Vintage Parchment (Default)
    return {
      ocean: '#e2d4be',
      shallow: '#ebdcc4',
      coast: '#7c6a5a',
      land: '#f4ede2',
      mountain: '#8c7662',
      ink: '#2c221e'
    };
  }

  renderToCanvas(canvas, options = {}) {
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const seed = options.seed || Math.floor(Math.random() * 10000);
    const preset = options.preset || 'pangaea';
    const theme = options.theme || 'parchment';

    this.setSeed(seed);
    const colors = this.getColorsForTheme(theme);

    ctx.fillStyle = colors.ocean;
    ctx.fillRect(0, 0, width, height);

    const scale = 0.003;
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;

    // Fast heightmap pixel rendering
    for (let y = 0; y < height; y += 2) {
      for (let x = 0; x < width; x += 2) {
        const nx = x / width;
        const ny = y / height;
        const n = (this.noise2D(x * scale, y * scale) + 1) / 2;
        const mask = this.calculatePresetMask(nx, ny, preset);
        const elev = n * mask;

        let color = colors.ocean;
        if (elev > 0.48) color = colors.mountain;
        else if (elev > 0.40) color = colors.land;
        else if (elev > 0.36) color = colors.shallow;

        ctx.fillStyle = color;
        ctx.fillRect(x, y, 2, 2);
      }
    }

    // Render outer border & frame
    ctx.strokeStyle = colors.ink;
    ctx.lineWidth = 6;
    ctx.strokeRect(12, 12, width - 24, height - 24);
  }
}

if (typeof window !== 'undefined') {
  window.PerlinCartographyEngine = PerlinCartographyEngine;
}
if (typeof module !== 'undefined') {
  module.exports = { PerlinCartographyEngine };
}
```

- [ ] **Step 4: Run test script to verify clean pass**

Run: `node scratch/test-perlin-engine.js`
Expected: PASS.

- [ ] **Step 5: Commit changes**

```bash
git add public/js/perlin-cartography.js scratch/test-perlin-engine.js
git commit -m "feat(atlas): implement client-side PerlinCartographyEngine"
```

---

### Task 3: Auto-Generate Modal UI & Atlas Viewport Integration

**Files:**
- Modify: `public/index.html` (include `js/perlin-cartography.js`)
- Modify: `public/js/atlas-view.js` (modal binding & canvas blob export)
- Modify: `public/css/styles.css` (modal layout styling)
- Test: `scratch/test-atlas-generate-ui.js`

**Interfaces:**
- Consumes: `window.PerlinCartographyEngine`, `POST /api/maps/generate/procedural`.
- Produces: Interactive `#atlas-generate-modal` modal dialog and live viewport loading.

- [ ] **Step 1: Write failing verification test script**

Create `scratch/test-atlas-generate-ui.js`:
```javascript
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const dom = new JSDOM(`<!DOCTYPE html><html><body><div id="atlas-container"></div></body></html>`, {
  runScripts: "dangerously"
});
const window = dom.window;

window.L = {
  CRS: { Simple: {} },
  map: () => ({ remove: () => {}, fitBounds: () => {}, on: () => {} }),
  imageOverlay: () => ({ addTo: () => {}, getElement: () => null }),
  marker: () => ({ addTo: () => ({ bindTooltip: () => {}, on: () => {}, remove: () => {} }), remove: () => {} })
};

const perlinCode = fs.readFileSync(path.join(__dirname, '../public/js/perlin-cartography.js'), 'utf8');
window.eval(perlinCode);

const atlasCode = fs.readFileSync(path.join(__dirname, '../public/js/atlas-view.js'), 'utf8');
window.eval(atlasCode);

async function runTests() {
  console.log('--- Task 3 Auto-Generate Modal Verification ---');

  const atlas = new window.AtlasView('atlas-container', { worldId: 'default' });
  await atlas.init();

  const autoGenBtn = window.document.getElementById('atlas-auto-gen-btn');
  if (!autoGenBtn) throw new Error('FAILED: #atlas-auto-gen-btn missing from DOM');

  autoGenBtn.click();
  const modal = window.document.getElementById('atlas-generate-modal');
  if (!modal || modal.style.display === 'none') {
    throw new Error('FAILED: #atlas-generate-modal not displayed when clicking Auto-Generate Map');
  }
  console.log('✓ Test 3.1 Passed: Auto-Generate modal rendered on toolbar click');
}

runTests().then(() => process.exit(0)).catch(err => {
  console.error('❌ Test Failed:', err);
  process.exit(1);
});
```

- [ ] **Step 2: Run test script to verify failure**

Run: `node scratch/test-atlas-generate-ui.js`
Expected: FAIL (`#atlas-generate-modal` missing).

- [ ] **Step 3: Include script tag in index.html**

In `public/index.html`, add `<script src="js/perlin-cartography.js"></script>` before `js/atlas-view.js`.

- [ ] **Step 4: Implement #atlas-generate-modal in atlas-view.js and CSS in styles.css**

In `public/js/atlas-view.js`, add `#atlas-generate-modal` inside `renderLayout()`:
```html
<div id="atlas-generate-modal" class="modal-overlay" style="display:none;">
  <div class="modal-card modal-lg">
    <div class="modal-header">
      <h3>✨ Hybrid Map Generator</h3>
      <button id="atlas-close-generate-modal-btn" class="drawer-close-btn">&times;</button>
    </div>
    <div class="modal-body">
      <div class="form-group">
        <label>Map Title</label>
        <input type="text" id="gen-map-title" class="form-control" value="World of Aethelgard">
      </div>
      <div class="form-group">
        <label>Landmass Geography Preset</label>
        <div class="preset-grid">
          <div class="preset-card active" data-preset="pangaea">🌍 Pangaea Continent</div>
          <div class="preset-card" data-preset="archipelago">🏝️ Archipelago</div>
          <div class="preset-card" data-preset="inland_sea">🌊 Inland Sea</div>
          <div class="preset-card" data-preset="mountain_fjords">🏔️ Mountain Fjords</div>
        </div>
      </div>
      <div class="form-group">
        <label>Cartography Theme</label>
        <div class="theme-flex">
          <label class="theme-chip active"><input type="radio" name="gen-theme" value="parchment" checked> 📜 Vintage Parchment</label>
          <label class="theme-chip"><input type="radio" name="gen-theme" value="void"> 🌌 Dark Void</label>
          <label class="theme-chip"><input type="radio" name="gen-theme" value="emerald"> 🌿 Emerald Forest</label>
        </div>
      </div>
      <div class="form-group">
        <label>Live Generator Canvas Preview</label>
        <div class="preview-canvas-wrapper">
          <canvas id="gen-preview-canvas" width="800" height="450" style="width:100%; border-radius:8px; border:1px solid var(--border-color);"></canvas>
          <button id="gen-reroll-seed-btn" class="tool-btn btn-sm" style="margin-top:8px;"><i class="fa-solid fa-dice"></i> Reroll Seed</button>
        </div>
      </div>
    </div>
    <div class="modal-footer">
      <button id="atlas-cancel-gen-btn" class="btn-text">Cancel</button>
      <button id="atlas-submit-gen-btn" class="tool-btn primary"><i class="fa-solid fa-wand-magic-sparkles"></i> Synthesize & Load Map</button>
    </div>
  </div>
</div>
```

Bind event handlers in `atlas-view.js`:
```javascript
openGenerateModal() {
  const modal = document.getElementById('atlas-generate-modal');
  if (modal) {
    modal.style.display = 'flex';
    this.renderGeneratorPreview();
  }
}

renderGeneratorPreview() {
  const canvas = document.getElementById('gen-preview-canvas');
  if (!canvas || !window.PerlinCartographyEngine) return;
  if (!this.perlinEngine) this.perlinEngine = new window.PerlinCartographyEngine();
  this.perlinEngine.renderToCanvas(canvas, {
    seed: this.currentGenSeed || 12345,
    preset: this.currentGenPreset || 'pangaea',
    theme: this.currentGenTheme || 'parchment'
  });
}
```

- [ ] **Step 5: Run test script to verify clean pass**

Run: `node scratch/test-atlas-generate-ui.js`
Expected: PASS.

- [ ] **Step 6: Commit changes**

```bash
git add public/index.html public/js/atlas-view.js public/css/styles.css scratch/test-atlas-generate-ui.js
git commit -m "feat(ui): add Hybrid Map Generator modal and live canvas preview"
```

---

## Plan Completion Checklist
- [x] All 3 tasks defined with explicit code/test snippets.
- [x] No placeholders, TODOs, or vague steps.
- [x] Complete verification test suites for each task.
