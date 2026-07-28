# World Doctor & Vault Management Suite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign World Doctor into an interactive, dual-mode vault management dashboard with a 1-click guided repair session wizard, granular diagnostic tabs, and an automated post-import triage pipeline for imported worlds.

**Architecture:** Extend Express API in `server.js` with scoped audit diagnostics (`/api/audit/run?world_id=`), guided session item queues (`/api/audit/guided-session`), and granular repair actions (`/api/audit/apply-action`). Redesign HTML/CSS for `#doctor-modal` into a 1024px responsive dashboard, and build client controllers in `public/js/app.js` to handle guided repair session state and post-import triage.

**Tech Stack:** Node.js, Express, SQLite3, HTML5, Vanilla CSS, JavaScript ES6 (Fetch API).

## Global Constraints
- Database file: `database/lore.db` (SQLite3).
- UI Styling: Vanilla CSS in `public/css/styles.css`.
- World Scope Values: `all`, `default`, or any valid `world_id`.

---

### Task 1: Backend Audit API Scoping & Guided Session Engine

**Files:**
- Modify: `server.js:750-950`

**Interfaces:**
- Consumes: SQLite `articles`, `worlds`, `relations` tables.
- Produces: `/api/audit/run`, `/api/audit/guided-session`, `/api/audit/apply-action` REST endpoints.

- [ ] **Step 1: Update `/api/audit/run` endpoint for `world_id` parameter**

In `server.js`, modify `app.post('/api/audit/run')` to accept `world_id` in the request body/query, filter articles by `world_id` if specified (unless `world_id === 'all'`), and calculate dynamic `healthScore` (0-100):

```javascript
app.post('/api/audit/run', (req, res) => {
  const { world_id } = req.body;
  let sql = 'SELECT id, title, category, sub_category, world_id, summary, content, tags FROM articles WHERE 1=1';
  const params = [];
  if (world_id && world_id !== 'all') {
    sql += ' AND (world_id = ? OR world_id IS NULL)';
    params.push(world_id);
  }

  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    db.all('SELECT source_id, target_id FROM relations', [], (err, rels) => {
      const activeRelationIds = new Set();
      if (!err && rels) {
        rels.forEach(r => { activeRelationIds.add(r.source_id); activeRelationIds.add(r.target_id); });
      }

      const stubArticles = [];
      const misclassifiedArticles = [];
      const duplicateArticles = [];
      const orphanArticles = [];
      const seenTitles = new Map();

      rows.forEach(art => {
        const cleanContent = (art.content || '').replace(/<[^>]*>/g, '').replace(/\[[^\]]+\]/g, '').trim();
        const isBoilerplate = /welcome to world anvil|describe a predator|read me first/i.test(cleanContent + ' ' + art.title);
        const isStub = cleanContent.length < 50 || isBoilerplate;

        if (isStub) {
          stubArticles.push({ id: art.id, title: art.title, category: art.category, world_id: art.world_id, reason: isBoilerplate ? 'Default Template Boilerplate' : 'Empty / Stub Article (< 50 chars)' });
        }

        const smart = smartCategorizeArticle(art.title, art.content);
        if (smart.category !== art.category) {
          misclassifiedArticles.push({ id: art.id, title: art.title, currentCategory: art.category, suggestedCategory: smart.category, suggestedSubCategory: smart.subCategory, summary: art.summary || smart.summary, reasoning: `Title/Content match '${smart.category}' pattern` });
        }

        const normTitle = art.title.toLowerCase().trim();
        if (seenTitles.has(normTitle)) {
          duplicateArticles.push({ id: art.id, originalId: seenTitles.get(normTitle).id, title: art.title, category: art.category, originalCategory: seenTitles.get(normTitle).category });
        } else {
          seenTitles.set(normTitle, { id: art.id, category: art.category });
        }

        if (!activeRelationIds.has(art.id) && !art.content.includes('@[') && !art.content.includes('[[')) {
          orphanArticles.push({ id: art.id, title: art.title, category: art.category });
        }
      });

      const penalties = (duplicateArticles.length * 10) + (misclassifiedArticles.length * 5) + (stubArticles.length * 3) + (orphanArticles.length * 2);
      const healthScore = Math.max(0, Math.min(100, 100 - penalties));

      res.json({
        world_id: world_id || 'all',
        totalAudited: rows.length,
        healthScore,
        counts: {
          duplicates: duplicateArticles.length,
          misclassified: misclassifiedArticles.length,
          stubs: stubArticles.length,
          orphans: orphanArticles.length
        },
        stubArticles,
        misclassifiedArticles,
        duplicateArticles,
        orphanArticles
      });
    });
  });
});
```

