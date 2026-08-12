# Option B: Narrative Slate (Scene & Session Workspace) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the dedicated Narrative Slate creative workspace (`#narrative-slate-view`) with persona profile integration, Plot Hooks & Scene Action Steps, multi-action prose tools (`⚡ Continue Prose`, `🎭 POV Rewrite`, `💡 Suggest Next Steps`), live `[[WikiLink]]` auto-complete, and slate snapshot persistence.

**Architecture:** Add `slates` table in SQLite, implement 5 narrative API endpoints in `server.js`, and add split-pane workspace UI in `public/index.html`, `public/css/styles.css`, and `public/js/app.js`.

**Tech Stack:** Node.js, Express, SQLite3, Vanilla JavaScript, CSS.

## Global Constraints

- Preserve WorldAnvil formatting rules (quotes, rows, columns, tables).
- Zero silent error masks; return clean JSON error payloads on failures.
- Enforce strict `overflow-x: hidden` responsive UI to prevent clipping.

---

### Task 1: Database Migration & Persona Profile Integration

**Files:**
- Modify: `server.js`
- Create: `scratch/test-narrative-db.js`

**Interfaces:**
- Consumes: SQLite DB & `personas` table
- Produces: `slates` SQLite table & `getCastPersonaContext(cast_ids)` helper

- [ ] **Step 1: Write test script for DB schema & persona extraction**

Create `scratch/test-narrative-db.js`:
```javascript
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const assert = require('assert');

const dbPath = path.join(__dirname, '../lore.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS slates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      world_id TEXT DEFAULT 'all',
      plot_hook TEXT,
      scene_steps TEXT,
      cast_ids TEXT,
      pinned_lore_ids TEXT,
      tone_chips TEXT,
      visibility TEXT DEFAULT 'public',
      format TEXT DEFAULT 'markdown',
      max_tokens INTEGER DEFAULT 4000,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    assert(!err, 'Failed to create slates table');
    console.log('✅ Slates database migration test passed!');
  });
});
```

- [ ] **Step 2: Run test script to verify DB migration**

Run: `node scratch/test-narrative-db.js`
Expected: `✅ Slates database migration test passed!`

- [ ] **Step 3: Update DB schema initialization in server.js**

Add `slates` table initialization and `getCastPersonaContext(cast_ids, callback)` helper to `server.js`.

- [ ] **Step 4: Commit Task 1**

```bash
git add server.js scratch/test-narrative-db.js
git commit -m "feat: add slates table migration and persona profile extractor"
```

---

### Task 2: Narrative Slate API Suite (`POST /api/narrative/*`)

**Files:**
- Modify: `server.js`
- Create: `scratch/test-narrative-slate.js`

**Interfaces:**
- Consumes: `{ plot_hook, scene_steps, cast_ids, pinned_lore_ids, tone_chips, visibility, max_tokens }`
- Produces: 5 API routes: `compile-slate`, `continue-prose`, `pov-rewrite`, `suggest-beats`, `save-slate`, `slates`

- [ ] **Step 1: Write integration test script for Narrative Slate API suite**

Create `scratch/test-narrative-slate.js`:
```javascript
const http = require('http');

const postData = JSON.stringify({
  plot_hook: "Elena intercepts an Imperial courier in the rain.",
  scene_steps: ["Elena confronts courier", "Courier reveals ambush", "Shadowy figure on balcony"],
  cast_ids: [],
  pinned_lore_ids: [],
  tone_chips: ["Gritty & Noir"],
  visibility: "public",
  max_tokens: 4000
});

const req = http.request({
  hostname: 'localhost',
  port: 3998,
  path: '/api/narrative/compile-slate',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
}, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    console.log('Status Code:', res.statusCode);
    const data = JSON.parse(body);
    if (data.status === 'success' && data.compiled_prompt) {
      console.log('✅ Narrative Slate compile endpoint integration test passed!');
    } else {
      console.error('❌ Narrative Slate compile failed:', data);
      process.exit(1);
    }
  });
});

req.on('error', (e) => {
  console.error('Request error:', e.message);
  process.exit(1);
});

req.write(postData);
req.end();
```

- [ ] **Step 2: Implement Narrative API routes in server.js**

Add `POST /api/narrative/compile-slate`, `POST /api/narrative/continue-prose`, `POST /api/narrative/pov-rewrite`, `POST /api/narrative/suggest-beats`, `POST /api/narrative/save-slate`, `GET /api/narrative/slates`.

- [ ] **Step 3: Run integration test against server**

Run `node scratch/test-narrative-slate.js` while test server is running.
Expected: `✅ Narrative Slate compile endpoint integration test passed!`

- [ ] **Step 4: Commit Task 2**

```bash
git add server.js scratch/test-narrative-slate.js
git commit -m "feat: add Narrative Slate API suite endpoints"
```

---

### Task 3: Frontend Narrative Slate Workspace & Live `[[WikiLink]]` Auto-complete

**Files:**
- Modify: `public/index.html` (Add `📜 Narrative Slate` top nav button & `#narrative-slate-view` HTML)
- Modify: `public/css/styles.css` (Add split-pane styling, tone chips, and `[[WikiLink]]` popover styles)
- Modify: `public/js/app.js` (Add view switcher, slate configuration, live WikiLink popup, co-writer actions)

**Interfaces:**
- Consumes: `/api/narrative/*` endpoints
- Produces: Complete Narrative Slate UI workspace (`#narrative-slate-view`)

- [ ] **Step 1: Add HTML markup in public/index.html**

Add header view button `<button id="narrative-slate-btn" class="nav-tab">📜 Narrative Slate</button>` and main container `<div id="narrative-slate-view" class="view-panel hidden">...</div>`.

- [ ] **Step 2: Add CSS rules in public/css/styles.css**

Add styles for `.narrative-workspace`, `.prose-editor-pane`, `.slate-drawer-pane`, `.tone-chip`, and `.wikilink-popover`.

- [ ] **Step 3: Implement JavaScript handlers in public/js/app.js**

Add `switchView('narrative-slate')`, `compileNarrativeSlate()`, `generateProseContinuation()`, `showPovRewriteModal()`, `suggestNextBeats()`, `handleWikiLinkAutocomplete()`, and `saveNarrativeSlate()`.

- [ ] **Step 4: Verify manual E2E in browser / node server**

Verify view switching, tone chip toggles, prose continuation, and WikiLink auto-complete dropdown.

- [ ] **Step 5: Commit Task 3**

```bash
git add public/index.html public/css/styles.css public/js/app.js
git commit -m "feat: implement frontend Narrative Slate workspace and live WikiLink auto-complete"
```
