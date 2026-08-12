# Public World Wiki Portal & Frontpage Suite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a cinematic public world frontpage and wiki landing page system (inspired by award-winning World Anvil portals and Obsidian Quartz digital gardens) with custom hero banners, tagline quotes, featured lore spotlight cards ("Bookcovers"), category docks, OpenGraph social media preview tags, and 1-click sharing via `/view/:shareToken`.

**Architecture:** Extend SQLite `worlds` schema in `server.js` with `banner_image`, `tagline`, `pinned_article_ids`, and `template_style`. Build `GET /api/worlds/:worldId/frontpage` and `PUT /api/worlds/:worldId/frontpage` API endpoints. Upgrade `GET /view/:shareToken` to render the cinematic World Frontpage Wiki Portal. Implement `public/js/frontpage-view.js` for frontpage customization and layout management in the web app.

**Tech Stack:** Express.js, SQLite3 (`lore.db`), Vanilla JS (ES6 Classes), CSS Tokens (`ancient-codex`, `scifi-fantasy`, `data-mode="light"`).

## Global Constraints
- **Public Gateway**: `GET /view/:shareToken` MUST open directly to the cinematic World Frontpage Wiki Portal.
- **Secret Protection**: Public Player View MUST strip `[secret]...[/secret]` text blocks and omit private entries.
- **Social Media Cards**: OpenGraph tags (`og:title`, `og:description`, `og:image`) MUST be injected into `/view/:shareToken` header.
- **Theme Support**: Interface MUST inherit `ancient-codex`, `scifi-fantasy`, and `data-mode="light"` theme variables.

---

### Task 1: Database Schema & World Frontpage API Endpoints (`server.js`)

**Files:**
- Modify: `server.js` (add schema migrations for `worlds` table and frontpage endpoints)
- Test: `scratch/test-frontpage-backend.js`

**Interfaces:**
- Consumes: `lore.db` sqlite3 connection, `imageUpload` multer middleware.
- Produces:
  - `GET /api/worlds/:worldId/frontpage`
  - `PUT /api/worlds/:worldId/frontpage`

- [ ] **Step 1: Write failing backend integration test**

Create `scratch/test-frontpage-backend.js`:
```javascript
const assert = require('assert');
const http = require('http');
const { app } = require('../server.js');

async function runTests() {
  console.log('Testing World Frontpage API Endpoints...');
  const server = app.listen(3004);

  function request(path, options = {}, body = null) {
    return new Promise((resolve, reject) => {
      const req = http.request(`http://localhost:3004${path}`, options, (res) => {
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
    // 1. Fetch frontpage payload for default world
    const res1 = await request('/api/worlds/default/frontpage');
    assert.strictEqual(res1.status, 200, `GET /api/worlds/default/frontpage should return 200, got ${res1.status}`);
    assert(res1.body.world, 'Response should contain world object');
    assert(Array.isArray(res1.body.pinnedArticles), 'Response should contain pinnedArticles array');

    // 2. Update frontpage payload
    const updatePayload = {
      tagline: 'A world of ancient high magic and floating citadels.',
      template_style: 'grand-codex'
    };
    const res2 = await request('/api/worlds/default/frontpage', { method: 'PUT', headers: { 'Content-Type': 'application/json' } }, updatePayload);
    assert.strictEqual(res2.status, 200, `PUT /api/worlds/default/frontpage should return 200, got ${res2.status}`);
    assert.strictEqual(res2.body.world.tagline, 'A world of ancient high magic and floating citadels.');

    console.log('✅ Frontpage Backend Tests Passed!');
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

Run: `node scratch/test-frontpage-backend.js`  
Expected: FAIL with 404 response.

- [ ] **Step 3: Implement database schema alterations and API endpoints in `server.js`**

In `server.js`, add ALTER TABLE statements to `db.serialize()`:
```javascript
db.run("ALTER TABLE worlds ADD COLUMN banner_image TEXT DEFAULT '/uploads/images/default-banner.png'", (err) => {});
db.run("ALTER TABLE worlds ADD COLUMN tagline TEXT DEFAULT 'An intricate custom setting waiting to be explored.'", (err) => {});
db.run("ALTER TABLE worlds ADD COLUMN pinned_article_ids TEXT DEFAULT '[]'", (err) => {});
db.run("ALTER TABLE worlds ADD COLUMN template_style TEXT DEFAULT 'grand-codex'", (err) => {});
```

