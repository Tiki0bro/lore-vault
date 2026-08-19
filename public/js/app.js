/**
 * LoreWeaver Frontend Application Controller
 */

// Global Toast Notification Helper
window.showToast = function(message, type = 'error') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  const typeClass = type === 'success' ? 'toast-success' : (type === 'info' ? 'toast-info' : 'toast-error');
  toast.className = `toast ${typeClass}`;

  const icon = type === 'success' ? '✅' : (type === 'info' ? 'ℹ️' : '⚠️');

  toast.innerHTML = `
    <span class="toast-icon">${icon}</span>
    <span class="toast-message">${message}</span>
    <button class="toast-close" onclick="this.parentElement.remove()">✕</button>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('toast-hiding');
    setTimeout(() => {
      if (toast.parentElement) {
        toast.remove();
      }
    }, 300);
  }, 5000);
};

class LoreApp {
  constructor() {
    this.articles = [];
    this.categories = [];
    this.worlds = [];
    this.currentWorldId = 'all';
    this.currentArticle = null;
    this.selectedCategory = null;
    this.selectedSubCategory = null;
    this.selectedTag = null;
    this.searchQuery = '';
    this.editingId = null;
    this.navigationHistory = [];
    this.historyIndex = -1;
    this.recentArticles = [];
    this.doctorWorldScope = 'all';
    this.guidedQueue = [];
    this.guidedQueueIndex = 0;
    this.fullTextSearch = false;
    this.searchDebounceTimer = null;
    this.searchResults = [];
    this.selectedIndex = -1;

    this.init();
  }

  async init() {
    this.initThemeMode();
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

    this.setupSearchBar();
    this.setupWeaveMatrix();
    this.setupCrosslinkPopover();
  }

  initThemeMode() {
    const savedMode = localStorage.getItem('lorevault_mode') || 'dark';
    document.body.setAttribute('data-mode', savedMode);
    this.updateToggleIcon(savedMode);
  }

  toggleThemeMode() {
    const currentMode = document.body.getAttribute('data-mode') || 'dark';
    const newMode = currentMode === 'light' ? 'dark' : 'light';
    document.body.setAttribute('data-mode', newMode);
    localStorage.setItem('lorevault_mode', newMode);
    this.updateToggleIcon(newMode);
    return newMode;
  }

  toggleZenMode() {
    const libraryView = document.getElementById('view-library');
    const toggleBtn = document.getElementById('zen-mode-toggle');
    if (!libraryView) return false;

    const isZen = libraryView.classList.toggle('zen-mode');
    if (toggleBtn) {
      toggleBtn.innerHTML = isZen ? '📖 Exit Focus' : '📖 Focus Mode';
    }
    return isZen;
  }

  updateToggleIcon(mode) {
    const toggleBtn = document.getElementById('theme-mode-toggle');
    if (!toggleBtn) return;
    const sunIcon = toggleBtn.querySelector('.mode-icon-sun');
    const moonIcon = toggleBtn.querySelector('.mode-icon-moon');

    if (mode === 'light') {
      if (sunIcon) {
        sunIcon.style.display = 'none';
        sunIcon.classList.add('hidden');
      }
      if (moonIcon) {
        moonIcon.style.display = 'inline';
        moonIcon.classList.remove('hidden');
      }
      toggleBtn.setAttribute('title', 'Switch to Dark Mode');
    } else {
      if (sunIcon) {
        sunIcon.style.display = 'inline';
        sunIcon.classList.remove('hidden');
      }
      if (moonIcon) {
        moonIcon.style.display = 'none';
        moonIcon.classList.add('hidden');
      }
      toggleBtn.setAttribute('title', "Switch to Scholar's Parchment Light Mode");
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
    this.selectedSubCategory = null;
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
    this.renderCategoryDock();

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

    this.notifyWorldChange(worldId);
  }

  notifyWorldChange(worldId) {
    const activeWorld = worldId || 'default';
    if (window.LoreEvents && typeof window.LoreEvents.emit === 'function') {
      window.LoreEvents.emit('world:changed', { worldId: activeWorld });
    }

    if (window.atlasView) {
      window.atlasView.worldId = activeWorld;
      if (typeof window.atlasView.init === 'function') window.atlasView.init();
    }
    if (window.timelineView) {
      window.timelineView.worldId = activeWorld;
      if (typeof window.timelineView.init === 'function') window.timelineView.init();
    }
    if (window.frontpageView) {
      window.frontpageView.worldId = activeWorld;
      if (typeof window.frontpageView.init === 'function') window.frontpageView.init();
    }
    if (window.relationshipView) {
      if (typeof window.relationshipView.init === 'function') window.relationshipView.init(activeWorld);
    }
    if (window.ContextBuilder) {
      if (typeof window.ContextBuilder.init === 'function') window.ContextBuilder.init(this.articles);
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
    const narrativeSlateView = document.getElementById('narrative-slate-view');
    const marketingView = document.getElementById('marketing-view');
    const atlasView = document.getElementById('view-atlas');
    const frontpageView = document.getElementById('view-frontpage');
    const timelineView = document.getElementById('view-timeline');
    const relationshipsView = document.getElementById('view-relationships');

    const tabLibrary = document.getElementById('tab-library');
    const tabStudio = document.getElementById('tab-studio');
    const tabContext = document.getElementById('tab-context');
    const narrativeSlateBtn = document.getElementById('narrative-slate-nav-btn');
    const tabMarketing = document.getElementById('tab-marketing');
    const tabAtlas = document.getElementById('tab-atlas');
    const tabFrontpage = document.getElementById('tab-frontpage');
    const tabTimeline = document.getElementById('tab-timeline');
    const tabRelationships = document.getElementById('tab-relationships') || document.querySelector('button[data-view="view-relationships"]');

    [libraryView, studioView, contextView, marketingView, atlasView, frontpageView, timelineView, relationshipsView].forEach(v => v && v.classList.remove('active'));
    if (narrativeSlateView) {
      narrativeSlateView.classList.remove('active');
      narrativeSlateView.classList.add('hidden');
    }

    [tabLibrary, tabStudio, tabContext, narrativeSlateBtn, tabMarketing, tabAtlas, tabFrontpage, tabTimeline, tabRelationships].forEach(t => t && t.classList.remove('active'));

    if (tabName === 'relationships' || tabName === 'view-relationships') {
      if (relationshipsView) relationshipsView.classList.add('active');
      if (tabRelationships) tabRelationships.classList.add('active');
      if (window.relationshipView) {
        window.relationshipView.init(this.currentWorldId || 'default');
      }
    } else if (tabName === 'timeline') {
      if (timelineView) timelineView.classList.add('active');
      if (tabTimeline) tabTimeline.classList.add('active');
      if (!window.timelineView) {
        window.timelineView = new TimelineView('timeline-app-root', { worldId: this.currentWorldId || 'default' });
      } else {
        window.timelineView.worldId = this.currentWorldId || 'default';
      }
      window.timelineView.init();
    } else if (tabName === 'frontpage') {
      if (frontpageView) frontpageView.classList.add('active');
      if (tabFrontpage) tabFrontpage.classList.add('active');
      if (!window.frontpageView) {
        window.frontpageView = new FrontpageView('frontpage-app-root', { worldId: this.currentWorldId || 'default' });
      } else {
        window.frontpageView.worldId = this.currentWorldId || 'default';
      }
      window.frontpageView.init();
    } else if (tabName === 'atlas') {
      if (atlasView) atlasView.classList.add('active');
      if (tabAtlas) tabAtlas.classList.add('active');
      if (!window.atlasView) {
        window.atlasView = new AtlasView('atlas-app-root', { worldId: this.currentWorldId || 'default' });
        window.atlasView.init();
      } else if (window.atlasView.worldId !== (this.currentWorldId || 'default')) {
        window.atlasView.worldId = this.currentWorldId || 'default';
        window.atlasView.init();
      }
    } else if (tabName === 'marketing') {
      if (marketingView) marketingView.classList.add('active');
      if (tabMarketing) tabMarketing.classList.add('active');
      this.populateMarketingArticles();
    } else if (tabName === 'narrative-slate') {
      if (narrativeSlateView) {
        narrativeSlateView.classList.remove('hidden');
        narrativeSlateView.classList.add('active');
      }
      if (narrativeSlateBtn) narrativeSlateBtn.classList.add('active');
      this.initNarrativeSlateWorkspace();
    } else if (tabName === 'studio') {
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

  switchView(viewName) {
    this.switchTab(viewName);
  }

  /* --- MARKETING ENGINE METHODS --- */

  populateMarketingArticles() {
    const selectEl = document.getElementById('marketing-article-select');
    if (!selectEl) return;

    selectEl.innerHTML = '';
    if (!this.articles || this.articles.length === 0) {
      const option = document.createElement('option');
      option.value = '';
      option.textContent = '-- No Articles Available --';
      option.disabled = true;
      selectEl.appendChild(option);
      return;
    }

    this.articles.forEach(art => {
      const option = document.createElement('option');
      option.value = art.id;
      option.textContent = `${art.title} (${art.category || 'General'})`;
      if (this.currentArticle && this.currentArticle.id === art.id) {
        option.selected = true;
      }
      selectEl.appendChild(option);
    });

    if (selectEl.selectedIndex === -1 && selectEl.options.length > 0) {
      selectEl.options[0].selected = true;
    }
  }

  selectMarketingTone(btnElement) {
    if (!btnElement) return;
    const parent = btnElement.parentElement;
    if (parent) {
      const chips = parent.querySelectorAll('.tone-chip');
      chips.forEach(c => c.classList.remove('active'));
    }
    btnElement.classList.add('active');
  }

  async generateMarketingCopy(mode = 'dashboard') {
    let article_ids = [];
    let preset = 'tweet';
    let tone_chip = 'Epic & Hype';
    let cta_type = 'kickstarter';
    let outputEl = null;
    let generateBtn = null;

    if (mode === 'quick') {
      const articleIdInput = document.getElementById('quick-marketing-article-id');
      const artId = articleIdInput && articleIdInput.value ? articleIdInput.value : (this.currentArticle ? this.currentArticle.id : null);
      if (!artId) {
        alert('Please select an article first.');
        return;
      }
      article_ids = [artId];

      const presetSelect = document.getElementById('quick-marketing-preset');
      if (presetSelect) preset = presetSelect.value;

      const ctaSelect = document.getElementById('quick-marketing-cta');
      if (ctaSelect) cta_type = ctaSelect.value;

      outputEl = document.getElementById('quick-marketing-output');
      generateBtn = document.getElementById('btn-quick-generate-marketing');
    } else {
      const selectEl = document.getElementById('marketing-article-select');
      if (selectEl && selectEl.selectedOptions && selectEl.selectedOptions.length > 0) {
        article_ids = Array.from(selectEl.selectedOptions).map(opt => opt.value).filter(Boolean);
      } else if (this.currentArticle) {
        article_ids = [this.currentArticle.id];
      } else if (this.articles && this.articles.length > 0) {
        article_ids = [this.articles[0].id];
      }

      if (article_ids.length === 0) {
        alert('Please select at least one source article for marketing copy generation.');
        return;
      }

      const presetSelect = document.getElementById('marketing-preset-select');
      if (presetSelect) preset = presetSelect.value;

      const activeToneBtn = document.querySelector('#marketing-tone-chips .tone-chip.active');
      if (activeToneBtn) tone_chip = activeToneBtn.dataset.tone || activeToneBtn.textContent.trim();

      const ctaSelect = document.getElementById('marketing-cta-select');
      if (ctaSelect) cta_type = ctaSelect.value;

      outputEl = document.getElementById('marketing-output-text');
      generateBtn = document.getElementById('btn-generate-marketing');
    }

    if (outputEl) outputEl.value = '⚡ Generating marketing promotional copy... Please wait...';
    if (generateBtn) generateBtn.disabled = true;

    try {
      const response = await fetch('/api/marketing/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          article_ids,
          preset,
          tone_chip,
          cta_type
        })
      });

      const data = await response.json();
      if (data.status === 'success' && data.generated_copy) {
        if (outputEl) outputEl.value = data.generated_copy;
        window.showToast('Marketing copy generated successfully!', 'success');
      } else {
        const msg = data.message || data.error || 'Failed to generate copy';
        if (outputEl) outputEl.value = `❌ Error: ${msg}`;
        window.showToast(msg, 'error');
      }
    } catch (err) {
      console.error('Marketing generation failed:', err);
      if (outputEl) outputEl.value = `❌ Connection Error: ${err.message}`;
      window.showToast(`Marketing generation error: ${err.message}`, 'error');
    } finally {
      if (generateBtn) generateBtn.disabled = false;
    }
  }

  openQuickMarketingModal() {
    let art = this.currentArticle;
    if (!art && this.articles && this.articles.length > 0) {
      art = this.articles[0];
    }

    if (!art) {
      alert('No article selected or available in Lore Vault.');
      return;
    }

    const modal = document.getElementById('marketing-quick-modal');
    const idInput = document.getElementById('quick-marketing-article-id');
    const infoEl = document.getElementById('quick-marketing-article-info');
    const outputEl = document.getElementById('quick-marketing-output');

    if (idInput) idInput.value = art.id;
    if (infoEl) infoEl.textContent = `📢 Article: ${art.title} (${art.category || 'General'})`;
    if (outputEl) outputEl.value = '';

    if (modal) modal.classList.remove('hidden');
  }

  closeQuickMarketingModal() {
    const modal = document.getElementById('marketing-quick-modal');
    if (modal) modal.classList.add('hidden');
  }

  showWeaveActionModal() {
    const modal = document.getElementById('weave-action-modal');
    if (modal) modal.classList.remove('hidden');
  }

  closeWeaveActionModal() {
    const modal = document.getElementById('weave-action-modal');
    if (modal) modal.classList.add('hidden');
  }

  routeToNarrativeSlate() {
    this.closeWeaveActionModal();
    const compiledEl = document.getElementById('compiled-llm-output');
    if (compiledEl && compiledEl.value.trim()) {
      this.activeWeaveContext = compiledEl.value.trim();
      const banner = document.getElementById('slate-weave-context-banner');
      if (banner) {
        banner.classList.remove('hidden');
      }
    }
    this.switchTab('narrative-slate');
    if (window.showToast) {
      window.showToast('Weave Matrix Context loaded into Narrative Slate!', 'success');
    }
  }

  clearActiveWeaveContext() {
    this.activeWeaveContext = null;
    const banner = document.getElementById('slate-weave-context-banner');
    if (banner) {
      banner.classList.add('hidden');
    }
    if (window.showToast) {
      window.showToast('Cleared active Weave Matrix context overlay', 'info');
    }
  }

  routeToMarketing() {
    this.closeWeaveActionModal();
    this.switchTab('marketing');
    if (window.showToast) {
      window.showToast('Routed context to Marketing Engine', 'success');
    }
  }

  openQuickLoreChat() {
    this.closeWeaveActionModal();
    if (typeof window.toggleAIChatDrawer === 'function') {
      window.toggleAIChatDrawer();
    } else {
      const drawer = document.getElementById('ai-chat-drawer');
      if (drawer) drawer.classList.remove('hidden');
    }
    if (window.showToast) {
      window.showToast('Quick Chat (Lore Interrogation) opened', 'info');
    }
  }

  routeToNewArticle() {
    this.closeWeaveActionModal();
    this.openEditor();
    if (window.showToast) {
      window.showToast('Opened New Article editor', 'info');
    }
  }

  copyMarketingOutput(mode = 'dashboard') {
    const outputEl = mode === 'quick'
      ? document.getElementById('quick-marketing-output')
      : document.getElementById('marketing-output-text');
    
    const btn = mode === 'quick'
      ? document.getElementById('btn-copy-quick-marketing')
      : document.getElementById('btn-copy-marketing-output');

    if (!outputEl || !outputEl.value) return;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(outputEl.value).then(() => {
        if (btn) {
          const originalText = btn.textContent;
          btn.textContent = '✅ Copied!';
          setTimeout(() => {
            btn.textContent = originalText;
          }, 2000);
        }
      }).catch(err => {
        console.error('Failed to copy text: ', err);
        outputEl.select();
        document.execCommand('copy');
        if (btn) {
          const originalText = btn.textContent;
          btn.textContent = '✅ Copied!';
          setTimeout(() => {
            btn.textContent = originalText;
          }, 2000);
        }
      });
    } else {
      outputEl.select();
      document.execCommand('copy');
      if (btn) {
        const originalText = btn.textContent;
        btn.textContent = '✅ Copied!';
        setTimeout(() => {
          btn.textContent = originalText;
        }, 2000);
      }
    }
  }

  /* --- NARRATIVE SLATE WORKSPACE METHODS --- */

  initNarrativeSlateWorkspace() {
    this.renderCastMultiselect();
    this.renderPinnedLoreMultiselect();
    this.fetchSavedSlates();
    this.updateSlateWordCount();

    const container = document.getElementById('slate-steps-container');
    if (container && container.children.length === 0) {
      this.addSceneStep('Protagonist arrives at scene location');
    }
  }

  renderCastMultiselect() {
    const container = document.getElementById('slate-cast-multiselect');
    if (!container) return;

    const charArticles = (this.articles || []).filter(a => a.category === 'Characters');
    if (charArticles.length === 0) {
      container.innerHTML = '<span style="font-size:0.75rem; color:var(--text-muted);">No character articles in lore database.</span>';
      return;
    }

    container.innerHTML = charArticles.map(art => `
      <label class="cast-checkbox-label">
        <input type="checkbox" value="${art.id}" onchange="window.app.renderCastWantsFlawsCards()">
        <span>🎭 ${this.escapeHtml(art.title)}</span>
      </label>
    `).join('');

    this.renderCastWantsFlawsCards();
  }

  renderPinnedLoreMultiselect() {
    const container = document.getElementById('slate-pinned-lore-container');
    if (!container) return;

    if (!this.articles || this.articles.length === 0) {
      container.innerHTML = '<span style="font-size:0.75rem; color:var(--text-muted);">No articles in lore database.</span>';
      return;
    }

    container.innerHTML = this.articles.map(art => `
      <label class="lore-checkbox-label">
        <input type="checkbox" value="${art.id}">
        <span>📜 ${this.escapeHtml(art.title)} <small style="color:var(--text-muted);">(${this.escapeHtml(art.category || 'General')})</small></span>
      </label>
    `).join('');
  }

  renderCastWantsFlawsCards() {
    const cardsContainer = document.getElementById('slate-cast-cards');
    if (!cardsContainer) return;

    const checkedBoxes = document.querySelectorAll('#slate-cast-multiselect input[type="checkbox"]:checked');
    const selectedIds = Array.from(checkedBoxes).map(b => b.value);

    if (selectedIds.length === 0) {
      cardsContainer.innerHTML = '<span style="font-size:0.75rem; color:var(--text-muted);">Select cast members above to display active Wants & Flaws.</span>';
      return;
    }

    const cardsHtml = selectedIds.map(id => {
      const art = (this.articles || []).find(a => a.id === id);
      const title = art ? art.title : id;
      const summary = art ? (art.summary || art.content.substring(0, 120) + '...') : '';
      return `
        <div class="cast-card">
          <div class="cast-card-name">🎭 ${this.escapeHtml(title)}</div>
          <div class="cast-card-detail"><strong>Wants:</strong> Secure safety, unearth hidden truth</div>
          <div class="cast-card-detail"><strong>Flaws/Conflict:</strong> Hyper-vigilant, hesitant trust</div>
          ${summary ? `<div class="cast-card-detail" style="font-style:italic; margin-top:0.25rem;">"${this.escapeHtml(summary)}"</div>` : ''}
        </div>
      `;
    }).join('');

    cardsContainer.innerHTML = cardsHtml;
  }

  addSceneStep(text = '') {
    const container = document.getElementById('slate-steps-container');
    if (!container) return;

    const row = document.createElement('div');
    row.className = 'step-item-row';
    row.innerHTML = `
      <input type="text" class="step-item-input" value="${this.escapeHtml(text)}" placeholder="Enter scene step directive...">
      <button type="button" class="step-remove-btn" onclick="this.parentElement.remove()">✕</button>
    `;
    container.appendChild(row);
  }

  updateSlateWordCount() {
    const editor = document.getElementById('narrative-prose-editor');
    const badge = document.getElementById('slate-word-count');
    if (!editor || !badge) return;

    const text = editor.value.trim();
    const words = text ? text.split(/\s+/).length : 0;
    badge.textContent = `${words} word${words === 1 ? '' : 's'}`;
  }

  async compileNarrativeSlate() {
    if (this.activeWeaveContext) {
      const plot_hook = document.getElementById('slate-plot-hook') ? document.getElementById('slate-plot-hook').value.trim() : '';
      let finalPrompt = this.activeWeaveContext;
      if (plot_hook) {
        finalPrompt += `\n\n[ADDITIONAL SCENE DIRECTIVE & HOOK]\n${plot_hook}`;
      }
      return {
        status: 'success',
        compiled_prompt: finalPrompt
      };
    }

    const plot_hook = document.getElementById('slate-plot-hook') ? document.getElementById('slate-plot-hook').value.trim() : '';

    const stepInputs = document.querySelectorAll('#slate-steps-container .step-item-input');
    const scene_steps = Array.from(stepInputs).map(i => i.value.trim()).filter(Boolean);

    const checkedCast = document.querySelectorAll('#slate-cast-multiselect input[type="checkbox"]:checked');
    const cast_ids = Array.from(checkedCast).map(c => c.value);

    const checkedLore = document.querySelectorAll('#slate-pinned-lore-container input[type="checkbox"]:checked');
    const pinned_lore_ids = Array.from(checkedLore).map(l => l.value);

    const activeChips = document.querySelectorAll('#slate-tone-chips .tone-chip.active');
    const tone_chips = Array.from(activeChips).map(c => c.getAttribute('data-tone') || c.innerText.trim());

    const payload = {
      plot_hook,
      scene_steps,
      cast_ids,
      pinned_lore_ids,
      tone_chips,
      visibility: 'public',
      max_tokens: 4000
    };

    try {
      const res = await fetch('/api/narrative/compile-slate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      let data;
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") !== -1) {
        data = await res.json();
      } else {
        const textError = await res.text();
        throw new Error(`Server returned non-JSON response: ${textError.substring(0, 100)}...`);
      }

      if (data.status === 'success') {
        return data;
      } else {
        const msg = data.message || data.error || 'Failed to compile narrative slate';
        window.showToast(msg, 'error');
        throw new Error(msg);
      }
    } catch (err) {
      window.showToast(`Slate Compilation Error: ${err.message}`, 'error');
      throw err;
    }
  }

  async generateProseContinuation() {
    const btn = document.getElementById('btn-continue-prose');
    if (btn) {
      btn.disabled = true;
      btn.innerText = '⏳ Writing...';
    }

    try {
      const compileData = await this.compileNarrativeSlate();
      const editor = document.getElementById('narrative-prose-editor');
      const current_draft = editor ? editor.value : '';

      const res = await fetch('/api/narrative/continue-prose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          compiled_prompt: compileData.compiled_prompt,
          current_draft: current_draft
        })
      });

      const data = await res.json();
      if (data.status === 'success' && data.generated_text) {
        if (editor.value.trim().length > 0) {
          editor.value += '\n\n' + data.generated_text;
        } else {
          editor.value = data.generated_text;
        }
        this.updateSlateWordCount();
        window.showToast('Prose generated successfully!', 'success');
      } else {
        const msg = data.message || data.error || 'Unknown server error';
        window.showToast('Error generating prose continuation: ' + msg, 'error');
      }
    } catch (err) {
      window.showToast('Prose Error: ' + err.message, 'error');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerText = '⚡ Continue Prose';
      }
    }
  }

  showPovRewriteModal() {
    const modal = document.getElementById('pov-rewrite-modal');
    if (!modal) return;

    const select = document.getElementById('pov-target-character');
    if (select) {
      select.innerHTML = '<option value="">-- Choose Character POV --</option>';
      const charArticles = (this.articles || []).filter(a => a.category === 'Characters');
      charArticles.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = c.title;
        select.appendChild(opt);
      });
    }

    modal.classList.remove('hidden');
    modal.style.display = 'flex';
  }

  closePovRewriteModal() {
    const modal = document.getElementById('pov-rewrite-modal');
    if (modal) {
      modal.classList.add('hidden');
      modal.style.display = 'none';
    }
  }

  async executePovRewrite() {
    const editor = document.getElementById('narrative-prose-editor');
    if (!editor) return;

    const charId = document.getElementById('pov-target-character') ? document.getElementById('pov-target-character').value : '';
    if (!charId) {
      alert('Please select a target character perspective.');
      return;
    }

    let textToRewrite = '';
    const startPos = editor.selectionStart;
    const endPos = editor.selectionEnd;

    if (startPos !== endPos) {
      textToRewrite = editor.value.substring(startPos, endPos);
    } else {
      textToRewrite = editor.value.trim();
    }

    if (!textToRewrite) {
      alert('Please write or select text in the editor to rewrite.');
      return;
    }

    this.closePovRewriteModal();

    try {
      const res = await fetch('/api/narrative/pov-rewrite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          highlighted_text: textToRewrite,
          pov_character_id: charId
        })
      });

      const data = await res.json();
      if (data.status === 'success' && data.rewritten_text) {
        if (startPos !== endPos) {
          editor.value = editor.value.substring(0, startPos) + data.rewritten_text + editor.value.substring(endPos);
        } else {
          editor.value = data.rewritten_text;
        }
        this.updateSlateWordCount();
      } else {
        alert('Error performing POV rewrite: ' + (data.error || 'Unknown error'));
      }
    } catch (e) {
      alert('Error: ' + e.message);
    }
  }

  async suggestNextBeats() {
    const btn = document.getElementById('btn-suggest-beats');
    if (btn) {
      btn.disabled = true;
      btn.innerText = '⏳ Brainstorming...';
    }

    try {
      const compileData = await this.compileNarrativeSlate();
      const editor = document.getElementById('narrative-prose-editor');
      const current_draft = editor ? editor.value : '';

      const res = await fetch('/api/narrative/suggest-beats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          compiled_prompt: compileData.compiled_prompt,
          current_draft: current_draft
        })
      });

      const data = await res.json();
      if (data.status === 'success' && Array.isArray(data.beats)) {
        this.showBeatSuggestionsModal(data.beats);
      } else {
        alert('Error suggesting beats: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerText = '💡 Suggest Next Steps';
      }
    }
  }

  showBeatSuggestionsModal(beats) {
    const modal = document.getElementById('beats-suggestion-modal');
    const container = document.getElementById('beats-suggestion-list');
    if (!modal || !container) return;

    container.innerHTML = beats.map((beat, idx) => `
      <div style="background:rgba(15,23,42,0.9); border:1px solid var(--border-color); border-radius:6px; padding:0.75rem;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.35rem;">
          <strong style="color:var(--accent-amber); font-size:0.9rem;">${idx + 1}. ${this.escapeHtml(beat.title)}</strong>
          <span style="font-size:0.7rem; padding:0.15rem 0.5rem; background:rgba(56,189,248,0.1); color:var(--accent-primary); border-radius:4px;">${this.escapeHtml(beat.type || 'Beat')}</span>
        </div>
        <p style="font-size:0.8rem; color:var(--text-secondary); margin-bottom:0.5rem;">${this.escapeHtml(beat.description)}</p>
        <button class="btn btn-sm btn-primary" onclick="window.app.insertBeatStep('${this.escapeHtml(beat.title + ': ' + beat.description)}')">+ Add to Scene Steps</button>
      </div>
    `).join('');

    modal.classList.remove('hidden');
    modal.style.display = 'flex';
  }

  closeBeatsModal() {
    const modal = document.getElementById('beats-suggestion-modal');
    if (modal) {
      modal.classList.add('hidden');
      modal.style.display = 'none';
    }
  }

  insertBeatStep(stepText) {
    this.addSceneStep(stepText);
    this.closeBeatsModal();
  }

  async saveNarrativeSlate() {
    const name = prompt('Enter a name for this Narrative Slate:', 'Scene Slate - ' + new Date().toLocaleTimeString());
    if (!name) return;

    const plot_hook = document.getElementById('slate-plot-hook') ? document.getElementById('slate-plot-hook').value.trim() : '';

    const stepInputs = document.querySelectorAll('#slate-steps-container .step-item-input');
    const scene_steps = Array.from(stepInputs).map(i => i.value.trim()).filter(Boolean);

    const checkedCast = document.querySelectorAll('#slate-cast-multiselect input[type="checkbox"]:checked');
    const cast_ids = Array.from(checkedCast).map(c => c.value);

    const checkedLore = document.querySelectorAll('#slate-pinned-lore-container input[type="checkbox"]:checked');
    const pinned_lore_ids = Array.from(checkedLore).map(l => l.value);

    const activeChips = document.querySelectorAll('#slate-tone-chips .tone-chip.active');
    const tone_chips = Array.from(activeChips).map(c => c.getAttribute('data-tone') || c.innerText.trim());

    const payload = {
      name,
      world_id: this.currentWorldId || 'all',
      plot_hook,
      scene_steps,
      cast_ids,
      pinned_lore_ids,
      tone_chips
    };

    try {
      const res = await fetch('/api/narrative/save-slate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.status === 'success') {
        alert('Narrative Slate saved successfully!');
        this.fetchSavedSlates();
      } else {
        alert('Failed to save slate: ' + (data.error || 'Unknown error'));
      }
    } catch (e) {
      alert('Error saving slate: ' + e.message);
    }
  }

  async fetchSavedSlates() {
    const select = document.getElementById('slate-snapshot-select');
    if (!select) return;

    try {
      const res = await fetch(`/api/narrative/slates?world_id=${this.currentWorldId || 'all'}`);
      const data = await res.json();

      select.innerHTML = '<option value="">📂 Load Saved Slate Snapshot...</option>';

      if (data.status === 'success' && Array.isArray(data.slates)) {
        data.slates.forEach(slate => {
          const opt = document.createElement('option');
          opt.value = slate.id;
          opt.textContent = `${slate.name} (${new Date(slate.updated_at).toLocaleDateString()})`;
          select.appendChild(opt);
        });
      }
    } catch (e) {
      console.error('Failed to fetch saved slates:', e);
    }
  }

  async loadNarrativeSlate(slateId) {
    if (!slateId) return;

    try {
      const res = await fetch(`/api/narrative/slates?world_id=${this.currentWorldId || 'all'}`);
      const data = await res.json();

      if (data.status === 'success' && Array.isArray(data.slates)) {
        const slate = data.slates.find(s => s.id === slateId);
        if (!slate) return;

        if (document.getElementById('slate-plot-hook')) {
          document.getElementById('slate-plot-hook').value = slate.plot_hook || '';
        }

        const stepsContainer = document.getElementById('slate-steps-container');
        if (stepsContainer) {
          stepsContainer.innerHTML = '';
          let steps = [];
          try {
            steps = typeof slate.scene_steps === 'string' ? JSON.parse(slate.scene_steps) : slate.scene_steps;
          } catch (e) {}
          if (Array.isArray(steps) && steps.length > 0) {
            steps.forEach(stepText => this.addSceneStep(stepText));
          } else {
            this.addSceneStep('');
          }
        }

        let castIds = [];
        try {
          castIds = typeof slate.cast_ids === 'string' ? JSON.parse(slate.cast_ids) : slate.cast_ids;
        } catch (e) {}
        const castBoxes = document.querySelectorAll('#slate-cast-multiselect input[type="checkbox"]');
        castBoxes.forEach(box => {
          box.checked = Array.isArray(castIds) && castIds.includes(box.value);
        });
        this.renderCastWantsFlawsCards();

        let tones = [];
        try {
          tones = typeof slate.tone_chips === 'string' ? JSON.parse(slate.tone_chips) : slate.tone_chips;
        } catch (e) {}
        const toneButtons = document.querySelectorAll('#slate-tone-chips .tone-chip');
        toneButtons.forEach(btn => {
          const tVal = btn.getAttribute('data-tone') || btn.innerText.trim();
          if (Array.isArray(tones) && tones.includes(tVal)) {
            btn.classList.add('active');
          } else {
            btn.classList.remove('active');
          }
        });

        let loreIds = [];
        try {
          loreIds = typeof slate.pinned_lore_ids === 'string' ? JSON.parse(slate.pinned_lore_ids) : slate.pinned_lore_ids;
        } catch (e) {}
        const loreBoxes = document.querySelectorAll('#slate-pinned-lore-container input[type="checkbox"]');
        loreBoxes.forEach(box => {
          box.checked = Array.isArray(loreIds) && loreIds.includes(box.value);
        });
      }
    } catch (e) {
      console.error('Failed to load slate details:', e);
    }
  }

  handleWikiLinkAutocomplete(event) {
    this.updateSlateWordCount();

    const editor = document.getElementById('narrative-prose-editor');
    const popover = document.getElementById('wikilink-autocomplete-popover');
    if (!editor || !popover) return;

    const cursorPos = editor.selectionStart;
    const textBefore = editor.value.substring(0, cursorPos);
    const lastOpenIndex = textBefore.lastIndexOf('[[');

    if (lastOpenIndex !== -1) {
      const textAfterOpen = textBefore.substring(lastOpenIndex + 2);
      if (!textAfterOpen.includes(']]') && !textAfterOpen.includes('\n')) {
        const query = textAfterOpen.toLowerCase();
        const matches = (this.articles || []).filter(art =>
          art.title.toLowerCase().includes(query)
        ).slice(0, 8);

        if (matches.length > 0) {
          popover.innerHTML = matches.map((art, idx) => `
            <div class="wikilink-item ${idx === 0 ? 'selected' : ''}" onclick="window.app.selectWikiLinkItem('${this.escapeHtml(art.title)}')">
              <span>[[${this.escapeHtml(art.title)}]]</span>
              <span class="item-category">${this.escapeHtml(art.category || 'Lore')}</span>
            </div>
          `).join('');

          popover.classList.remove('hidden');
          return;
        }
      }
    }

    popover.classList.add('hidden');
  }

  selectWikiLinkItem(articleTitle) {
    const editor = document.getElementById('narrative-prose-editor');
    const popover = document.getElementById('wikilink-autocomplete-popover');
    if (!editor) return;

    const cursorPos = editor.selectionStart;
    const textBefore = editor.value.substring(0, cursorPos);
    const textAfter = editor.value.substring(cursorPos);
    const lastOpenIndex = textBefore.lastIndexOf('[[');

    if (lastOpenIndex !== -1) {
      const prefix = textBefore.substring(0, lastOpenIndex);
      editor.value = prefix + `[[${articleTitle}]]` + textAfter;
      const newCursorPos = prefix.length + articleTitle.length + 4;
      editor.selectionStart = newCursorPos;
      editor.selectionEnd = newCursorPos;
      editor.focus();
    }

    if (popover) popover.classList.add('hidden');
    this.updateSlateWordCount();
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
      this.renderCategoryDock();
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
      this.renderFilterChips();
      this.renderCategoryDock();
      
      // Update ContextBuilder dataset
      if (window.ContextBuilder) {
        window.ContextBuilder.init(this.articles);
      }
      this.populateMarketingArticles();
      this.loadKnowledgeGraph();
    } catch (err) {
      console.error('Failed to fetch articles:', err);
    }
  }

  renderCategoryDock() {
    const dockEl = document.getElementById('category-dock-bar');
    if (!dockEl) return;

    const standardCategories = [
      'Characters',
      'Locations',
      'Factions',
      'Races & Species',
      'Magic & Tech',
      'History',
      'Items'
    ];

    const categoryIcons = {
      'Characters': '👤',
      'Locations': '🏰',
      'Factions': '🛡️',
      'Races & Species': '🧬',
      'Magic & Tech': '🔮',
      'History': '📜',
      'Items': '⚔️'
    };

    let totalCount = 0;
    const countMap = {};
    standardCategories.forEach(cat => { countMap[cat] = 0; });

    if (Array.isArray(this.categories) && this.categories.length > 0) {
      this.categories.forEach(c => {
        if (c.category && countMap.hasOwnProperty(c.category)) {
          countMap[c.category] = c.count || 0;
        }
        totalCount += (c.count || 0);
      });
    } else if (Array.isArray(this.articles)) {
      this.articles.forEach(a => {
        if (a.category && countMap.hasOwnProperty(a.category)) {
          countMap[a.category]++;
        }
        totalCount++;
      });
    }

    const isAllActive = !this.selectedCategory;
    let html = `
      <button class="category-dock-pill ${isAllActive ? 'active' : ''}" onclick="window.app.filterByCategory(null)" title="All Categories">
        <span class="dock-icon">📚</span>
        <span class="dock-title">All</span>
        <span class="dock-count-badge">${totalCount}</span>
      </button>
    `;

    standardCategories.forEach(catName => {
      const count = countMap[catName] || 0;
      const isActive = this.selectedCategory === catName;
      const icon = (window.LoreBadges && typeof window.LoreBadges.getCategoryIcon === 'function')
        ? window.LoreBadges.getCategoryIcon(catName)
        : (categoryIcons[catName] || '📜');

      const escapedCat = catName.replace(/'/g, "\\'");
      html += `
        <button class="category-dock-pill ${isActive ? 'active' : ''}" onclick="window.app.filterByCategory('${escapedCat}')" title="${catName}">
          <span class="dock-icon">${icon}</span>
          <span class="dock-title">${catName}</span>
          <span class="dock-count-badge">${count}</span>
        </button>
      `;
    });

    // Render Custom Primary Categories
    if (Array.isArray(this.categories)) {
      this.categories.forEach(c => {
        if (c.isCustom && c.category && !standardCategories.includes(c.category)) {
          const catName = c.category;
          const count = c.count || 0;
          const isActive = this.selectedCategory === catName;
          const icon = c.icon || '📁';
          const escapedCat = catName.replace(/'/g, "\\'");
          html += `
            <button class="category-dock-pill ${isActive ? 'active' : ''}" onclick="window.app.filterByCategory('${escapedCat}')" title="${catName}">
              <span class="dock-icon">${icon}</span>
              <span class="dock-title">${catName}</span>
              <span class="dock-count-badge">${count}</span>
            </button>
          `;
        }
      });
    }

    // Add Custom Category CTA Button
    html += `
      <button class="add-category-dock-btn" onclick="window.app.openCreateCategoryModal()" title="Add Custom Category or Sub-Category">
        <span>+ Category</span>
      </button>
    `;

    dockEl.innerHTML = html;
    this.renderSubCategoryBar();
  }

  renderSubCategoryBar() {
    const barEl = document.getElementById('sub-category-bar');
    if (!barEl) return;

    const currentCat = this.selectedCategory;
    const subCategoriesMap = {
      'Characters': ['Rulers & Nobility', 'Mages & Mystics', 'Warriors & Officers', 'Key Figures & Personages'],
      'Locations': ['Cities & Settlements', 'Fortresses & Strongholds', 'Realms & Territories', 'Geography & Wilderness', 'Landmarks & Ruins'],
      'Factions': ['Noble Houses & Dynasties', 'Syndicates & Guilds', 'Military Orders', 'Organizations & Societies'],
      'Races & Species': ['Playable Races & Lineages', 'Beasts & Creatures', 'Monsters & Entities', 'Flora & Ecology'],
      'Magic & Tech': ['Spells & Incantations', 'Arcane Artifacts & Catalysts', 'Technology & Machinery', 'Magic Systems & Theories'],
      'History': ['Eras & Ages', 'Wars & Battles', 'Treaties & Accords', 'Chronicles & Key Events'],
      'Items': ['Weapons & Armaments', 'Armor & Relics', 'Potions & Reagents', 'Trinkets & Valuables']
    };

    const hasFilter = !!(this.selectedCategory || this.selectedSubCategory || this.selectedTag || this.searchQuery);

    if (!currentCat) {
      if (hasFilter) {
        barEl.classList.remove('hidden');
        barEl.innerHTML = `
          <button class="clear-filter-chip" onclick="window.app.clearCategoryFilters()" title="Clear Active Filters">
            <span>✕ Clear Filter</span>
          </button>
        `;
      } else {
        barEl.classList.add('hidden');
        barEl.innerHTML = '';
      }
      return;
    }

    barEl.classList.remove('hidden');

    const knownSubs = subCategoriesMap[currentCat] || [];
    const dbSubMap = new Map();

    const found = Array.isArray(this.categories) ? this.categories.find(c => c.category === currentCat) : null;
    if (found && Array.isArray(found.subCategories)) {
      found.subCategories.forEach(s => {
        if (s.subCategory) dbSubMap.set(s.subCategory, s.count || 0);
      });
    }

    if (Array.isArray(this.articles)) {
      const articleSubCounts = new Map();
      this.articles.forEach(a => {
        if (a.category === currentCat) {
          const sub = a.sub_category || a.subCategory;
          if (sub) {
            articleSubCounts.set(sub, (articleSubCounts.get(sub) || 0) + 1);
          } else if (Array.isArray(a.tags)) {
            a.tags.forEach(t => {
              if (knownSubs.includes(t)) {
                articleSubCounts.set(t, (articleSubCounts.get(t) || 0) + 1);
              }
            });
          }
        }
      });
      articleSubCounts.forEach((cnt, sName) => {
        const existing = dbSubMap.get(sName) || 0;
        if (cnt > existing || !dbSubMap.has(sName)) {
          dbSubMap.set(sName, cnt);
        }
      });
    }

    const subList = Array.from(new Set([...knownSubs, ...dbSubMap.keys()]));

    let html = '';

    // 1-Click Clear Filter Chip
    html += `
      <button class="clear-filter-chip" onclick="window.app.clearCategoryFilters()" title="Clear Active Filters">
        <span>✕ Clear Filter</span>
      </button>
    `;

    // "All [Category]" Chip
    const isAllSubActive = !this.selectedSubCategory && !this.selectedTag;
    html += `
      <button class="sub-category-chip ${isAllSubActive ? 'active' : ''}" onclick="window.app.filterBySubCategory('All')" title="All ${currentCat}">
        <span>All ${currentCat}</span>
      </button>
    `;

    // Sub-category Chips
    subList.forEach(subName => {
      const count = dbSubMap.get(subName) || 0;
      const isSubActive = (this.selectedSubCategory === subName || this.selectedTag === subName);
      const escapedSub = subName.replace(/'/g, "\\'");
      html += `
        <button class="sub-category-chip ${isSubActive ? 'active' : ''}" onclick="window.app.filterBySubCategory('${escapedSub}')" title="${subName}">
          <span>${subName}</span>
          <span class="sub-chip-count">${count}</span>
        </button>
      `;
    });

    barEl.innerHTML = html;
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

  toggleTagsAccordion() {
    const body = document.getElementById('tags-accordion-body');
    const toggleBtn = document.getElementById('tags-accordion-toggle');
    if (body) {
      body.classList.toggle('collapsed');
      const isCollapsed = body.classList.contains('collapsed');
      if (toggleBtn) {
        const arrow = toggleBtn.querySelector('.accordion-arrow');
        if (arrow) arrow.textContent = isCollapsed ? '▸' : '▾';
      }
    }
  }

  renderArticleList(articles = this.articles) {
    const container = document.getElementById('articles-cards');
    const countEl = document.getElementById('article-count');
    if (!container) return;

    const list = articles || [];

    if (countEl) countEl.textContent = `${list.length} Articles`;

    if (list.length === 0) {
      container.innerHTML = `
        <div style="text-align:center; padding:2rem; color:var(--text-muted);">
          No lore articles found matching criteria.
        </div>
      `;
      return;
    }

    // Group articles by Category or Type or fallback to Uncategorized
    const groups = {};
    list.forEach(art => {
      let cat = art.category || art.type;
      if (!cat && Array.isArray(art.tags) && art.tags.length > 0) {
        cat = art.tags[0];
      }
      if (!cat || typeof cat !== 'string' || !cat.trim()) {
        cat = 'Uncategorized';
      } else {
        cat = cat.trim();
      }

      if (!groups[cat]) {
        groups[cat] = [];
      }
      groups[cat].push(art);
    });

    const sortedCategories = Object.keys(groups).sort((a, b) => a.localeCompare(b));
    const catIconMap = {
      'Characters': '👥',
      'Locations': '🏰',
      'Factions': '🛡️',
      'Races & Species': '🧬',
      'Magic & Tech': '🔮',
      'History': '📜',
      'Items': '🗡️'
    };

    // --- FULL-COLUMN CARD STREAM WHEN CATEGORY OR FILTER IS ACTIVE ---
    if (this.selectedCategory || this.selectedSubCategory || this.selectedTag || this.searchQuery) {
      container.innerHTML = list.map(art => {
        const isActive = this.currentArticle && this.currentArticle.id === art.id;
        const catClass = (art.category || 'uncategorized').toLowerCase().replace(/[^a-z0-9]/g, '');
        const tagsList = Array.isArray(art.tags) ? art.tags : [];
        const icon = catIconMap[art.category] || '📁';

        return `
          <div class="article-card ${isActive ? 'active' : ''}" onclick="window.app.loadArticle('${art.id}')">
            <div class="card-top">
              <h3 class="card-title">${this.escapeHtml(art.title)}</h3>
              <span class="badge badge-${catClass}">${icon} ${this.escapeHtml(art.category || 'Lore')}</span>
            </div>
            <p class="card-summary">${this.escapeHtml(art.summary || 'No summary available.')}</p>
            <div class="card-footer">
              ${tagsList.slice(0, 4).map(t => `<span class="tag-pill" style="font-size:0.65rem;" onclick="event.stopPropagation(); window.app.filterByTag('${this.escapeHtml(t)}')">#${this.escapeHtml(t)}</span>`).join('')}
            </div>
          </div>
        `;
      }).join('');
      return;
    }

    // --- COLLAPSIBLE ACCORDIONS FOR ALL CATEGORIES VIEW ---
    container.innerHTML = sortedCategories.map(catName => {
      const categoryArticles = groups[catName];
      const icon = catIconMap[catName] || '📁';
      const isOpen = !this.selectedCategory || this.selectedCategory === catName;

      const articlesHtml = categoryArticles.map(art => {
        const isActive = this.currentArticle && this.currentArticle.id === art.id;
        const catClass = (art.category || 'uncategorized').toLowerCase().replace(/[^a-z0-9]/g, '');
        const tagsList = Array.isArray(art.tags) ? art.tags : [];

        return `
          <li>
            <div class="article-card ${isActive ? 'active' : ''}" onclick="window.app.loadArticle('${art.id}')">
              <div class="card-top">
                <h3 class="card-title">${this.escapeHtml(art.title)}</h3>
                <span class="badge badge-${catClass}">${icon} ${this.escapeHtml(art.category || catName)}</span>
              </div>
              <p class="card-summary">${this.escapeHtml(art.summary || 'No summary available.')}</p>
              <div class="card-footer">
                ${tagsList.slice(0, 3).map(t => `<span class="tag-pill" style="font-size:0.65rem;">#${this.escapeHtml(t)}</span>`).join('')}
              </div>
            </div>
          </li>
        `;
      }).join('');

      return `
        <details class="category-folder" ${isOpen ? 'open' : ''}>
          <summary class="category-folder-summary">
            <span class="category-folder-title">
              <span class="folder-icon">${icon}</span>
              <span>${this.escapeHtml(catName)}</span>
            </span>
            <div style="display:flex; align-items:center; gap:0.5rem;">
              <span class="cat-count" style="font-size:0.75rem;">${categoryArticles.length}</span>
              <span class="category-folder-caret">▶</span>
            </div>
          </summary>
          <ul class="article-list-group">
            ${articlesHtml}
          </ul>
        </details>
      `;
    }).join('');

    this.renderFilterBreadcrumb();
  }

  renderFilterBreadcrumb() {
    const el = document.getElementById('active-filter-breadcrumb');
    if (!el) return;

    if (!this.selectedCategory && !this.selectedTag && !this.searchQuery) {
      el.classList.add('hidden');
      el.innerHTML = '';
      return;
    }

    const catIconMap = {
      'Characters': '👥',
      'Locations': '🏰',
      'Factions': '🛡️',
      'Races & Species': '🧬',
      'Magic & Tech': '🔮',
      'History': '📜',
      'Items': '🗡️'
    };

    let pathHtml = '';
    if (this.selectedCategory) {
      const icon = catIconMap[this.selectedCategory] || '📁';
      pathHtml += `<span>${icon} ${this.escapeHtml(this.selectedCategory)}</span>`;
    }

    if (this.selectedTag) {
      if (pathHtml) pathHtml += `<span class="breadcrumb-sep">›</span>`;
      pathHtml += `<span>${this.escapeHtml(this.selectedTag)}</span>`;
    }

    if (this.searchQuery) {
      if (pathHtml) pathHtml += `<span class="breadcrumb-sep">›</span>`;
      pathHtml += `<span>🔍 "${this.escapeHtml(this.searchQuery)}"</span>`;
    }

    const count = this.articles ? this.articles.length : 0;
    pathHtml += ` <span style="font-size:0.7rem; opacity:0.7; font-weight:normal;">(${count})</span>`;

    el.innerHTML = `
      <div class="breadcrumb-path">${pathHtml}</div>
      <button class="breadcrumb-clear" onclick="window.app.clearCategoryFilters()">✕ Clear Filter</button>
    `;
    el.classList.remove('hidden');
  }

  renderArticlesList() {
    this.renderArticleList(this.articles);
  }

  async loadArticle(id, isHistoryNav = false) {
    try {
      const res = await fetch(`/api/articles/${encodeURIComponent(id)}`);
      if (!res.ok) return;

      this.currentArticle = await res.json();
      this.recordRecentArticle(this.currentArticle.id, this.currentArticle.title, this.currentArticle.category);

      if (!isHistoryNav) {
        if (this.historyIndex === -1 || this.navigationHistory[this.historyIndex] !== id) {
          this.navigationHistory = this.navigationHistory.slice(0, this.historyIndex + 1);
          this.navigationHistory.push(id);
          this.historyIndex = this.navigationHistory.length - 1;
        }
      }
      this.syncHistoryButtons();
      
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

      // Sync Add to Slate button state
      this.syncAddToSlateBtn();

      this.renderArticlesList();
    } catch (err) {
      console.error('Failed to load article:', err);
    }
  }

  /**
   * Sync #add-to-slate-btn visual state with ContextBuilder slate.
   */
  syncAddToSlateBtn() {
    const btn = document.getElementById('add-to-slate-btn');
    if (!btn || !this.currentArticle) return;

    const isInSlate = window.ContextBuilder &&
      window.ContextBuilder.state.slate.selectedArticleIds.has(this.currentArticle.id);

    if (isInSlate) {
      btn.textContent = '✓ In Slate';
      btn.classList.add('in-slate', 'added');
      btn.disabled = true;
    } else {
      btn.textContent = '+ Add to Slate';
      btn.classList.remove('in-slate', 'added');
      btn.disabled = false;
    }
  }

  /**
   * Handle click on the #add-to-slate-btn.
   * Adds the current article to the Weave Matrix slate with visual feedback.
   */
  handleAddToSlateClick() {
    if (!this.currentArticle) return;

    const btn = document.getElementById('add-to-slate-btn');
    if (!btn || btn.disabled) return;

    const articleId = this.currentArticle.id;

    // Delegate to ContextBuilder
    let wasAdded = true;
    if (window.ContextBuilder && typeof window.ContextBuilder.addArticleToSlate === 'function') {
      wasAdded = window.ContextBuilder.addArticleToSlate(articleId);
    }

    if (wasAdded) {
      // Visual feedback: text change + pulse animation
      btn.textContent = '✓ In Slate';
      btn.classList.add('in-slate', 'added');
      btn.disabled = true;

      if (window.showToast) {
        window.showToast(`"${this.currentArticle.title}" added to Weave Matrix slate`, 'success');
      }
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

  renderFilterChips() {
    const container = document.getElementById('category-filter-chips');
    if (!container) return;

    const standardCategories = [
      'Characters',
      'Locations',
      'Factions',
      'Races & Species',
      'Magic & Tech',
      'History',
      'Items'
    ];

    const subCategoriesMap = {
      'Characters': ['Rulers & Nobility', 'Mages & Mystics', 'Warriors & Officers', 'Key Figures & Personages'],
      'Locations': ['Cities & Settlements', 'Fortresses & Strongholds', 'Realms & Territories', 'Geography & Wilderness', 'Landmarks & Ruins'],
      'Factions': ['Noble Houses & Dynasties', 'Syndicates & Guilds', 'Military Orders', 'Organizations & Societies'],
      'Races & Species': ['Playable Races & Lineages', 'Beasts & Creatures', 'Monsters & Entities', 'Flora & Ecology'],
      'Magic & Tech': ['Spells & Incantations', 'Arcane Artifacts & Catalysts', 'Technology & Machinery', 'Magic Systems & Theories'],
      'History': ['Eras & Ages', 'Wars & Battles', 'Treaties & Accords', 'Chronicles & Key Events'],
      'Items': ['Weapons & Armaments', 'Armor & Relics', 'Potions & Reagents', 'Trinkets & Valuables']
    };

    let chips = ['All'];
    const currentCat = this.selectedCategory;

    if (currentCat && subCategoriesMap[currentCat]) {
      const knownSubs = subCategoriesMap[currentCat] || [];
      const found = this.categories.find(c => c.category === currentCat);
      const dbSubs = (found && Array.isArray(found.subCategories)) ? found.subCategories.map(s => s.subCategory) : [];
      const combinedSubs = Array.from(new Set([...knownSubs, ...dbSubs]));
      chips = ['All', ...combinedSubs];
    } else {
      chips = ['All', ...standardCategories];
    }

    container.innerHTML = chips.map(chip => {
      let isActive = false;
      if (currentCat && subCategoriesMap[currentCat]) {
        if (chip === 'All') {
          isActive = !this.selectedSubCategory && !this.selectedTag;
        } else {
          isActive = (this.selectedSubCategory === chip || this.selectedTag === chip);
        }
      } else {
        if (chip === 'All') {
          isActive = !this.selectedCategory;
        } else {
          isActive = (this.selectedCategory === chip);
        }
      }

      const escapedChip = chip.replace(/'/g, "\\'");
      return `
        <button class="filter-chip ${isActive ? 'active' : ''}"
                onclick="window.app.filterBySubCategory('${escapedChip}')">
          ${chip}
        </button>
      `;
    }).join('');
  }

  filterByCategory(cat) {
    this.selectedCategory = cat;
    this.selectedSubCategory = null;
    this.selectedTag = null;
    this.fetchCategories();
    this.fetchArticles();
    this.renderFilterChips();
    this.renderCategoryDock();
    this.renderSubCategoryBar();
  }

  filterByTag(tag) {
    this.selectedTag = this.selectedTag === tag ? null : tag;
    this.selectedSubCategory = this.selectedTag;
    this.fetchArticles();
    this.renderFilterChips();
    this.renderSubCategoryBar();
  }

  filterBySubCategory(sub) {
    const standardCategories = [
      'Characters', 'Locations', 'Factions', 'Races & Species',
      'Magic & Tech', 'History', 'Items'
    ];

    if (sub === 'All') {
      if (this.selectedSubCategory || this.selectedTag) {
        this.selectedSubCategory = null;
        this.selectedTag = null;
        this.fetchArticles();
        this.renderFilterChips();
        this.renderSubCategoryBar();
      } else if (this.selectedCategory) {
        this.selectedSubCategory = null;
        this.selectedTag = null;
        this.fetchArticles();
        this.renderFilterChips();
        this.renderSubCategoryBar();
      } else {
        this.filterByCategory(null);
      }
      return;
    }

    if (!this.selectedCategory && standardCategories.includes(sub)) {
      this.filterByCategory(sub);
      return;
    }

    this.filterByTag(sub);
    this.renderSubCategoryBar();
  }

  clearCategoryFilters() {
    this.selectedCategory = null;
    this.selectedSubCategory = null;
    this.selectedTag = null;
    this.searchQuery = '';
    const searchInput = document.getElementById('global-search') || document.querySelector('.search-bar-container input');
    if (searchInput) searchInput.value = '';
    this.fetchCategories();
    this.fetchArticles();
    this.renderCategoryDock();
    this.renderSubCategoryBar();
    this.renderFilterChips();
  }

  handleSearch(val) {
    this.searchQuery = val.trim();
    this.fetchArticles();
    if (val.trim()) {
      this.handleSearchInput(val.trim());
    } else {
      this.renderRecentArticlesDropdown();
    }
  }

  recordRecentArticle(id, title, category) {
    if (!id || !title) return;
    try {
      let recent = JSON.parse(localStorage.getItem('lorevault_recent_articles')) || [];
      if (!Array.isArray(recent)) recent = [];
      recent = recent.filter(item => item.id !== id);
      recent.unshift({ id, title, category: category || 'General' });
      recent = recent.slice(0, 5);
      localStorage.setItem('lorevault_recent_articles', JSON.stringify(recent));
    } catch (e) {
      console.warn('Failed to save recent article to localStorage:', e);
    }
  }

  getRecentArticles() {
    try {
      const recent = JSON.parse(localStorage.getItem('lorevault_recent_articles'));
      return Array.isArray(recent) ? recent : [];
    } catch (e) {
      return [];
    }
  }

  setupSearchBar() {
    const searchInput = document.getElementById('global-search');
    const clearBtn = document.getElementById('search-clear-btn');
    const fulltextToggle = document.getElementById('search-fulltext-toggle');
    const dropdown = document.getElementById('search-results-dropdown');
    const container = document.getElementById('search-container');

    if (!searchInput) return;

    // Global hotkey listeners (Ctrl+K, Cmd+K, /)
    document.addEventListener('keydown', (e) => {
      const isK = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k';
      const isSlash = e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName) && !document.activeElement.isContentEditable;

      if (isK || isSlash) {
        e.preventDefault();
        searchInput.focus();
        searchInput.select();
      }
    });

    searchInput.addEventListener('focus', () => {
      const val = searchInput.value.trim();
      if (!val) {
        this.renderRecentArticlesDropdown();
      } else if (this.searchResults.length > 0) {
        this.showSearchDropdown();
      }
    });

    searchInput.addEventListener('input', (e) => {
      const val = e.target.value.trim();
      if (clearBtn) {
        clearBtn.classList.toggle('hidden', !e.target.value);
      }
      if (!val) {
        this.renderRecentArticlesDropdown();
        return;
      }

      if (this.searchDebounceTimer) clearTimeout(this.searchDebounceTimer);
      this.searchDebounceTimer = setTimeout(() => {
        this.handleSearchInput(val);
      }, 200);
    });

    searchInput.addEventListener('keydown', (e) => {
      if (dropdown && !dropdown.classList.contains('hidden')) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          this.moveSelection(1);
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          this.moveSelection(-1);
        } else if (e.key === 'Enter') {
          if (this.selectedIndex >= 0 && this.searchResults[this.selectedIndex]) {
            e.preventDefault();
            this.loadArticle(this.searchResults[this.selectedIndex].id);
            this.hideSearchDropdown();
          }
        } else if (e.key === 'Escape') {
          e.preventDefault();
          this.hideSearchDropdown();
          searchInput.blur();
        }
      }
    });

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        this.clearSearch();
      });
    }

    if (fulltextToggle) {
      fulltextToggle.addEventListener('click', () => {
        this.toggleFullTextSearch();
      });
    }

    document.addEventListener('click', (e) => {
      if (container && !container.contains(e.target)) {
        this.hideSearchDropdown();
      }
    });
  }

  clearSearch() {
    const searchInput = document.getElementById('global-search');
    const clearBtn = document.getElementById('search-clear-btn');
    if (searchInput) searchInput.value = '';
    if (clearBtn) clearBtn.classList.add('hidden');
    this.searchResults = [];
    this.selectedIndex = -1;
    this.renderRecentArticlesDropdown();
    if (searchInput) searchInput.focus();
  }

  toggleFullTextSearch() {
    this.fullTextSearch = !this.fullTextSearch;
    const fulltextToggle = document.getElementById('search-fulltext-toggle');
    if (fulltextToggle) {
      fulltextToggle.classList.toggle('active', this.fullTextSearch);
    }
    const searchInput = document.getElementById('global-search');
    if (searchInput && searchInput.value.trim()) {
      this.handleSearchInput(searchInput.value.trim());
    }
  }

  renderRecentArticlesDropdown() {
    const recent = this.getRecentArticles();
    const dropdown = document.getElementById('search-results-dropdown');
    if (!dropdown) return;

    if (recent.length === 0) {
      dropdown.innerHTML = '<div class="search-no-results">🕒 No recently viewed lore</div>';
      dropdown.classList.remove('hidden');
      this.searchResults = [];
      this.selectedIndex = -1;
      return;
    }

    this.searchResults = recent;
    this.selectedIndex = -1;

    let html = `<div class="search-dropdown-header"><span>🕒 RECENTLY VIEWED LORE</span></div>`;
    html += recent.map((art, i) => {
      const catIcon = this.getCategoryIcon(art.category);
      return `
        <div class="search-result-item ${i === this.selectedIndex ? 'selected' : ''}" data-index="${i}" onclick="window.app.loadArticle('${art.id}'); window.app.hideSearchDropdown();" onmouseenter="window.app.setSelectedIndex(${i})">
          <div class="search-result-header">
            <span class="search-result-title">${catIcon} ${this.escapeHtml(art.title)}</span>
            <span class="search-result-badge">${this.escapeHtml(art.category || 'Lore')}</span>
          </div>
        </div>
      `;
    }).join('');

    dropdown.innerHTML = html;
    dropdown.classList.remove('hidden');
  }

  async handleSearchInput(val) {
    let queryStr = val.trim();
    let catFilter = null;
    let tagFilter = null;

    const catMatch = queryStr.match(/(?:^|\s)cat:([^\s#]+)/i);
    if (catMatch) {
      catFilter = catMatch[1];
      queryStr = queryStr.replace(catMatch[0], '').trim();
    }

    const tagMatch = queryStr.match(/(?:^|\s)#([^\s#]+)/i);
    if (tagMatch) {
      tagFilter = tagMatch[1];
      queryStr = queryStr.replace(tagMatch[0], '').trim();
    }

    try {
      const params = new URLSearchParams();
      if (queryStr) params.append('q', queryStr);
      if (catFilter) params.append('category', catFilter);
      if (tagFilter) params.append('tag', tagFilter);
      if (this.currentWorldId && this.currentWorldId !== 'all') params.append('world_id', this.currentWorldId);
      if (this.fullTextSearch) params.append('content', 'true');

      const res = await fetch(`/api/articles?${params.toString()}`);
      const data = await res.json();
      this.searchResults = data || [];
      this.selectedIndex = -1;

      this.renderSearchResultsDropdown(this.searchResults, queryStr, catFilter, tagFilter);
    } catch (err) {
      console.error('Failed to search articles:', err);
    }
  }

  renderSearchResultsDropdown(results, queryStr, catFilter, tagFilter) {
    const dropdown = document.getElementById('search-results-dropdown');
    if (!dropdown) return;

    if (!results || results.length === 0) {
      dropdown.innerHTML = '<div class="search-no-results">🔍 No matching lore found</div>';
      dropdown.classList.remove('hidden');
      return;
    }

    let filterChips = [];
    if (catFilter) filterChips.push(`Category: ${catFilter}`);
    if (tagFilter) filterChips.push(`#${tagFilter}`);
    if (this.fullTextSearch) filterChips.push(`Full-Text`);

    let headerLabel = `MATCHING LORE (${results.length})`;
    if (filterChips.length > 0) {
      headerLabel += ` <span style="font-weight:normal; opacity:0.8; text-transform:none;">[${filterChips.join(', ')}]</span>`;
    }

    let html = `<div class="search-dropdown-header"><span>${headerLabel}</span></div>`;
    html += results.map((art, i) => {
      const catIcon = this.getCategoryIcon(art.category);
      const catBadgeClass = this.getCategoryBadgeClass(art.category);
      const hasSecret = /\[box=secret\]|\[secret\]/i.test(art.summary || '') || /\[box=secret\]|\[secret\]/i.test(art.content || '');
      
      let summaryText = art.summary || '';
      summaryText = summaryText.replace(/\[box=secret\][\s\S]*?(?:\[\/box\]|$)/gi, '')
                               .replace(/\[secret\][\s\S]*?(?:\[\/secret\]|$)/gi, '')
                               .replace(/<[^>]+>/g, '')
                               .trim();
      if (summaryText.length > 100) summaryText = summaryText.substring(0, 100) + '...';

      return `
        <div class="search-result-item ${i === this.selectedIndex ? 'selected' : ''}" data-index="${i}" onclick="window.app.loadArticle('${art.id}'); window.app.hideSearchDropdown();" onmouseenter="window.app.setSelectedIndex(${i})">
          <div class="search-result-header">
            <span class="search-result-title">${catIcon} ${this.escapeHtml(art.title)} ${hasSecret ? '<span class="search-secret-badge" title="Contains secret lore">🔒</span>' : ''}</span>
            <span class="search-result-badge ${catBadgeClass}">${catIcon} ${this.escapeHtml(art.category || 'Lore')}</span>
          </div>
          ${summaryText ? `<div class="search-result-summary">${this.escapeHtml(summaryText)}</div>` : ''}
        </div>
      `;
    }).join('');

    dropdown.innerHTML = html;
    dropdown.classList.remove('hidden');
  }

  getCategoryBadgeClass(cat) {
    if (window.LoreBadges && typeof window.LoreBadges.getCategoryBadgeClass === 'function') {
      return window.LoreBadges.getCategoryBadgeClass(cat);
    }
    if (!cat) return 'badge-default';
    const c = String(cat).toLowerCase().replace(/[^a-z0-9]/g, '');
    return `badge-${c}`;
  }

  getCategoryIcon(cat) {
    if (window.LoreBadges && typeof window.LoreBadges.getCategoryIcon === 'function') {
      return window.LoreBadges.getCategoryIcon(cat);
    }
    if (!cat) return '📜';
    const c = String(cat).toLowerCase();
    if (c.includes('character') || c.includes('person') || c.includes('hero')) return '👤';
    if (c.includes('location') || c.includes('place') || c.includes('city') || c.includes('realm')) return '🏰';
    if (c.includes('faction') || c.includes('guild') || c.includes('nation') || c.includes('order')) return '🛡️';
    if (c.includes('magic') || c.includes('spell') || c.includes('artifact')) return '🔮';
    if (c.includes('item') || c.includes('weapon') || c.includes('gear')) return '⚔️';
    if (c.includes('species') || c.includes('race') || c.includes('creature') || c.includes('beast')) return '🧬';
    return '📜';
  }

  escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  moveSelection(direction) {
    if (this.searchResults.length === 0) return;
    this.selectedIndex += direction;
    if (this.selectedIndex < 0) this.selectedIndex = 0;
    if (this.selectedIndex >= this.searchResults.length) this.selectedIndex = this.searchResults.length - 1;
    this.updateSelectedState();
  }

  setSelectedIndex(i) {
    this.selectedIndex = i;
    this.updateSelectedState();
  }

  updateSelectedState() {
    const dropdown = document.getElementById('search-results-dropdown');
    if (!dropdown) return;
    const items = dropdown.querySelectorAll('.search-result-item');
    items.forEach((item, idx) => {
      if (idx === this.selectedIndex) {
        item.classList.add('selected');
        item.scrollIntoView({ block: 'nearest' });
      } else {
        item.classList.remove('selected');
      }
    });
  }

  showSearchDropdown() {
    const dropdown = document.getElementById('search-results-dropdown');
    if (dropdown) dropdown.classList.remove('hidden');
  }

  hideSearchDropdown() {
    const dropdown = document.getElementById('search-results-dropdown');
    if (dropdown) dropdown.classList.add('hidden');
  }

  handleSortSegment(mode) {
    const container = document.getElementById('sort-segmented-control');
    if (container) {
      const btns = container.querySelectorAll('.segmented-btn');
      btns.forEach(btn => {
        if (btn.getAttribute('data-sort') === mode) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      });
    }
    this.handleSort(mode);
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

  selectEditCategory(category) {
    const catIn = document.getElementById('edit-category');
    if (catIn) catIn.value = category;
    this.updateEditCategoryUI(category);
  }

  updateEditCategoryUI(category) {
    const container = document.getElementById('edit-category-segmented');
    if (!container) return;
    const targetCat = category || 'Characters';
    const btns = container.querySelectorAll('.segmented-btn');
    btns.forEach(btn => {
      if (btn.getAttribute('data-cat') === targetCat) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  selectChatCategoryFilter(category) {
    const catIn = document.getElementById('chat-category-filter');
    if (catIn) catIn.value = category;
    const container = document.getElementById('chat-category-segmented');
    if (container) {
      const btns = container.querySelectorAll('.segmented-btn');
      btns.forEach(btn => {
        if (btn.getAttribute('data-chat-cat') === category) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      });
    }
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
      this.updateEditCategoryUI(this.currentArticle.category);
      summaryIn.value = this.currentArticle.summary || '';
      tagsIn.value = (this.currentArticle.tags || []).join(', ');
      contentIn.value = this.currentArticle.content;
      if (headerImgIn) headerImgIn.value = this.currentArticle.header_image || '';
    } else {
      titleHeader.textContent = 'New Lore Article';
      titleIn.value = '';
      catIn.value = 'Locations';
      this.updateEditCategoryUI('Locations');
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
    this.hideCrosslinkPopover();
  }

  // --- @ CROSS-LINK AUTO-COMPLETE POPOVER ---
  setupCrosslinkPopover() {
    const textarea = document.getElementById('edit-content');
    const popover = document.getElementById('crosslink-popover');
    if (!textarea || !popover) return;

    this.crosslinkMatches = [];
    this.crosslinkIndex = 0;

    textarea.addEventListener('input', (e) => this.handleCrosslinkInput(e));
    textarea.addEventListener('keyup', (e) => this.handleCrosslinkInput(e));
    textarea.addEventListener('keydown', (e) => this.handleCrosslinkKeydown(e));

    document.addEventListener('click', (e) => {
      if (popover && !popover.contains(e.target) && e.target !== textarea) {
        this.hideCrosslinkPopover();
      }
    });

    popover.addEventListener('click', (e) => {
      const item = e.target.closest('.crosslink-item');
      if (item) {
        const idx = parseInt(item.getAttribute('data-idx'), 10);
        if (!isNaN(idx) && this.crosslinkMatches && this.crosslinkMatches[idx]) {
          this.insertCrosslink(this.crosslinkMatches[idx]);
        }
      }
    });
  }

  handleCrosslinkInput(e) {
    const textarea = document.getElementById('edit-content');
    const popover = document.getElementById('crosslink-popover');
    if (!textarea || !popover) return;

    const cursorPos = textarea.selectionStart;
    const textBefore = textarea.value.slice(0, cursorPos);
    const match = textBefore.match(/@([^@\n\]]*)$/);

    if (!match) {
      this.hideCrosslinkPopover();
      return;
    }

    const query = match[1].toLowerCase().trim();
    const matches = (this.articles || []).filter(a =>
      a.title && (query === '' || a.title.toLowerCase().includes(query))
    ).slice(0, 8);

    if (matches.length === 0) {
      this.hideCrosslinkPopover();
      return;
    }

    this.crosslinkMatches = matches;
    if (this.crosslinkIndex >= matches.length) {
      this.crosslinkIndex = 0;
    }
    this.renderCrosslinkMatches();
  }

  renderCrosslinkMatches() {
    const popover = document.getElementById('crosslink-popover');
    if (!popover || !this.crosslinkMatches || this.crosslinkMatches.length === 0) {
      this.hideCrosslinkPopover();
      return;
    }

    popover.innerHTML = this.crosslinkMatches.map((article, idx) => `
      <div class="crosslink-item ${idx === this.crosslinkIndex ? 'active' : ''}" data-idx="${idx}" data-id="${article.id}">
        <span class="crosslink-title">${this.escapeHtml ? this.escapeHtml(article.title) : article.title}</span>
        <span class="crosslink-badge">${this.escapeHtml ? this.escapeHtml(article.category || 'Article') : (article.category || 'Article')}</span>
      </div>
    `).join('');

    popover.classList.remove('hidden');
  }

  handleCrosslinkKeydown(e) {
    const popover = document.getElementById('crosslink-popover');
    if (!popover || popover.classList.contains('hidden') || !this.crosslinkMatches || !this.crosslinkMatches.length) {
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      this.crosslinkIndex = (this.crosslinkIndex + 1) % this.crosslinkMatches.length;
      this.renderCrosslinkMatches();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      this.crosslinkIndex = (this.crosslinkIndex - 1 + this.crosslinkMatches.length) % this.crosslinkMatches.length;
      this.renderCrosslinkMatches();
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      if (this.crosslinkMatches[this.crosslinkIndex]) {
        this.insertCrosslink(this.crosslinkMatches[this.crosslinkIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      this.hideCrosslinkPopover();
    }
  }

  insertCrosslink(article) {
    const textarea = document.getElementById('edit-content');
    if (!textarea || !article) return;

    const cursorPos = textarea.selectionStart;
    const textBefore = textarea.value.slice(0, cursorPos);
    const textAfter = textarea.value.slice(cursorPos);

    const atIndex = textBefore.lastIndexOf('@');
    if (atIndex !== -1) {
      const linkText = `@[${article.title}](${article.id})`;
      const updatedBefore = textBefore.slice(0, atIndex) + linkText;
      textarea.value = updatedBefore + textAfter;
      const newCursorPos = updatedBefore.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
      textarea.focus();
      this.updateEditorPreview();
    }
    this.hideCrosslinkPopover();
  }

  hideCrosslinkPopover() {
    const popover = document.getElementById('crosslink-popover');
    if (popover) {
      popover.classList.add('hidden');
    }
    this.crosslinkMatches = [];
    this.crosslinkIndex = 0;
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

  openGraphModal() {
    const modal = document.getElementById('graph-modal');
    if (!modal) return;
    modal.classList.remove('hidden');
    this.loadKnowledgeGraph();
    requestAnimationFrame(() => {
      if (window.loreGraph && typeof window.loreGraph.resizeCanvas === 'function') {
        window.loreGraph.resizeCanvas();
      }
    });
  }

  closeGraphModal() {
    const modal = document.getElementById('graph-modal');
    if (modal) modal.classList.add('hidden');
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

  async batchRepairWorldDoctor(actions = ['fix_misclassified', 'crosslink_orphans']) {
    const targetWorldId = this.doctorWorldScope || this.currentWorldId || 'all';
    this.showNotification('⚡ Running 1-Click Vault Batch Repair...', 'info');
    try {
      const res = await fetch('/api/audit/batch-repair', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ world_id: targetWorldId, actions })
      });
      const data = await res.json();
      if (data.success) {
        this.showNotification(`✅ ${data.message}`, 'success');
        await this.runWorldAudit();
        await this.loadArticles();
      } else {
        this.showNotification(`❌ Batch repair failed: ${data.error || 'Unknown error'}`, 'error');
      }
    } catch (err) {
      this.showNotification(`❌ Network error executing batch repair: ${err.message}`, 'error');
    }
  }

  async exportWorldDoctorReport() {
    const targetWorldId = this.doctorWorldScope || this.currentWorldId || 'all';
    try {
      const res = await fetch(`/api/audit/export-report?world_id=${encodeURIComponent(targetWorldId)}`);
      const data = await res.json();
      if (data.markdownContent) {
        const blob = new Blob([data.markdownContent], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = data.filename || `World_Health_Report_${targetWorldId}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        this.showNotification('📄 World Health Report exported successfully!', 'success');
      }
  async toggleDismissAuditIssue(issueKey) {
    if (!issueKey) return;
    try {
      const res = await fetch('/api/audit/dismiss', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ issue_key: issueKey })
      });
      const data = await res.json();
      if (data.success) {
        this.showNotification(data.message, 'success');
        await this.runWorldAudit();
      }
    } catch (err) {
      this.showNotification(`❌ Dismissal error: ${err.message}`, 'error');
    }
  }

  async copyWorldDoctorSummary() {
    const audit = this.lastAudit || {};
    const score = audit.healthScore ?? 100;
    const total = audit.totalAudited || 0;
    const stubs = audit.stubCount || 0;
    const misc = audit.misclassifiedCount || 0;
    const dups = audit.duplicateCount || 0;
    const orphans = audit.orphanCount || 0;

    const summary = `🛡️ **LoreVault World Doctor Summary**\n` +
      `**World Scope**: ${this.doctorWorldScope || 'Global'}\n` +
      `**Health Score**: **${score} / 100**\n` +
      `**Total Articles**: ${total} articles\n` +
      `• Stubs: ${stubs} | Misclassified: ${misc} | Duplicates: ${dups} | Orphans: ${orphans}\n` +
      `*Generated by LoreVault Canon Guard Auditor*`;

    try {
      await navigator.clipboard.writeText(summary);
      this.showNotification('📋 World Doctor Summary copied to clipboard!', 'success');
    } catch (err) {
      this.showNotification('❌ Could not copy to clipboard', 'error');
    }
  }

  renderQuickFixesHero(data) {
    const container = document.getElementById('doctor-quick-fixes-hero');
    const listEl = document.getElementById('doctor-quick-fixes-list');
    if (!container || !listEl) return;

    const quickFixes = [];

    // Dead links (+12 pts)
    if (data.deadCrossLinks && data.deadCrossLinks.length > 0) {
      const link = data.deadCrossLinks[0];
      quickFixes.push({
        title: `Dead Link: "${link.deadTargetTitle}"`,
        description: `Referenced in "${link.sourceTitle}" but target article does not exist.`,
        impact: `+12 pts`,
        actionLabel: `Fix Link`,
        actionFn: `window.app.openArticle('${link.sourceId}')`
      });
    }

    // Duplicates (+10 pts)
    if (data.duplicateArticles && data.duplicateArticles.length > 0) {
      const dup = data.duplicateArticles[0];
      quickFixes.push({
        title: `Duplicate Title: "${dup.title}"`,
        description: `Identical double-up title in category ${dup.category}.`,
        impact: `+10 pts`,
        actionLabel: `Resolve Duplicate`,
        actionFn: `window.app.switchDoctorTab('dup')`
      });
    }

    // Misclassified (+5 pts)
    if (data.misclassifiedArticles && data.misclassifiedArticles.length > 0) {
      const misc = data.misclassifiedArticles[0];
      quickFixes.push({
        title: `Misclassified: "${misc.title}"`,
        description: `Currently '${misc.currentCategory}' → Reclassify to '${misc.suggestedCategory}'`,
        impact: `+5 pts`,
        actionLabel: `Reclassify`,
        actionFn: `window.app.batchRepairWorldDoctor(['fix_misclassified'])`
      });
    }

    if (quickFixes.length === 0) {
      container.style.display = 'none';
      return;
    }

    container.style.display = 'block';
    listEl.innerHTML = quickFixes.map(fix => `
      <div style="background:var(--surface-card); border:1px solid var(--border-color); border-radius:6px; padding:0.6rem 0.8rem; display:flex; justify-content:space-between; align-items:center; gap:0.5rem;">
        <div>
          <div style="display:flex; align-items:center; gap:0.4rem;">
            <strong style="font-size:0.8rem; color:var(--text-primary);">${fix.title}</strong>
            <span style="font-size:0.65rem; padding:0.1rem 0.35rem; background:rgba(74,222,128,0.15); color:#4ade80; border-radius:4px; font-weight:700;">${fix.impact}</span>
          </div>
          <div style="font-size:0.75rem; color:var(--text-muted); margin-top:0.15rem;">${fix.description}</div>
        </div>
        <button class="btn btn-primary" style="font-size:0.75rem; padding:0.25rem 0.6rem; white-space:nowrap;" onclick="${fix.actionFn}">${fix.actionLabel}</button>
      </div>
    `).join('');
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

      this.renderQuickFixesHero(data);

      // Metric count cards
      const mDup = document.getElementById('doctor-metric-duplicates');
      const mMisc = document.getElementById('doctor-metric-misc');
      const mStubs = document.getElementById('doctor-metric-stubs');
      const mAi = document.getElementById('doctor-metric-ai');
      const mOrphans = document.getElementById('doctor-metric-orphans');
      const mIgnored = document.getElementById('doctor-metric-ignored');

      if (mDup) mDup.textContent = dupCount;
      if (mMisc) mMisc.textContent = miscCount;
      if (mStubs) mStubs.textContent = stubCount;
      if (mAi) mAi.textContent = aiCount;
      if (mOrphans) mOrphans.textContent = orphanCount;
      if (mIgnored) mIgnored.textContent = data.ignoredCount || (data.ignoredArticles?.length || 0);

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
              <button class="btn btn-secondary" style="font-size:0.75rem; padding:0.15rem 0.5rem; background:#475569; color:#fff;" onclick="window.app.toggleDismissAuditIssue('${art.issueKey || 'misc:' + art.id}')">👁️ Ignore</button>
              <button class="btn-text" style="font-size:0.75rem;" onclick="window.app.loadArticle('${art.id}'); window.app.closeDoctorModal();">View</button>
            </div>
          </div>
        `).join('');
      } else {
        if (fixMiscBtn) fixMiscBtn.style.display = 'none';
        miscList.innerHTML = `<div style="padding:0.75rem; color:var(--accent-emerald); font-size:0.8rem;">✓ All articles are correctly categorized!</div>`;
      }

      // Render Ignored Issues List
      const ignoredList = document.getElementById('doctor-ignored-list');
      if (ignoredList) {
        const ignoredItems = data.ignoredArticles || [];
        if (ignoredItems.length > 0) {
          ignoredList.innerHTML = ignoredItems.map(item => `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:0.4rem 0.6rem; border-bottom:1px solid var(--border-color); font-size:0.8rem;">
              <div>
                <strong style="color:var(--text-muted);">${item.title || item.sourceTitle || item.issueKey}</strong>
                <span style="color:var(--text-muted); font-size:0.75rem; margin-left:0.5rem;">(Suppressed from health score)</span>
              </div>
              <button class="btn btn-secondary" style="font-size:0.75rem; padding:0.15rem 0.5rem; background:#10b981; color:#fff;" onclick="window.app.toggleDismissAuditIssue('${item.issueKey}')">↩️ Restore</button>
            </div>
          `).join('');
        } else {
          ignoredList.innerHTML = `<div style="color:var(--text-muted); font-size:0.8rem; text-align:center; padding:0.75rem;">No audit issues currently ignored.</div>`;
        }
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

      // Parse WikiLinks & format paragraphs inside AI answer
      let parsed = window.WAParser ? window.WAParser.parseWikiLinks(data.answer) : data.answer;
      if (!parsed.includes('<p>') && !parsed.includes('<div>')) {
        parsed = parsed
          .split(/\n\n+/)
          .map(para => `<p>${para.trim().replace(/\n/g, '<br>')}</p>`)
          .join('');
      }
      loadingDiv.innerHTML = `<div class="chat-message-content">${parsed}</div>`;
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

  // --- WEAVE MATRIX DRAWER METHODS ---
  setupWeaveMatrix() {
    this.weaveFormat = 'markdown';
    this.weaveVisibility = 'public';
    this.weaveMaxTokens = 4000;
    this.weavePinnedIds = new Set();

    const weaveBtn = document.getElementById('weave-matrix-btn');
    if (weaveBtn) {
      weaveBtn.addEventListener('click', () => this.toggleWeaveMatrixDrawer());
    }

    // Format Chips
    const chipsContainer = document.getElementById('weave-format-chips');
    if (chipsContainer) {
      const chips = chipsContainer.querySelectorAll('.format-chip');
      chips.forEach(chip => {
        chip.addEventListener('click', () => {
          chips.forEach(c => c.classList.remove('active'));
          chip.classList.add('active');
          this.weaveFormat = chip.dataset.format || 'markdown';
          this.compileWeaveContext();
        });
      });
    }

    // Visibility Switch
    const visToggle = document.getElementById('weave-visibility-toggle');
    const visLabel = document.getElementById('weave-visibility-label');
    if (visToggle) {
      visToggle.addEventListener('change', (e) => {
        if (e.target.checked) {
          this.weaveVisibility = 'dm_only';
          if (visLabel) visLabel.textContent = 'DM-Only Secrets Included';
        } else {
          this.weaveVisibility = 'public';
          if (visLabel) visLabel.textContent = 'Public Only (Secrets Stripped)';
        }
        this.compileWeaveContext();
      });
    }

    // Token Slider
    const tokenSlider = document.getElementById('weave-token-slider');
    if (tokenSlider) {
      const updateSlider = (e) => {
        this.weaveMaxTokens = parseInt(e.target.value, 10) || 4000;
        const badge = document.getElementById('weave-token-badge');
        if (badge) {
          badge.textContent = `0 / ${this.weaveMaxTokens.toLocaleString()} tokens`;
        }
        this.compileWeaveContext();
      };
      tokenSlider.addEventListener('input', updateSlider);
      tokenSlider.addEventListener('change', updateSlider);
    }

    // Copy Button
    const copyBtn = document.getElementById('weave-copy-btn');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => this.copyWeaveCompiledContext());
    }
  }

  toggleWeaveMatrixDrawer() {
    const drawer = document.getElementById('weave-matrix-drawer');
    if (!drawer) return;
    const isHidden = drawer.classList.contains('hidden');
    if (isHidden) {
      drawer.classList.remove('hidden');
      this.renderWeavePinnedArticles();
      this.compileWeaveContext();
    } else {
      drawer.classList.add('hidden');
    }
  }

  renderWeavePinnedArticles() {
    const container = document.getElementById('weave-pinned-articles');
    const countBadge = document.getElementById('weave-pinned-count');
    if (!container) return;

    if (countBadge) {
      countBadge.textContent = `${this.weavePinnedIds.size} pinned`;
    }

    if (this.articles.length === 0) {
      container.innerHTML = `<div style="color:var(--text-muted); font-size:0.75rem; padding:0.4rem; text-align:center;">No articles available in vault.</div>`;
      return;
    }

    let html = '';
    this.articles.forEach(art => {
      const isPinned = this.weavePinnedIds.has(art.id);
      html += `
        <div class="pinned-item" style="${isPinned ? 'border: 1px solid #f59e0b;' : ''}">
          <span>${isPinned ? '📌' : '📄'} <strong>${this.escapeHtml(art.title)}</strong> (${art.category || 'General'})</span>
          <span class="pin-toggle" title="${isPinned ? 'Unpin article' : 'Pin article'}" onclick="window.app.togglePinArticle('${art.id}')">
            ${isPinned ? '📍 Pinned' : '📌 Pin'}
          </span>
        </div>
      `;
    });
    container.innerHTML = html;
  }

  togglePinArticle(articleId) {
    if (this.weavePinnedIds.has(articleId)) {
      this.weavePinnedIds.delete(articleId);
    } else {
      this.weavePinnedIds.add(articleId);
    }
    this.renderWeavePinnedArticles();
    this.compileWeaveContext();
  }

  async compileWeaveContext() {
    const outputTextarea = document.getElementById('weave-output-preview');
    const tokenBadge = document.getElementById('weave-token-badge');
    const progressFill = document.getElementById('weave-token-progress-fill');

    if (outputTextarea) {
      outputTextarea.placeholder = 'Compiling context pack...';
    }

    try {
      const res = await fetch('/api/context/compile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          world_id: this.currentWorldId || 'all',
          pinned_ids: Array.from(this.weavePinnedIds),
          query: '',
          format: this.weaveFormat || 'markdown',
          visibility: this.weaveVisibility || 'public',
          max_tokens: this.weaveMaxTokens || 4000
        })
      });

      const data = await res.json();
      if (data.status === 'success') {
        if (outputTextarea) {
          outputTextarea.value = data.compiled_context || '';
        }
        if (data.token_metrics) {
          const used = data.token_metrics.total_tokens || 0;
          const max = data.token_metrics.max_budget || 4000;
          const selected = data.token_metrics.selected_count || 0;
          const total = data.token_metrics.total_available || 0;

          if (tokenBadge) {
            tokenBadge.textContent = `${used.toLocaleString()} / ${max.toLocaleString()} tokens (${selected}/${total} items)`;
          }
          if (progressFill) {
            const pct = Math.min(100, Math.round((used / max) * 100));
            progressFill.style.width = `${pct}%`;
          }
        }
      } else {
        const msg = data.message || data.error || 'Unknown error';
        if (outputTextarea) outputTextarea.value = `Error compiling context: ${msg}`;
        window.showToast(`Context compilation failed: ${msg}`, 'error');
      }
    } catch (err) {
      console.error('Weave compile error:', err);
      if (outputTextarea) outputTextarea.value = `Failed to connect to context compiler API: ${err.message}`;
      window.showToast(`Context compile error: ${err.message}`, 'error');
    }
  }

  copyWeaveCompiledContext() {
    const outputTextarea = document.getElementById('weave-output-preview');
    const copyBtn = document.getElementById('weave-copy-btn');
    if (!outputTextarea || !outputTextarea.value.trim()) return;

    navigator.clipboard.writeText(outputTextarea.value).then(() => {
      if (copyBtn) {
        const originalText = copyBtn.innerHTML;
        copyBtn.innerHTML = '✅ Copied Context!';
      }
    }).catch(err => {
      console.error('Clipboard copy failed:', err);
    });
  }

  openCreateCategoryModal() {
    const modal = document.getElementById('create-category-modal');
    if (!modal) return;

    // Populate Parent Category dropdown
    const parentSelect = document.getElementById('new-cat-parent');
    if (parentSelect) {
      const standardCats = ['Characters', 'Locations', 'Factions', 'Races & Species', 'Magic & Tech', 'History', 'Items'];
      const customCats = Array.isArray(this.categories) ? this.categories.map(c => c.category).filter(c => c && !standardCats.includes(c)) : [];
      const allCats = Array.from(new Set([...standardCats, ...customCats]));
      
      parentSelect.innerHTML = allCats.map(c => `<option value="${c}">${c}</option>`).join('');
    }

    this.renderManageCustomCategories();
    modal.classList.remove('hidden');
  }

  renderManageCustomCategories() {
    const listEl = document.getElementById('custom-categories-manage-list');
    if (!listEl) return;

    const customItems = [];
    const standardCats = ['Characters', 'Locations', 'Factions', 'Races & Species', 'Magic & Tech', 'History', 'Items'];

    if (Array.isArray(this.categories)) {
      this.categories.forEach(c => {
        if (c.isCustom && c.category && !standardCats.includes(c.category)) {
          customItems.push({ name: c.category, type: 'Primary Category', icon: c.icon || '📁' });
        }
        if (Array.isArray(c.subCategories)) {
          c.subCategories.forEach(s => {
            if (s.isCustom && s.subCategory) {
              customItems.push({ name: s.subCategory, type: `Sub-Category under ${c.category}`, icon: '🏷️' });
            }
          });
        }
      });
    }

    if (customItems.length === 0) {
      listEl.innerHTML = `<div style="font-size:0.8rem; color:var(--text-muted); font-style:italic;">No custom categories created yet.</div>`;
      return;
    }

    listEl.innerHTML = customItems.map(item => {
      const escapedName = item.name.replace(/'/g, "\\'");
      return `
        <div style="display:flex; align-items:center; justify-content:space-between; padding:0.4rem 0.65rem; background:var(--surface-sidebar); border:1px solid var(--border-color); border-radius:6px; font-size:0.8rem;">
          <div style="display:flex; align-items:center; gap:0.4rem; min-width:0; flex:1;">
            <span>${item.icon}</span>
            <span style="font-weight:600; color:var(--text-primary); text-overflow:ellipsis; overflow:hidden; white-space:nowrap;">${this.escapeHtml(item.name)}</span>
            <span style="font-size:0.7rem; color:var(--text-muted); font-style:italic;">(${this.escapeHtml(item.type)})</span>
          </div>
          <button type="button" class="btn btn-danger" style="padding:0.15rem 0.45rem; font-size:0.7rem;" onclick="window.app.deleteCustomCategory('${escapedName}')">
            🗑️ Delete
          </button>
        </div>
      `;
    }).join('');
  }

  async deleteCustomCategory(name) {
    const standardCats = ['Characters', 'Locations', 'Factions', 'Races & Species', 'Magic & Tech', 'History', 'Items'];
    if (standardCats.includes(name)) {
      alert('Standard built-in categories cannot be deleted.');
      return;
    }

    if (!confirm(`Are you sure you want to delete the custom category '${name}'?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/categories/${encodeURIComponent(name)}`, {
        method: 'DELETE'
      });

      if (!res.ok) {
        const data = await res.json();
        alert('Error deleting category: ' + (data.error || 'Failed to delete'));
        return;
      }

      if (this.selectedCategory === name) {
        this.selectedCategory = null;
      }
      if (this.selectedSubCategory === name) {
        this.selectedSubCategory = null;
      }

      await this.fetchCategories();
      this.renderCategoryDock();
      this.renderArticlesList();
      this.renderManageCustomCategories();
      alert(`Custom category '${name}' deleted.`);
    } catch (err) {
      console.error('Failed to delete custom category:', err);
      alert('Error deleting custom category: ' + err.message);
    }
  }

  closeCreateCategoryModal() {
    const modal = document.getElementById('create-category-modal');
    if (modal) modal.classList.add('hidden');
    const nameInput = document.getElementById('new-cat-name');
    if (nameInput) nameInput.value = '';
  }

  setCatTypeSegment(type) {
    const segmented = document.getElementById('cat-type-segmented');
    if (segmented) {
      const btns = segmented.querySelectorAll('.segmented-btn');
      btns.forEach(b => {
        if (b.getAttribute('data-type') === type) b.classList.add('active');
        else b.classList.remove('active');
      });
    }

    const parentGroup = document.getElementById('parent-cat-group');
    const iconGroup = document.getElementById('icon-cat-group');
    if (type === 'sub') {
      if (parentGroup) parentGroup.classList.remove('hidden');
      if (iconGroup) iconGroup.classList.add('hidden');
    } else {
      if (parentGroup) parentGroup.classList.add('hidden');
      if (iconGroup) iconGroup.classList.remove('hidden');
    }
  }

  async submitCustomCategory() {
    const nameInput = document.getElementById('new-cat-name');
    if (!nameInput || !nameInput.value.trim()) {
      alert('Please enter a category name');
      return;
    }

    const name = nameInput.value.trim();
    const activeTypeBtn = document.querySelector('#cat-type-segmented .segmented-btn.active');
    const type = activeTypeBtn ? activeTypeBtn.getAttribute('data-type') : 'primary';

    let parent_category = null;
    let icon = '📁';

    if (type === 'sub') {
      const parentSelect = document.getElementById('new-cat-parent');
      if (parentSelect) parent_category = parentSelect.value;
    } else {
      const iconSelect = document.getElementById('new-cat-icon');
      if (iconSelect) icon = iconSelect.value;
    }

    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, parent_category, icon })
      });

      if (!res.ok) {
        const data = await res.json();
        alert('Error: ' + (data.error || 'Failed to save category'));
        return;
      }

      this.closeCreateCategoryModal();
      await this.fetchCategories();
      this.renderCategoryDock();
      this.renderArticlesList();
      alert(`Category '${name}' created successfully!`);
    } catch (err) {
      console.error('Failed to submit custom category:', err);
      alert('Error saving category: ' + err.message);
    }
  }

  filterByTag(tag) {
    this.selectedTag = tag;
    this.renderSubCategoryBar();
    this.renderArticlesList();
  }
}