- [ ] **Step 2: Implement `/api/audit/guided-session` endpoint**

Add endpoint in `server.js` to compile guided queue:

```javascript
app.get('/api/audit/guided-session', (req, res) => {
  const { world_id } = req.query;
  let sql = 'SELECT id, title, category, sub_category, world_id, summary, content FROM articles WHERE 1=1';
  const params = [];
  if (world_id && world_id !== 'all') {
    sql += ' AND (world_id = ? OR world_id IS NULL)';
    params.push(world_id);
  }

  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    const queue = [];
    const seenTitles = new Map();

    rows.forEach(art => {
      const normTitle = art.title.toLowerCase().trim();
      if (seenTitles.has(normTitle)) {
        const orig = seenTitles.get(normTitle);
        queue.push({
          id: 'dup-' + art.id,
          type: 'duplicate',
          articleId: art.id,
          title: art.title,
          category: art.category,
          originalId: orig.id,
          originalCategory: orig.category,
          content: art.content,
          originalContent: orig.content
        });
      } else {
        seenTitles.set(normTitle, art);
      }

      const smart = smartCategorizeArticle(art.title, art.content);
      if (smart.category !== art.category) {
        queue.push({
          id: 'misc-' + art.id,
          type: 'misclassification',
          articleId: art.id,
          title: art.title,
          currentCategory: art.category,
          suggestedCategory: smart.category,
          suggestedSubCategory: smart.subCategory,
          reasoning: `Contains strong signals for ${smart.category}`,
          excerpt: (art.summary || art.content).substring(0, 180)
        });
      }

      const clean = (art.content || '').replace(/<[^>]*>/g, '').replace(/\[[^\]]+\]/g, '').trim();
      if (clean.length < 50) {
        queue.push({
          id: 'stub-' + art.id,
          type: 'stub',
          articleId: art.id,
          title: art.title,
          category: art.category,
          excerpt: clean || 'Empty Article'
        });
      }
    });

    res.json({ totalItems: queue.length, queue });
  });
});
```

- [ ] **Step 3: Implement `/api/audit/apply-action` endpoint**

Add endpoint in `server.js` to execute repair actions (`recategorize`, `delete_article`, `merge_duplicates`):

```javascript
app.post('/api/audit/apply-action', (req, res) => {
  const { action, articleId, params } = req.body;
  if (!action || !articleId) return res.status(400).json({ error: 'action and articleId are required' });

  if (action === 'recategorize') {
    db.run('UPDATE articles SET category = ?, sub_category = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [params.newCategory, params.newSubCategory || 'General', articleId], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, message: `Re-categorized ${articleId} to ${params.newCategory}` });
      });
  } else if (action === 'delete_article') {
    db.run('DELETE FROM articles WHERE id = ?', [articleId], (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, message: `Deleted article ${articleId}` });
    });
  } else if (action === 'merge_duplicates') {
    db.get('SELECT content FROM articles WHERE id = ?', [articleId], (err, row1) => {
      db.get('SELECT content FROM articles WHERE id = ?', [params.targetMasterId], (err, row2) => {
        if (row1 && row2) {
          const mergedContent = (row2.content + '\n\n' + row1.content).trim();
          db.run('UPDATE articles SET content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [mergedContent, params.targetMasterId]);
          db.run('DELETE FROM articles WHERE id = ?', [articleId]);
        }
        res.json({ success: true, message: `Merged duplicate into master ${params.targetMasterId}` });
      });
    });
  } else {
    res.json({ success: true, message: 'Action processed' });
  }
});
```

- [ ] **Step 4: Verify server endpoints with test requests**

Start/restart server and verify API routes return clean JSON responses.

---

### Task 2: Doctor Dashboard & Dual-Mode UI Container