Add endpoints in `server.js`:
```javascript
// Fetch Frontpage Payload
app.get('/api/worlds/:worldId/frontpage', (req, res) => {
  const { worldId } = req.params;
  const isPlayerMode = req.query.mode === 'player';

  db.get('SELECT * FROM worlds WHERE id = ? OR id = "default"', [worldId], (err, world) => {
    if (err || !world) {
      return res.status(404).json({ error: 'World not found' });
    }

    let pinnedIds = [];
    try {
      pinnedIds = JSON.parse(world.pinned_article_ids || '[]');
    } catch (e) {
      pinnedIds = [];
    }

    // Fetch pinned articles
    let articleQuery = 'SELECT id, title, category, sub_category, summary, content, header_image, tags, updated_at FROM articles WHERE world_id = ? OR world_id = "default"';
    db.all(articleQuery, [world.id], (err2, allArticles) => {
      const articles = allArticles || [];
      
      const pinnedArticles = articles.filter(a => pinnedIds.includes(a.id)).slice(0, 6);
      // If no pinned articles, fallback to 4 recent articles
      const featured = pinnedArticles.length ? pinnedArticles : articles.slice(0, 4);

      const sanitizedFeatured = featured.map(art => ({
        ...art,
        content: isPlayerMode ? sanitizeSecretContent(art.content) : art.content
      }));

      // Calculate category counts
      const categoryCounts = {};
      articles.forEach(a => {
        categoryCounts[a.category] = (categoryCounts[a.category] || 0) + 1;
      });

      res.json({
        world,
        stats: {
          totalArticles: articles.length,
          totalCategories: Object.keys(categoryCounts).length,
          categoryCounts
        },
        pinnedArticles: sanitizedFeatured
      });
    });
  });
});

// Update Frontpage Settings
app.put('/api/worlds/:worldId/frontpage', (req, res) => {
  const { worldId } = req.params;
  const { banner_image, tagline, pinned_article_ids, template_style } = req.body;

  const query = `
    UPDATE worlds
    SET banner_image = COALESCE(?, banner_image),
        tagline = COALESCE(?, tagline),
        pinned_article_ids = COALESCE(?, pinned_article_ids),
        template_style = COALESCE(?, template_style)
    WHERE id = ? OR id = "default"
  `;

  const pinnedStr = Array.isArray(pinned_article_ids) ? JSON.stringify(pinned_article_ids) : pinned_article_ids;

  db.run(query, [banner_image, tagline, pinnedStr, template_style, worldId], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    db.get('SELECT * FROM worlds WHERE id = ? OR id = "default"', [worldId], (err2, world) => {
      res.json({ success: true, world });
    });
  });
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node scratch/test-frontpage-backend.js`  
Expected: PASS with `✅ Frontpage Backend Tests Passed!`.

---

### Task 2: Public Share Gateway with Frontpage Portal (`server.js`)

**Files:**
- Modify: `server.js` (upgrade `GET /view/:shareToken`)
- Test: `scratch/test-frontpage-sharing.js`

**Interfaces:**
- Consumes: Frontpage data payload, OpenGraph tags.
- Produces: HTML response rendering the cinematic World Frontpage Wiki Portal.

- [ ] **Step 1: Write failing share gateway integration test**