// Global initialization
window.LoreApp = LoreApp;
document.addEventListener('DOMContentLoaded', () => {
  window.app = new LoreApp();
});

document.addEventListener('click', (e) => {
  const toggleBtn = e.target.closest('#theme-mode-toggle');
  if (toggleBtn) {
    e.preventDefault();
    if (window.app && typeof window.app.toggleThemeMode === 'function') {
      window.app.toggleThemeMode();
    }
  }
});

window.toggleWeaveMatrixDrawer = function() {
  if (window.app && typeof window.app.toggleWeaveMatrixDrawer === 'function') {
    window.app.toggleWeaveMatrixDrawer();
  } else {
    const drawer = document.getElementById('weave-matrix-drawer');
    if (drawer) drawer.classList.toggle('hidden');
  }
};

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

// Global fail-safe helper for Ask AI Chat Drawer & Minimize State
window.minimizeAIChatDrawer = function() {
  const drawer = document.getElementById('ai-chat-drawer');
  if (drawer) {
    drawer.classList.add('minimized');
  }
};

window.expandAIChatDrawer = function() {
  const drawer = document.getElementById('ai-chat-drawer');
  if (drawer) {
    drawer.classList.remove('minimized');
    drawer.classList.remove('hidden');
  }
};

window.toggleAIChatDrawer = function() {
  const drawer = document.getElementById('ai-chat-drawer');
  if (drawer) {
    if (drawer.classList.contains('minimized')) {
      drawer.classList.remove('minimized');
    } else {
      drawer.classList.toggle('hidden');
    }
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
    window.closeToolsMenu();
    const libraryView = document.getElementById('view-library');
    if (libraryView && libraryView.classList.contains('zen-mode')) {
      if (window.app && typeof window.app.toggleZenMode === 'function') {
        window.app.toggleZenMode();
      }
    }
  }

  if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'F' || e.key === 'f')) {
    e.preventDefault();
    if (window.app && typeof window.app.toggleZenMode === 'function') {
      window.app.toggleZenMode();
    }
  }
});

