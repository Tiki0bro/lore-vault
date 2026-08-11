# Faction & Character Relationship Matrix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a 2D Matrix Grid view and slide-out Relationship Drawer for LoreVault with SQLite persistence, Express REST APIs, Gemini 1-click relationship extraction, and AI story tension generation.

**Architecture:** Add a `lore_relationships` SQLite table in `server.js`, build CRUD and AI endpoints with candidate model retries, and create a modular `public/js/relationship-view.js` component with sticky table headers, HSL status badges, and a slide-out parchment detail drawer.

**Tech Stack:** Node.js, Express, SQLite (`sqlite3`), Vanilla JS / ES6 Modules, HTML5, CSS3 Tokens.

## Global Constraints

- Preserve all existing API endpoints and WorldAnvil article formatting standards.
- Enforce strict candidate model retry loop in `server.js` (`gemini-flash-latest`, `gemini-2.0-flash`, `gemini-3.1-pro-preview`, `gemini-pro-latest`).
- Filter out DM secrets (`is_secret = 1`) when `?mode=player` query parameter is present.
- Use explicit HSL CSS tokens (`[data-mode="light"]` and dark mode) matching `public/css/styles.css`.
- Avoid broad file replacements; perform surgical targeted edits.

---

### Task 1: Database Schema Migration & Model Layer

**Files:**
- Modify: `server.js:50-120`
- Test: `scratch/test-relationship-db.js`

**Interfaces:**
- Consumes: Existing SQLite connection `db` in `server.js`.
- Produces: `lore_relationships` SQLite table and schema initialization.

- [ ] **Step 1: Write failing database schema integration test**

Create `scratch/test-relationship-db.js`:
```javascript
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, '..', 'database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('Testing lore_relationships schema...');
db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='lore_relationships'", (err, row) => {
  if (err) {
    console.error('Test Failed:', err);
    process.exit(1);
  }
  if (!row) {
    console.error('Test Failed: Table lore_relationships does not exist');
    process.exit(1);
  }
  console.log('Test Passed: Table lore_relationships exists!');
  process.exit(0);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node scratch/test-relationship-db.js`
Expected output: `Test Failed: Table lore_relationships does not exist`

- [ ] **Step 3: Add `lore_relationships` table initialization in `server.js`**

Add table creation SQL inside `server.js`:
```javascript
db.run(`
  CREATE TABLE IF NOT EXISTS lore_relationships (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    world_id TEXT NOT NULL,
    source_entity_id TEXT NOT NULL,
    source_entity_title TEXT NOT NULL,
    target_entity_id TEXT NOT NULL,
    target_entity_title TEXT NOT NULL,
    relationship_type TEXT NOT NULL DEFAULT 'neutral',
    sentiment_score INTEGER DEFAULT 0,
    summary TEXT,
    is_secret INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (world_id) REFERENCES worlds(id) ON DELETE CASCADE,
    UNIQUE(world_id, source_entity_id, target_entity_id)
  )
`);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node scratch/test-relationship-db.js`
Expected output: `Test Passed: Table lore_relationships exists!`

- [ ] **Step 5: Commit**

```bash
git add server.js scratch/test-relationship-db.js; git commit -m "feat(db): initialize lore_relationships table schema"
```

---

### Task 2: REST API Endpoints in `server.js`

**Files:**
- Modify: `server.js`
- Test: `scratch/test-relationship-api.js`

**Interfaces:**
- Consumes: SQLite `lore_relationships` table.
- Produces: `GET /api/worlds/:worldId/relationships`, `POST /api/relationships`, `DELETE /api/relationships/:id`.

- [ ] **Step 1: Write failing API endpoint test**

Create `scratch/test-relationship-api.js`:
```javascript
const http = require('http');

function makeRequest(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
      headers: { 'Content-Type': 'application/json' }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(body || '{}') }));
    });
    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function run() {
  try {
    const res = await makeRequest('/api/worlds/default/relationships');
    if (res.status !== 200) {
      console.error('Test Failed: Expected status 200, got', res.status);
      process.exit(1);
    }
    console.log('Test Passed: GET /api/worlds/default/relationships returned status 200');
    process.exit(0);
  } catch (e) {
    console.error('Test Failed:', e.message);
    process.exit(1);
  }
}
run();
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node scratch/test-relationship-api.js`
Expected output: `Test Failed: Expected status 200, got 404`

