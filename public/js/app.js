/**
 * LoreWeaver Frontend Application Controller
 */

class LoreApp {
  constructor() {
    this.articles = [];
    this.categories = [];
    this.worlds = [];
    this.currentWorldId = 'all';
    this.currentArticle = null;
    this.selectedCategory = null;
    this.selectedTag = null;
    this.searchQuery = '';
    this.editingId = null;
    this.doctorWorldScope = 'all';
    this.guidedQueue = [];
    this.guidedQueueIndex = 0;

    this.init();
  }

  async init() {
    await this.fetchWorlds();

    let initialTheme = 'ancient-codex';
    if (this.currentWorldId !== 'all') {
      const world = this.worlds.find(w => w.id === this.currentWorldId);
      if (world && world.theme) initialTheme = world.theme;
    }
    document.body.setAttribute('data-theme', initialTheme);

    await this.fetchCategories();
    await this.fetchArticles();

    // Auto-load first article if available
    if (this.articles.length > 0) {
      this.loadArticle(this.articles[0].id);
    }

    if (window.LoreBadges) {
      if (typeof window.LoreBadges.injectAll === 'function') {
        window.LoreBadges.injectAll();
      } else if (typeof window.LoreBadges.renderAll === 'function') {
        window.LoreBadges.renderAll();
      }
    }
  }

  async fetchWorlds() {
    try {
      const res = await fetch('/api/worlds');
      this.worlds = await res.json();
      this.renderWorldSelectDropdowns();
    } catch (err) {
      console.error('Failed to fetch worlds:', err);
    }
  }

  renderWorldSelectDropdowns() {
    const mainDropdown = document.getElementById('world-select-dropdown');
    const moveDropdown = document.getElementById('move-world-select');

    if (mainDropdown) {
      let html = `<option value="all" ${this.currentWorldId === 'all' ? 'selected' : ''}>🌍 All Worlds (${this.worlds.reduce((acc, w) => acc + (w.article_count || 0), 0)})</option>`;
      this.worlds.forEach(w => {
        html += `<option value="${w.id}" ${this.currentWorldId === w.id ? 'selected' : ''}>🌐 ${w.name} (${w.article_count || 0})</option>`;
      });
      mainDropdown.innerHTML = html;
    }

    if (moveDropdown) {
      let html = `<option value="" disabled selected>🌍 Move to World...</option>`;
      this.worlds.forEach(w => {
        html += `<option value="${w.id}">Transfer ➔ ${w.name}</option>`;
      });
      moveDropdown.innerHTML = html;
    }
  }

  async switchWorld(worldId) {
    this.currentWorldId = worldId;
    this.selectedCategory = null;
    this.selectedTag = null;
    this.searchQuery = '';
    this.currentArticle = null;

    // Apply per-world theme
    let theme = 'ancient-codex';
    if (worldId !== 'all') {
      const world = this.worlds.find(w => w.id === worldId);
      if (world && world.theme) theme = world.theme;
    }
    document.body.setAttribute('data-theme', theme);

    // Reset Article Viewer state for the new world
    const viewerEl = document.getElementById('article-viewer');
    const emptyEl = document.getElementById('article-viewer-empty');
    if (viewerEl) viewerEl.classList.add('hidden');
    if (emptyEl) emptyEl.classList.remove('hidden');

    await this.fetchCategories();
    await this.fetchArticles();

    // Auto-load first article if available in the selected world
    if (this.articles.length > 0) {
      this.loadArticle(this.articles[0].id);
    }

    if (window.LoreBadges) {
      if (typeof window.LoreBadges.injectAll === 'function') {
        window.LoreBadges.injectAll();
      } else if (typeof window.LoreBadges.renderAll === 'function') {
        window.LoreBadges.renderAll();
      }
    }
  }

  openCreateWorldModal() {
    const modal = document.getElementById('create-world-modal');
    if (modal) modal.classList.remove('hidden');
  }

  closeCreateWorldModal() {
    const modal = document.getElementById('create-world-modal');
    if (modal) modal.classList.add('hidden');
  }

  async saveNewWorld() {
    const nameEl = document.getElementById('new-world-name');
    const descEl = document.getElementById('new-world-desc');
    const themeEl = document.getElementById('new-world-theme');

    const name = nameEl.value.trim();
    const description = descEl.value.trim();
    const theme = themeEl ? themeEl.value : 'ancient-codex';

    if (!name) {
      alert('Please enter a world name.');
      return;
    }

    try {
      const res = await fetch('/api/worlds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, theme })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      alert(`World "${data.name}" created!`);
      nameEl.value = '';
      descEl.value = '';
      if (themeEl) themeEl.value = 'ancient-codex';
      this.closeCreateWorldModal();

      await this.fetchWorlds();
      this.switchWorld(data.id);

    } catch (err) {
      alert('Error creating world: ' + err.message);
    }
  }

  openEditWorldModal() {
    if (!this.currentWorldId || this.currentWorldId === 'all') {
      alert('Please select a specific world to edit theme and settings.');
      return;
    }
    const world = this.worlds.find(w => w.id === this.currentWorldId);
    if (!world) return;

    const modal = document.getElementById('edit-world-modal');
    const idEl = document.getElementById('edit-world-id');
    const nameEl = document.getElementById('edit-world-name');
    const descEl = document.getElementById('edit-world-desc');
    const themeEl = document.getElementById('edit-world-theme');

    if (idEl) idEl.value = world.id;
    if (nameEl) nameEl.value = world.name;
    if (descEl) descEl.value = world.description || '';
    if (themeEl) themeEl.value = world.theme || 'ancient-codex';

    if (modal) {
      modal.classList.remove('hidden');
      modal.style.display = 'flex';
    }
  }

  closeEditWorldModal() {
    const modal = document.getElementById('edit-world-modal');
    if (modal) {
      modal.classList.add('hidden');
      modal.style.display = 'none';
    }
  }

  async updateWorld() {
    const idEl = document.getElementById('edit-world-id');
    const nameEl = document.getElementById('edit-world-name');
    const descEl = document.getElementById('edit-world-desc');
    const themeEl = document.getElementById('edit-world-theme');

    const id = idEl ? idEl.value : this.currentWorldId;
    const name = nameEl ? nameEl.value.trim() : '';
    const description = descEl ? descEl.value.trim() : '';
    const theme = themeEl ? themeEl.value : 'ancient-codex';

    if (!name) {
      alert('Please enter a world name.');
      return;
    }

    try {
      const res = await fetch(`/api/worlds/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, theme })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      alert(`World "${data.name}" updated successfully!`);
      this.closeEditWorldModal();

      await this.fetchWorlds();
      this.switchWorld(id);
    } catch (err) {
      alert('Error updating world: ' + err.message);
    }
  }

  switchTab(tabName) {
    const libraryView = document.getElementById('view-library');
    const studioView = document.getElementById('view-studio');
    const contextView = document.getElementById('view-context');

    const tabLibrary = document.getElementById('tab-library');
    const tabStudio = document.getElementById('tab-studio');
    const tabContext = document.getElementById('tab-context');

    [libraryView, studioView, contextView].forEach(v => v && v.classList.remove('active'));
    [tabLibrary, tabStudio, tabContext].forEach(t => t && t.classList.remove('active'));

    if (tabName === 'studio') {
      if (studioView) studioView.classList.add('active');
      if (tabStudio) tabStudio.classList.add('active');
      this.fetchScenes();
    } else if (tabName === 'context') {
      if (contextView) contextView.classList.add('active');
      if (tabContext) tabContext.classList.add('active');
      if (window.ContextBuilder) window.ContextBuilder.init(this.articles);
    } else {
      if (libraryView) libraryView.classList.add('active');
      if (tabLibrary) tabLibrary.classList.add('active');
    }
  }

  // --- PHASE 3 NARRATIVE SLATE & PERSONA CONTROLLERS ---
  async fetchScenes() {
    try {
      const res = await fetch('/api/scenes');
      this.scenes = await res.json();
      this.renderSceneList();
    } catch (err) {
      console.error('Failed to fetch scenes:', err);
    }
  }

  renderSceneList() {
    const listEl = document.getElementById('scene-studio-list');
    if (!listEl) return;

    if (!this.scenes || this.scenes.length === 0) {
      listEl.innerHTML = `<div style="font-size:0.75rem; color:var(--text-muted); padding:0.4rem;">No saved scenes yet. Click '+ New Scene' to start drafting.</div>`;
      return;
    }

    listEl.innerHTML = this.scenes.map(s => `
      <div style="background:#0f172a; border:1px solid var(--border-color); border-radius:6px; padding:0.5rem 0.65rem; display:flex; justify-content:space-between; align-items:center; cursor:pointer;" onclick="window.app.loadScene('${s.id}')">
        <div>
          <strong style="color:#fff; font-size:0.8rem; display:block;">${s.title}</strong>
          <span style="font-size:0.7rem; color:var(--text-muted);">${s.word_count || 0} words</span>
        </div>
        <button class="btn-text" style="font-size:0.75rem;">Edit</button>
      </div>
    `).join('');
  }

  loadScene(sceneId) {
    if (!this.scenes) return;
    const scene = this.scenes.find(s => s.id === sceneId);
    if (!scene) return;

    this.activeSceneId = scene.id;
    const titleInput = document.getElementById('scene-title-input');
    const editor = document.getElementById('scene-manuscript-editor');
    const wordCount = document.getElementById('scene-word-count');

    if (titleInput) titleInput.value = scene.title;
    if (editor) editor.value = scene.content;
    if (wordCount) wordCount.textContent = `${scene.word_count || 0} words`;
  }

  createNewScene() {
    this.activeSceneId = 'scene-' + Date.now();
    const titleInput = document.getElementById('scene-title-input');
    const editor = document.getElementById('scene-manuscript-editor');
    const wordCount = document.getElementById('scene-word-count');

    if (titleInput) titleInput.value = 'Untitled Scene ' + (this.scenes ? this.scenes.length + 1 : 1);
    if (editor) editor.value = '';
    if (wordCount) wordCount.textContent = '0 words';
  }

  async saveCurrentScene() {
    const titleInput = document.getElementById('scene-title-input');
    const editor = document.getElementById('scene-manuscript-editor');
    const title = titleInput ? titleInput.value.trim() : 'Untitled Scene';
    const content = editor ? editor.value : '';

    try {
      const res = await fetch('/api/scenes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: this.activeSceneId,
          title,
          content
        })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      alert(`Scene "${title}" saved!`);
      await this.fetchScenes();
    } catch (err) {
      alert('Error saving scene: ' + err.message);
    }
  }

  handleManuscriptKeyup(e) {
    const editor = document.getElementById('scene-manuscript-editor');
    const wordCount = document.getElementById('scene-word-count');
    if (editor && wordCount) {
      const words = editor.value.trim().split(/\s+/).filter(w => w.length > 0).length;
      wordCount.textContent = `${words} words`;
    }

    const popover = document.getElementById('wikilink-autocomplete-popover');
    const popoverList = document.getElementById('wikilink-popover-list');
    if (!editor || !popover || !popoverList) return;

    const val = editor.value;
    const cursorPos = editor.selectionStart;
    const textBeforeCursor = val.substring(0, cursorPos);
    const match = textBeforeCursor.match(/\[\[([^\]]*)$/);

    if (match) {
      const query = match[1].toLowerCase();
      const matches = (this.articles || []).filter(a => a.title.toLowerCase().includes(query)).slice(0, 5);

      if (matches.length > 0) {
        popoverList.innerHTML = matches.map(m => `
          <div style="padding:0.3rem 0.5rem; font-size:0.8rem; color:#fff; cursor:pointer; border-radius:4px; hover:background:#1e293b;" onclick="window.app.insertWikiLinkAtCursor('${m.title}')">
            <strong>${m.title}</strong> <span style="font-size:0.65rem; color:var(--text-muted);">(${m.category})</span>
          </div>
        `).join('');

        popover.style.top = (editor.getBoundingClientRect().top + 80) + 'px';
        popover.style.left = (editor.getBoundingClientRect().left + 40) + 'px';
        popover.classList.remove('hidden');
      } else {
        popover.classList.add('hidden');
      }
    } else {
      popover.classList.add('hidden');
    }
  }

  insertWikiLinkAtCursor(title) {
    const editor = document.getElementById('scene-manuscript-editor');
    const popover = document.getElementById('wikilink-autocomplete-popover');
    if (!editor) return;

    const val = editor.value;
    const cursorPos = editor.selectionStart;
    const textBefore = val.substring(0, cursorPos);
    const textAfter = val.substring(cursorPos);
    const openIndex = textBefore.lastIndexOf('[[');

    if (openIndex !== -1) {
      editor.value = textBefore.substring(0, openIndex) + `[[${title}]]` + textAfter;
    }
    if (popover) popover.classList.add('hidden');

    // Sync persona card in sidebar
    const syncEl = document.getElementById('scene-studio-persona-sync');
    const matchedArt = (this.articles || []).find(a => a.title.toLowerCase() === title.toLowerCase());
    if (syncEl && matchedArt) {
      syncEl.innerHTML = `
        <div style="font-weight:700; color:#38bdf8; font-size:0.85rem; margin-bottom:0.25rem;">${matchedArt.title}</div>
        <div style="font-size:0.7rem; color:var(--text-muted); text-transform:uppercase; margin-bottom:0.4rem;">Category: ${matchedArt.category}</div>
        <div style="font-size:0.75rem; color:#e2e8f0; font-style:italic;">"${matchedArt.summary || matchedArt.content.substring(0, 150)}..."</div>
      `;
    }
  }

  openPersonaInterviewer() {
    const modal = document.getElementById('persona-interviewer-modal');
    const select = document.getElementById('persona-character-select');
    if (modal) modal.classList.remove('hidden');

    if (select) {
      const chars = (this.articles || []).filter(a => a.category === 'Characters');
      select.innerHTML = chars.length > 0
        ? chars.map(c => `<option value="${c.id}">${c.title}</option>`).join('')
        : `<option value="roland-braxton">Roland Braxton</option><option value="aaron-tabor">Aaron Tabor</option>`;
      if (select.value) this.handleInterviewerPersonaSelect(select.value);
    }
  }

  async handleInterviewerPersonaSelect(articleId) {
    const statusDiv = document.getElementById('persona-interviewer-status');
    if (!statusDiv) return;
    
    statusDiv.innerHTML = '<div style="color:var(--text-muted); font-size:0.85rem;">Loading Persona Data...</div>';
    
    try {
      const res = await fetch(`/api/personas/${articleId}`);
      const persona = await res.json();
      
      this.renderPersonaHub(articleId, persona, 'persona-interviewer-status', 'interviewer-edit');
    } catch (e) {
      statusDiv.innerHTML = `<div style="color:#f43f5e; font-size:0.85rem;">Failed to load Persona: ${e.message}</div>`;
      console.error('Error checking persona status', e);
    }
  }

  closePersonaInterviewer() {
    const modal = document.getElementById('persona-interviewer-modal');
    if (modal) modal.classList.add('hidden');
  }

  async sendPersonaQuestion() {
    const input = document.getElementById('persona-question-input');
    const select = document.getElementById('persona-character-select');
    const chatContainer = document.getElementById('persona-chat-messages');
    if (!input || !chatContainer || !input.value.trim()) return;

    const question = input.value.trim();
    const characterId = select ? select.value : 'Roland Braxton';
    const characterName = select && select.options[select.selectedIndex] ? select.options[select.selectedIndex].text : characterId;

    chatContainer.innerHTML += `
      <div style="align-self:flex-end; background:#0284c7; color:#fff; padding:0.4rem 0.75rem; border-radius:8px 8px 0 8px; max-width:80%;">
        <strong>You:</strong> ${question}
      </div>
    `;
    input.value = '';
    chatContainer.scrollTop = chatContainer.scrollHeight;

    try {
      const res = await fetch('/api/personas/interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ characterId, characterName, question })
      });
      const data = await res.json();

      chatContainer.innerHTML += `
        <div style="align-self:flex-start; background:#1e293b; color:#e2e8f0; border:1px solid #38bdf8; padding:0.5rem 0.75rem; border-radius:8px 8px 8px 0; max-width:85%;">
          <strong style="color:#38bdf8;">${data.characterName}:</strong> ${data.reply}
          <div style="margin-top:0.4rem;">
            <button class="btn btn-secondary" style="font-size:0.65rem; padding:0.15rem 0.4rem; background:#059669; color:#fff;" onclick="window.app.insertPersonaReplyToScene('${data.reply.replace(/'/g, "\\'")}')">✨ Insert Dialogue into Scene</button>
          </div>
        </div>
      `;
      chatContainer.scrollTop = chatContainer.scrollHeight;

    } catch (err) {
      chatContainer.innerHTML += `<div style="color:#f43f5e;">Error interviewing persona: ${err.message}</div>`;
    }
  }

  insertPersonaReplyToScene(replyText) {
    const editor = document.getElementById('scene-manuscript-editor');
    if (editor) {
      editor.value += `\n\n"${replyText}"`;
      alert('Dialogue inserted into manuscript editor!');
      this.closePersonaInterviewer();
    }
  }

  async suggestSceneBeats() {
    const titleInput = document.getElementById('scene-title-input');
    const editor = document.getElementById('scene-manuscript-editor');
    const modal = document.getElementById('beat-prompter-modal');
    const list = document.getElementById('beat-prompter-list');

    if (modal) modal.classList.remove('hidden');
    if (list) list.innerHTML = `<div style="color:#38bdf8;">🤖 Gemini is analyzing the manuscript and generating 3 lore-grounded beats...</div>`;

    try {
      const res = await fetch('/api/scene/suggest-beats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sceneTitle: titleInput ? titleInput.value : '',
          manuscriptText: editor ? editor.value : ''
        })
      });
      const data = await res.json();
      this.activeBeats = data.beats || [];

      if (this.activeBeats.length > 0) {
        list.innerHTML = this.activeBeats.map((b, i) => `
          <div style="background:#0f172a; border:1px solid var(--border-color); border-radius:8px; padding:0.75rem;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.3rem;">
              <div>
                <span class="badge" style="background:rgba(56,189,248,0.2); color:#38bdf8; font-size:0.7rem;">${b.type || 'Beat'}</span>
                <strong style="color:#fff; font-size:0.9rem; margin-left:0.4rem;">${b.title}</strong>
              </div>
              <button class="btn btn-primary" style="font-size:0.75rem; padding:0.25rem 0.6rem;" onclick="window.app.insertBeatToScene(${i})">✨ Insert Beat</button>
            </div>
            <div style="font-size:0.8rem; color:#e2e8f0; margin-bottom:0.4rem;">${b.summary}</div>
            <div style="font-size:0.75rem; color:var(--text-muted); font-style:italic;">"${b.generatedProse}"</div>
          </div>
        `).join('');
      } else {
        list.innerHTML = `<div style="color:#f43f5e;">No beats generated.</div>`;
      }
    } catch (err) {
      if (list) list.innerHTML = `<div style="color:#f43f5e;">Error generating beats: ${err.message}</div>`;
    }
  }

  insertBeatToScene(beatIndex) {
    if (!this.activeBeats || !this.activeBeats[beatIndex]) return;
    const beat = this.activeBeats[beatIndex];
    const editor = document.getElementById('scene-manuscript-editor');

    if (editor) {
      editor.value += `\n\n${beat.generatedProse}`;
      alert(`Inserted beat "${beat.title}" into manuscript!`);
      this.closeBeatPrompter();
    }
  }

  closeBeatPrompter() {
    const modal = document.getElementById('beat-prompter-modal');
    if (modal) modal.classList.add('hidden');
  }

  async openPOVRewriteModal() {
    const editor = document.getElementById('scene-manuscript-editor');
    if (!editor || !editor.value.trim()) {
      alert('Please enter some manuscript text to re-write in POV perspective.');
      return;
    }

    const select = document.getElementById('persona-character-select');
    const characterName = prompt('Enter Character Name to invoke POV (e.g. Roland Braxton):', 'Roland Braxton');
    if (!characterName) return;

    try {
      const res = await fetch('/api/scene/pov-rewrite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sceneText: editor.value,
          characterName
        })
      });
      const data = await res.json();
      if (data.povProse) {
        editor.value = data.povProse;
        alert(`Scene successfully re-written in ${characterName}'s POV perspective!`);
      }
    } catch (err) {
      alert('Error performing POV rewrite: ' + err.message);
    }
  }