/* --- Tools Dropdown Menu Helpers --- */
window.toggleToolsMenu = function(e) {
  if (e) e.stopPropagation();
  const menu = document.getElementById('tools-dropdown-menu');
  if (menu) {
    menu.classList.toggle('hidden');
  }
};

window.closeToolsMenu = function() {
  const menu = document.getElementById('tools-dropdown-menu');
  if (menu) {
    menu.classList.add('hidden');
  }
};

document.addEventListener('click', function(e) {
  const container = document.querySelector('.tools-dropdown-container');
  if (container && !container.contains(e.target)) {
    window.closeToolsMenu();
  }
});

/* --- Tags Accordion Global Helper --- */
window.toggleTagsAccordion = function() {
  if (window.app && typeof window.app.toggleTagsAccordion === 'function') {
    window.app.toggleTagsAccordion();
  } else {
    const body = document.getElementById('tags-accordion-body');
    const toggleBtn = document.getElementById('tags-accordion-toggle');
    if (body) {
      body.classList.toggle('collapsed');
      const isCollapsed = body.classList.contains('collapsed');
      if (toggleBtn) {
        const arrow = toggleBtn.querySelector('.accordion-arrow');
        if (arrow) arrow.textContent = isCollapsed ? '▸' : '▾';
      }
    }
  }
};

