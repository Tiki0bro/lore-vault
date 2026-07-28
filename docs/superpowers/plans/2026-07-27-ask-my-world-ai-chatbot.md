# Phase 1: "Ask My World" AI Chatbot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a collapsible slide-over AI Chatbot drawer (`💬 Ask AI`) that queries the active world database for lore context and uses Google Gemini API (or Ollama/Offline engine) to answer user questions with clickable inline `[[WikiLinks]]`.

**Architecture:** Node.js Express backend (`POST /api/ai/ask`) handles lore search & LLM context synthesis. Frontend Vanilla JS drawer (`#ai-chat-drawer`) manages chat history, category filtering, and WikiLink click routing.

**Tech Stack:** Express, SQLite, Fetch API, HTML5/CSS3.

## Global Constraints
- Target workspace: `C:\Users\EthenGreening\.gemini\antigravity\scratch\lore-vault`
- HTML elements must be top-level siblings without nested modal wrapping.
- All mentioned lore titles in AI responses must be rendered as clickable `[[WikiLinks]]`.

---

### Task 1: Backend Q&A API Endpoint (`POST /api/ai/ask`)

**Files:**
- Modify: `server.js`

**Interfaces:**
- Consumes: `{ question, world_id, category, provider, apiKey, model }`
- Produces: `{ answer, sources }`

- [ ] **Step 1: Write backend endpoint implementation**
Add `POST /api/ai/ask` in `server.js`:
```javascript
app.post('/api/ai/ask', (req, res) => {
  const { question, world_id, category, provider, apiKey, model } = req.body;
  if (!question) return res.status(400).json({ error: 'Question is required.' });

  const world = world_id || 'default';
  let sql = 'SELECT id, title, category, summary, content FROM articles WHERE (world_id = ? OR world_id IS NULL)';
  const params = [world];

  if (category && category !== 'all') {
    sql += ' AND category = ?';
    params.push(category);
  }

  db.all(sql, params, async (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });

    // Simple keyword relevance ranking
    const qWords = question.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const ranked = rows.map(r => {
      let score = 0;
      const text = (r.title + ' ' + r.summary + ' ' + r.content).toLowerCase();
      qWords.forEach(w => { if (text.includes(w)) score += 2; });
      return { ...r, score };
    }).sort((a, b) => b.score - a.score).slice(0, 8);

    const contextPayload = ranked.map(r => `--- ARTICLE: ${r.title} (Category: ${r.category}) ---\n${r.content.substring(0, 1000)}`).join('\n\n');

    const prompt = `You are the canonical World Lore Assistant for LoreVault. Use ONLY the following verified world lore to answer the user's question accurately.
If an article is mentioned, wrap its exact title in [[WikiLink]] syntax (e.g. [[House Ravenwing]]).
Be concise, engaging, and faithful to the lore context provided below.

--- VERIFIED LORE CONTEXT ---
${contextPayload || 'No specific matching articles found.'}

--- USER QUESTION ---
${question}`;

    // LLM Call Handling (Gemini / Ollama / OpenAI / Offline Fallback)
    try {
      if (provider === 'gemini' && apiKey) {
        const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model || 'gemini-1.5-flash'}:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });
        if (geminiRes.ok) {
          const gData = await geminiRes.json();
          const text = gData.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) return res.json({ answer: text, sources: ranked.map(r => ({ id: r.id, title: r.title })) });
        }
      }
    } catch (e) {}

    // Offline / Fallback generator
    const fallbackAnswer = `Based on your lore database for ${ranked.length > 0 ? '[[' + ranked[0].title + ']]' : 'your world'}:\n\n${ranked.length > 0 ? ranked[0].summary : 'No specific details found.'}\n\nFor full details, inspect your lore articles.`;
    return res.json({ answer: fallbackAnswer, sources: ranked.map(r => ({ id: r.id, title: r.title })) });
  });
});
```

- [ ] **Step 2: Verify endpoint via curl / node test**
Run: `node -e "fetch('http://localhost:3000/api/ai/ask', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({question:'Who is Alwin?', world_id:'default'})}).then(r=>r.json()).then(console.log)"`
Expected: `{ answer: "...", sources: [...] }`

- [ ] **Step 3: Commit task**
```bash
git add server.js
git commit -m "feat(ai): add POST /api/ai/ask backend endpoint for lore Q&A"
```

---

### Task 2: AI Chat Drawer HTML & CSS Layout

**Files:**
- Modify: `public/index.html`
- Modify: `public/css/styles.css`

- [ ] **Step 1: Add Ask AI Header Button & Drawer HTML**
In `public/index.html`, add `💬 Ask AI` button to header:
```html
<button class="btn btn-secondary" style="background:#0284c7; color:#fff;" onclick="window.toggleAIChatDrawer()">
  <span>💬</span> Ask AI
</button>
```