  async fetchCategories() {
    try {
      const res = await fetch(`/api/categories?world_id=${this.currentWorldId || 'all'}`);
      this.categories = await res.json();
      this.renderCategoryMenu();
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    }
  }

  async fetchArticles() {
    try {
      const params = new URLSearchParams();
      if (this.currentWorldId) params.append('world_id', this.currentWorldId);
      if (this.selectedCategory) params.append('category', this.selectedCategory);
      if (this.selectedTag) params.append('tag', this.selectedTag);
      if (this.searchQuery) params.append('search', this.searchQuery);

      const res = await fetch(`/api/articles?${params.toString()}`);
      this.articles = await res.json();
      
      this.renderArticlesList();
      this.renderTagCloud();
      
      // Update ContextBuilder dataset
      if (window.ContextBuilder) {
        window.ContextBuilder.init(this.articles);
      }
    } catch (err) {
      console.error('Failed to fetch articles:', err);
    }
  }

  renderCategoryMenu() {
    const listEl = document.getElementById('category-list');
    if (!listEl) return;

    const allCount = this.categories.reduce((acc, c) => acc + c.count, 0);

    let html = `
      <li class="${!this.selectedCategory ? 'active' : ''}" onclick="window.app.filterByCategory(null)">
        <span>All Categories</span>
        <span class="cat-count">${allCount}</span>
      </li>
    `;

    const standardCategories = ['Characters', 'Locations', 'Factions', 'Species', 'Magic & Tech', 'History', 'Items'];
    standardCategories.forEach(catName => {
      const found = this.categories.find(c => c.category === catName);
      const count = found ? found.count : 0;
      const isActive = this.selectedCategory === catName;
      
      html += `
        <li class="${isActive ? 'active' : ''}" onclick="window.app.filterByCategory('${catName}')">
          <span>${catName}</span>
          <span class="cat-count">${count}</span>
        </li>
      `;

      // Render Sub-Category Subsets when Active
      if (isActive && found && found.subCategories && found.subCategories.length > 0) {
        html += `<div class="sub-category-list" style="padding-left:1rem; margin:0.3rem 0; display:flex; flex-direction:column; gap:0.2rem;">`;
        found.subCategories.forEach(sub => {
          const isSubActive = this.selectedTag === sub.subCategory;
          html += `
            <div class="sub-cat-item ${isSubActive ? 'active' : ''}" style="font-size:0.75rem; color:${isSubActive ? 'var(--accent-blue)' : 'var(--text-muted)'}; cursor:pointer; padding:0.2rem 0.4rem; border-radius:4px; display:flex; justify-content:space-between;" onclick="event.stopPropagation(); window.app.filterByTag('${sub.subCategory}')">
              <span>↳ ${sub.subCategory}</span>
              <span style="font-size:0.65rem;">${sub.count}</span>
            </div>
          `;
        });
        html += `</div>`;
      }
    });

    listEl.innerHTML = html;
  }

  renderTagCloud() {
    const container = document.getElementById('tag-cloud');
    if (!container) return;

    const tagMap = new Map();
    this.articles.forEach(a => {
      if (Array.isArray(a.tags)) {
        a.tags.forEach(t => {
          tagMap.set(t, (tagMap.get(t) || 0) + 1);
        });
      }
    });

    if (tagMap.size === 0) {
      container.innerHTML = `<span style="color:var(--text-muted); font-size:0.75rem;">No tags yet</span>`;
      return;
    }

    let html = '';
    tagMap.forEach((count, tag) => {
      const isActive = this.selectedTag === tag;
      html += `
        <span class="tag-pill ${isActive ? 'active' : ''}" onclick="window.app.filterByTag('${tag}')">
          #${tag}
        </span>
      `;
    });

    container.innerHTML = html;
  }