/* --- Global Narrative Slate Helper Bindings --- */
window.switchView = function(viewName) {
  if (window.app && typeof window.app.switchView === 'function') {
    window.app.switchView(viewName);
  } else if (window.app && typeof window.app.switchTab === 'function') {
    window.app.switchTab(viewName);
  }
};

window.compileNarrativeSlate = function() {
  if (window.app && typeof window.app.compileNarrativeSlate === 'function') {
    return window.app.compileNarrativeSlate();
  }
};

window.generateProseContinuation = function() {
  if (window.app && typeof window.app.generateProseContinuation === 'function') {
    return window.app.generateProseContinuation();
  }
};

window.showPovRewriteModal = function() {
  if (window.app && typeof window.app.showPovRewriteModal === 'function') {
    return window.app.showPovRewriteModal();
  }
};

window.closePovRewriteModal = function() {
  if (window.app && typeof window.app.closePovRewriteModal === 'function') {
    return window.app.closePovRewriteModal();
  }
};

window.executePovRewrite = function() {
  if (window.app && typeof window.app.executePovRewrite === 'function') {
    return window.app.executePovRewrite();
  }
};

window.suggestNextBeats = function() {
  if (window.app && typeof window.app.suggestNextBeats === 'function') {
    return window.app.suggestNextBeats();
  }
};