Add slide-over `#ai-chat-drawer` at the end of body before `<script>` tags:
```html
<aside id="ai-chat-drawer" class="chat-drawer hidden">
  <div class="drawer-header">
    <div style="display:flex; align-items:center; gap:0.5rem;">
      <span style="font-size:1.1rem;">💬</span>
      <h3 style="font-size:0.95rem; font-weight:700; margin:0;">Ask My World AI</h3>
    </div>
    <div style="display:flex; align-items:center; gap:0.5rem;">
      <select id="chat-category-filter" style="background:#090d16; color:#38bdf8; border:1px solid var(--border-color); border-radius:4px; font-size:0.75rem; padding:0.2rem 0.4rem;">
        <option value="all">All Categories</option>
        <option value="Characters">Characters</option>
        <option value="Locations">Locations</option>
        <option value="Factions">Factions</option>
        <option value="Species">Species</option>
        <option value="Magic & Tech">Magic & Tech</option>
        <option value="History">History</option>
        <option value="Items">Items</option>
      </select>
      <button class="close-btn" onclick="window.toggleAIChatDrawer()">✕</button>
    </div>
  </div>

  <div id="chat-messages-container" class="drawer-messages">
    <div class="chat-message ai-message">
      👋 Hello! Ask me any question about your active world lore, characters, or locations.
    </div>
  </div>

  <div class="drawer-footer">
    <textarea id="chat-input-field" rows="2" placeholder="Ask a question about your world lore..." onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();window.app.sendChatMessage();}"></textarea>
    <div style="display:flex; justify-content:space-between; align-items:center; margin-top:0.4rem;">
      <button class="btn-text" style="font-size:0.75rem;" onclick="window.app.clearChatMessages()">🗑️ Clear</button>
      <button class="btn btn-primary" style="font-size:0.8rem; padding:0.3rem 0.75rem;" onclick="window.app.sendChatMessage()">Send ➔</button>
    </div>
  </div>
</aside>
```

- [ ] **Step 2: Add CSS for Slide-Over Drawer in `public/css/styles.css`**
```css
/* AI Chat Slide-Over Drawer */
.chat-drawer {
  position: fixed;
  top: 0; right: 0; bottom: 0;
  width: 380px;
  max-width: 90vw;
  background: #0b1120;
  border-left: 1px solid var(--border-color);
  box-shadow: -4px 0 20px rgba(0,0,0,0.5);
  display: flex;
  flex-direction: column;
  z-index: 900;
  transition: transform 0.3s ease;
}
.chat-drawer.hidden {
  display: none !important;
}
.drawer-header {
  padding: 0.85rem 1rem;
  background: #090d16;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.drawer-messages {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.chat-message {
  padding: 0.6rem 0.85rem;
  border-radius: 8px;
  font-size: 0.85rem;
  line-height: 1.5;
}
.user-message {
  align-self: flex-end;
  background: #1e293b;
  color: #f8fafc;
  border: 1px solid rgba(56,189,248,0.2);
}
.ai-message {
  align-self: flex-start;
  background: #0f172a;
  color: #e2e8f0;
  border: 1px solid var(--border-color);
}
.drawer-footer {
  padding: 0.85rem 1rem;
  background: #090d16;
  border-top: 1px solid var(--border-color);
}
.drawer-footer textarea {
  width: 100%;
  background: #0f172a;
  color: #fff;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 0.5rem;
  font-size: 0.85rem;
  resize: none;
  outline: none;
}
```

- [ ] **Step 3: Commit task**
```bash
git add public/index.html public/css/styles.css
git commit -m "feat(ui): add Ask AI slide-over chat drawer layout"
```

---

### Task 3: Frontend Chat Logic & WikiLink Parser Binding

**Files:**
- Modify: `public/js/app.js`

- [ ] **Step 1: Add chat methods to LoreApp in `public/js/app.js`**
```javascript
  async sendChatMessage() {
    const inputEl = document.getElementById('chat-input-field');
    const container = document.getElementById('chat-messages-container');
    const categorySelect = document.getElementById('chat-category-filter');

    const question = inputEl.value.trim();
    if (!question) return;

    const category = categorySelect ? categorySelect.value : 'all';
    inputEl.value = '';

    // Append User Message
    container.innerHTML += `<div class="chat-message user-message">${escapeHtml(question)}</div>`;
    container.scrollTop = container.scrollHeight;

    // Append Loading Message
    const loadingId = 'ai-loading-' + Date.now();
    container.innerHTML += `<div id="${loadingId}" class="chat-message ai-message">🤖 Searching world lore...</div>`;
    container.scrollTop = container.scrollHeight;

    const provider = localStorage.getItem('lore_ai_provider') || 'offline';
    const apiKey = localStorage.getItem('lore_ai_key') || '';
    const model = localStorage.getItem('lore_ai_model') || '';

    try {
      const res = await fetch('/api/ai/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          world_id: this.currentWorldId || 'default',
          category,
          provider,
          apiKey,
          model
        })
      });

      const data = await res.json();
      const loadingEl = document.getElementById(loadingId);

      if (loadingEl) {
        // Parse WikiLinks inside answer into clickable HTML links
        const formattedAnswer = window.WAParser ? window.WAParser.parseWikiLinks(data.answer) : data.answer;
        loadingEl.innerHTML = `<div>${formattedAnswer}</div>`;
      }
      container.scrollTop = container.scrollHeight;

    } catch (err) {
      const loadingEl = document.getElementById(loadingId);
      if (loadingEl) loadingEl.textContent = 'Chat Error: ' + err.message;
    }
  }

  clearChatMessages() {
    const container = document.getElementById('chat-messages-container');
    if (container) {
      container.innerHTML = `<div class="chat-message ai-message">👋 Hello! Ask me any question about your active world lore.</div>`;
    }
  }
```

Add fail-safe window helper:
```javascript
window.toggleAIChatDrawer = function() {
  const drawer = document.getElementById('ai-chat-drawer');
  if (drawer) {
    drawer.classList.toggle('hidden');
  }
};
```

- [ ] **Step 2: Commit task**
```bash
git add public/js/app.js
git commit -m "feat(app): add sendChatMessage and toggleAIChatDrawer frontend handlers"
```