Create `scratch/test-frontpage-sharing.js`:
```javascript
const assert = require('assert');
const http = require('http');
const { app } = require('../server.js');

async function runTests() {
  console.log('Testing Public World Frontpage Share Gateway...');
  const server = app.listen(3005);

  function request(path) {
    return new Promise((resolve, reject) => {
      http.get(`http://localhost:3005${path}`, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve({ status: res.statusCode, body: data }));
      }).on('error', reject);
    });
  }

  try {
    const res = await request('/view/default');
    assert.strictEqual(res.status, 200, 'GET /view/default should return 200');
    assert(res.body.includes('class="world-hero-banner"'), 'Page must contain world hero banner section');
    assert(res.body.includes('class="featured-spotlight-grid"'), 'Page must contain featured spotlight grid');
    assert(res.body.includes('<meta property="og:title"'), 'Page must contain OpenGraph title tag');

    console.log('✅ Frontpage Share Gateway Tests Passed!');
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

Run: `node scratch/test-frontpage-sharing.js`  
Expected: FAIL due to missing frontpage banner/grid elements.

- [ ] **Step 3: Upgrade `GET /view/:shareToken` in `server.js`**

In `server.js`, replace `GET /view/:shareToken` route handler:
```javascript
app.get('/view/:shareToken', (req, res) => {
  const worldId = req.params.shareToken;
  
  db.get('SELECT * FROM worlds WHERE id = ? OR id = "default"', [worldId], (err, world) => {
    const targetWorld = world || {
      id: 'default',
      name: 'LoreVault Atlas',
      description: 'Interactive World Lore Explorer',
      tagline: 'An intricate custom setting waiting to be explored.',
      banner_image: '/uploads/images/default-banner.png',
      theme: 'ancient-codex'
    };

    db.all('SELECT id, title, category, summary, content, header_image, tags FROM articles WHERE world_id = ? OR world_id = "default"', [targetWorld.id], (err2, articles) => {
      const allArticles = articles || [];
      
      let pinnedIds = [];
      try { pinnedIds = JSON.parse(targetWorld.pinned_article_ids || '[]'); } catch (e) {}

      const pinned = allArticles.filter(a => pinnedIds.includes(a.id)).slice(0, 6);
      const featured = pinned.length ? pinned : allArticles.slice(0, 4);

      const html = `<!DOCTYPE html>
<html lang="en" data-theme="${targetWorld.theme}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${targetWorld.name} — World Lore Portal</title>
  <meta property="og:title" content="${targetWorld.name} — LoreVault World Portal">
  <meta property="og:description" content="${targetWorld.tagline || targetWorld.description || 'Explore the lore, maps, and codex.'}">
  <meta property="og:image" content="${targetWorld.banner_image || '/uploads/images/default-banner.png'}">
  <meta property="og:type" content="website">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
  <link rel="stylesheet" href="/css/styles.css">
  <style>
    body { margin: 0; padding: 0; background: var(--bg-main, #0b0f19); color: var(--text-primary, #e2e8f0); font-family: sans-serif; }
    .public-portal-container { max-width: 1200px; margin: 0 auto; padding: 24px; }
    .world-hero-banner {
      height: 320px;
      border-radius: 16px;
      background: linear-gradient(to bottom, rgba(0,0,0,0.3), rgba(11,15,25,0.95)), url('${targetWorld.banner_image || '/uploads/images/default-banner.png'}') center/cover;
      display: flex; flex-direction: column; justify-content: flex-end; padding: 32px; box-sizing: border-box; border: 1px solid var(--border-color, #1e293b);
    }
    .world-hero-banner h1 { margin: 0; font-size: 2.8rem; color: #fff; text-shadow: 0 2px 10px rgba(0,0,0,0.8); }
    .world-hero-banner p { font-size: 1.2rem; color: var(--accent-amber, #f59e0b); font-style: italic; margin-top: 8px; }
    .action-dock { display: flex; gap: 12px; margin: 24px 0; flex-wrap: wrap; }
    .featured-spotlight-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; margin-top: 16px; }
    .spotlight-card { background: var(--surface-card, #0f172a); border: 1px solid var(--border-color, #1e293b); border-radius: 12px; padding: 20px; cursor: pointer; transition: transform 0.2s, border-color 0.2s; }
    .spotlight-card:hover { transform: translateY(-4px); border-color: var(--accent-primary, #38bdf8); }
  </style>
</head>
<body>
  <div class="public-portal-container">
    <div class="world-hero-banner">
      <h1>${targetWorld.name}</h1>
      <p>“${targetWorld.tagline || 'An intricate custom setting waiting to be explored.'}”</p>
    </div>

    <div class="action-dock">
      <a href="/view/${targetWorld.id}#atlas" class="tool-btn primary"><i class="fa-solid fa-map"></i> Explore World Map</a>
      <a href="/view/${targetWorld.id}#codex" class="tool-btn"><i class="fa-solid fa-book"></i> Browse Full Codex</a>
      <span class="badge" style="align-self:center; font-size:0.9rem;">📚 ${allArticles.length} Articles</span>
    </div>

    <h2>⭐ Featured Lore Spotlight</h2>
    <div class="featured-spotlight-grid">
      ${featured.map(art => `
        <div class="spotlight-card">
          <span class="category-badge">${art.category}</span>
          <h3 style="margin:8px 0;">${art.title}</h3>
          <p style="font-size:0.9rem; color:var(--text-secondary,#94a3b8);">${art.summary || (art.content ? art.content.substring(0, 120) + '...' : '')}</p>
        </div>
      `).join('')}
    </div>
  </div>
</body>
</html>`;
      res.send(html);
    });
  });
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node scratch/test-frontpage-sharing.js`  
Expected: PASS with `✅ Frontpage Share Gateway Tests Passed!`.

---

### Task 3: Frontpage View Component (`public/js/frontpage-view.js`)

**Files:**
- Create: `public/js/frontpage-view.js`

**Interfaces:**
- Consumes: `/api/worlds/:worldId/frontpage` payload.
- Produces: `window.FrontpageView` class for managing the Frontpage Portal rendering and Customize Frontpage modal.

- [ ] **Step 1: Create `public/js/frontpage-view.js`**

```javascript
class FrontpageView {
  constructor(containerId, options = {}) {
    this.containerId = containerId;
    this.worldId = options.worldId || 'default';
    this.data = null;
  }

  async init() {
    await this.fetchFrontpage();
    this.render();
  }

  async fetchFrontpage() {
    try {
      const res = await fetch(`/api/worlds/${this.worldId}/frontpage`);
      this.data = await res.json();
    } catch (e) {
      console.error('Failed to fetch frontpage payload:', e);
    }
  }

  render() {
    const container = document.getElementById(this.containerId);
    if (!container || !this.data) return;

    const { world, stats, pinnedArticles } = this.data;

    container.innerHTML = `
      <div class="frontpage-wrapper">
        <div class="frontpage-hero-banner" style="background-image: linear-gradient(to bottom, rgba(0,0,0,0.3), rgba(11,15,25,0.95)), url('${world.banner_image || '/uploads/images/default-banner.png'}');">
          <div class="hero-content">
            <h1>${world.name}</h1>
            <p class="hero-tagline">“${world.tagline || 'An intricate custom setting waiting to be explored.'}”</p>
            <button id="customize-frontpage-btn" class="tool-btn" style="margin-top:12px;"><i class="fa-solid fa-gear"></i> Customize Frontpage</button>
          </div>
        </div>

        <div class="frontpage-metrics-dock">
          <div class="metric-chip"><i class="fa-solid fa-book"></i> <strong>${stats.totalArticles}</strong> Articles</div>
          <div class="metric-chip"><i class="fa-solid fa-folder-tree"></i> <strong>${stats.totalCategories}</strong> Primary Categories</div>
          <button class="tool-btn primary" onclick="window.switchTab('atlas')"><i class="fa-solid fa-map"></i> World Atlas</button>
          <button class="tool-btn" onclick="window.app.openGraphModal()"><i class="fa-solid fa-network-wired"></i> Knowledge Graph</button>
        </div>

        <section class="frontpage-section">
          <h2>⭐ Featured Lore Spotlight</h2>
          <div class="featured-spotlight-grid">
            ${pinnedArticles.map(art => `
              <div class="spotlight-card" onclick="window.app.selectArticle('${art.id}'); window.switchTab('library');">
                <span class="category-badge">${art.category}</span>
                <h3>${art.title}</h3>
                <p>${art.summary || (art.content ? art.content.substring(0, 110) + '...' : '')}</p>
              </div>
            `).join('')}
          </div>
        </section>
      </div>

      <!-- Customize Frontpage Modal -->
      <div id="customize-frontpage-modal" class="modal-overlay" style="display:none;">
        <div class="modal-card">
          <div class="modal-header">
            <h3><i class="fa-solid fa-sliders"></i> Customize World Frontpage</h3>
            <button id="close-frontpage-modal-btn" class="drawer-close-btn">&times;</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label>Tagline / Synopsis Quote</label>
              <input type="text" id="frontpage-tagline-input" class="form-control" value="${world.tagline || ''}">
            </div>
            <div class="form-group">
              <label>Banner Image URL</label>
              <input type="text" id="frontpage-banner-input" class="form-control" value="${world.banner_image || ''}">
            </div>
          </div>
          <div class="modal-footer" style="display:flex; justify-content:flex-end; gap:10px; margin-top:16px;">
            <button id="cancel-frontpage-modal-btn" class="tool-btn">Cancel</button>
            <button id="save-frontpage-modal-btn" class="tool-btn primary">Save Changes</button>
          </div>
        </div>
      </div>
    `;

    this.bindEvents();
  }

  bindEvents() {
    const btn = document.getElementById('customize-frontpage-btn');
    const modal = document.getElementById('customize-frontpage-modal');
    if (btn && modal) {
      btn.addEventListener('click', () => modal.style.display = 'flex');
    }

    const closeBtn = document.getElementById('close-frontpage-modal-btn');
    const cancelBtn = document.getElementById('cancel-frontpage-modal-btn');
    if (closeBtn) closeBtn.addEventListener('click', () => modal.style.display = 'none');
    if (cancelBtn) cancelBtn.addEventListener('click', () => modal.style.display = 'none');

    const saveBtn = document.getElementById('save-frontpage-modal-btn');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => this.saveChanges());
    }
  }

  async saveChanges() {
    const tagline = document.getElementById('frontpage-tagline-input').value;
    const banner = document.getElementById('frontpage-banner-input').value;

    try {
      const res = await fetch(`/api/worlds/${this.worldId}/frontpage`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tagline, banner_image: banner })
      });
      const data = await res.json();
      if (data.success) {
        document.getElementById('customize-frontpage-modal').style.display = 'none';
        await this.init();
      }
    } catch (e) {
      alert('Failed to update frontpage settings.');
    }
  }
}

window.FrontpageView = FrontpageView;
```

---

### Task 4: UI Navigation & CSS Token Integration (`public/index.html` & `public/css/styles.css` & `public/js/app.js`)

**Files:**
- Modify: `public/index.html` (add `🌐 World Portal` nav tab & `#view-frontpage` section)
- Modify: `public/css/styles.css` (add Frontpage hero banner, spotlight grid, and theme rules)
- Modify: `public/js/app.js` (hook up `switchTab('frontpage')`)

- [ ] **Step 1: Update `public/index.html` nav tabs**

Add tab button in `public/index.html`:
```html
<button class="tab-btn" id="tab-frontpage" onclick="window.switchTab('frontpage')"><span class="tab-icon">🌐</span> World Frontpage</button>
```

Add view section in `public/index.html`:
```html
<section id="view-frontpage" class="view-panel">
  <div id="frontpage-app-root" style="width: 100%; height: calc(100vh - 56px); overflow-y: auto;"></div>
</section>
```

Add script tag in `public/index.html`:
```html
<script src="js/frontpage-view.js?v=13"></script>
```

- [ ] **Step 2: Add CSS rules in `public/css/styles.css`**

```css
#view-frontpage {
  display: none;
  width: 100%;
  height: calc(100vh - 56px);
  background: var(--bg-main, #0b0f19);
  overflow-y: auto;
}

#view-frontpage.active {
  display: block !important;
}

.frontpage-wrapper {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
}

.frontpage-hero-banner {
  height: 300px;
  border-radius: 16px;
  background-size: cover;
  background-position: center;
  display: flex;
  align-items: flex-end;
  padding: 32px;
  box-sizing: border-box;
  border: 1px solid var(--border-color, #1e293b);
}

.frontpage-hero-banner h1 {
  font-size: 2.6rem;
  margin: 0;
  color: #fff;
}

.hero-tagline {
  font-size: 1.1rem;
  color: var(--accent-amber, #f59e0b);
  font-style: italic;
  margin-top: 8px;
}

.frontpage-metrics-dock {
  display: flex;
  gap: 16px;
  align-items: center;
  margin: 24px 0;
}

.metric-chip {
  background: var(--surface-card, #0f172a);
  border: 1px solid var(--border-color, #1e293b);
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 0.9rem;
}

.featured-spotlight-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
  margin-top: 16px;
}

.spotlight-card {
  background: var(--surface-card, #0f172a);
  border: 1px solid var(--border-color, #1e293b);
  border-radius: 12px;
  padding: 20px;
  cursor: pointer;
  transition: transform 0.2s, border-color 0.2s;
}

.spotlight-card:hover {
  transform: translateY(-4px);
  border-color: var(--accent-primary, #38bdf8);
}
```

- [ ] **Step 3: Update `public/js/app.js`**

Add `'frontpage'` handling to `switchTab(tabName)`:
```javascript
if (tabName === 'frontpage') {
  if (frontpageView) frontpageView.classList.add('active');
  if (tabFrontpage) tabFrontpage.classList.add('active');
  if (!window.frontpageView) {
    window.frontpageView = new FrontpageView('frontpage-app-root', { worldId: this.currentWorldId || 'default' });
    window.frontpageView.init();
  }
}
```

---

### Task 5: End-to-End Verification & Walkthrough

**Files:**
- Run test scripts: `scratch/test-frontpage-backend.js`, `scratch/test-frontpage-sharing.js`
- Update: `walkthrough.md`

- [ ] **Step 1: Execute all integration test suites**

Run:
```bash
node scratch/test-frontpage-backend.js
node scratch/test-frontpage-sharing.js
```
Expected: PASS with 100% green results.

- [ ] **Step 2: Update `walkthrough.md` artifact**

Document completed frontpage portal features, sharing routes, and verification.