window.closeBeatsModal = function() {
  if (window.app && typeof window.app.closeBeatsModal === 'function') {
    return window.app.closeBeatsModal();
  }
};

window.saveNarrativeSlate = function() {
  if (window.app && typeof window.app.saveNarrativeSlate === 'function') {
    return window.app.saveNarrativeSlate();
  }
};

window.loadNarrativeSlate = function(slateId) {
  if (window.app && typeof window.app.loadNarrativeSlate === 'function') {
    return window.app.loadNarrativeSlate(slateId);
  }
};

window.addSceneStep = function(text) {
  if (window.app && typeof window.app.addSceneStep === 'function') {
    return window.app.addSceneStep(text);
  }
};

window.toggleToneChip = function(btn) {
  if (btn) btn.classList.toggle('active');
};

window.handleWikiLinkAutocomplete = function(event) {
  if (window.app && typeof window.app.handleWikiLinkAutocomplete === 'function') {
    window.app.handleWikiLinkAutocomplete(event);
  }
};

window.openQuickMarketingModal = function() {
  if (window.app && typeof window.app.openQuickMarketingModal === 'function') {
    return window.app.openQuickMarketingModal();
  }
};

window.closeQuickMarketingModal = function() {
  if (window.app && typeof window.app.closeQuickMarketingModal === 'function') {
    return window.app.closeQuickMarketingModal();
  }
};

