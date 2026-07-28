# Phase 3: AI Scene Co-Writer, Character Personas & Chapter Studio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the AI Scene Co-Writer & Chapter Studio featuring split-screen manuscript editing, floating `[[WikiLink]]` auto-complete popover, Character Persona Manager (thoughts, wants, needs, speech quirks), Dynamic History Logs, 💬 Persona Interviewer Chat Console, 👁️ POV Perspective Invoker, and AI Beat Prompter.

**Architecture:** Node.js Express backend in `server.js` adds `character_personas`, `character_history`, and `scenes` SQLite tables alongside Gemini endpoints (`/api/personas/interview`, `/api/scene/pov-rewrite`, `/api/scene/suggest-beats`). Frontend in `public/index.html` adds the `🎬 Scene Studio` main view tab, `#scene-drawer` slide-over, `#wikilink-autocomplete-popover`, and Persona Interviewer UI.

**Tech Stack:** Express, SQLite, Fetch API, HTML5/CSS3.

---

### Task 1: Backend Persona Storage, History Log & AI Synthesis Endpoints

**Files:**
- Modify: `server.js`

**Interfaces:**
- Tables: `character_personas`, `character_history`, `scenes`
- Endpoints: `POST /api/personas`, `GET /api/personas/:id`, `POST /api/personas/interview`, `POST /api/scene/pov-rewrite`, `POST /api/scene/suggest-beats`

- [ ] **Step 1: Create SQLite tables in `server.js`**
Add table initialization:
```javascript
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS character_personas (
    character_id TEXT PRIMARY KEY,
    thoughts TEXT,
    wants TEXT,
    needs TEXT,
    speech_mannerisms TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS character_history (
    id TEXT PRIMARY KEY,
    character_id TEXT,
    chapter_id TEXT,
    event_text TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS scenes (
    id TEXT PRIMARY KEY,
    chapter_id TEXT,
    title TEXT,
    content TEXT,
    word_count INTEGER DEFAULT 0,
    active_cast TEXT,
    location_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
});
```

- [ ] **Step 2: Add `POST /api/personas/interview` in `server.js`**
```javascript
app.post('/api/personas/interview', async (req, res) => {
  const { characterId, characterName, question, persona, history } = req.body;
  const serverCfg = getAIConfig();
  const activeKey = serverCfg.apiKey || process.env.GEMINI_API_KEY || '';

  const personaContext = `CHARACTER: ${characterName || characterId}
Inner Thoughts: ${persona?.thoughts || 'Direct, practical'}
Wants/Desires: ${persona?.wants || 'Protect companions'}
Needs/Vulnerabilities: ${persona?.needs || 'Overcome past losses'}
Speech Quirks: ${persona?.speech_mannerisms || 'Short, military phrasing'}
History Log: ${(history || []).join('; ')}`;

  const prompt = `You are roleplaying as ${characterName || characterId}.
STRICTLY adopt this character's persona, speech mannerisms, worldview, and memory log below:

${personaContext}

USER QUESTION: "${question}"

Respond 100% IN-CHARACTER in the first person ("I"). Keep your response authentic, concise, and aligned with your speech mannerisms and history.`;

  if (activeKey) {
    try {
      const candidateModels = ['gemini-flash-latest', 'gemini-2.0-flash', 'gemini-3.1-pro-preview', 'gemini-pro-latest'];
      for (const targetModel of candidateModels) {
        try {
          const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${activeKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
          });
          if (geminiRes.ok) {
            const gData = await geminiRes.json();
            const text = gData.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) return res.json({ characterName: characterName || characterId, reply: text });
          }
        } catch (e) {}
      }
    } catch (e) {}
  }

  return res.json({ characterName: characterName || characterId, reply: `[In-Character]: Regarding "${question}", I stand ready to defend our ground.` });
});
```

- [ ] **Step 3: Add `POST /api/scene/pov-rewrite` & `POST /api/scene/suggest-beats` in `server.js`**
```javascript
app.post('/api/scene/pov-rewrite', async (req, res) => {
  const { sceneText, characterName, persona, history } = req.body;
  const serverCfg = getAIConfig();
  const activeKey = serverCfg.apiKey || process.env.GEMINI_API_KEY || '';

  const prompt = `Re-write the following scene passage strictly through the First-Person ("I") perspective and emotional lens of ${characterName}.