**Files:**
- Modify: `public/index.html:445-545`
- Modify: `public/css/styles.css`

**Interfaces:**
- Consumes: Modern dark design tokens in `styles.css`.
- Produces: Responsive 1024px `#doctor-modal` layout with World Scope dropdown, Health Gauge, CTA banner, Guided Repair Session container, and Tabbed View panels.

- [ ] **Step 1: Update HTML structure for `#doctor-modal` in `public/index.html`**

Update `#doctor-modal` to include:
- World Scope Dropdown (`#doctor-world-scope`)
- Health Score Badge (`#doctor-health-score-badge`)
- Summary Metric Cards (`#doctor-metric-duplicates`, `#doctor-metric-misc`, `#doctor-metric-stubs`, `#doctor-metric-orphans`)
- CTA Banner with button `#start-guided-repair-btn`
- Guided Session View `#doctor-guided-session-view` (hidden by default)
- Tab Bar (`#doctor-tab-nav`) and Tab Panels (`#doctor-panel-overview`, `#doctor-panel-misc`, `#doctor-panel-dup`, `#doctor-panel-stubs`, `#doctor-panel-ai`, `#doctor-panel-orphans`)

- [ ] **Step 2: Add CSS rules for Doctor Dashboard & Repair Cards in `public/css/styles.css`**

Add CSS for:
- `.doctor-modal-card` (max-width: 1024px)
- `.health-score-gauge`
- `.repair-comparison-grid` (2-column comparison pane for Guided Repair Session)
- `.guided-action-bar`

- [ ] **Step 3: Add Post-Import Triage Modal `#import-triage-modal` in `public/index.html`**

Create `#import-triage-modal` container with import summary badge, breakdown list, and CTA button `#triage-launch-guided-btn`.

---

### Task 3: Guided Repair Session & Dashboard Controller

**Files:**
- Modify: `public/js/app.js:1380-1600`

**Interfaces:**
- Consumes: REST APIs (`/api/audit/run`, `/api/audit/guided-session`, `/api/audit/apply-action`).
- Produces: Interactive client app methods: `openDoctorModal()`, `setDoctorWorldScope()`, `startGuidedSession()`, `renderGuidedStep()`, `applyGuidedStepAction()`, `switchDoctorTab()`.

- [ ] **Step 1: Implement `setDoctorWorldScope()` and update `runWorldAudit()`**

In `public/js/app.js`, add `setDoctorWorldScope(worldId)` to fetch audit diagnostics scoped to selected world, update Health Score gauge color based on score (>=90 green, >=70 amber, <70 red), and render issue counts.

- [ ] **Step 2: Implement Guided Session Queue Manager (`startGuidedSession`, `renderGuidedStep`, `applyGuidedStepAction`)**

In `public/js/app.js`:
- `startGuidedSession()`: Fetches `/api/audit/guided-session?world_id=...`, hides tab views, displays `#doctor-guided-session-view`, and initializes `this.guidedQueueIndex = 0`.
- `renderGuidedStep()`: Renders current step comparison card (Left: Current Article, Right: Proposed Doctor Fix with action buttons).
- `applyGuidedStepAction(action, params)`: Sends `/api/audit/apply-action`, advances queue index, updates progress bar, and shows Completion Card when index reaches end of queue.

- [ ] **Step 3: Implement Post-Import Triage Auto-Trigger (`handleImportComplete`)**

In `public/js/app.js`, update `processImport()` callback to immediately open `#import-triage-modal` with newly imported stats and offer a 1-click button to `startGuidedSession()`.

---

### Task 4: Integration Verification & End-to-End Testing

**Files:**
- Test: All components in local browser environment.

- [ ] **Step 1: Test World Doctor Dashboard & Scope Selector**
  - Open World Doctor; verify health score, metrics cards, and switching world scope dropdown.

- [ ] **Step 2: Test Guided Repair Session Flow**
  - Click "Start Guided Repair Session"; verify 1-by-1 stepping through misclassifications, duplicates, and stubs. Verify final completion screen updates vault health score.

- [ ] **Step 3: Test Post-Import Triage Popup**
  - Import a ZIP archive; verify post-import triage dialog pops up automatically and seamlessly transitions into the Guided Repair Session.
