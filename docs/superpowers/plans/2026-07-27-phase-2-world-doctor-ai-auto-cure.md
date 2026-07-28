# Phase 2: Advanced World Doctor & AI Auto-Cure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the LLM-powered World Doctor suite featuring a World Health Score Card (`85 / 100`), Deep Gemini AI Narrative Audit, One-Click Conflict Harmonizer, Genre-Aware Auto-Cure Stubs, and Smart Cross-Linker with confidence badges.

**Architecture:** Node.js Express backend endpoints in `server.js` handle Gemini LLM audit synthesis, stub generation, and conflict harmonization. Frontend UI in `public/index.html` adds health score cards, stub preview modals, harmonize diff modals, and inline warning banners.

**Tech Stack:** Express, SQLite, Fetch API, HTML5/CSS3.

## Global Constraints
- Target workspace: `C:\Users\EthenGreening\.gemini\antigravity\scratch\lore-vault`
- Modals must be top-level siblings in `public/index.html`.
- Generated stubs must strictly adhere to WorldAnvil Simplified Standard syntax (`[quote]`, `[row]`/`[col]`, `[h2]`, `[b]`).

---

### Task 1: Backend Audit & Auto-Cure API Endpoints

**Files:**
- Modify: `server.js`

**Interfaces:**
- Consumes: `{ world_id, stubId, genre, conflictId, articleId }`
- Produces: `{ healthScore, summary, conflicts, content, suggestions }`

- [ ] **Step 1: Write `POST /api/audit/deep-ai` in `server.js`**
Add endpoint that runs Gemini over active world articles to detect timeline conflicts and calculate World Health Score:
```javascript
app.post('/api/audit/deep-ai', (req, res) => {
  const { world_id } = req.body;
  let sql = 'SELECT id, title, category, sub_category, summary, content FROM articles WHERE 1=1';
  const params = [];
  if (world_id && world_id !== 'all') {
    sql += ' AND (world_id = ? OR world_id IS NULL)';
    params.push(world_id);
  }

  db.all(sql, params, async (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!rows || rows.length === 0) {
      return res.json({ healthScore: 100, summary: "Vault is empty.", conflicts: [] });
    }

    const stubs = rows.filter(r => (r.content || '').length < 100);
    const serverCfg = getAIConfig();
    const activeKey = serverCfg.apiKey || process.env.GEMINI_API_KEY || '';

    // If no key, perform local heuristic analysis
    let healthScore = Math.max(50, 100 - (stubs.length * 4));
    let summary = `Your world contains ${rows.length} articles (${stubs.length} stubs).`;
    let conflicts = [];

    if (activeKey) {
      const payload = rows.slice(0, 12).map(r => `[${r.title}]: ${r.summary || r.content.substring(0, 400)}`).join('\n');
      const prompt = `Perform a deep narrative audit on these world lore articles. Detect timeline contradictions or conflicting facts.\n\nLORE:\n${payload}\n\nReturn JSON ONLY:\n{"healthScore": 85, "summary": "...", "conflicts": [{"id": "c1", "type": "timeline_conflict", "severity": "critical", "articleId1": "...", "articleTitle1": "...", "articleId2": "...", "articleTitle2": "...", "description": "...", "harmonizedText1": "...", "harmonizedText2": "..."}]}`;

      try {
        const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${activeKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });
        if (geminiRes.ok) {
          const gData = await geminiRes.json();
          const text = gData.candidates?.[0]?.content?.parts?.[0]?.text;
          const match = text.match(/\{[\s\S]*\}/);
          if (match) {
            const parsed = JSON.parse(match[0]);
            healthScore = parsed.healthScore || healthScore;
            summary = parsed.summary || summary;
            conflicts = parsed.conflicts || [];
          }
        }
      } catch (e) {}
    }

    res.json({ healthScore, summary, conflicts, stubCount: stubs.length });
  });
});
```

- [ ] **Step 2: Write `POST /api/audit/flesh-out-stub` & `POST /api/audit/harmonize` in `server.js`**
```javascript
app.post('/api/audit/flesh-out-stub', async (req, res) => {
  const { stubId, title, category, genre, world_id } = req.body;
  const serverCfg = getAIConfig();
  const activeKey = serverCfg.apiKey || process.env.GEMINI_API_KEY || '';

  const genreTone = genre || 'High Fantasy';
  const prompt = `Write a rich 2-paragraph world lore article for "${title}" (Category: ${category}) in the genre "${genreTone}".