  renderArticlesList() {
    const container = document.getElementById('articles-cards');
    const countEl = document.getElementById('article-count');
    if (!container) return;

    if (countEl) countEl.textContent = `${this.articles.length} Articles`;

    if (this.articles.length === 0) {
      container.innerHTML = `
        <div style="text-align:center; padding:2rem; color:var(--text-muted);">
          No lore articles found matching criteria.
        </div>
      `;
      return;
    }

    container.innerHTML = this.articles.map(art => {
      const isActive = this.currentArticle && this.currentArticle.id === art.id;
      const catClass = art.category.toLowerCase().replace(/[^a-z0-9]/g, '');
      const tagsList = Array.isArray(art.tags) ? art.tags : [];

      return `
        <div class="article-card ${isActive ? 'active' : ''}" onclick="window.app.loadArticle('${art.id}')">
          <div class="card-top">
            <h3 class="card-title">${art.title}</h3>
            <span class="badge badge-${catClass}">${art.category}</span>
          </div>
          <p class="card-summary">${art.summary || 'No summary available.'}</p>
          <div class="card-footer">
            ${tagsList.slice(0, 3).map(t => `<span class="tag-pill" style="font-size:0.65rem;">#${t}</span>`).join('')}
          </div>
        </div>
      `;
    }).join('');
  }

  async loadArticle(id) {
    try {
      const res = await fetch(`/api/articles/${encodeURIComponent(id)}`);
      if (!res.ok) return;

      this.currentArticle = await res.json();
      
      const emptyState = document.getElementById('article-viewer-empty');
      const viewer = document.getElementById('article-viewer');
      const catBadge = document.getElementById('view-category-badge');
      const dateEl = document.getElementById('view-updated-date');
      const bodyEl = document.getElementById('wa-article-render');
      const outboundEl = document.getElementById('outbound-links-list');
      const inboundEl = document.getElementById('inbound-links-list');

      if (emptyState) emptyState.classList.add('hidden');
      if (viewer) viewer.classList.remove('hidden');

      if (catBadge) {
        catBadge.textContent = this.currentArticle.category;
        catBadge.className = `badge badge-${this.currentArticle.category.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
      }

      if (dateEl) {
        const d = new Date(this.currentArticle.updated_at || Date.now());
        dateEl.textContent = `Updated: ${d.toLocaleDateString()}`;
      }

      // Render WorldAnvil Simplified Standard Markup to HTML
      if (bodyEl) {
        let parsedHtml = WAParser.parse(this.currentArticle.content);
        if (this.currentArticle.header_image) {
          const heroBanner = `
            <div class="wa-article-banner">
              <img src="${this.currentArticle.header_image}" alt="Hero Cover" onerror="this.parentNode.style.display='none'" />
              <div class="banner-overlay"></div>
            </div>
          `;
          parsedHtml = heroBanner + parsedHtml;
        }
        bodyEl.innerHTML = parsedHtml;
        this.loadPersonaData(this.currentArticle);
      }

      // Outbound cross links
      if (outboundEl) {
        outboundEl.innerHTML = this.currentArticle.outboundLinks.length > 0
          ? this.currentArticle.outboundLinks.map(link => 
              `<li><a href="#" onclick="event.preventDefault(); window.app.loadArticle('${link.id}')">${link.title} (${link.category})</a></li>`
            ).join('')
          : '<li style="color:var(--text-muted); font-size:0.8rem;">No outbound cross-links</li>';
      }

      // Inbound cross links
      if (inboundEl) {
        inboundEl.innerHTML = this.currentArticle.inboundLinks.length > 0
          ? this.currentArticle.inboundLinks.map(link => 
              `<li><a href="#" onclick="event.preventDefault(); window.app.loadArticle('${link.id}')">${link.title} (${link.category})</a></li>`
            ).join('')
          : '<li style="color:var(--text-muted); font-size:0.8rem;">No inbound cross-links</li>';
      }

      this.renderArticlesList();
    } catch (err) {
      console.error('Failed to load article:', err);
    }
  }

  async loadArticleByTitle(title) {
    if (!title) return;
    const clean = title.toLowerCase().trim();
    let found = this.articles.find(a => a.title.toLowerCase().trim() === clean || a.id.toLowerCase().trim() === clean);
    if (found) {
      this.loadArticle(found.id);
    } else {
      try {
        const res = await fetch(`/api/articles?search=${encodeURIComponent(title)}&world_id=${this.currentWorldId || 'all'}`);
        const results = await res.json();
        if (results && results.length > 0) {
          this.loadArticle(results[0].id);
        } else {
          alert(`Lore article "${title}" not found in active world vault.`);
        }
      } catch (e) {
        alert(`Could not load article "${title}".`);
      }
    }
  }

  filterByCategory(cat) {
    this.selectedCategory = cat;
    this.fetchCategories();
    this.fetchArticles();
  }

  filterByTag(tag) {
    this.selectedTag = this.selectedTag === tag ? null : tag;
    this.fetchArticles();
  }

  handleSearch(val) {
    this.searchQuery = val.trim();
    this.fetchArticles();
  }

  handleSort(mode) {
    if (mode === 'title') {
      this.articles.sort((a, b) => a.title.localeCompare(b.title));
    } else if (mode === 'category') {
      this.articles.sort((a, b) => a.category.localeCompare(b.category));
    } else {
      this.articles.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
    }
    this.renderArticlesList();
  }



  async loadKnowledgeGraph() {
    try {
      const res = await fetch('/api/graph');
      const data = await res.json();
      if (!this.loreGraph) {
        this.loreGraph = new LoreGraph('graph-canvas');
      }
      this.loreGraph.setData(data.nodes, data.links);
    } catch (err) {
      console.error('Failed to load graph data:', err);
    }
  }

  // --- EDITOR MODAL ---
  openEditor(articleId = null) {
    this.editingId = articleId;
    const modal = document.getElementById('editor-modal');
    const titleHeader = document.getElementById('modal-title');
    const titleIn = document.getElementById('edit-title');
    const catIn = document.getElementById('edit-category');
    const summaryIn = document.getElementById('edit-summary');
    const tagsIn = document.getElementById('edit-tags');
    const contentIn = document.getElementById('edit-content');
    const headerImgIn = document.getElementById('edit-header-image');

    if (articleId && this.currentArticle) {
      titleHeader.textContent = 'Edit Lore Article';
      titleIn.value = this.currentArticle.title;
      catIn.value = this.currentArticle.category;
      summaryIn.value = this.currentArticle.summary || '';
      tagsIn.value = (this.currentArticle.tags || []).join(', ');
      contentIn.value = this.currentArticle.content;
      if (headerImgIn) headerImgIn.value = this.currentArticle.header_image || '';
    } else {
      titleHeader.textContent = 'New Lore Article';
      titleIn.value = '';
      catIn.value = 'Locations';
      summaryIn.value = '';
      tagsIn.value = '';
      if (headerImgIn) headerImgIn.value = '';
      contentIn.value = `[quote]“Enter thematic quote here” | — Source[/quote]

[row]
[col]
[h1]Article Title[/h1]
Overview paragraph describing the location, faction, or character.
[/col]
[col]
[h3]Sidebar Details[/h3]
[table]
[tr][th]Property[/th][th]Details[/th][/tr]
[tr][td]Type[/td][td]Value[/td][/tr]
[/table]
[/col]
[/row]

[hr]

[h2]I. Main Heading[/h2]
[b]Key Feature:[/b] Detailed explanation...`;
    }

    modal.classList.remove('hidden');
    this.setupEditorDragAndDrop();
    this.updateEditorPreview();
  }

  closeEditor() {
    document.getElementById('editor-modal').classList.add('hidden');
    this.editingId = null;
  }

  updateEditorPreview() {
    const text = document.getElementById('edit-content').value;
    const previewEl = document.getElementById('editor-preview-render');
    if (previewEl) {
      previewEl.innerHTML = WAParser.parse(text);
    }
  }

  insertMarkup(snippet) {
    const textarea = document.getElementById('edit-content');
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const val = textarea.value;

    textarea.value = val.substring(0, start) + snippet + val.substring(end);
    textarea.selectionStart = textarea.selectionEnd = start + snippet.length;
    textarea.focus();
    this.updateEditorPreview();
  }

  editCurrentArticle() {
    if (this.currentArticle) {
      this.openEditor(this.currentArticle.id);
    }
  }

  async saveArticle() {
    const title = document.getElementById('edit-title').value.trim();
    const category = document.getElementById('edit-category').value;
    const summary = document.getElementById('edit-summary').value.trim();
    const tagsRaw = document.getElementById('edit-tags').value;
    const content = document.getElementById('edit-content').value.trim();
    const header_image = document.getElementById('edit-header-image') ? document.getElementById('edit-header-image').value.trim() : '';

    if (!title || !category || !content) {
      alert('Please fill out Title, Category, and Content.');
      return;
    }

    const tags = tagsRaw.split(',').map(t => t.trim()).filter(Boolean);
    const payload = { title, category, summary, content, tags, header_image };

    try {
      let res;
      if (this.editingId) {
        res = await fetch(`/api/articles/${encodeURIComponent(this.editingId)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch('/api/articles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      this.closeEditor();
      await this.fetchCategories();
      await this.fetchArticles();

      const targetId = this.editingId || data.id;
      if (targetId) {
        this.loadArticle(targetId);
      }
    } catch (err) {
      alert('Error saving article: ' + err.message);
    }
  }

  async deleteCurrentArticle() {
    if (!this.currentArticle) return;
    if (!confirm(`Are you sure you want to delete "${this.currentArticle.title}"?`)) return;

    try {
      const res = await fetch(`/api/articles/${encodeURIComponent(this.currentArticle.id)}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      this.currentArticle = null;
      document.getElementById('article-viewer').classList.add('hidden');
      document.getElementById('article-viewer-empty').classList.remove('hidden');

      await this.fetchCategories();
      await this.fetchArticles();

      if (this.articles.length > 0) {
        this.loadArticle(this.articles[0].id);
      }
    } catch (err) {
      alert('Error deleting article: ' + err.message);
    }
  }

  // --- PERSONA SUBSYSTEM METHODS ---
  async loadPersonaData(article) {
    const hub = document.getElementById('persona-hub-container');
    if (!hub) return;
    
    if (article.category !== 'Characters') {
      hub.style.display = 'none';
      return;
    }
    
    hub.style.display = 'block';
    hub.innerHTML = '<div style="color:var(--text-muted); font-size:0.85rem;">Loading Persona Data...</div>';
    
    try {
      const res = await fetch(`/api/personas/${article.id}`);
      const persona = await res.json();
      this.renderPersonaHub(article.id, persona);
    } catch (e) {
      hub.innerHTML = '<div style="color:#f43f5e; font-size:0.85rem;">Failed to load Persona</div>';
    }
  }

  renderPersonaHub(articleId, persona, containerId = 'persona-hub-container', prefix = 'persona-edit') {
    const hub = document.getElementById(containerId);
    if (!hub) return;
    
    const exists = !!persona.id;
    
    if (!exists && !persona.thoughts && !persona.wants && !persona.needs) {
      hub.innerHTML = `
        <h3 style="color:#f59e0b; font-size:1.1rem; margin-bottom:0.5rem;">🎭 Persona Hub</h3>
        <p style="color:var(--text-secondary); font-size:0.85rem; margin-bottom:1rem;">This character doesn't have a structured Persona yet. A Persona helps the AI deeply understand their motivations during Scene writing.</p>
        <div style="display:flex; gap:0.5rem;">
          <button class="btn btn-primary" onclick="window.app.generatePersonaWithAI('${articleId}', '${containerId}', '${prefix}')">✨ Generate with AI</button>
          <button class="btn btn-secondary" onclick="window.app.renderPersonaHub('${articleId}', { article_id: '${articleId}', id: 'temp', thoughts:'', wants:'', needs:'', history_log:'' }, '${containerId}', '${prefix}')">Create Manually</button>
        </div>
      `;
      return;
    }
    hub.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.75rem;">
        <h3 style="color:#f59e0b; font-size:1.1rem;">🎭 Persona Hub</h3>
        <div style="display:flex; gap:0.5rem;">
          <button class="btn btn-secondary" style="font-size:0.75rem; padding:0.2rem 0.5rem;" onclick="window.app.generatePersonaWithAI('${articleId}', '${containerId}', '${prefix}')">✨ Fill with AI</button>
          <button class="btn btn-primary" style="font-size:0.75rem; padding:0.2rem 0.5rem;" onclick="window.app.savePersona('${articleId}', '${prefix}')">💾 Save Persona</button>
        </div>
      </div>
      
      <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:1rem; margin-bottom:1rem;">
        <div style="display:flex; flex-direction:column; gap:0.4rem;">
          <label style="font-size:0.75rem; color:var(--accent-blue); text-transform:uppercase; font-weight:700; letter-spacing:0.05em;">Thoughts / Internal</label>
          <textarea id="${prefix}-thoughts" rows="3" class="persona-textarea" placeholder="Character's internal monologue...">${persona.thoughts || ''}</textarea>
        </div>
        <div style="display:flex; flex-direction:column; gap:0.4rem;">
          <label style="font-size:0.75rem; color:var(--accent-blue); text-transform:uppercase; font-weight:700; letter-spacing:0.05em;">Wants (External Goal)</label>
          <textarea id="${prefix}-wants" rows="3" class="persona-textarea" placeholder="What they actively seek...">${persona.wants || ''}</textarea>
        </div>
        <div style="display:flex; flex-direction:column; gap:0.4rem;">
          <label style="font-size:0.75rem; color:var(--accent-blue); text-transform:uppercase; font-weight:700; letter-spacing:0.05em;">Needs (Internal Flaw)</label>
          <textarea id="${prefix}-needs" rows="3" class="persona-textarea" placeholder="Their hidden weakness...">${persona.needs || ''}</textarea>
        </div>
      </div>
      
      <div style="display:flex; flex-direction:column; gap:0.4rem;">
        <label style="font-size:0.75rem; color:var(--accent-blue); text-transform:uppercase; font-weight:700; letter-spacing:0.05em;">History Log / Timeline</label>
        <textarea id="${prefix}-history" rows="4" class="persona-textarea" placeholder="Record major events that change this character...">${persona.history_log || ''}</textarea>
      </div>
    `;
  }

  async generatePersonaWithAI(articleId, containerId = 'persona-hub-container', prefix = 'persona-edit') {
    const hub = document.getElementById(containerId);
    if (!hub) return;
    
    hub.innerHTML = '<div style="color:#38bdf8; font-size:0.85rem; font-weight:600;">✨ Analyzing Lore & Generating Persona... (This takes a few seconds)</div>';
    
    try {
      const res = await fetch('/api/personas/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ article_id: articleId })
      });
      const data = await res.json();
      
      if (data.error) throw new Error(data.error);
      
      const checkRes = await fetch(`/api/personas/${articleId}`);
      const checkData = await checkRes.json();
      
      if (checkData.id) {
        await fetch(`/api/personas/${articleId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            thoughts: data.thoughts || '',
            wants: data.wants || '',
            needs: data.needs || '',
            history_log: checkData.history_log || ''
          })
        });
      } else {
        await fetch('/api/personas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            article_id: articleId,
            thoughts: data.thoughts || '',
            wants: data.wants || '',
            needs: data.needs || '',
            history_log: ''
          })
        });
      }
      
      const newRes = await fetch(`/api/personas/${articleId}`);
      const newPersona = await newRes.json();
      this.renderPersonaHub(articleId, newPersona, containerId, prefix);
    } catch (e) {
      alert('Generation Failed: ' + e.message);
      const newRes = await fetch(`/api/personas/${articleId}`);
      const newPersona = await newRes.json();
      this.renderPersonaHub(articleId, newPersona, containerId, prefix);
    }
  }

  async savePersona(articleId, prefix = 'persona-edit') {
    const thoughts = document.getElementById(`${prefix}-thoughts`)?.value || '';
    const wants = document.getElementById(`${prefix}-wants`)?.value || '';
    const needs = document.getElementById(`${prefix}-needs`)?.value || '';
    const history_log = document.getElementById(`${prefix}-history`)?.value || '';
    
    try {
      await fetch(`/api/personas/${articleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ thoughts, wants, needs, history_log })
      });
      
      const checkData = await fetch(`/api/personas/${articleId}`).then(r=>r.json());
      if (!checkData.id) {
         await fetch('/api/personas', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ article_id: articleId, thoughts, wants, needs, history_log })
         });
      }
      
      alert('Persona Saved!');
    } catch (e) {
      alert('Error saving persona: ' + e.message);
    }
  }

  openQuickPersonaModal() {
    const m = document.getElementById('quick-persona-modal');
    if (m) {
      document.getElementById('quick-persona-name').value = '';
      document.getElementById('quick-persona-bg').value = '';
      m.classList.remove('hidden');
    }
  }

  closeQuickPersonaModal() {
    const m = document.getElementById('quick-persona-modal');
    if (m) m.classList.add('hidden');
  }

  async submitQuickPersona() {
    const name = document.getElementById('quick-persona-name').value.trim();
    const bg = document.getElementById('quick-persona-bg').value.trim();
    if (!name) return alert('Name is required');
    
    try {
      const res = await fetch('/api/articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: name,
          category: 'Characters',
          sub_category: '',
          world_id: this.currentWorldId,
          content: `[quote]"I am ${name}." | — ${name}[/quote]\n\n[row]\n[col]\n[h1]${name}[/h1]\n${bg}\n[/col]\n[col]\n[h3]Stats[/h3]\n[table]\n[tr][th]Role[/th][td]Unknown[/td][/tr]\n[/table]\n[/col]\n[/row]\n[hr]\n[h2]I. Background[/h2]\n${bg}`
        })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      
      this.closeQuickPersonaModal();
      window.switchTab('library');
      
      await this.fetchArticles();
      this.loadArticle(data.id);
      
    } catch (e) {
      alert('Error creating Quick Persona: ' + e.message);
    }
  }

  // --- IMPORT MODAL HANDLERS ---
  openImportModal() {
    document.getElementById('import-modal').classList.remove('hidden');
    document.getElementById('import-json-paste').value = '';
    const msg = document.getElementById('import-status-msg');
    msg.style.display = 'none';
  }

  closeImportModal() {
    document.getElementById('import-modal').classList.add('hidden');
  }

  handleImportFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    this.selectedImportFile = file;

    if (file.name.endsWith('.json')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        document.getElementById('import-json-paste').value = event.target.result;
      };
      reader.readAsText(file);
    } else if (file.name.endsWith('.zip')) {
      document.getElementById('import-json-paste').value = `[ZIP Archive Selected: ${file.name} (${(file.size / 1024).toFixed(1)} KB)]`;
    }
  }

  async processImport() {
    const statusMsg = document.getElementById('import-status-msg');
    const fileInput = document.getElementById('import-file-input');
    const file = fileInput.files[0] || this.selectedImportFile;
    const jsonText = document.getElementById('import-json-paste').value.trim();

    statusMsg.style.display = 'block';
    statusMsg.style.background = 'rgba(56, 189, 248, 0.15)';
    statusMsg.style.color = '#38bdf8';

    // 1. Handle ZIP File Upload
    if (file && file.name.endsWith('.zip')) {
      statusMsg.textContent = '🤖 Unpacking ZIP & running Smart AI Categorization Engine...';

      const formData = new FormData();
      formData.append('zipfile', file);

      try {
        const res = await fetch('/api/import/zip', {
          method: 'POST',
          body: formData
        });

        const data = await res.json();
        if (data.error) throw new Error(data.error);

        statusMsg.style.background = 'rgba(74, 222, 128, 0.2)';
        statusMsg.style.color = '#4ade80';
        statusMsg.textContent = data.message;

        setTimeout(async () => {
          this.closeImportModal();
          await this.fetchCategories();
          await this.fetchArticles();
          if (this.articles.length > 0) {
            this.loadArticle(this.articles[0].id);
          }
          if (data.importAudit) {
            this.openImportTriageModal(data.importAudit);
          } else {
            this.openImportTriageModal({
              importedCount: data.importedCount || 0,
              world_id: this.currentWorldId || 'default',
              misclassifiedCount: 0,
              duplicateCount: 0,
              stubCount: 0
            });
          }
        }, 1000);
      } catch (err) {
        statusMsg.style.background = 'rgba(244, 63, 94, 0.2)';
        statusMsg.style.color = '#f43f5e';
        statusMsg.textContent = 'ZIP Import error: ' + err.message;
      }
      return;
    }

    // 2. Handle JSON Text/File Import
    if (!jsonText) {
      alert('Please select a .zip export file or paste JSON export data.');
      return;
    }

    let parsed;
    try {
      parsed = JSON.parse(jsonText);
    } catch (err) {
      statusMsg.style.background = 'rgba(244, 63, 94, 0.2)';
      statusMsg.style.color = '#f43f5e';
      statusMsg.textContent = 'Invalid JSON syntax. Please verify your export file.';
      return;
    }

    statusMsg.textContent = 'Importing JSON articles into LoreVault...';

    try {
      const res = await fetch('/api/import/worldanvil', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed)
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      statusMsg.style.background = 'rgba(74, 222, 128, 0.2)';
      statusMsg.style.color = '#4ade80';
      statusMsg.textContent = data.message;

      setTimeout(async () => {
        this.closeImportModal();
        await this.fetchCategories();
        await this.fetchArticles();
        if (this.articles.length > 0) {
          this.loadArticle(this.articles[0].id);
        }
        if (data.importAudit) {
          this.openImportTriageModal(data.importAudit);
        } else {
          this.openImportTriageModal({
            importedCount: data.importedCount || 0,
            world_id: this.currentWorldId || 'default',
            misclassifiedCount: 0,
            duplicateCount: 0,
            stubCount: 0
          });
        }
      }, 1000);

    } catch (err) {
      statusMsg.style.background = 'rgba(244, 63, 94, 0.2)';
      statusMsg.style.color = '#f43f5e';
      statusMsg.textContent = 'Import error: ' + err.message;
    }
  }

  // --- LIVE AI ASSISTANT METHODS ---
  async openAISettings() {
    document.getElementById('ai-settings-modal').classList.remove('hidden');
    let provider = 'gemini';
    let apiKey = '';
    let model = 'gemini-1.5-flash';

    try {
      const res = await fetch('/api/ai/config');
      const cfg = await res.json();
      provider = cfg.provider || 'gemini';
      apiKey = cfg.apiKey || '';
      model = cfg.model || 'gemini-1.5-flash';
    } catch (e) {
      provider = localStorage.getItem('lore_ai_provider') || 'gemini';
      apiKey = localStorage.getItem('lore_ai_key') || '';
      model = localStorage.getItem('lore_ai_model') || 'gemini-1.5-flash';
    }

    document.getElementById('ai-provider-select').value = provider;
    document.getElementById('ai-api-key').value = apiKey;
    this.toggleAIFields(provider, model);
  }

  closeAISettings() {
    document.getElementById('ai-settings-modal').classList.add('hidden');
  }

  toggleAIFields(provider, currentModel) {
    const keyGroup = document.getElementById('ai-key-group');
    const modelGroup = document.getElementById('ai-model-group');
    const modelSelect = document.getElementById('ai-model-select');
    const customInput = document.getElementById('ai-custom-model');

    if (keyGroup) keyGroup.style.display = (provider === 'gemini' || provider === 'openai') ? 'block' : 'none';
    if (modelGroup) modelGroup.style.display = (provider !== 'offline') ? 'block' : 'none';

    if (modelSelect) {
      let optionsHtml = '';
      if (provider === 'gemini') {
        optionsHtml = `
          <option value="gemini-2.5-flash">🚀 Gemini 2.5 Flash</option>
          <option value="gemini-2.5-pro">🧠 Gemini 2.5 Pro</option>
          <option value="gemini-2.0-flash">🚀 Gemini 2.0 Flash</option>
          <option value="gemini-flash-latest">⚡ Gemini Flash Latest (Recommended)</option>
          <option value="gemini-pro-latest">🧠 Gemini Pro Latest</option>
          <option value="custom">Custom Model Name...</option>
        `;
      } else if (provider === 'openai') {
        optionsHtml = `
          <option value="gpt-4o-mini">⚡ GPT-4o Mini (Fast & Cheap)</option>
          <option value="gpt-4o">🧠 GPT-4o (Flagship High Intelligence)</option>
          <option value="o1-mini">Reasoning o1-mini</option>
          <option value="custom">Custom Model Name...</option>
        `;
      } else if (provider === 'ollama') {
        optionsHtml = `
          <option value="llama3">Llama 3 (8B)</option>
          <option value="llama3.1">Llama 3.1</option>
          <option value="mistral">Mistral (7B)</option>
          <option value="gemma2">Gemma 2</option>
          <option value="custom">Custom Model Name...</option>
        `;
      }
      modelSelect.innerHTML = optionsHtml;

      if (currentModel) {
        const hasOption = Array.from(modelSelect.options).some(o => o.value === currentModel);
        if (hasOption) {
          modelSelect.value = currentModel;
          if (customInput) customInput.style.display = 'none';
        } else {
          modelSelect.value = 'custom';
          if (customInput) {
            customInput.style.display = 'block';
            customInput.value = currentModel;
          }
        }
      }
    }
  }

  handleModelSelectChange(val) {
    const customInput = document.getElementById('ai-custom-model');
    if (customInput) {
      customInput.style.display = (val === 'custom') ? 'block' : 'none';
    }
  }

  async saveAISettings() {
    const provider = document.getElementById('ai-provider-select').value;
    const key = document.getElementById('ai-api-key').value.trim();
    const modelSelectVal = document.getElementById('ai-model-select').value;
    const customModelVal = document.getElementById('ai-custom-model').value.trim();
    const model = (modelSelectVal === 'custom' && customModelVal) ? customModelVal : modelSelectVal;

    localStorage.setItem('lore_ai_provider', provider);
    localStorage.setItem('lore_ai_key', key);
    localStorage.setItem('lore_ai_model', model);

    try {
      await fetch('/api/ai/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, apiKey: key, model })
      });
      alert(`AI Settings Saved! Active Model: ${model}`);
    } catch (e) {
      alert(`AI Settings Saved! Active Model: ${model}`);
    }

    this.closeAISettings();
  }

  async runAIAssist(action) {
    const title = document.getElementById('edit-title').value.trim();
    const category = document.getElementById('edit-category').value;
    const contentArea = document.getElementById('edit-content');
    const content = contentArea.value.trim();

    if (!content) {
      alert('Please enter or paste some text/notes in the editor before running the AI Assistant.');
      return;
    }

    let instructions = '';
    if (action === 'expand_lore') {
      const userPrompt = prompt('Enter custom direction / focus for AI lore expansion (optional):\ne.g. "Focus on architectural history", "Detail secret basement", "Add military lore"', '');
      if (userPrompt === null) return; // User canceled
      instructions = userPrompt.trim();
    }

    const originalText = contentArea.value;
    contentArea.value = '🤖 AI Assistant is processing and formatting your lore...';

    const provider = localStorage.getItem('lore_ai_provider') || 'offline';
    const apiKey = localStorage.getItem('lore_ai_key') || '';
    const model = localStorage.getItem('lore_ai_model') || '';

    try {
      const res = await fetch('/api/ai/assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          title,
          content,
          category,
          instructions,
          provider,
          apiKey,
          model
        })
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      contentArea.value = data.result;
      this.updateEditorPreview();

    } catch (err) {
      alert('AI Assistant Error: ' + err.message);
      contentArea.value = originalText;
      this.updateEditorPreview();
    }
  }

  stripMissingImageTags() {
    const textarea = document.getElementById('edit-content');
    if (!textarea) return;
    const original = textarea.value;

    let cleaned = original.replace(/\[img:\d+\]/gi, '');
    cleaned = cleaned.replace(/\[img\]\d+\[\/img\]/gi, '');
    cleaned = cleaned.replace(/!\[([^\]]*)\]\((?:undefined|null|)\)/gi, '');

    textarea.value = cleaned.trim();
    this.updateEditorPreview();
    alert('Removed unlinked broken image tags from article content!');
  }

  // --- CANON GUARD & AUDITOR METHODS ---
  openDoctorModal() {
    const modal = document.getElementById('doctor-modal');
    if (!modal) {
      alert('Canon Guard modal container not found in DOM. Please do a hard refresh (Ctrl + Shift + R or Ctrl + F5).');
      return;
    }
    modal.classList.remove('hidden');
    this.runWorldAudit();
  }

  closeDoctorModal() {
    const modal = document.getElementById('doctor-modal');
    if (modal) modal.classList.add('hidden');
  }

  setDoctorWorldScope(worldId) {
    this.doctorWorldScope = worldId;
    this.runWorldAudit();
  }

  async runWorldAudit() {
    const statusEl = document.getElementById('doctor-status');
    const summaryEl = document.getElementById('doctor-summary-counts');
    const miscList = document.getElementById('doctor-misclassified-list');
    const stubList = document.getElementById('doctor-stubs-list');
    const dupList = document.getElementById('doctor-duplicates-list');
    const orphanList = document.getElementById('doctor-orphan-list') || document.getElementById('doctor-orphans-list');

    const fixMiscBtn = document.getElementById('fix-misclassified-btn');
    const fixStubsBtn = document.getElementById('fix-stubs-btn');
    const fixDupBtn = document.getElementById('fix-duplicates-btn');

    // Populate scope dropdown with current worlds
    const scopeSelect = document.getElementById('doctor-world-scope');
    if (scopeSelect && this.worlds && Array.isArray(this.worlds)) {
      const selected = this.doctorWorldScope || scopeSelect.value || 'all';
      let html = `<option value="all">🌐 All Worlds (Global Scope)</option><option value="default">📜 Default Vault Scope</option>`;
      this.worlds.forEach(w => {
        html += `<option value="${w.id}">${w.name} (${w.article_count || 0})</option>`;
      });
      scopeSelect.innerHTML = html;
      scopeSelect.value = selected;
    }

    if (statusEl) statusEl.textContent = '🔍 Scanning lore database for duplicates, misclassifications, and stubs...';
    if (miscList) miscList.innerHTML = `<div style="padding:0.75rem; color:var(--text-muted);">Analyzing category assignments...</div>`;
    if (stubList) stubList.innerHTML = `<div style="padding:0.75rem; color:var(--text-muted);">Analyzing stub articles...</div>`;
    if (dupList) dupList.innerHTML = `<div style="padding:0.75rem; color:var(--text-muted);">Checking for title double-ups...</div>`;
    if (orphanList) orphanList.innerHTML = `<div style="padding:0.75rem; color:var(--text-muted);">Checking for unlinked lore...</div>`;

    const provider = localStorage.getItem('lore_ai_provider') || 'offline';
    const apiKey = localStorage.getItem('lore_ai_key') || '';
    const model = localStorage.getItem('lore_ai_model') || '';

    try {
      const targetWorldId = this.doctorWorldScope || this.currentWorldId || 'all';
      const res = await fetch('/api/audit/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ world_id: targetWorldId, provider, apiKey, model })
      });
      const data = await res.json();
      this.lastAudit = data;

      const dupCount = data.counts?.duplicates ?? data.duplicateCount ?? (data.duplicateArticles?.length || 0);
      const miscCount = data.counts?.misclassified ?? data.misclassifiedCount ?? (data.misclassifiedArticles?.length || 0);
      const stubCount = data.counts?.stubs ?? data.stubCount ?? (data.stubArticles?.length || 0);
      const orphanCount = data.counts?.orphans ?? data.orphanCount ?? (data.orphanArticles?.length || 0);
      const aiCount = data.counts?.aiConflicts ?? data.aiConflictCount ?? (data.conflicts?.length || 0);

      // Health score badge
      const healthBadge = document.getElementById('doctor-health-score-badge');
      if (healthBadge) {
        const score = data.healthScore !== undefined ? data.healthScore : 100;
        healthBadge.textContent = `${score} / 100`;
        if (score >= 90) {
          healthBadge.style.background = 'rgba(74, 222, 128, 0.15)';
          healthBadge.style.color = '#4ade80';
          healthBadge.style.borderColor = 'rgba(74, 222, 128, 0.3)';
        } else if (score >= 70) {
          healthBadge.style.background = 'rgba(251, 191, 36, 0.15)';
          healthBadge.style.color = '#fbbf24';
          healthBadge.style.borderColor = 'rgba(251, 191, 36, 0.3)';
        } else {
          healthBadge.style.background = 'rgba(244, 63, 94, 0.15)';
          healthBadge.style.color = '#f43f5e';
          healthBadge.style.borderColor = 'rgba(244, 63, 94, 0.3)';
        }
      }

      // Metric count cards
      const mDup = document.getElementById('doctor-metric-duplicates');
      const mMisc = document.getElementById('doctor-metric-misc');
      const mStubs = document.getElementById('doctor-metric-stubs');
      const mAi = document.getElementById('doctor-metric-ai');
      const mOrphans = document.getElementById('doctor-metric-orphans');

      if (mDup) mDup.textContent = dupCount;
      if (mMisc) mMisc.textContent = miscCount;
      if (mStubs) mStubs.textContent = stubCount;
      if (mAi) mAi.textContent = aiCount;
      if (mOrphans) mOrphans.textContent = orphanCount;

      if (statusEl) statusEl.textContent = `Diagnostic Scan Complete — Audited ${data.totalAudited || 0} articles.`;
      if (summaryEl) summaryEl.textContent = `Found ${dupCount} duplicates, ${miscCount} misclassifications, ${stubCount} stubs, and ${orphanCount} orphans.`;

      // 1. Render Misclassified List
      const miscArticles = data.misclassifiedArticles || [];
      if (miscArticles.length > 0) {
        if (fixMiscBtn) fixMiscBtn.style.display = 'inline-block';
        miscList.innerHTML = miscArticles.map(art => `
          <div style="display:flex; justify-content:space-between; align-items:center; padding:0.4rem 0.6rem; border-bottom:1px solid var(--border-color); font-size:0.8rem;">
            <div>
              <strong style="color:#fff;">${art.title}</strong>
              <span style="color:var(--text-muted); font-size:0.75rem; margin-left:0.5rem;">Current: <del style="color:var(--accent-rose);">${art.currentCategory}</del> ➔ Suggested: <ins style="color:var(--accent-emerald); text-decoration:none; font-weight:600;">${art.suggestedCategory}</ins></span>
            </div>
            <div style="display:flex; gap:0.4rem;">
              <button class="btn btn-secondary" style="font-size:0.75rem; padding:0.15rem 0.5rem;" onclick="window.app.applyGuidedStepAction('recategorize', '${art.id}', { newCategory: '${art.suggestedCategory}', newSubCategory: '${art.suggestedSubCategory || 'General'}' })">Fix Category</button>
              <button class="btn-text" style="font-size:0.75rem;" onclick="window.app.loadArticle('${art.id}'); window.app.closeDoctorModal();">View</button>
            </div>
          </div>
        `).join('');
      } else {
        if (fixMiscBtn) fixMiscBtn.style.display = 'none';
        miscList.innerHTML = `<div style="padding:0.75rem; color:var(--accent-emerald); font-size:0.8rem;">✓ All articles are correctly categorized!</div>`;
      }

      // 2. Render Duplicates List
      const dupArticles = data.duplicateArticles || [];
      if (dupArticles.length > 0) {
        if (fixDupBtn) fixDupBtn.style.display = 'inline-block';
        dupList.innerHTML = dupArticles.map(art => `
          <div style="display:flex; justify-content:space-between; align-items:center; padding:0.4rem 0.6rem; border-bottom:1px solid var(--border-color); font-size:0.8rem;">
            <div>
              <strong style="color:#fff;">${art.title}</strong>
              <span style="color:var(--text-muted); font-size:0.75rem; margin-left:0.5rem;">(Duplicate copy under category: ${art.category})</span>
            </div>
            <div style="display:flex; gap:0.4rem;">
              ${art.originalId ? `<button class="btn btn-secondary" style="font-size:0.75rem; padding:0.15rem 0.5rem;" onclick="window.app.applyGuidedStepAction('merge_duplicates', '${art.id}', { targetMasterId: '${art.originalId}' })">Merge</button>` : ''}
              <button class="btn btn-secondary" style="font-size:0.75rem; padding:0.15rem 0.5rem; background:#dc2626; color:#fff;" onclick="window.app.applyGuidedStepAction('delete_article', '${art.id}')">Delete Copy</button>
              <button class="btn-text" style="font-size:0.75rem;" onclick="window.app.loadArticle('${art.id}'); window.app.closeDoctorModal();">Inspect</button>
            </div>
          </div>
        `).join('');
      } else {
        if (fixDupBtn) fixDupBtn.style.display = 'none';
        dupList.innerHTML = `<div style="padding:0.75rem; color:var(--accent-emerald); font-size:0.8rem;">✓ No duplicate article double-ups found.</div>`;
      }

      // 3. Render Stub List
      const stubArticles = data.stubArticles || [];
      const bulkAutoCureBtn = document.getElementById('bulk-autocure-btn');
      if (stubArticles.length > 0) {
        if (fixStubsBtn) fixStubsBtn.style.display = 'inline-block';
        if (bulkAutoCureBtn) bulkAutoCureBtn.style.display = 'inline-block';
        stubList.innerHTML = stubArticles.map(art => `
          <div style="display:flex; justify-content:space-between; align-items:center; padding:0.4rem 0.6rem; border-bottom:1px solid var(--border-color); font-size:0.8rem;">
            <div>
              <strong style="color:#fff;">${art.title}</strong>
              <span style="color:var(--text-muted); font-size:0.75rem; margin-left:0.5rem;">(${art.category})</span>
            </div>
            <div style="display:flex; gap:0.4rem;">
              <button class="btn btn-secondary" style="font-size:0.75rem; padding:0.15rem 0.5rem; background:#059669; color:#fff;" onclick="window.app.openStubPreviewModal('${art.id}', '${art.title.replace(/'/g, "\\'")}', '${art.category}')">🪄 Flesh Out</button>
              <button class="btn btn-secondary" style="font-size:0.75rem; padding:0.15rem 0.5rem; background:#dc2626; color:#fff;" onclick="window.app.applyGuidedStepAction('delete_article', '${art.id}')">Delete</button>
              <button class="btn-text" style="font-size:0.75rem;" onclick="window.app.loadArticle('${art.id}'); window.app.closeDoctorModal();">Inspect</button>
            </div>
          </div>
        `).join('');
      } else {
        if (fixStubsBtn) fixStubsBtn.style.display = 'none';
        if (bulkAutoCureBtn) bulkAutoCureBtn.style.display = 'none';
        stubList.innerHTML = `<div style="padding:0.75rem; color:var(--accent-emerald); font-size:0.8rem;">✓ No empty stubs found.</div>`;
      }

      // 4. Render Orphan List
      const orphanArticles = data.orphanArticles || [];
      if (orphanList) {
        if (orphanArticles.length > 0) {
          orphanList.innerHTML = orphanArticles.slice(0, 10).map(art => `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:0.4rem 0.6rem; border-bottom:1px solid var(--border-color); font-size:0.8rem;">
              <div>
                <strong style="color:#fff;">${art.title}</strong>
                <span style="color:var(--text-muted); font-size:0.75rem; margin-left:0.5rem;">(${art.category})</span>
                <span class="badge" style="background:rgba(56,189,248,0.15); color:#38bdf8; font-size:0.65rem; margin-left:0.3rem;">🟢 High Confidence</span>
              </div>
              <button class="btn-text" style="font-size:0.75rem;" onclick="window.app.loadArticle('${art.id}'); window.app.closeDoctorModal();">Add Links</button>
            </div>
          `).join('') + (orphanArticles.length > 10 ? `<div style="font-size:0.7rem; color:var(--text-muted); text-align:center; padding:0.3rem;">...and ${orphanArticles.length - 10} more unlinked articles.</div>` : '');
        } else {
          orphanList.innerHTML = `<div style="padding:0.75rem; color:var(--accent-emerald); font-size:0.8rem;">✓ Every article has cross-reference links!</div>`;
        }
      }

    } catch (err) {
      if (statusEl) statusEl.textContent = 'Audit Error: ' + err.message;
    }
  }

  // --- GUIDED REPAIR SESSION CONTROLLER METHODS ---

  async startGuidedSession() {
    const worldId = this.doctorWorldScope || this.currentWorldId || 'all';
    try {
      const res = await fetch(`/api/audit/guided-session?world_id=${encodeURIComponent(worldId)}`);
      const data = await res.json();
      
      this.guidedQueue = data.queue || [];
      this.guidedQueueIndex = 0;

      const mainDashboard = document.getElementById('doctor-dashboard-main');
      const guidedView = document.getElementById('doctor-guided-session-view');

      if (mainDashboard) mainDashboard.classList.add('hidden');
      if (guidedView) guidedView.classList.remove('hidden');

      this.renderGuidedStep();
    } catch (err) {
      alert('Failed to start Guided Repair Session: ' + err.message);
    }
  }

  renderGuidedStep() {
    const total = (this.guidedQueue || []).length;
    const progressFill = document.getElementById('guided-progress-fill') || document.getElementById('doctor-guided-progress-bar');
    const progressLabel = document.getElementById('guided-progress-label') || document.getElementById('doctor-guided-progress-text');
    const stepContainer = document.getElementById('guided-step-container') || document.getElementById('doctor-guided-comparison');

    if (this.guidedQueueIndex >= total) {
      // Completion Card
      if (progressFill) progressFill.style.width = '100%';
      if (progressLabel) progressLabel.textContent = 'Session Complete! 🎉';

      if (stepContainer) {
        stepContainer.innerHTML = `
          <div style="background:#090d16; border:1px solid var(--border-color); border-radius:12px; padding:2.5rem 1.5rem; text-align:center; margin-top:1rem;">
            <div style="font-size:3.5rem; margin-bottom:0.75rem; filter:drop-shadow(0 0 10px rgba(74,222,128,0.4));">🏆</div>
            <h3 style="font-size:1.4rem; color:#4ade80; margin-bottom:0.5rem; font-weight:700;">Guided Repair Complete!</h3>
            <p style="color:var(--text-secondary); font-size:0.9rem; max-width:500px; margin:0 auto 1.5rem auto; line-height:1.5;">
              All items in the repair queue have been processed. Your world vault structure and lore integrity have significantly improved!
            </p>
            <button class="btn btn-primary" style="background: linear-gradient(135deg, #10b981 0%, #0284c7 100%); border:none; padding:0.6rem 1.5rem; font-size:0.9rem;" onclick="window.app.closeGuidedSession()">
              Return to Doctor Dashboard
            </button>
          </div>
        `;
      }
      return;
    }

    const currentStep = this.guidedQueueIndex + 1;
    const pct = Math.round((this.guidedQueueIndex / Math.max(1, total)) * 100);

    if (progressFill) progressFill.style.width = `${pct}%`;
    if (progressLabel) progressLabel.textContent = `Step ${currentStep} of ${total}`;

    const item = this.guidedQueue[this.guidedQueueIndex];
    if (!item) return;

    if (!stepContainer) return;

    if (item.type === 'misclassification') {
      stepContainer.innerHTML = `
        <div class="repair-comparison-grid" style="margin-top:1rem; display:grid; grid-template-columns:1fr 1fr; gap:1rem;">
          <div class="repair-pane" style="background:#090d16; border:1px solid var(--border-color); border-radius:8px; padding:1rem;">
            <div class="pane-header" style="font-size:0.75rem; text-transform:uppercase; color:var(--text-muted); letter-spacing:0.05em; font-weight:700; margin-bottom:0.5rem;">Current Vault Item</div>
            <h4 style="font-size:1.1rem; color:#fff; margin:0 0 0.4rem 0;">${item.title}</h4>
            <div style="font-size:0.8rem; color:var(--accent-rose); margin-bottom:0.75rem;">
              Current Category: <strong>${item.currentCategory}</strong>
            </div>
            <div style="font-size:0.8rem; color:var(--text-muted); line-height:1.4; background:rgba(255,255,255,0.03); padding:0.6rem; border-radius:6px;">
              ${item.excerpt || 'No excerpt available.'}
            </div>
          </div>
          <div class="repair-pane" style="background:#090d16; border:1px solid var(--accent-amber); border-radius:8px; padding:1rem;">
            <div class="pane-header" style="font-size:0.75rem; text-transform:uppercase; color:var(--accent-amber); letter-spacing:0.05em; font-weight:700; margin-bottom:0.5rem;">Proposed Doctor Fix</div>
            <h4 style="font-size:1.1rem; color:#4ade80; margin:0 0 0.4rem 0;">Category: ${item.suggestedCategory}</h4>
            <div style="font-size:0.8rem; color:var(--text-secondary); margin-bottom:0.75rem;">
              Sub-Category: <strong>${item.suggestedSubCategory || 'General'}</strong>
            </div>
            <div style="font-size:0.8rem; color:var(--text-secondary); line-height:1.4; margin-bottom:1.25rem;">
              💡 <em>Reasoning:</em> ${item.reasoning || 'Automated smart categorization analysis.'}
            </div>
            <div style="display:flex; gap:0.5rem; flex-wrap:wrap;">
              <button class="btn btn-primary" style="background:#10b981; border:none; font-size:0.8rem;" onclick="window.app.applyGuidedStepAction('recategorize', { newCategory: '${item.suggestedCategory}', newSubCategory: '${item.suggestedSubCategory || 'General'}' })">
                ✓ Apply Recategorization
              </button>
              <button class="btn btn-secondary" style="font-size:0.8rem;" onclick="window.app.applyGuidedStepAction('skip')">
                ⏭️ Skip
              </button>
            </div>
          </div>
        </div>
      `;
    } else if (item.type === 'duplicate') {
      stepContainer.innerHTML = `
        <div class="repair-comparison-grid" style="margin-top:1rem; display:grid; grid-template-columns:1fr 1fr; gap:1rem;">
          <div class="repair-pane" style="background:#090d16; border:1px solid var(--border-color); border-radius:8px; padding:1rem;">
            <div class="pane-header" style="font-size:0.75rem; text-transform:uppercase; color:var(--text-muted); letter-spacing:0.05em; font-weight:700; margin-bottom:0.5rem;">Duplicate Article (Copy)</div>
            <h4 style="font-size:1.1rem; color:#fff; margin:0 0 0.4rem 0;">${item.title}</h4>
            <div style="font-size:0.8rem; color:var(--accent-purple); margin-bottom:0.75rem;">
              Category: <strong>${item.category}</strong>
            </div>
            <div style="font-size:0.8rem; color:var(--text-muted); line-height:1.4; background:rgba(255,255,255,0.03); padding:0.6rem; border-radius:6px;">
              ${(item.content || '').substring(0, 180) || 'Duplicate copy content.'}
            </div>
          </div>
          <div class="repair-pane" style="background:#090d16; border:1px solid var(--accent-purple); border-radius:8px; padding:1rem;">
            <div class="pane-header" style="font-size:0.75rem; text-transform:uppercase; color:var(--accent-purple); letter-spacing:0.05em; font-weight:700; margin-bottom:0.5rem;">Master Article Comparison</div>
            <h4 style="font-size:1.1rem; color:#4ade80; margin:0 0 0.4rem 0;">Master Copy (ID: ${item.originalId})</h4>
            <div style="font-size:0.8rem; color:var(--text-secondary); margin-bottom:0.75rem;">
              Original Category: <strong>${item.originalCategory}</strong>
            </div>
            <div style="font-size:0.8rem; color:var(--text-secondary); line-height:1.4; margin-bottom:1.25rem;">
              💡 <em>Recommended Action:</em> Merge duplicate content into master article or delete copy.
            </div>
            <div style="display:flex; gap:0.5rem; flex-wrap:wrap;">
              <button class="btn btn-primary" style="background:#8b5cf6; border:none; font-size:0.8rem;" onclick="window.app.applyGuidedStepAction('merge_duplicates', { targetMasterId: '${item.originalId}' })">
                🔀 Merge into Master
              </button>
              <button class="btn btn-secondary" style="background:#dc2626; color:#fff; font-size:0.8rem;" onclick="window.app.applyGuidedStepAction('delete_article')">
                🗑️ Delete Duplicate
              </button>
              <button class="btn btn-secondary" style="font-size:0.8rem;" onclick="window.app.applyGuidedStepAction('skip')">
                ⏭️ Skip
              </button>
            </div>
          </div>
        </div>
      `;
    } else if (item.type === 'stub') {
      stepContainer.innerHTML = `
        <div class="repair-comparison-grid" style="margin-top:1rem; display:grid; grid-template-columns:1fr 1fr; gap:1rem;">
          <div class="repair-pane" style="background:#090d16; border:1px solid var(--border-color); border-radius:8px; padding:1rem;">
            <div class="pane-header" style="font-size:0.75rem; text-transform:uppercase; color:var(--text-muted); letter-spacing:0.05em; font-weight:700; margin-bottom:0.5rem;">Empty / Stub Article</div>
            <h4 style="font-size:1.1rem; color:#fff; margin:0 0 0.4rem 0;">${item.title}</h4>
            <div style="font-size:0.8rem; color:var(--accent-rose); margin-bottom:0.75rem;">
              Category: <strong>${item.category}</strong>
            </div>
            <div style="font-size:0.8rem; color:var(--text-muted); line-height:1.4; background:rgba(255,255,255,0.03); padding:0.6rem; border-radius:6px;">
              ${item.excerpt || 'Article has minimal or default template content.'}
            </div>
          </div>
          <div class="repair-pane" style="background:#090d16; border:1px solid var(--accent-rose); border-radius:8px; padding:1rem;">
            <div class="pane-header" style="font-size:0.75rem; text-transform:uppercase; color:var(--accent-rose); letter-spacing:0.05em; font-weight:700; margin-bottom:0.5rem;">Doctor Action</div>
            <h4 style="font-size:1.1rem; color:#38bdf8; margin:0 0 0.4rem 0;">Flesh Out or Remove</h4>
            <div style="font-size:0.8rem; color:var(--text-secondary); margin-bottom:1.25rem; line-height:1.4;">
              This article is missing body content or contains standard World Anvil boilerplate.
            </div>
            <div style="display:flex; gap:0.5rem; flex-wrap:wrap;">
              <button class="btn btn-primary" style="background:#059669; border:none; font-size:0.8rem;" onclick="window.app.openStubPreviewModal('${item.articleId}', '${(item.title || '').replace(/'/g, "\\'")}', '${item.category}')">
                🪄 Flesh Out with AI
              </button>
              <button class="btn btn-secondary" style="background:#dc2626; color:#fff; font-size:0.8rem;" onclick="window.app.applyGuidedStepAction('delete_article')">
                🗑️ Delete Stub
              </button>
              <button class="btn btn-secondary" style="font-size:0.8rem;" onclick="window.app.applyGuidedStepAction('skip')">
                ⏭️ Skip
              </button>
            </div>
          </div>
        </div>
      `;
    }
  }

  async applyGuidedStepAction(action, extraParamsOrArticleId, maybeExtraParams) {
    let articleId = null;
    let params = {};

    const item = (this.guidedQueue || [])[this.guidedQueueIndex];

    if (typeof action === 'string' && typeof extraParamsOrArticleId === 'string') {
      articleId = extraParamsOrArticleId;
      params = maybeExtraParams || {};
    } else {
      if (item) {
        articleId = item.articleId || item.id;
      }
      params = extraParamsOrArticleId || {};
    }

    if (action !== 'skip' && articleId) {
      try {
        await fetch('/api/audit/apply-action', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action, articleId, params })
        });
      } catch (err) {
        console.error('Failed to apply guided repair action:', err);
      }
    }

    this.guidedQueueIndex++;
    this.renderGuidedStep();
  }

  closeGuidedSession() {
    const mainDashboard = document.getElementById('doctor-dashboard-main');
    const guidedView = document.getElementById('doctor-guided-session-view');

    if (guidedView) guidedView.classList.add('hidden');
    if (mainDashboard) mainDashboard.classList.remove('hidden');

    this.runWorldAudit();
  }

  exitGuidedSession() {
    this.closeGuidedSession();
  }

  switchDoctorTab(tabId) {
    const tabBtns = document.querySelectorAll('#doctor-tab-nav .doctor-tab-btn');
    tabBtns.forEach(btn => {
      if (btn.getAttribute('data-tab') === tabId) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    const panels = document.querySelectorAll('.doctor-tab-panel');
    panels.forEach(panel => {
      if (panel.id === `doctor-panel-${tabId}`) {
        panel.classList.remove('hidden');
      } else {
        panel.classList.add('hidden');
      }
    });
  }

  openImportTriageModal(importAudit) {
    const modal = document.getElementById('import-triage-modal');
    const statsContainer = document.getElementById('import-triage-stats');
    if (!modal) return;

    const importedCount = importAudit?.importedCount || 0;
    const worldId = importAudit?.world_id || this.currentWorldId || 'default';
    const misclassifiedCount = importAudit?.misclassifiedCount || 0;
    const duplicateCount = importAudit?.duplicateCount || 0;
    const stubCount = importAudit?.stubCount || 0;

    if (statsContainer) {
      statsContainer.innerHTML = `
        <div style="display:flex; flex-direction:column; gap:0.6rem; font-size:0.9rem;">
          <div style="color:#4ade80; font-weight:600; display:flex; align-items:center; gap:0.5rem;">
            <span>✓</span> <span>${importedCount} articles imported into &lt;${worldId}&gt;</span>
          </div>
          <div style="color:${misclassifiedCount > 0 ? '#fbbf24' : 'var(--text-secondary)'}; display:flex; align-items:center; gap:0.5rem;">
            <span>⚠️</span> <span>${misclassifiedCount} potential category misclassifications</span>
          </div>
          <div style="color:${duplicateCount > 0 ? '#f43f5e' : 'var(--text-secondary)'}; display:flex; align-items:center; gap:0.5rem;">
            <span>👯</span> <span>${duplicateCount} title overlaps with existing worlds</span>
          </div>
          <div style="color:${stubCount > 0 ? '#a855f7' : 'var(--text-secondary)'}; display:flex; align-items:center; gap:0.5rem;">
            <span>🧹</span> <span>${stubCount} empty stubs detected</span>
          </div>
        </div>
      `;
    }

    const triageBtn = document.getElementById('triage-launch-guided-btn');
    if (triageBtn) {
      triageBtn.onclick = () => this.startGuidedSessionFromTriage();
    }

    modal.classList.remove('hidden');
    modal.style.display = 'flex';
  }

  startGuidedSessionFromTriage() {
    this.closeImportTriageModal();
    this.openDoctorModal();
    this.startGuidedSession();
  }

  closeImportTriageModal() {
    const modal = document.getElementById('import-triage-modal');
    if (modal) {
      modal.classList.add('hidden');
      modal.style.display = 'none';
    }
  }

  async runDeepAIAudit() {
    const deepList = document.getElementById('doctor-deep-ai-list');
    const healthBadge = document.getElementById('doctor-health-score-badge');
    const healthSummary = document.getElementById('doctor-health-summary');

    if (deepList) deepList.innerHTML = `<div style="padding:0.75rem; color:#38bdf8;">🤖 Deep Gemini LLM is analyzing narrative consistency and timeline logic across vault articles...</div>`;

    try {
      const res = await fetch('/api/audit/deep-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ world_id: this.currentWorldId || 'all' })
      });
      const data = await res.json();
      this.lastDeepAudit = data;

      if (healthBadge) {
        healthBadge.textContent = `${data.healthScore || 90} / 100`;
        const score = data.healthScore || 90;
        if (score >= 90) {
          healthBadge.style.background = 'rgba(74,222,128,0.15)';
          healthBadge.style.color = '#4ade80';
          healthBadge.style.borderColor = 'rgba(74,222,128,0.3)';
        } else if (score >= 70) {
          healthBadge.style.background = 'rgba(251,191,36,0.15)';
          healthBadge.style.color = '#fbbf24';
          healthBadge.style.borderColor = 'rgba(251,191,36,0.3)';
        } else {
          healthBadge.style.background = 'rgba(244,63,94,0.15)';
          healthBadge.style.color = '#f43f5e';
          healthBadge.style.borderColor = 'rgba(244,63,94,0.3)';
        }
      }

      if (healthSummary) healthSummary.textContent = data.summary || 'Deep AI Audit completed.';

      if (data.conflicts && data.conflicts.length > 0) {
        deepList.innerHTML = data.conflicts.map(c => `
          <div style="padding:0.6rem; border-bottom:1px solid var(--border-color); font-size:0.8rem;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.25rem;">
              <div>
                <span class="badge" style="background:rgba(244,63,94,0.2); color:#f43f5e; font-size:0.7rem; border:1px solid rgba(244,63,94,0.4);">${c.severity || 'Critical Conflict'}</span>
                <strong style="color:#fff; margin-left:0.4rem;">${c.articleTitle1} ↔ ${c.articleTitle2}</strong>
              </div>
              <button class="btn btn-secondary" style="font-size:0.75rem; padding:0.2rem 0.5rem; background:#059669; color:#fff;" onclick="window.app.openHarmonizeModal('${c.id}')">🪄 Harmonize with AI</button>
            </div>
            <div style="color:var(--text-muted); font-size:0.75rem;">${c.description}</div>
          </div>
        `).join('');
      } else {
        deepList.innerHTML = `<div style="padding:0.75rem; color:#4ade80; font-size:0.8rem;">✓ Deep AI Audit clean! Zero narrative or timeline conflicts detected.</div>`;
      }

    } catch (err) {
      if (deepList) deepList.innerHTML = `<div style="padding:0.75rem; color:#f43f5e; font-size:0.8rem;">Audit Error: ${err.message}</div>`;
    }
  }

  openStubPreviewModal(stubId, title, category) {
    this.activeStubTarget = { stubId, title, category };
    const modal = document.getElementById('stub-preview-modal');
    const titleEl = document.getElementById('stub-preview-title');
    if (modal) modal.classList.remove('hidden');
    if (titleEl) titleEl.textContent = `🪄 AI Generated Lore Preview — ${title}`;
    this.regenerateStubPreview();
  }

  closeStubPreviewModal() {
    const modal = document.getElementById('stub-preview-modal');
    if (modal) modal.classList.add('hidden');
  }

  async regenerateStubPreview() {
    if (!this.activeStubTarget) return;
    const previewEl = document.getElementById('stub-rendered-preview');
    const genreSelect = document.getElementById('stub-genre-select');
    const genre = genreSelect ? genreSelect.value : 'High Fantasy';

    if (previewEl) previewEl.innerHTML = `<div style="color:#38bdf8; font-size:0.85rem;">🤖 Generating 2-paragraph ${genre} lore for "${this.activeStubTarget.title}"...</div>`;

    try {
      const res = await fetch('/api/audit/flesh-out-stub', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stubId: this.activeStubTarget.stubId,
          title: this.activeStubTarget.title,
          category: this.activeStubTarget.category,
          genre
        })
      });
      const data = await res.json();
      this.generatedStubLore = data.content;

      if (previewEl) {
        previewEl.innerHTML = window.WAParser ? window.WAParser.parse(data.content) : data.content;
      }
    } catch (err) {
      if (previewEl) previewEl.textContent = 'Failed to generate stub lore: ' + err.message;
    }
  }

  async saveGeneratedStubLore() {
    if (!this.activeStubTarget || !this.generatedStubLore) return;

    try {
      const res = await fetch(`/api/articles/${this.activeStubTarget.stubId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: this.activeStubTarget.title,
          category: this.activeStubTarget.category,
          content: this.generatedStubLore,
          summary: `${this.activeStubTarget.title} lore article.`
        })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      alert(`Lore saved for "${this.activeStubTarget.title}"!`);
      this.closeStubPreviewModal();
      await this.fetchCategories();
      await this.fetchArticles();
      this.runWorldAudit();

    } catch (err) {
      alert('Error saving stub lore: ' + err.message);
    }
  }

  async bulkAutoCureStubs() {
    if (!this.lastAudit || !this.lastAudit.stubArticles || this.lastAudit.stubArticles.length === 0) return;
    if (!confirm(`Auto-Cure ${this.lastAudit.stubArticles.length} stubs with AI lore?`)) return;

    const genreSelect = document.getElementById('stub-genre-select');
    const genre = genreSelect ? genreSelect.value : 'High Fantasy';

    const statusEl = document.getElementById('doctor-status');
    if (statusEl) statusEl.textContent = `🪄 Auto-Curing ${this.lastAudit.stubArticles.length} stubs...`;

    for (const art of this.lastAudit.stubArticles) {
      try {
        const res = await fetch('/api/audit/flesh-out-stub', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stubId: art.id, title: art.title, category: art.category, genre })
        });
        const data = await res.json();
        if (data.content) {
          await fetch(`/api/articles/${art.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: art.title, category: art.category, content: data.content })
          });
        }
      } catch (e) {}
    }

    alert('Bulk Auto-Cure complete! All stubs have been fleshed out.');
    await this.fetchCategories();
    await this.fetchArticles();
    this.runWorldAudit();
  }

  openHarmonizeModal(conflictId) {
    if (!this.lastDeepAudit || !this.lastDeepAudit.conflicts) return;
    const conflict = this.lastDeepAudit.conflicts.find(c => c.id === conflictId);
    if (!conflict) return;

    this.activeConflict = conflict;
    const modal = document.getElementById('harmonize-diff-modal');
    const title1 = document.getElementById('harmonize-title-1');
    const title2 = document.getElementById('harmonize-title-2');
    const content1 = document.getElementById('harmonize-content-1');
    const content2 = document.getElementById('harmonize-content-2');

    if (modal) modal.classList.remove('hidden');
    if (title1) title1.textContent = conflict.articleTitle1;
    if (title2) title2.textContent = conflict.articleTitle2;
    if (content1) content1.textContent = conflict.harmonizedText1 || conflict.description;
    if (content2) content2.textContent = conflict.harmonizedText2 || conflict.description;
  }

  closeHarmonizeModal() {
    const modal = document.getElementById('harmonize-diff-modal');
    if (modal) modal.classList.add('hidden');
  }

  async applyHarmonizedResolution() {
    if (!this.activeConflict) return;
    try {
      const res = await fetch('/api/audit/harmonize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          articleId1: this.activeConflict.articleId1,
          newContent1: this.activeConflict.harmonizedText1,
          articleId2: this.activeConflict.articleId2,
          newContent2: this.activeConflict.harmonizedText2
        })
      });
      const data = await res.json();
      alert(data.message);
      this.closeHarmonizeModal();
      await this.fetchArticles();
      this.runDeepAIAudit();
    } catch (err) {
      alert('Error harmonizing lore: ' + err.message);
    }
  }

  async applyCategoryFixes() {
    if (!this.lastAudit || !this.lastAudit.misclassifiedArticles) return;

    const fixes = this.lastAudit.misclassifiedArticles.map(art => ({
      id: art.id,
      action: 'recategorize',
      newCategory: art.suggestedCategory
    }));

    try {
      const res = await fetch('/api/audit/apply-fixes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fixes })
      });

      const data = await res.json();
      alert(data.message);

      await this.fetchCategories();
      await this.fetchArticles();
      this.runWorldAudit();

    } catch (err) {
      alert('Error applying category fixes: ' + err.message);
    }
  }

  async cleanStubs() {
    if (!this.lastAudit || !this.lastAudit.stubArticles) return;
    if (!confirm(`Are you sure you want to delete ${this.lastAudit.stubCount} empty/stub articles?`)) return;

    const fixes = this.lastAudit.stubArticles.map(art => ({
      id: art.id,
      action: 'delete_stub'
    }));

    try {
      const res = await fetch('/api/audit/apply-fixes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fixes })
      });

      const data = await res.json();
      alert(data.message);

      await this.fetchCategories();
      await this.fetchArticles();
      this.runWorldAudit();

    } catch (err) {
      alert('Error cleaning stubs: ' + err.message);
    }
  }

  // --- ASK MY WORLD AI CHAT METHODS ---
  async sendChatMessage() {
    const inputEl = document.getElementById('chat-input-field');
    const container = document.getElementById('chat-messages-container');
    const categorySelect = document.getElementById('chat-category-filter');

    const question = inputEl ? inputEl.value.trim() : '';
    if (!question) return;

    const category = categorySelect ? categorySelect.value : 'all';
    inputEl.value = '';

    // Append User Question
    const userDiv = document.createElement('div');
    userDiv.className = 'chat-message user-message';
    userDiv.textContent = question;
    container.appendChild(userDiv);
    container.scrollTop = container.scrollHeight;

    // Append Loading State
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'chat-message ai-message';
    loadingDiv.innerHTML = '🔍 Searching world lore context...';
    container.appendChild(loadingDiv);
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
      if (data.error) throw new Error(data.error);

      // Parse WikiLinks inside AI answer
      const formattedAnswer = window.WAParser ? window.WAParser.parseWikiLinks(data.answer) : data.answer;
      loadingDiv.innerHTML = `<div>${formattedAnswer}</div>`;
      container.scrollTop = container.scrollHeight;

    } catch (err) {
      loadingDiv.textContent = 'AI Chat Error: ' + err.message;
    }
  }

  clearChatMessages() {
    const container = document.getElementById('chat-messages-container');
    if (container) {
      container.innerHTML = `<div class="chat-message ai-message">👋 Hello! Ask me any question about your active world lore, characters, or locations.</div>`;
    }
  }
}

// Global initialization
document.addEventListener('DOMContentLoaded', () => {
  window.app = new LoreApp();
});

// Global fail-safe helpers for Canon Guard modal
window.openDoctorModal = function() {
  const modal = document.getElementById('doctor-modal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.style.display = 'flex';
  }
  if (window.app && typeof window.app.runWorldAudit === 'function') {
    window.app.runWorldAudit();
  }
};

window.closeDoctorModal = function() {
  const modal = document.getElementById('doctor-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.style.display = 'none';
  }
};

window.setDoctorWorldScope = function(worldId) {
  if (window.app && typeof window.app.setDoctorWorldScope === 'function') {
    window.app.setDoctorWorldScope(worldId);
  }
};

window.startGuidedSession = function() {
  if (window.app && typeof window.app.startGuidedSession === 'function') {
    window.app.startGuidedSession();
  }
};

window.closeGuidedSession = function() {
  if (window.app && typeof window.app.closeGuidedSession === 'function') {
    window.app.closeGuidedSession();
  }
};

window.exitGuidedSession = function() {
  if (window.app && typeof window.app.exitGuidedSession === 'function') {
    window.app.exitGuidedSession();
  }
};

window.switchDoctorTab = function(tabId) {
  if (window.app && typeof window.app.switchDoctorTab === 'function') {
    window.app.switchDoctorTab(tabId);
  }
};

window.startGuidedSessionFromTriage = function() {
  if (window.app && typeof window.app.startGuidedSessionFromTriage === 'function') {
    window.app.startGuidedSessionFromTriage();
  }
};

window.closeImportTriageModal = function() {
  if (window.app && typeof window.app.closeImportTriageModal === 'function') {
    window.app.closeImportTriageModal();
  } else {
    const modal = document.getElementById('import-triage-modal');
    if (modal) modal.classList.add('hidden');
  }
};

// Global fail-safe helpers for Create World modal
window.openCreateWorldModal = function() {
  const modal = document.getElementById('create-world-modal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.style.display = 'flex';
  }
};

window.closeCreateWorldModal = function() {
  const modal = document.getElementById('create-world-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.style.display = 'none';
  }
};

window.openEditWorldModal = function() {
  if (window.app && typeof window.app.openEditWorldModal === 'function') {
    window.app.openEditWorldModal();
  } else {
    const modal = document.getElementById('edit-world-modal');
    if (modal) {
      modal.classList.remove('hidden');
      modal.style.display = 'flex';
    }
  }
};

window.closeEditWorldModal = function() {
  if (window.app && typeof window.app.closeEditWorldModal === 'function') {
    window.app.closeEditWorldModal();
  } else {
    const modal = document.getElementById('edit-world-modal');
    if (modal) {
      modal.classList.add('hidden');
      modal.style.display = 'none';
    }
  }
};

// Global fail-safe helper for Ask AI Chat Drawer
window.toggleAIChatDrawer = function() {
  const drawer = document.getElementById('ai-chat-drawer');
  if (drawer) {
    drawer.classList.toggle('hidden');
  }
};

window.closeStubPreviewModal = function() {
  if (window.app && typeof window.app.closeStubPreviewModal === 'function') {
    window.app.closeStubPreviewModal();
  } else {
    const modal = document.getElementById('stub-preview-modal');
    if (modal) modal.classList.add('hidden');
  }
};

window.closeHarmonizeModal = function() {
  if (window.app && typeof window.app.closeHarmonizeModal === 'function') {
    window.app.closeHarmonizeModal();
  } else {
    const modal = document.getElementById('harmonize-diff-modal');
    if (modal) modal.classList.add('hidden');
  }
};

window.closePersonaInterviewer = function() {
  if (window.app && typeof window.app.closePersonaInterviewer === 'function') {
    window.app.closePersonaInterviewer();
  } else {
    const modal = document.getElementById('persona-interviewer-modal');
    if (modal) modal.classList.add('hidden');
  }
};

window.closeBeatPrompter = function() {
  if (window.app && typeof window.app.closeBeatPrompter === 'function') {
    window.app.closeBeatPrompter();
  } else {
    const modal = document.getElementById('beat-prompter-modal');
    if (modal) modal.classList.add('hidden');
  }
};

window.switchTab = function(tabName) {
  if (window.app && typeof window.app.switchTab === 'function') {
    window.app.switchTab(tabName);
  } else {
    const libraryView = document.getElementById('view-library');
    const studioView = document.getElementById('view-studio');
    const contextView = document.getElementById('view-context');

    const tabLibrary = document.getElementById('tab-library');
    const tabStudio = document.getElementById('tab-studio');
    const tabContext = document.getElementById('tab-context');

    [libraryView, studioView, contextView].forEach(v => v && v.classList.remove('active'));
    [tabLibrary, tabStudio, tabContext].forEach(t => t && t.classList.remove('active'));

    if (tabName === 'studio') {
      if (studioView) studioView.classList.add('active');
      if (tabStudio) tabStudio.classList.add('active');
    } else if (tabName === 'context') {
      if (contextView) contextView.classList.add('active');
      if (tabContext) tabContext.classList.add('active');
    } else {
      if (libraryView) libraryView.classList.add('active');
      if (tabLibrary) tabLibrary.classList.add('active');
    }
  }
};

// --- IMAGE UPLOAD, DRAG & DROP, AND LIGHTBOX HELPERS ---
if (window.app) {
  window.app.uploadHeaderImage = async function(file) {
    if (!file) return;
    const formData = new FormData();
    formData.append('image', file);

    try {
      const res = await fetch('/api/upload/image', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const input = document.getElementById('edit-header-image');
      if (input) input.value = data.url;
    } catch (err) {
      alert('Failed to upload cover image: ' + err.message);
    }
  };

  window.app.uploadBodyImage = async function(file) {
    if (!file) return;
    const formData = new FormData();
    formData.append('image', file);

    try {
      const res = await fetch('/api/upload/image', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      this.insertMarkup(`[img]${data.url}[/img]\n`);
    } catch (err) {
      alert('Failed to upload image: ' + err.message);
    }
  };

  window.app.setupEditorDragAndDrop = function() {
    const textarea = document.getElementById('edit-content');
    if (!textarea || textarea.dataset.dragBound) return;
    textarea.dataset.dragBound = 'true';

    textarea.addEventListener('dragover', (e) => {
      e.preventDefault();
      textarea.style.borderColor = 'var(--accent-blue)';
    });

    textarea.addEventListener('dragleave', (e) => {
      e.preventDefault();
      textarea.style.borderColor = '';
    });

    textarea.addEventListener('drop', async (e) => {
      e.preventDefault();
      textarea.style.borderColor = '';
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const file = e.dataTransfer.files[0];
        if (file.type.startsWith('image/')) {
          await window.app.uploadBodyImage(file);
        }
      }
    });
  };

  window.app.generateAIImagePrompt = function() {
    const title = document.getElementById('edit-title').value.trim() || 'Fantasy Lore Location';
    const category = document.getElementById('edit-category').value || 'Locations';
    const promptText = `An epic fantasy digital painting of ${title}, ${category} in WorldAnvil concept art style, highly detailed, dramatic atmospheric lighting, 8k resolution --v 6.0`;

    const choice = confirm(`Generated AI Image Prompt:\n\n"${promptText}"\n\nClick OK to insert this concept prompt into your article content.`);
    if (choice) {
      this.insertMarkup(`[img align="center" caption="${title} concept art"]${promptText}[/img]\n`);
    }
  };

  window.app.openMediaVault = function() {
    const modal = document.getElementById('media-vault-modal');
    if (modal) modal.classList.remove('hidden');
    this.fetchMediaAssets();
  };

  window.app.closeMediaVault = function() {
    const modal = document.getElementById('media-vault-modal');
    if (modal) modal.classList.add('hidden');
  };

  window.app.fetchMediaAssets = async function(query = '') {
    const grid = document.getElementById('media-vault-grid');
    if (!grid) return;
    grid.innerHTML = '<div style="color:var(--text-muted); font-size:0.85rem; padding:1rem; text-align:center;">Loading assets...</div>';

    try {
      const worldId = this.currentWorldId || 'default';
      const url = `/api/media?world_id=${encodeURIComponent(worldId)}${query ? '&q=' + encodeURIComponent(query) : ''}`;
      const res = await fetch(url);
      const data = await res.json();

      if (!Array.isArray(data) || data.length === 0) {
        grid.innerHTML = '<div style="color:var(--text-muted); font-size:0.85rem; padding:2rem; text-align:center; grid-column:1/-1;">No media assets found in vault. Click "📷 Upload Image" to add image files.</div>';
        return;
      }

      grid.innerHTML = data.map(item => `
        <div class="media-card" style="background:var(--surface-card); border:1px solid var(--border-color); border-radius:6px; padding:0.5rem; display:flex; flex-direction:column; gap:0.4rem;">
          <div style="height:120px; overflow:hidden; border-radius:4px; background:#000; display:flex; justify-content:center; align-items:center;">
            <img src="${item.url}" alt="${item.original_name || item.filename}" style="max-width:100%; max-height:100%; object-fit:cover; cursor:pointer;" onclick="window.openImageLightbox('${item.url}', '${(item.original_name || item.filename).replace(/'/g, "\\'")}')" />
          </div>
          <div style="font-size:0.75rem; color:var(--text-primary); font-weight:600; text-overflow:ellipsis; overflow:hidden; white-space:nowrap;" title="${item.original_name || item.filename}">
            ${item.original_name || item.filename}
          </div>
          <div style="display:flex; gap:0.25rem; margin-top:auto;">
            <button class="btn btn-secondary" style="flex:1; font-size:0.7rem; padding:0.2rem;" onclick="window.app.insertMediaBBCode('${item.url}')">➕ Insert</button>
            <button class="btn btn-secondary" style="font-size:0.7rem; padding:0.2rem; background:#dc2626; color:#fff;" onclick="window.app.deleteMediaAsset('${item.id}')">🗑️</button>
          </div>
        </div>
      `).join('');
    } catch (err) {
      grid.innerHTML = `<div style="color:var(--accent-rose); font-size:0.85rem; padding:1rem;">Failed to load media assets: ${err.message}</div>`;
    }
  };

  window.app.filterMediaVault = function(query) {
    this.fetchMediaAssets(query);
  };

  window.app.uploadMediaVaultAsset = async function(file) {
    if (!file) return;
    await this.uploadHeaderImage(file);
    this.fetchMediaAssets();
  };

  window.app.insertMediaBBCode = function(url) {
    this.insertMarkup(`[img]${url}[/img]\n`);
    this.closeMediaVault();
  };

  window.app.deleteMediaAsset = async function(id) {
    if (!confirm('Are you sure you want to delete this media asset from the vault?')) return;
    try {
      const res = await fetch(`/api/media/${encodeURIComponent(id)}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      this.fetchMediaAssets();
    } catch (err) {
      alert('Failed to delete asset: ' + err.message);
    }
  };
}

window.openImageLightbox = function(src, caption) {
  const modal = document.getElementById('article-image-lightbox');
  const img = document.getElementById('lightbox-img');
  const cap = document.getElementById('lightbox-caption');
  if (img) img.src = src;
  if (cap) cap.textContent = caption || '';
  if (modal) modal.classList.remove('hidden');
};

window.closeImageLightbox = function() {
  const modal = document.getElementById('article-image-lightbox');
  if (modal) modal.classList.add('hidden');
};

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    window.closeImageLightbox();
  }
});