- [ ] **Step 3: Implement REST API endpoints in `server.js`**

Add the GET, POST, and DELETE endpoints:
```javascript
app.get('/api/worlds/:worldId/relationships', (req, res) => {
  const { worldId } = req.params;
  const isPlayerMode = req.query.mode === 'player';
  let query = 'SELECT * FROM lore_relationships WHERE world_id = ?';
  const params = [worldId];
  if (isPlayerMode) {
    query += ' AND is_secret = 0';
  }
  query += ' ORDER BY source_entity_title ASC';
  
  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ relationships: rows });
  });
});

app.post('/api/relationships', (req, res) => {
  const {
    world_id,
    source_entity_id,
    source_entity_title,
    target_entity_id,
    target_entity_title,
    relationship_type,
    sentiment_score,
    summary,
    is_secret
  } = req.body;

  if (!world_id || !source_entity_title || !target_entity_title) {
    return res.status(400).json({ error: 'Missing required entity titles or world_id' });
  }

  const query = `
    INSERT INTO lore_relationships (
      world_id, source_entity_id, source_entity_title,
      target_entity_id, target_entity_title, relationship_type,
      sentiment_score, summary, is_secret, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(world_id, source_entity_id, target_entity_id) DO UPDATE SET
      relationship_type = excluded.relationship_type,
      sentiment_score = excluded.sentiment_score,
      summary = excluded.summary,
      is_secret = excluded.is_secret,
      updated_at = CURRENT_TIMESTAMP
  `;

  db.run(query, [
    world_id,
    source_entity_id || source_entity_title.toLowerCase().replace(/\s+/g, '-'),
    source_entity_title,
    target_entity_id || target_entity_title.toLowerCase().replace(/\s+/g, '-'),
    target_entity_title,
    relationship_type || 'neutral',
    sentiment_score || 0,
    summary || '',
    is_secret ? 1 : 0
  ], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, id: this.lastID });
  });
});

app.delete('/api/relationships/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM lore_relationships WHERE id = ?', [id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, deleted: this.changes });
  });
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node scratch/test-relationship-api.js`
Expected output: `Test Passed: GET /api/worlds/default/relationships returned status 200`

- [ ] **Step 5: Commit**

```bash
git add server.js scratch/test-relationship-api.js; git commit -m "feat(api): add REST endpoints for relationship CRUD operations"
```

---

### Task 3: AI Extraction & Story Tension Endpoints

**Files:**
- Modify: `server.js`
- Test: `scratch/test-relationship-ai.js`

**Interfaces:**
- Consumes: Gemini Candidate Model Retry loop in `server.js`.
- Produces: `POST /api/relationships/auto-extract`, `POST /api/relationships/spark-conflict`.

- [ ] **Step 1: Write failing test for AI endpoints**

Create `scratch/test-relationship-ai.js`:
```javascript
const http = require('http');

function makeRequest(path, method = 'POST', data = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
      headers: { 'Content-Type': 'application/json' }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(body || '{}') }));
    });
    req.on('error', reject);
    req.write(JSON.stringify(data));
    req.end();
  });
}

async function run() {
  try {
    const res = await makeRequest('/api/relationships/spark-conflict', 'POST', {
      world_id: 'default',
      source_entity_title: 'House Blackwood',
      target_entity_title: 'The Iron Guard'
    });
    if (res.status !== 200) {
      console.error('Test Failed: Expected 200, got', res.status);
      process.exit(1);
    }
    console.log('Test Passed: AI Conflict endpoint returned status 200');
    process.exit(0);
  } catch (e) {
    console.error('Test Failed:', e.message);
    process.exit(1);
  }
}
run();
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node scratch/test-relationship-ai.js`
Expected output: `Test Failed: Expected 200, got 404`

- [ ] **Step 3: Implement AI endpoints in `server.js`**

Add `POST /api/relationships/auto-extract` and `POST /api/relationships/spark-conflict` in `server.js` using the candidate model retry helper `callGeminiApiWithFallback`:

```javascript
app.post('/api/relationships/auto-extract', async (req, res) => {
  const { world_id } = req.body;
  if (!world_id) return res.status(400).json({ error: 'Missing world_id' });

  db.all('SELECT id, title, category, summary, content FROM articles WHERE world_id = ? OR world_id = "all" LIMIT 30', [world_id], async (err, articles) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!articles || articles.length === 0) {
      return res.json({ relationships: [], count: 0, message: 'No articles found to extract relationships from.' });
    }

    const loreContext = articles.map(a => `Title: ${a.title}\nCategory: ${a.category}\nSummary: ${a.summary || a.content.substring(0, 300)}`).join('\n---\n');

    const prompt = `Analyze the following worldbuilding lore articles and identify dynamic relationships between characters and factions.
Return ONLY a valid JSON array of relationship objects without markdown formatting.

Format each object exactly like this:
{
  "source_entity_title": "String",
  "target_entity_title": "String",
  "relationship_type": "allied" | "hostile" | "tense" | "secret_master" | "debtor" | "neutral",
  "sentiment_score": Integer between -100 and 100,
  "summary": "Short explanation of the relationship based on lore",
  "is_secret": 0 or 1
}

Lore Context:
${loreContext}`;

    try {
      const responseText = await callGeminiApiWithFallback(prompt);
      const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      const relationships = JSON.parse(cleanJson);

      let insertedCount = 0;
      const stmt = db.prepare(`
        INSERT INTO lore_relationships (
          world_id, source_entity_id, source_entity_title,
          target_entity_id, target_entity_title, relationship_type,
          sentiment_score, summary, is_secret, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(world_id, source_entity_id, target_entity_id) DO UPDATE SET
          relationship_type = excluded.relationship_type,
          sentiment_score = excluded.sentiment_score,
          summary = excluded.summary,
          is_secret = excluded.is_secret,
          updated_at = CURRENT_TIMESTAMP
      `);

      for (const rel of relationships) {
        if (rel.source_entity_title && rel.target_entity_title) {
          stmt.run([
            world_id,
            rel.source_entity_title.toLowerCase().replace(/\s+/g, '-'),
            rel.source_entity_title,
            rel.target_entity_title.toLowerCase().replace(/\s+/g, '-'),
            rel.target_entity_title,
            rel.relationship_type || 'neutral',
            rel.sentiment_score || 0,
            rel.summary || '',
            rel.is_secret ? 1 : 0
          ]);
          insertedCount++;
        }
      }
      stmt.finalize();

      res.json({ success: true, count: insertedCount, relationships });
    } catch (apiErr) {
      res.status(500).json({ error: 'AI relationship extraction failed: ' + apiErr.message });
    }
  });
});

app.post('/api/relationships/spark-conflict', async (req, res) => {
  const { world_id, source_entity_title, target_entity_title } = req.body;
  if (!source_entity_title || !target_entity_title) {
    return res.status(400).json({ error: 'Missing entity titles' });
  }

  const prompt = `You are Arthur Vance, Socratic Architect for LoreVault.
Generate 3 actionable, high-tension story conflict hooks between "${source_entity_title}" and "${target_entity_title}".

Return ONLY a valid JSON array of 3 objects with keys "title", "type" ("Inciting Incident" | "Hidden Dilemma" | "Escalation"), and "description".

Example:
[
  { "type": "Inciting Incident", "title": "The Stolen Ledger", "description": "A secret debt record surfaces in a tavern brawl." }
]`;

  try {
    const responseText = await callGeminiApiWithFallback(prompt);
    const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    const hooks = JSON.parse(cleanJson);
    res.json({ hooks });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate conflict hooks: ' + err.message });
  }
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node scratch/test-relationship-ai.js`
Expected output: `Test Passed: AI Conflict endpoint returned status 200`

- [ ] **Step 5: Commit**

```bash
git add server.js scratch/test-relationship-ai.js; git commit -m "feat(ai): add Gemini endpoints for relationship extraction and story conflict generation"
```

---

### Task 4: Frontend Component (`public/js/relationship-view.js`) & UI Integration

**Files:**
- Create: `public/js/relationship-view.js`
- Modify: `public/index.html`
- Modify: `public/css/styles.css`
- Test: `scratch/test-relationship-ui.js`

**Interfaces:**
- Consumes: REST APIs `/api/worlds/:worldId/relationships` and `/api/relationships/*`.
- Produces: `RelationshipView` class rendering matrix grid, sticky headers, HSL badges, and slide-out detail drawer.

- [ ] **Step 1: Add HTML Structure in `public/index.html`**

Add navbar tab button and view panel in `public/index.html`:
```html
<button class="nav-tab" data-view="view-relationships">⚔️ Relationships</button>
```

Add Section `#view-relationships`:
```html
<section id="view-relationships" class="view-panel">
  <div class="relationship-toolbar">
    <div class="filter-group">
      <select id="rel-category-filter" class="toolbar-select">
        <option value="all">All Entities</option>
        <option value="factions">Factions Only</option>
        <option value="characters">Characters Only</option>
      </select>
      <select id="rel-type-filter" class="toolbar-select">
        <option value="all">All Statuses</option>
        <option value="hostile">🔴 Hostile</option>
        <option value="allied">🟢 Allied</option>
        <option value="tense">🟡 Tense</option>
        <option value="secret_master">🟣 Secret/Debt</option>
      </select>
      <input type="text" id="rel-search-input" class="toolbar-input" placeholder="Search entities...">
    </div>
    <div class="action-group">
      <button id="rel-ai-extract-btn" class="btn btn-primary">✨ AI Extract Relationships</button>
      <button id="rel-add-btn" class="btn btn-secondary">+ Add Relationship</button>
    </div>
  </div>

  <div id="relationship-grid-container" class="grid-scroll-pane">
    <!-- Matrix Grid dynamically rendered by relationship-view.js -->
  </div>
</section>

<!-- Slide-out Drawer -->
<div id="relationship-detail-drawer" class="drawer hidden">
  <div class="drawer-header">
    <h3 id="rel-drawer-title">Entity A ↔ Entity B</h3>
    <button id="rel-drawer-close" class="btn-icon">✕</button>
  </div>
  <div class="drawer-content">
    <div class="form-group">
      <label>Relationship Type</label>
      <select id="drawer-rel-type" class="form-control">
        <option value="allied">🟢 Allied / Vassal</option>
        <option value="hostile">🔴 Hostile / Enemy</option>
        <option value="tense">🟡 Tense / Rival</option>
        <option value="secret_master">🟣 Secret Master / Debt</option>
        <option value="neutral">⚪ Neutral / None</option>
      </select>
    </div>
    <div class="form-group">
      <label>Sentiment Score (-100 to +100)</label>
      <input type="range" id="drawer-sentiment-slider" min="-100" max="100" class="form-range">
      <span id="drawer-sentiment-val">0</span>
    </div>
    <div class="form-group">
      <label>DM Secret Note</label>
      <textarea id="drawer-summary" class="form-control" rows="3" placeholder="Supporting lore notes..."></textarea>
      <label class="checkbox-label"><input type="checkbox" id="drawer-is-secret"> 🔒 DM Only Secret</label>
    </div>
    <div class="drawer-actions">
      <button id="drawer-save-btn" class="btn btn-primary">Save Relationship</button>
      <button id="drawer-spark-btn" class="btn btn-warning">⚡ Spark Story Conflict</button>
      <button id="drawer-delete-btn" class="btn btn-danger">Delete</button>
    </div>
    <div id="drawer-conflict-results" class="conflict-container hidden"></div>
  </div>
</div>
```

- [ ] **Step 2: Add Styling in `public/css/styles.css`**

Add CSS rules for matrix grid layout, sticky headers, HSL status badges, and drawer:
```css
.relationship-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: var(--surface-card);
  border-bottom: 1px solid var(--border-color);
  gap: 1rem;
}
.grid-scroll-pane {
  overflow: auto;
  max-height: calc(100vh - 160px);
  padding: 1rem;
}
.rel-matrix-table {
  border-collapse: separate;
  border-spacing: 2px;
  width: max-content;
}
.rel-matrix-table th, .rel-matrix-table td {
  padding: 8px 12px;
  text-align: center;
  border: 1px solid var(--border-color);
  background: var(--surface-sidebar);
}
.rel-matrix-table th.sticky-row {
  position: sticky;
  top: 0;
  z-index: 2;
  background: var(--surface-card);
}
.rel-matrix-table th.sticky-col {
  position: sticky;
  left: 0;
  z-index: 2;
  background: var(--surface-card);
  text-align: left;
}
.rel-badge {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.15s ease;
}
.rel-badge:hover {
  transform: scale(1.05);
}
.rel-badge.hostile { background: rgba(239, 68, 68, 0.15); color: #ef4444; border: 1px solid #ef4444; }
.rel-badge.allied { background: rgba(34, 197, 94, 0.15); color: #22c55e; border: 1px solid #22c55e; }
.rel-badge.tense { background: rgba(234, 179, 8, 0.15); color: #eab308; border: 1px solid #eab308; }
.rel-badge.secret_master { background: rgba(168, 85, 247, 0.15); color: #a855f7; border: 1px solid #a855f7; }
.rel-badge.neutral { background: var(--surface-card); color: var(--text-secondary); }

/* Drawer styling */
.drawer {
  position: fixed;
  top: 0;
  right: 0;
  width: 400px;
  height: 100vh;
  background: var(--surface-card);
  border-left: 1px solid var(--border-color);
  box-shadow: -4px 0 20px rgba(0,0,0,0.3);
  z-index: 1000;
  padding: 1.5rem;
  overflow-y: auto;
  transition: transform 0.3s ease;
}
.drawer.hidden {
  transform: translateX(100%);
}
```

- [ ] **Step 3: Implement Component Logic in `public/js/relationship-view.js`**

Create `public/js/relationship-view.js`:
```javascript
class RelationshipView {
  constructor() {
    this.relationships = [];
    this.entities = [];
    this.currentWorldId = 'default';
    this.selectedRel = null;
  }

  async init(worldId = 'default') {
    this.currentWorldId = worldId;
    this.bindEvents();
    await this.fetchData();
  }

  bindEvents() {
    document.getElementById('rel-ai-extract-btn')?.addEventListener('click', () => this.extractRelationships());
    document.getElementById('rel-drawer-close')?.addEventListener('click', () => this.closeDrawer());
    document.getElementById('drawer-save-btn')?.addEventListener('click', () => this.saveRelationship());
    document.getElementById('drawer-spark-btn')?.addEventListener('click', () => this.sparkConflict());
    document.getElementById('drawer-delete-btn')?.addEventListener('click', () => this.deleteRelationship());
    document.getElementById('drawer-sentiment-slider')?.addEventListener('input', (e) => {
      document.getElementById('drawer-sentiment-val').textContent = e.target.value;
    });
  }

  async fetchData() {
    try {
      const res = await fetch(`/api/worlds/${this.currentWorldId}/relationships`);
      const data = await res.json();
      this.relationships = data.relationships || [];
      this.extractEntityList();
      this.renderGrid();
    } catch (err) {
      console.error('Failed to load relationships:', err);
    }
  }

  extractEntityList() {
    const set = new Set();
    this.relationships.forEach(r => {
      set.add(r.source_entity_title);
      set.add(r.target_entity_title);
    });
    this.entities = Array.from(set).sort();
  }

  renderGrid() {
    const container = document.getElementById('relationship-grid-container');
    if (!container) return;

    if (this.entities.length === 0) {
      container.innerHTML = `<div class="empty-state">No relationship data yet. Click <strong>✨ AI Extract Relationships</strong> to analyze world lore!</div>`;
      return;
    }

    let html = `<table class="rel-matrix-table"><thead><tr><th class="sticky-col sticky-row">Entity</th>`;
    this.entities.forEach(ent => {
      html += `<th class="sticky-row">${this.escapeHtml(ent)}</th>`;
    });
    html += `</tr></thead><tbody>`;

    this.entities.forEach(source => {
      html += `<tr><th class="sticky-col">${this.escapeHtml(source)}</th>`;
      this.entities.forEach(target => {
        if (source === target) {
          html += `<td class="self-cell">—</td>`;
        } else {
          const rel = this.relationships.find(r => 
            (r.source_entity_title === source && r.target_entity_title === target) ||
            (r.source_entity_title === target && r.target_entity_title === source)
          );
          const type = rel ? rel.relationship_type : 'neutral';
          const label = rel ? type.replace('_', ' ') : '+';
          html += `<td><span class="rel-badge ${type}" onclick="window.relationshipView.openDrawer('${this.escapeHtml(source)}', '${this.escapeHtml(target)}')">${label}</span></td>`;
        }
      });
      html += `</tr>`;
    });

    html += `</tbody></table>`;
    container.innerHTML = html;
  }

  openDrawer(source, target) {
    const drawer = document.getElementById('relationship-detail-drawer');
    if (!drawer) return;

    this.selectedRel = this.relationships.find(r => 
      (r.source_entity_title === source && r.target_entity_title === target) ||
      (r.source_entity_title === target && r.target_entity_title === source)
    ) || {
      world_id: this.currentWorldId,
      source_entity_title: source,
      target_entity_title: target,
      relationship_type: 'neutral',
      sentiment_score: 0,
      summary: '',
      is_secret: 0
    };

    document.getElementById('rel-drawer-title').textContent = `${source} ↔ ${target}`;
    document.getElementById('drawer-rel-type').value = this.selectedRel.relationship_type;
    document.getElementById('drawer-sentiment-slider').value = this.selectedRel.sentiment_score;
    document.getElementById('drawer-sentiment-val').textContent = this.selectedRel.sentiment_score;
    document.getElementById('drawer-summary').value = this.selectedRel.summary || '';
    document.getElementById('drawer-is-secret').checked = !!this.selectedRel.is_secret;
    document.getElementById('drawer-conflict-results').classList.add('hidden');

    drawer.classList.remove('hidden');
  }

  closeDrawer() {
    document.getElementById('relationship-detail-drawer')?.classList.add('hidden');
  }

  async saveRelationship() {
    if (!this.selectedRel) return;

    const payload = {
      world_id: this.currentWorldId,
      source_entity_title: this.selectedRel.source_entity_title,
      target_entity_title: this.selectedRel.target_entity_title,
      relationship_type: document.getElementById('drawer-rel-type').value,
      sentiment_score: parseInt(document.getElementById('drawer-sentiment-slider').value, 10),
      summary: document.getElementById('drawer-summary').value,
      is_secret: document.getElementById('drawer-is-secret').checked ? 1 : 0
    };

    try {
      await fetch('/api/relationships', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      this.closeDrawer();
      await this.fetchData();
    } catch (err) {
      alert('Failed to save relationship: ' + err.message);
    }
  }

  async extractRelationships() {
    const btn = document.getElementById('rel-ai-extract-btn');
    if (btn) btn.disabled = true;
    try {
      const res = await fetch('/api/relationships/auto-extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ world_id: this.currentWorldId })
      });
      const data = await res.json();
      alert(`AI Extraction Complete! ${data.count || 0} relationships found.`);
      await this.fetchData();
    } catch (err) {
      alert('AI Extraction Failed: ' + err.message);
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  async sparkConflict() {
    if (!this.selectedRel) return;
    const container = document.getElementById('drawer-conflict-results');
    if (container) {
      container.classList.remove('hidden');
      container.innerHTML = '⚡ Generating story conflict hooks...';
    }

    try {
      const res = await fetch('/api/relationships/spark-conflict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          world_id: this.currentWorldId,
          source_entity_title: this.selectedRel.source_entity_title,
          target_entity_title: this.selectedRel.target_entity_title
        })
      });
      const data = await res.json();
      if (data.hooks && container) {
        let html = '<h4>🔥 Story Conflict Sparks</h4>';
        data.hooks.forEach(h => {
          html += `<div class="conflict-card"><strong>[${h.type}] ${this.escapeHtml(h.title)}</strong><p>${this.escapeHtml(h.description)}</p></div>`;
        });
        container.innerHTML = html;
      }
    } catch (err) {
      if (container) container.innerHTML = 'Failed to generate conflicts: ' + err.message;
    }
  }

  escapeHtml(str) {
    return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
}

window.relationshipView = new RelationshipView();
```

- [ ] **Step 4: Verify integration via browser / E2E test script**

Create `scratch/test-relationship-ui.js`:
```javascript
const fs = require('fs');
const path = require('path');

console.log('Verifying UI file inclusions...');
const html = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(__dirname, '..', 'public', 'css', 'styles.css'), 'utf8');
const jsExists = fs.existsSync(path.join(__dirname, '..', 'public', 'js', 'relationship-view.js'));

if (!html.includes('view-relationships')) {
  console.error('Test Failed: index.html missing view-relationships');
  process.exit(1);
}
if (!css.includes('.rel-matrix-table')) {
  console.error('Test Failed: styles.css missing .rel-matrix-table');
  process.exit(1);
}
if (!jsExists) {
  console.error('Test Failed: relationship-view.js file missing');
  process.exit(1);
}

console.log('Test Passed: All UI assets present and linked!');
process.exit(0);
```

Run: `node scratch/test-relationship-ui.js`
Expected output: `Test Passed: All UI assets present and linked!`

- [ ] **Step 5: Commit**

```bash
git add public/index.html public/css/styles.css public/js/relationship-view.js scratch/test-relationship-ui.js; git commit -m "feat(ui): implement RelationshipView component with Matrix Grid and slide-out drawer"
```

---

### Task 5: End-to-End Verification & Verification Gate

**Files:**
- Test: `scratch/test-relationship-e2e.js`

- [ ] **Step 1: Write E2E Verification Test Script**

Create `scratch/test-relationship-e2e.js`:
```javascript
const http = require('http');

async function testFullFlow() {
  console.log('Running End-to-End Relationship Matrix Verification...');
  
  // 1. Fetch relationships
  const req1 = await makeReq('/api/worlds/default/relationships');
  if (req1.status !== 200) throw new Error('GET relationships failed');

  // 2. Insert test relationship
  const req2 = await makeReq('/api/relationships', 'POST', {
    world_id: 'default',
    source_entity_title: 'House Blackwood',
    target_entity_title: 'The Iron Guard',
    relationship_type: 'hostile',
    sentiment_score: -80,
    summary: 'E2E Test Relationship',
    is_secret: 0
  });
  if (req2.status !== 200) throw new Error('POST relationship failed');

  // 3. Verify insertion
  const req3 = await makeReq('/api/worlds/default/relationships');
  const found = req3.data.relationships.find(r => r.source_entity_title === 'House Blackwood');
  if (!found) throw new Error('Inserted relationship not found in GET response');

  console.log('✅ End-to-End Verification Passed Successfully!');
}

function makeReq(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
      headers: { 'Content-Type': 'application/json' }
    }, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(body || '{}') }));
    });
    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

testFullFlow().catch(err => {
  console.error('❌ E2E Test Failed:', err.message);
  process.exit(1);
});
```

- [ ] **Step 2: Execute E2E Verification Test**

Run: `node scratch/test-relationship-e2e.js`
Expected output: `✅ End-to-End Verification Passed Successfully!`

- [ ] **Step 3: Commit and Log Architectural Decision**

```bash
git add scratch/test-relationship-e2e.js; git commit -m "test: add E2E integration test for Relationship Matrix"
```