STRICTLY use WorldAnvil Simplified Standard syntax:
[quote]“Quote text” | — Source[/quote]
[row]
[col]
[h1]Title[/h1]
Overview paragraph...
[/col]
[col]
[h3]Sidebar Title[/h3]
[table]
[tr][th]Property[/th][th]Value[/th][/tr]
[tr][td][b]Type:[/b][/td][td]Value[/td][/tr]
[/table]
[/col]
[/row]
[hr]
[h2]I. Historical Lore[/h2]
Detailed paragraph...`;

  if (activeKey) {
    try {
      const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${activeKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });
      if (geminiRes.ok) {
        const gData = await geminiRes.json();
        const text = gData.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) return res.json({ id: stubId, title, content: text });
      }
    } catch (e) {}
  }

  // Local Fallback Standard Template
  const fallback = `[quote]“A cornerstone of ${genreTone} lore.” | — Imperial Archives[/quote]\n\n[row]\n[col]\n[h1]${title}[/h1]\n${title} is a prominent ${category.toLowerCase()} entry in your world setting.\n[/col]\n[col]\n[h3]Overview[/h3]\n[table]\n[tr][th]Field[/th][th]Detail[/th][/tr]\n[tr][td][b]Category:[/b][/td][td]${category}[/td][/tr]\n[/table]\n[/col]\n[/row]\n[hr]\n[h2]I. Details[/h2]\n[b]Lore Record:[/b] Chronicles note its significance in recent history.`;
  return res.json({ id: stubId, title, content: fallback });
});

app.post('/api/audit/harmonize', (req, res) => {
  const { articleId1, newContent1, articleId2, newContent2 } = req.body;
  if (articleId1 && newContent1) {
    db.run('UPDATE articles SET content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [newContent1, articleId1]);
    syncFileToStorage(articleId1, newContent1);
  }
  if (articleId2 && newContent2) {
    db.run('UPDATE articles SET content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [newContent2, articleId2]);
    syncFileToStorage(articleId2, newContent2);
  }
  res.json({ message: 'Lore harmonized successfully across both articles!' });
});
```

- [ ] **Step 3: Test endpoints via node script**
Run: `node -e "fetch('http://localhost:3000/api/audit/deep-ai', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({world_id:'all'})}).then(r=>r.json()).then(console.log)"`
Expected: `{ healthScore: ..., summary: ..., conflicts: [...] }`

- [ ] **Step 4: Commit task**
```bash
git add server.js
git commit -m "feat(audit): add deep AI audit, stub flesh-out, and harmonize endpoints"
```

---

### Task 2: World Doctor UI Extensions & World Health Score Card

**Files:**
- Modify: `public/index.html`
- Modify: `public/css/styles.css`

- [ ] **Step 1: Add World Health Score Card & Deep AI Audit Tab in `public/index.html`**
Update `#doctor-modal` body:
```html
<div class="health-card" style="background:#090d16; border:1px solid var(--border-color); border-radius:8px; padding:1rem; display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
  <div>
    <div style="font-size:0.75rem; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.05em;">World Vault Health</div>
    <div id="doctor-health-summary" style="font-size:0.85rem; color:#e2e8f0; margin-top:0.25rem;">Analyzing vault status...</div>
  </div>
  <div id="doctor-health-score-badge" style="font-size:1.5rem; font-weight:800; padding:0.4rem 0.8rem; background:rgba(74,222,128,0.15); color:#4ade80; border:1px solid rgba(74,222,128,0.3); border-radius:8px;">
    -- / 100
  </div>
</div>
```

- [ ] **Step 2: Add Deep AI Audit Section in `public/index.html`**
```html
<div style="margin-top:1.25rem;">
  <h3 style="font-size:0.9rem; color:#38bdf8; margin-bottom:0.5rem; display:flex; justify-content:space-between; align-items:center;">
    <span>🤖 Deep AI Narrative Audit</span>
    <button class="btn btn-secondary" style="font-size:0.75rem; padding:0.25rem 0.6rem; background:#0284c7; color:#fff;" onclick="window.app.runDeepAIAudit()">🤖 Run Deep AI Audit</button>
  </h3>
  <div id="doctor-deep-ai-list" style="max-height:160px; overflow-y:auto; background:#090d16; border:1px solid var(--border-color); border-radius:6px; padding:0.5rem;">
    <div style="color:var(--text-muted); font-size:0.8rem; text-text-align:center; padding:0.75rem;">Click 'Run Deep AI Audit' to analyze narrative consistency.</div>
  </div>
</div>
```