window.generateMarketingCopy = function(mode) {
  if (window.app && typeof window.app.generateMarketingCopy === 'function') {
    return window.app.generateMarketingCopy(mode);
  }
};

window.copyMarketingOutput = function(mode) {
  if (window.app && typeof window.app.copyMarketingOutput === 'function') {
    return window.app.copyMarketingOutput(mode);
  }
};

window.selectMarketingTone = function(btn) {
  if (window.app && typeof window.app.selectMarketingTone === 'function') {
    return window.app.selectMarketingTone(btn);
  }
};

window.showWeaveActionModal = function() {
  if (window.app && typeof window.app.showWeaveActionModal === 'function') {
    return window.app.showWeaveActionModal();
  } else {
    const modal = document.getElementById('weave-action-modal');
    if (modal) modal.classList.remove('hidden');
  }
};

window.closeWeaveActionModal = function() {
  if (window.app && typeof window.app.closeWeaveActionModal === 'function') {
    return window.app.closeWeaveActionModal();
  } else {
    const modal = document.getElementById('weave-action-modal');
    if (modal) modal.classList.add('hidden');
  }
};

window.routeToNarrativeSlate = function() {
  if (window.app && typeof window.app.routeToNarrativeSlate === 'function') {
    return window.app.routeToNarrativeSlate();
  }
};