CHARACTER PERSONA:
Thoughts: ${persona?.thoughts || ''}
Wants: ${persona?.wants || ''}
Needs: ${persona?.needs || ''}
Speech: ${persona?.speech_mannerisms || ''}
History: ${(history || []).join('; ')}

ORIGINAL SCENE:
${sceneText}

Write compelling, immersive POV prose:`;

  if (activeKey) {
    try {
      const candidateModels = ['gemini-flash-latest', 'gemini-2.0-flash', 'gemini-3.1-pro-preview', 'gemini-pro-latest'];
      for (const targetModel of candidateModels) {
        try {
          const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${activeKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
          });
          if (geminiRes.ok) {
            const gData = await geminiRes.json();
            const text = gData.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) return res.json({ povProse: text });
          }
        } catch (e) {}
      }
    } catch (e) {}
  }

  return res.json({ povProse: `I observe the scene unfold before me... ${sceneText}` });
});
```

- [ ] **Step 4: Test endpoints via node script**
Run node script testing `/api/personas/interview`.

- [ ] **Step 5: Commit task**
```bash
git add server.js
git commit -m "feat(api): add character personas, history log, interview, and POV rewrite endpoints"
```

---

### Task 2: `🎬 Scene Studio` Main Navigation View & Split Editor Layout

**Files:**
- Modify: `public/index.html`
- Modify: `public/css/styles.css`

- [ ] **Step 1: Add `🎬 Scene Studio` tab button to top nav header in `public/index.html`**
```html
<button class="nav-tab" data-tab="scene-studio-view" onclick="window.app.switchTab('scene-studio-view')">🎬 Scene Studio</button>
```

- [ ] **Step 2: Add `#scene-studio-view` split container in `public/index.html`**
```html
<div id="scene-studio-view" class="tab-content hidden" style="display:grid; grid-template-columns: 280px 1fr; gap:1rem; height:calc(100vh - 120px);">
  <!-- LEFT SIDEBAR: OUTLINE & PERSONA SYNC -->
  <aside style="background:#090d16; border:1px solid var(--border-color); border-radius:8px; padding:1rem; overflow-y:auto;">
    <h3 style="font-size:0.85rem; color:#38bdf8; margin-bottom:0.75rem; font-weight:700;">🎬 Manuscript & Scenes</h3>
    <div id="scene-studio-outline-list">
      <div style="font-size:0.8rem; color:var(--text-muted);">No scenes created yet.</div>
    </div>

    <hr style="border-color:var(--border-color); margin:1rem 0;">

    <h3 style="font-size:0.85rem; color:#f59e0b; margin-bottom:0.5rem; font-weight:700;">🎭 Active Persona Sync</h3>
    <div id="scene-studio-persona-sync" style="background:#0f172a; border:1px solid var(--border-color); border-radius:6px; padding:0.6rem; font-size:0.75rem; color:var(--text-secondary);">
      Hover or click any <code style="color:#38bdf8;">[[WikiLink]]</code> in the editor to inspect entity details.
    </div>
  </aside>

  <!-- RIGHT MAIN EDITOR -->
  <main style="display:flex; flex-direction:column; background:#090d16; border:1px solid var(--border-color); border-radius:8px; padding:1rem;">
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.75rem;">
      <input id="scene-title-input" type="text" placeholder="Scene Title (e.g. Ambushed in Merton)" style="background:transparent; border:none; border-bottom:1px solid var(--border-color); color:#fff; font-size:1.2rem; font-weight:700; width:60%; outline:none;" value="Ambushed in Merton">
      <div style="display:flex; gap:0.5rem; align-items:center;">
        <span id="scene-word-count" style="font-size:0.75rem; color:var(--text-muted);">0 words</span>
        <button class="btn btn-secondary" style="font-size:0.75rem; background:#0284c7; color:#fff;" onclick="window.app.suggestSceneBeats()">🤖 Suggest Beats</button>
        <button class="btn btn-secondary" style="font-size:0.75rem; background:#8b5cf6; color:#fff;" onclick="window.app.openPOVRewriteModal()">👁️ POV Rewrite</button>
        <button class="btn btn-primary" style="font-size:0.75rem;" onclick="window.app.saveCurrentScene()">Save Scene</button>
      </div>
    </div>

    <!-- RICH MANUSCRIPT EDITOR -->
    <textarea id="scene-manuscript-editor" style="flex:1; background:#020617; color:#e2e8f0; border:1px solid var(--border-color); border-radius:6px; padding:1rem; font-family:'Inter', sans-serif; font-size:0.95rem; line-height:1.6; resize:none; outline:none;" placeholder="Start writing your scene manuscript here... Use [[ to link characters or locations." onkeyup="window.app.handleManuscriptKeyup(event)"></textarea>
  </main>
</div>
```