- [ ] **Step 3: Commit task**
```bash
git add public/index.html public/css/styles.css
git commit -m "feat(ui): add World Health Score card and Deep AI Audit section"
```

---

### Task 3: Stub Preview Modal & Harmonize Diff Modal

**Files:**
- Modify: `public/index.html`

- [ ] **Step 1: Add Stub Preview Modal (`#stub-preview-modal`) to `public/index.html`**
```html
<div id="stub-preview-modal" class="modal hidden">
  <div class="modal-backdrop" onclick="window.app.closeStubPreviewModal()"></div>
  <div class="modal-card" style="max-width: 720px;">
    <div class="modal-header">
      <h2 id="stub-preview-title">🪄 AI Generated Lore Preview</h2>
      <button class="close-btn" onclick="window.app.closeStubPreviewModal()">✕</button>
    </div>
    <div class="modal-body">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.75rem;">
        <label style="font-size:0.8rem; color:var(--text-muted);">Genre & Tone:</label>
        <select id="stub-genre-select" style="background:#090d16; color:#38bdf8; border:1px solid var(--border-color); border-radius:4px; padding:0.25rem 0.5rem; font-size:0.8rem;" onchange="window.app.regenerateStubPreview()">
          <option value="High Fantasy">High Fantasy</option>
          <option value="Dark & Gritty">Dark & Gritty</option>
          <option value="Sci-Fi / Cyberpunk">Sci-Fi / Cyberpunk</option>
          <option value="Gothic Horror">Gothic Horror</option>
        </select>
      </div>
      <div id="stub-rendered-preview" style="background:#090d16; border:1px solid var(--border-color); border-radius:6px; padding:1rem; max-height:300px; overflow-y:auto;">
        Rendering lore...
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="window.app.closeStubPreviewModal()">Cancel</button>
      <button class="btn btn-primary" onclick="window.app.saveGeneratedStubLore()">Accept & Save Lore</button>
    </div>
  </div>
</div>
```

- [ ] **Step 2: Add Conflict Harmonize Diff Modal (`#harmonize-diff-modal`) to `public/index.html`**
```html
<div id="harmonize-diff-modal" class="modal hidden">
  <div class="modal-backdrop" onclick="window.app.closeHarmonizeModal()"></div>
  <div class="modal-card" style="max-width: 800px;">
    <div class="modal-header">
      <h2>🪄 One-Click AI Harmonize Resolution</h2>
      <button class="close-btn" onclick="window.app.closeHarmonizeModal()">✕</button>
    </div>
    <div class="modal-body" style="display:grid; grid-template-columns: 1fr 1fr; gap:1rem;">
      <div>
        <h4 id="harmonize-title-1" style="font-size:0.85rem; color:#f43f5e; margin-bottom:0.4rem;">Article 1</h4>
        <div id="harmonize-content-1" style="background:#090d16; border:1px solid var(--border-color); border-radius:6px; padding:0.75rem; font-size:0.8rem; max-height:260px; overflow-y:auto;"></div>
      </div>
      <div>
        <h4 id="harmonize-title-2" style="font-size:0.85rem; color:#4ade80; margin-bottom:0.4rem;">Article 2</h4>
        <div id="harmonize-content-2" style="background:#090d16; border:1px solid var(--border-color); border-radius:6px; padding:0.75rem; font-size:0.8rem; max-height:260px; overflow-y:auto;"></div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="window.app.closeHarmonizeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="window.app.applyHarmonizedResolution()">Apply Harmonized Lore</button>
    </div>
  </div>
</div>
```

- [ ] **Step 3: Commit task**
```bash
git add public/index.html
git commit -m "feat(ui): add stub preview modal and harmonize diff modal"
```

---

### Task 4: Frontend Controller Logic & Inline Warning Banners

**Files:**
- Modify: `public/js/app.js`

- [ ] **Step 1: Add frontend methods in `public/js/app.js`**
Add `runDeepAIAudit()`, `fleshOutStubPreview()`, `saveGeneratedStubLore()`, `openHarmonizeModal()`, `applyHarmonizedResolution()` to `LoreApp` class in `public/js/app.js`.

- [ ] **Step 2: Add inline warning banner rendering in `loadArticle()`**
In `loadArticle()`, check if `this.currentArticle` has flagged conflicts and render warning banner at top of `#article-viewer`.

- [ ] **Step 3: Commit task**
```bash
git add public/js/app.js
git commit -m "feat(app): implement frontend audit, harmonize diff, and inline warning banner logic"
```