window.clearActiveWeaveContext = function() {
  if (window.app && typeof window.app.clearActiveWeaveContext === 'function') {
    return window.app.clearActiveWeaveContext();
  }
};

window.routeToMarketing = function() {
  if (window.app && typeof window.app.routeToMarketing === 'function') {
    return window.app.routeToMarketing();
  }
};

window.openQuickLoreChat = function() {
  if (window.app && typeof window.app.openQuickLoreChat === 'function') {
    return window.app.openQuickLoreChat();
  }
};

window.routeToNewArticle = function() {
  if (window.app && typeof window.app.routeToNewArticle === 'function') {
    return window.app.routeToNewArticle();
  }
};

// --- Event Delegation: Add to Slate Button ---
document.addEventListener('click', function(e) {
  if (e.target && e.target.id === 'add-to-slate-btn') {
    e.preventDefault();
    if (window.app && typeof window.app.handleAddToSlateClick === 'function') {
      window.app.handleAddToSlateClick();
    }
  }
});

  navigateHistoryBack() {
    if (this.historyIndex > 0) {
      this.historyIndex--;
      const targetId = this.navigationHistory[this.historyIndex];
      this.loadArticle(targetId, true);
    }
  }

  syncHistoryButtons() {
    const backBtn = document.getElementById('article-back-btn');
    if (backBtn) {
      backBtn.disabled = !(this.historyIndex > 0);
    }
  }

  recordRecentArticle(id, title, category) {
    if (!this.recentArticles) this.recentArticles = [];
    this.recentArticles = this.recentArticles.filter(a => a.id !== id);
    this.recentArticles.unshift({ id, title, category });
    if (this.recentArticles.length > 5) this.recentArticles.pop();
    this.renderRecentArticlesDock();
  }

  renderRecentArticlesDock() {
    const dock = document.getElementById('recent-articles-dock');
    if (!dock) return;
    if (this.recentArticles.length <= 1) {
      dock.classList.add('hidden');
      return;
    }

    dock.classList.remove('hidden');
    let html = '<span class="recent-label">⏱️ Recent:</span>';
    this.recentArticles.forEach(a => {
      const isActive = this.currentArticle && this.currentArticle.id === a.id;
      html += `<button class="recent-article-chip ${isActive ? 'active' : ''}" onclick="window.app.loadArticle('${a.id}')">${a.title}</button>`;
    });
    dock.innerHTML = html;
  }

  toggleCommandPalette() {
    const modal = document.getElementById('command-palette-modal');
    const input = document.getElementById('cmd-palette-input');
    if (!modal) return;

    if (modal.classList.contains('hidden')) {
      modal.classList.remove('hidden');
      if (input) {
        input.value = '';
        input.focus();
        this.updateCommandPaletteResults('');
      }
    } else {
      modal.classList.add('hidden');
    }
  }

  updateCommandPaletteResults(query) {
    const resultsEl = document.getElementById('cmd-palette-results');
    if (!resultsEl) return;

    const q = (query || '').toLowerCase().trim();
    let html = '';

    const navItems = [
      { label: '📖 Open Lore Codex', tab: 'library' },
      { label: '🗺️ Open World Atlas', tab: 'atlas' },
      { label: '⏳ Open Timeline Chronology', tab: 'timeline' },
      { label: '⚔️ Open Relationship Matrix', tab: 'relationships' },
      { label: '🏰 Open World Wiki Frontpage', tab: 'frontpage' },
      { label: '⚡ Open Weave Matrix', tab: 'context' },
      { label: '📢 Open Marketing Suite', tab: 'marketing' }
    ];

    const matchingNav = navItems.filter(n => !q || n.label.toLowerCase().includes(q));
    if (matchingNav.length > 0) {
      html += '<div class="cmd-section-title">Navigation Views</div>';
      matchingNav.forEach(n => {
        html += `<div class="cmd-item" onclick="window.switchTab('${n.tab}'); window.app.toggleCommandPalette();">${n.label}</div>`;
      });
    }

    if (this.articles && this.articles.length > 0) {
      const matchingArticles = this.articles.filter(a => !q || a.title.toLowerCase().includes(q) || (a.category && a.category.toLowerCase().includes(q))).slice(0, 8);
      if (matchingArticles.length > 0) {
        html += '<div class="cmd-section-title">Lore Vault Articles</div>';
        matchingArticles.forEach(a => {
          html += `<div class="cmd-item" onclick="window.switchTab('library'); window.app.loadArticle('${a.id}'); window.app.toggleCommandPalette();">📄 ${a.title} <span class="cmd-badge">${a.category}</span></div>`;
        });
      }
    }

    resultsEl.innerHTML = html || '<div class="cmd-no-results">No matching articles or views found.</div>';
  }