- [ ] **Step 3: Commit task**
```bash
git add public/index.html public/css/styles.css
git commit -m "feat(ui): add Scene Studio split layout and main navigation tab"
```

---

### Task 3: Live `[[WikiLink]]` Floating Auto-Complete & Sidebar Sync

**Files:**
- Modify: `public/index.html`
- Modify: `public/js/app.js`

- [ ] **Step 1: Add floating popover markup in `public/index.html`**
```html
<div id="wikilink-autocomplete-popover" class="hidden" style="position:fixed; z-index:9999; background:#0f172a; border:1px solid #38bdf8; border-radius:6px; box-shadow:0 10px 25px rgba(0,0,0,0.5); width:240px; max-height:180px; overflow-y:auto; padding:0.3rem;">
  <div id="wikilink-popover-list"></div>
</div>
```

- [ ] **Step 2: Add auto-complete detection and selection in `public/js/app.js`**
Add `handleManuscriptKeyup(e)` to monitor typing `[[` and render matching titles from `this.articles`.

- [ ] **Step 3: Commit task**
```bash
git add public/index.html public/js/app.js
git commit -m "feat(editor): implement floating WikiLink auto-complete popover"
```

---

### Task 4: `💬 Persona Interviewer` Chat Console & `👁️ POV Invoker`

**Files:**
- Modify: `public/index.html`
- Modify: `public/js/app.js`

- [ ] **Step 1: Add Persona Interviewer Console in `public/index.html`**
```html
<div id="persona-interviewer-drawer" class="modal hidden">
  <div class="modal-backdrop" onclick="window.app.closePersonaInterviewer()"></div>
  <div class="modal-card" style="max-width: 600px;">
    <div class="modal-header">
      <h2>💬 Interview Character Persona</h2>
      <button class="close-btn" onclick="window.app.closePersonaInterviewer()">✕</button>
    </div>
    <div class="modal-body">
      <div style="margin-bottom:0.75rem;">
        <label style="font-size:0.8rem; color:var(--text-muted);">Select Character:</label>
        <select id="persona-character-select" style="background:#090d16; color:#38bdf8; border:1px solid var(--border-color); padding:0.3rem; border-radius:4px; font-size:0.85rem; width:100%; margin-top:0.25rem;"></select>
      </div>

      <div id="persona-chat-messages" style="background:#090d16; border:1px solid var(--border-color); border-radius:6px; padding:0.75rem; height:220px; overflow-y:auto; font-size:0.85rem; margin-bottom:0.75rem;">
        <div style="color:var(--text-muted);">Select a character and ask a question to prompt their persona...</div>
      </div>

      <div style="display:flex; gap:0.5rem;">
        <input id="persona-question-input" type="text" placeholder="Ask a question (e.g. Roland, what are you planning?)..." style="flex:1; background:#090d16; border:1px solid var(--border-color); color:#fff; border-radius:4px; padding:0.4rem 0.6rem; font-size:0.85rem;" onkeypress="if(event.key==='Enter') window.app.sendPersonaQuestion()">
        <button class="btn btn-primary" onclick="window.app.sendPersonaQuestion()">Ask</button>
      </div>
    </div>
  </div>
</div>
```

- [ ] **Step 2: Add frontend handlers in `public/js/app.js`**
Add `sendPersonaQuestion()`, `insertPersonaReplyToScene()`, `suggestSceneBeats()`, and `openPOVRewriteModal()` in `public/js/app.js`.

- [ ] **Step 3: Commit task**
```bash
git add public/index.html public/js/app.js
git commit -m "feat(persona): implement Persona Interviewer console and POV perspective invoker"
```