// --- Global Keyboard Shortcut Listener (Arthur Audit Hardening) ---
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    const cmdModal = document.getElementById('command-palette-modal');
    if (cmdModal && !cmdModal.classList.contains('hidden')) {
      cmdModal.classList.add('hidden');
      return;
    }
    const aiDrawer = document.getElementById('ai-chat-drawer');
    if (aiDrawer && aiDrawer.classList.contains('open')) {
      if (typeof window.toggleAiChatDrawer === 'function') window.toggleAiChatDrawer();
      return;
    }
    const weaveDrawer = document.getElementById('weave-matrix-drawer');
    if (weaveDrawer && weaveDrawer.classList.contains('open')) {
      if (typeof window.toggleWeaveMatrixDrawer === 'function') window.toggleWeaveMatrixDrawer();
      return;
    }
  }

  if ((e.ctrlKey || e.metaKey) && e.key && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    if (window.app && typeof window.app.toggleCommandPalette === 'function') {
      window.app.toggleCommandPalette();
    }
    return;
  }

  if (e.ctrlKey && e.shiftKey) {
    const key = e.key ? e.key.toLowerCase() : '';
    if (key === 'f') {
      e.preventDefault();
      if (window.app && typeof window.app.toggleZenMode === 'function') {
        window.app.toggleZenMode();
      }
    } else if (key === 'm') {
      e.preventDefault();
      if (typeof window.toggleWeaveMatrixDrawer === 'function') {
        window.toggleWeaveMatrixDrawer();
      }
    }
  }
});

// Event listener for Command Palette input
document.addEventListener('input', function(e) {
  if (e.target && e.target.id === 'cmd-palette-input') {
    if (window.app && typeof window.app.updateCommandPaletteResults === 'function') {
      window.app.updateCommandPaletteResults(e.target.value);
    }
  }
});
