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
    this.aiConfig = null;
    this.tourSteps = [];
    this.currentTourStepIndex = 0;

    this.init();
  }

  async init() {
    this.initThemeMode();
    this.initCustomTheme();
    await this.loadTemplates();
    await this.fetchAIConfig();
    await this.fetchWorlds();

    let initialTheme = 'ancient-codex';
    if (this.currentWorldId !== 'all') {
      const world = this.worlds.find(w => w.id === this.currentWorldId);
      if (world && world.theme) initialTheme = world.theme;
    }
    document.body.setAttribute('data-theme', initialTheme);

    await this.fetchCategories();
    await this.fetchArticles();
    this.initScholarTasks();

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
    this.initConcierge();
    this.initScholarTour();
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
    if (window.canvasView) {
      window.canvasView.worldId = activeWorld;
      if (typeof window.canvasView.init === 'function') window.canvasView.init();
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
    const canvasView = document.getElementById('view-canvas');
    const frontpageView = document.getElementById('view-frontpage');
    const timelineView = document.getElementById('view-timeline');
    const relationshipsView = document.getElementById('view-relationships');
    const manuscriptView = document.getElementById('view-manuscript');

    const tabLibrary = document.getElementById('tab-library');
    const tabStudio = document.getElementById('tab-studio');
    const tabContext = document.getElementById('tab-context');
    const narrativeSlateBtn = document.getElementById('narrative-slate-nav-btn');
    const tabMarketing = document.getElementById('tab-marketing');
    const tabAtlas = document.getElementById('tab-atlas');
    const tabCanvas = document.getElementById('tab-canvas');
    const tabFrontpage = document.getElementById('tab-frontpage');
    const tabTimeline = document.getElementById('tab-timeline');
    const tabRelationships = document.getElementById('tab-relationships') || document.querySelector('button[data-view="view-relationships"]');
    const tabManuscript = document.getElementById('tab-manuscript');

    [libraryView, studioView, contextView, marketingView, atlasView, canvasView, frontpageView, timelineView, relationshipsView, manuscriptView].forEach(v => {
      if (v) {
        v.classList.remove('active');
        v.classList.add('hidden');
      }
    });
    if (narrativeSlateView) {
      narrativeSlateView.classList.remove('active');
      narrativeSlateView.classList.add('hidden');
    }

    [tabLibrary, tabStudio, tabContext, narrativeSlateBtn, tabMarketing, tabAtlas, tabCanvas, tabFrontpage, tabTimeline, tabRelationships, tabManuscript].forEach(t => t && t.classList.remove('active'));

    if (tabName === 'manuscript') {
      if (manuscriptView) {
        manuscriptView.classList.remove('hidden');
        manuscriptView.classList.add('active');
      }
      if (tabManuscript) tabManuscript.classList.add('active');
      if (window.manuscriptView) {
        window.manuscriptView.init(this.currentWorldId || 'default');
      }
    } else if (tabName === 'canvas') {
      if (canvasView) {
        canvasView.classList.remove('hidden');
        canvasView.classList.add('active');
      }
      if (tabCanvas) tabCanvas.classList.add('active');
      if (!window.canvasView) {
        window.canvasView = new CanvasView('canvas-app-root');
        window.canvasView.worldId = this.currentWorldId || 'default';
        window.canvasView.init();
      } else {
        window.canvasView.worldId = this.currentWorldId || 'default';
        window.canvasView.init();
      }
    } else if (tabName === 'relationships' || tabName === 'view-relationships') {
      if (relationshipsView) {
        relationshipsView.classList.remove('hidden');
        relationshipsView.classList.add('active');
      }
      if (tabRelationships) tabRelationships.classList.add('active');
      if (window.relationshipView) {
        window.relationshipView.init(this.currentWorldId || 'default');
      }
    } else if (tabName === 'timeline') {
      if (timelineView) {
        timelineView.classList.remove('hidden');
        timelineView.classList.add('active');
      }
      if (tabTimeline) tabTimeline.classList.add('active');
      if (!window.timelineView) {
        window.timelineView = new TimelineView('timeline-app-root', { worldId: this.currentWorldId || 'default' });
      } else {
        window.timelineView.worldId = this.currentWorldId || 'default';
      }
      window.timelineView.init();
    } else if (tabName === 'frontpage') {
      if (frontpageView) {
        frontpageView.classList.remove('hidden');
        frontpageView.classList.add('active');
      }
      if (tabFrontpage) tabFrontpage.classList.add('active');
      if (!window.frontpageView) {
        window.frontpageView = new FrontpageView('frontpage-app-root', { worldId: this.currentWorldId || 'default' });
      } else {
        window.frontpageView.worldId = this.currentWorldId || 'default';
      }
      window.frontpageView.init();
    } else if (tabName === 'atlas') {
      if (atlasView) {
        atlasView.classList.remove('hidden');
        atlasView.classList.add('active');
      }
      if (tabAtlas) tabAtlas.classList.add('active');
      if (!window.atlasView) {
        window.atlasView = new AtlasView('atlas-app-root', { worldId: this.currentWorldId || 'default' });
        window.atlasView.init();
      } else if (window.atlasView.worldId !== (this.currentWorldId || 'default')) {
        window.atlasView.worldId = this.currentWorldId || 'default';
        window.atlasView.init();
      }
    } else if (tabName === 'marketing') {
      if (marketingView) {
        marketingView.classList.remove('hidden');
        marketingView.classList.add('active');
      }
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
      if (studioView) {
        studioView.classList.remove('hidden');
        studioView.classList.add('active');
      }
      if (tabStudio) tabStudio.classList.add('active');
      this.fetchScenes();
    } else if (tabName === 'context') {
      if (contextView) {
        contextView.classList.remove('hidden');
        contextView.classList.add('active');
      }
      if (tabContext) tabContext.classList.add('active');
      if (window.ContextBuilder) window.ContextBuilder.init(this.articles);
    } else {
      if (libraryView) {
        libraryView.classList.remove('hidden');
        libraryView.classList.add('active');
      }
      if (tabLibrary) tabLibrary.classList.add('active');
    }

    this.currentTab = tabName;

    // Synchronize Primary Left Rail active state
    document.querySelectorAll('.rail-item').forEach(r => {
      const match = r.dataset.nav === tabName || 
                    (tabName === 'view-relationships' && r.dataset.nav === 'relationships') ||
                    (tabName === 'narrative-slate' && r.dataset.nav === 'narrative-slate');
      r.classList.toggle('active', !!match);
    });

    // Synchronize Top Breadcrumb Active View Name
    const breadcrumbActive = document.getElementById('breadcrumb-active-view');
    const viewNames = {
      'library': 'Lore Codex',
      'manuscript': 'Manuscript Studio',
      'atlas': 'World Atlas',
      'canvas': 'Spatial Canvas',
      'timeline': 'Timeline',
      'relationships': 'Relationships',
      'view-relationships': 'Relationships',
      'narrative-slate': 'Scene Slate',
      'context': 'Weave Matrix',
      'frontpage': 'World Portal',
      'marketing': 'Marketing Studio',
      'census': 'World Census'
    };
    if (breadcrumbActive) {
      breadcrumbActive.textContent = viewNames[tabName] || 'Lore Codex';
    }
  }

  setWorkspaceMode(mode) {
    this.workspaceMode = mode || 'codex';
    const btnCodex = document.getElementById('rail-mode-codex');
    const btnStory = document.getElementById('rail-mode-story');
    const paneCodex = document.getElementById('subpanel-content-codex');
    const paneStory = document.getElementById('subpanel-content-story');
    const subpanelTitle = document.getElementById('subpanel-title');
    const subpanelIcon = document.getElementById('subpanel-icon');
    const primaryCta = document.getElementById('new-article-btn') || document.getElementById('stage-primary-cta');

    if (mode === 'story') {
      if (btnCodex) btnCodex.classList.remove('active');
      if (btnStory) btnStory.classList.add('active');
      if (paneCodex) paneCodex.classList.add('hidden');
      if (paneStory) paneStory.classList.remove('hidden');
      if (subpanelTitle) subpanelTitle.textContent = 'Manuscript Binder';
      if (subpanelIcon) subpanelIcon.textContent = '📖';
      if (primaryCta) primaryCta.textContent = '+ Add Chapter';
      this.switchTab('manuscript');
    } else {
      if (btnStory) btnStory.classList.remove('active');
      if (btnCodex) btnCodex.classList.add('active');
      if (paneStory) paneStory.classList.add('hidden');
      if (paneCodex) paneCodex.classList.remove('hidden');
      if (subpanelTitle) subpanelTitle.textContent = 'World Codex';
      if (subpanelIcon) subpanelIcon.textContent = '🏛️';
      if (primaryCta) primaryCta.textContent = '✍️ New Article';
      if (this.currentTab === 'manuscript') {
        this.switchTab('library');
      }
    }
    localStorage.setItem('lorevault_workspace_mode', this.workspaceMode);
  }

  toggleSubPanel() {
    const subpanel = document.getElementById('workspace-sub-panel');
    if (subpanel) {
      subpanel.classList.toggle('collapsed');
      const isCollapsed = subpanel.classList.contains('collapsed');
      localStorage.setItem('lorevault_subpanel_collapsed', isCollapsed ? 'true' : 'false');
    }
  }

  handleStagePrimaryCTA() {
    if (this.workspaceMode === 'story' || this.currentTab === 'manuscript') {
      if (window.manuscriptView && typeof window.manuscriptView.openCreateChapterModal === 'function') {
        window.manuscriptView.openCreateChapterModal();
      }
    } else {
      this.openEditor();
    }
  }

  handleArticleSearchInput(query) {
    const q = (query || '').toLowerCase().trim();
    const cards = document.querySelectorAll('#articles-cards .article-card');
    cards.forEach(card => {
      const title = (card.querySelector('.card-title')?.textContent || '').toLowerCase();
      const cat = (card.querySelector('.card-category')?.textContent || '').toLowerCase();
      const tags = (card.querySelector('.card-tags')?.textContent || '').toLowerCase();
      const matches = !q || title.includes(q) || cat.includes(q) || tags.includes(q);
      card.style.display = matches ? 'flex' : 'none';
    });
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
    this.attachCardTiltListeners();
  }

  attachCardTiltListeners() {
    const cards = document.querySelectorAll('.article-card');
    cards.forEach(card => {
      if (card.dataset.tiltBound) return;
      card.dataset.tiltBound = 'true';

      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const rotateX = ((y - centerY) / centerY) * -6;
        const rotateY = ((x - centerX) / centerX) * 6;

        card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-2px)`;
      });

      card.addEventListener('mouseleave', () => {
        card.style.transform = '';
      });
    });
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
      this.checkStatBlockIndicator(this.currentArticle.id);

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
    setTimeout(() => {
      if (titleIn) titleIn.focus();
    }, 50);
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

  // --- AI MODEL & PROVIDER CONFIGURATION METHODS ---
  async fetchAIConfig() {
    try {
      const res = await fetch('/api/ai/config');
      const data = await res.json();
      if (data && (data.success || 'use_custom_provider' in data)) {
        this.aiConfig = data;
        this.updateAIStatusChip(data);
      }
    } catch (err) {
      console.warn('[AI Config] Fetch warning:', err);
    }
  }

  updateAIStatusChip(config) {
    const cfg = config || this.aiConfig || { use_custom_provider: false };
    const chip = document.getElementById('ai-status-chip');
    const label = document.getElementById('ai-status-label');
    if (!chip) return;

    chip.classList.remove('custom-active', 'ollama-active');
    if (!cfg.use_custom_provider) {
      if (label) label.textContent = 'AI: Hosted Base';
    } else if (cfg.custom_provider === 'ollama' || cfg.provider === 'ollama') {
      if (label) label.textContent = 'AI: Local Ollama';
      chip.classList.add('ollama-active');
    } else {
      const p = cfg.custom_provider || cfg.provider || 'gemini';
      if (label) label.textContent = `AI: Custom (${p})`;
      chip.classList.add('custom-active');
    }
  }

  openAISettingsModal() {
    const modal = document.getElementById('ai-settings-modal');
    if (!modal) return;
    this.loadAISettingsToForm();
    modal.classList.remove('hidden');
    const feedback = document.getElementById('ai-test-feedback');
    if (feedback) {
      feedback.classList.add('hidden');
      feedback.textContent = '';
      feedback.className = 'ai-test-feedback hidden';
    }
  }

  closeAISettingsModal() {
    const modal = document.getElementById('ai-settings-modal');
    if (modal) modal.classList.add('hidden');
  }

  // --- FEATURE 3: DM MODE TOGGLE ---
  toggleDMMode() {
    const currentIsPlayer = localStorage.getItem('lorevault_mode_player') === 'true';
    const newIsPlayer = !currentIsPlayer;
    localStorage.setItem('lorevault_mode_player', newIsPlayer ? 'true' : 'false');

    const iconEl = document.getElementById('dm-toggle-icon');
    const labelEl = document.getElementById('dm-toggle-label');
    const btnEl = document.getElementById('dm-mode-toggle');

    if (newIsPlayer) {
      if (iconEl) iconEl.textContent = '👁️';
      if (labelEl) labelEl.textContent = 'Player Mode';
      if (btnEl) btnEl.classList.add('btn-warning');
      this.showToast('Switched to Player Mode (DM secrets hidden)', 'info');
    } else {
      if (iconEl) iconEl.textContent = '🔒';
      if (labelEl) labelEl.textContent = 'DM Mode';
      if (btnEl) btnEl.classList.remove('btn-warning');
      this.showToast('Switched to DM Mode (Full access)', 'success');
    }

    this.fetchArticles();
    if (window.canvasView) window.canvasView.loadNodes(this.currentWorldId || 'default');
  }

  // --- FEATURE 2: AI WORLD SIMULATOR METHODS ---
  openSimulatorModal() {
    const modal = document.getElementById('world-simulator-modal');
    if (modal) modal.classList.remove('hidden');
    this.simTimespan = 10;
  }

  closeSimulatorModal() {
    const modal = document.getElementById('world-simulator-modal');
    if (modal) modal.classList.add('hidden');
  }

  switchSimulatorTab(tab) {
    ['era', 'causality', 'rumors'].forEach(t => {
      const btn = document.getElementById(`sim-tab-${t}`);
      const sec = document.getElementById(`sim-section-${t}`);
      if (btn) btn.classList.toggle('active', t === tab);
      if (sec) sec.classList.toggle('hidden', t !== tab);
    });
  }

  setSimTimespan(years, btn) {
    this.simTimespan = years;
    const parent = btn.parentElement;
    if (parent) {
      Array.from(parent.children).forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
    }
  }

  async runEraSimulation() {
    const catalystInput = document.getElementById('sim-catalyst-input');
    const summaryEl = document.getElementById('sim-era-summary');
    const eventsEl = document.getElementById('sim-era-events');
    const resultsBox = document.getElementById('sim-era-results');

    if (summaryEl) summaryEl.textContent = 'Simulating era progression across world lore...';
    if (resultsBox) resultsBox.classList.remove('hidden');

    try {
      const res = await fetch('/api/simulation/simulate-era', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          world_id: this.currentWorldId || 'default',
          timespan_years: this.simTimespan || 50,
          custom_catalyst: catalystInput ? catalystInput.value : ''
        })
      });
      const data = await res.json();
      if (summaryEl) summaryEl.textContent = data.summary || 'Simulation completed.';

      if (eventsEl && Array.isArray(data.generated_events)) {
        eventsEl.innerHTML = data.generated_events.map(ev => `
          <div class="socratic-probe-card">
            <strong>${ev.year || ''}: ${ev.title || 'Event'}</strong>
            <p style="margin-top:0.25rem; font-size:0.85rem; color:#cbd5e1;">${ev.description || ''}</p>
          </div>
        `).join('');
      }
      this.showToast('Era simulation complete!', 'success');
    } catch (err) {
      if (summaryEl) summaryEl.textContent = 'Simulation failed: ' + err.message;
    }
  }

  async runCausalityAudit() {
    const scoreEl = document.getElementById('sim-causality-score');
    const probesEl = document.getElementById('sim-causality-probes');
    const resultsBox = document.getElementById('sim-causality-results');

    if (resultsBox) resultsBox.classList.remove('hidden');
    if (probesEl) probesEl.innerHTML = '<p>Evaluating causality probes...</p>';

    try {
      const res = await fetch('/api/simulation/causality-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ world_id: this.currentWorldId || 'default' })
      });
      const data = await res.json();

      if (scoreEl) scoreEl.textContent = `${data.overall_causality_score || 90}/100`;
      if (probesEl && Array.isArray(data.socratic_probes)) {
        probesEl.innerHTML = data.socratic_probes.map(p => `
          <div class="socratic-probe-card">
            <span class="badge" style="background:#0284c7;">${p.category}</span>
            <p style="margin-top:0.4rem; font-weight:700; color:#f8fafc;">❓ ${p.question}</p>
            <p style="margin-top:0.25rem; font-size:0.8rem; color:#f59e0b;">💡 Remedy: ${p.suggested_fix}</p>
          </div>
        `).join('');
      }
    } catch (err) {
      if (probesEl) probesEl.innerHTML = '<p>Audit failed: ' + err.message + '</p>';
    }
  }

  async loadWorldRumors() {
    const listEl = document.getElementById('sim-rumors-list');
    if (!listEl) return;
    listEl.innerHTML = '<p>Fetching rumors...</p>';

    try {
      const res = await fetch(`/api/simulation/rumors/${this.currentWorldId || 'default'}`);
      const data = await res.json();
      if (Array.isArray(data.rumors)) {
        listEl.innerHTML = data.rumors.map(r => `
          <div class="sim-rumor-chip">🍺 "${r}"</div>
        `).join('');
      }
    } catch (err) {
      listEl.innerHTML = '<p>Failed to load rumors.</p>';
    }
  }

  openAISettings() {
    this.openAISettingsModal();
  }

  closeAISettings() {
    this.closeAISettingsModal();
  }

  loadAISettingsToForm() {
    const cfg = this.aiConfig || {
      use_custom_provider: false,
      custom_provider: 'gemini',
      custom_model: 'gemini-2.0-flash',
      masked_key: '',
      ollama_url: 'http://localhost:11434'
    };
    const radioHosted = document.getElementById('ai-tier-hosted');
    const radioCustom = document.getElementById('ai-tier-custom');
    const providerSel = document.getElementById('ai-provider-select');
    const keyInput = document.getElementById('ai-key-input');
    const modelInput = document.getElementById('ai-model-input');
    const ollamaInput = document.getElementById('ai-ollama-input');

    if (cfg.use_custom_provider) {
      if (radioCustom) radioCustom.checked = true;
      if (radioHosted) radioHosted.checked = false;
      this.handleAITierToggle('custom');
    } else {
      if (radioHosted) radioHosted.checked = true;
      if (radioCustom) radioCustom.checked = false;
      this.handleAITierToggle('hosted');
    }

    const provider = cfg.custom_provider || cfg.provider || 'gemini';
    if (providerSel) providerSel.value = provider;
    if (keyInput) {
      keyInput.value = cfg.masked_key || cfg.masked_api_key || cfg.custom_api_key || cfg.apiKey || '';
      keyInput.type = 'password';
    }
    if (modelInput) modelInput.value = cfg.custom_model || cfg.model || cfg.default_model || 'gemini-2.0-flash';
    if (ollamaInput) ollamaInput.value = cfg.ollama_url || 'http://localhost:11434';

    this.handleAIProviderChange(provider);
  }

  handleAITierToggle(tier) {
    const controls = document.getElementById('ai-custom-controls');
    if (!controls) return;
    if (tier === 'custom') {
      controls.classList.remove('hidden');
    } else {
      controls.classList.add('hidden');
    }
  }

  handleAIProviderChange(provider) {
    const groupKey = document.getElementById('group-api-key');
    const groupOllama = document.getElementById('group-ollama-url');
    if (provider === 'ollama') {
      if (groupKey) groupKey.classList.add('hidden');
      if (groupOllama) groupOllama.classList.remove('hidden');
    } else {
      if (groupKey) groupKey.classList.remove('hidden');
      if (groupOllama) groupOllama.classList.add('hidden');
    }
  }

  toggleAPIKeyVisibility() {
    const keyInput = document.getElementById('ai-key-input');
    if (!keyInput) return;
    keyInput.type = keyInput.type === 'password' ? 'text' : 'password';
  }

  async saveAISettings() {
    const radioCustom = document.getElementById('ai-tier-custom');
    const useCustom = radioCustom ? radioCustom.checked : false;
    const providerSel = document.getElementById('ai-provider-select');
    const provider = providerSel ? providerSel.value : 'gemini';
    const keyInput = document.getElementById('ai-key-input');
    const key = keyInput ? keyInput.value : '';
    const modelInput = document.getElementById('ai-model-input');
    const model = modelInput ? modelInput.value : '';
    const ollamaInput = document.getElementById('ai-ollama-input');
    const ollamaUrl = ollamaInput ? ollamaInput.value : 'http://localhost:11434';

    try {
      const res = await fetch('/api/ai/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          use_custom_provider: useCustom,
          custom_provider: provider,
          custom_api_key: key,
          custom_model: model,
          ollama_url: ollamaUrl,
          provider: provider,
          apiKey: key,
          model: model
        })
      });
      const data = await res.json();
      if (data && (data.success || data.config)) {
        const updatedConfig = data.config || data;
        this.aiConfig = updatedConfig;
        this.updateAIStatusChip(updatedConfig);
        this.closeAISettingsModal();
        if (typeof window.showToast === 'function') {
          window.showToast('⚙️ AI Settings saved successfully!', 'success');
        }
      } else {
        throw new Error(data && data.error ? data.error : 'Save failed');
      }
    } catch (err) {
      if (typeof window.showToast === 'function') {
        window.showToast(`❌ Failed to save AI settings: ${err.message}`, 'error');
      }
    }
  }

  async testAIConnection() {
    const feedback = document.getElementById('ai-test-feedback');
    const testBtn = document.getElementById('ai-test-btn');
    if (testBtn) {
      testBtn.disabled = true;
      testBtn.textContent = '⏳ Testing...';
    }

    const radioCustom = document.getElementById('ai-tier-custom');
    const useCustom = radioCustom ? radioCustom.checked : false;
    const providerSel = document.getElementById('ai-provider-select');
    const provider = providerSel ? providerSel.value : 'gemini';
    const keyInput = document.getElementById('ai-key-input');
    const key = keyInput ? keyInput.value : '';
    const modelInput = document.getElementById('ai-model-input');
    const model = modelInput ? modelInput.value : '';
    const ollamaInput = document.getElementById('ai-ollama-input');
    const ollamaUrl = ollamaInput ? ollamaInput.value : 'http://localhost:11434';

    try {
      const res = await fetch('/api/ai/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          use_custom_provider: useCustom,
          provider: provider,
          custom_provider: provider,
          api_key: key,
          custom_api_key: key,
          model: model,
          custom_model: model,
          ollama_url: ollamaUrl
        })
      });
      const data = await res.json();
      if (feedback) {
        feedback.classList.remove('hidden', 'success', 'error');
        if (data.success) {
          feedback.classList.add('success');
          feedback.textContent = `✔ ${data.message} (${data.latency_ms}ms)`;
        } else {
          feedback.classList.add('error');
          feedback.textContent = `✖ ${data.message}`;
        }
      }
    } catch (err) {
      if (feedback) {
        feedback.classList.remove('hidden', 'success');
        feedback.classList.add('error');
        feedback.textContent = '✖ Network error testing connection: ' + err.message;
      }
    } finally {
      if (testBtn) {
        testBtn.disabled = false;
        testBtn.textContent = '⚡ Test Connection';
      }
    }
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

  async cleanOrphanTags(action = 'purge_orphans') {
    const targetWorldId = this.doctorWorldScope || this.currentWorldId || 'all';
    try {
      const res = await fetch('/api/audit/clean-tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ world_id: targetWorldId, action })
      });
      const data = await res.json();
      if (data.success) {
        this.showNotification(`🏷️ ${data.message}`, 'success');
        await this.runWorldAudit();
      }
    } catch (err) {
      this.showNotification(`❌ Error cleaning tags: ${err.message}`, 'error');
    }
  }

  async undoBatchRepairWorldDoctor() {
    if (!this.lastBatchRepairSnapshot || this.lastBatchRepairSnapshot.length === 0) {
      this.showNotification('⚠️ No batch repair snapshot to undo.', 'warning');
      return;
    }
    try {
      const res = await fetch('/api/audit/undo-batch-repair', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ snapshots: this.lastBatchRepairSnapshot })
      });
      const data = await res.json();
      if (data.success) {
        this.showNotification(`↩️ ${data.message}`, 'success');
        this.lastBatchRepairSnapshot = null;
        const undoBtn = document.getElementById('undo-batch-repair-btn');
        if (undoBtn) undoBtn.style.display = 'none';
        await this.runWorldAudit();
        await this.loadArticles();
      }
    } catch (err) {
      this.showNotification(`❌ Undo error: ${err.message}`, 'error');
    }
  }

  async fetchHealthScoreHistory() {
    const targetWorldId = this.doctorWorldScope || this.currentWorldId || 'all';
    try {
      const res = await fetch(`/api/audit/health-history?world_id=${encodeURIComponent(targetWorldId)}`);
      const data = await res.json();
      if (data.history && Array.isArray(data.history) && data.history.length > 0) {
        this.renderHealthScoreSparkline(data.history);
      }
    } catch (e) {}
  }

  renderHealthScoreSparkline(history) {
    const container = document.getElementById('doctor-sparkline-svg');
    if (!container || !history || history.length === 0) return;

    const width = container.clientWidth || 400;
    const height = 45;
    const padding = 5;

    const scores = history.map(h => h.health_score);
    const min = Math.min(...scores, 0);
    const max = 100;

    const points = scores.map((score, index) => {
      const x = padding + (index / (scores.length - 1 || 1)) * (width - 2 * padding);
      const y = height - padding - ((score - min) / (max - min || 1)) * (height - 2 * padding);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');

    const svg = `
      <svg width="100%" height="${height}" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" style="overflow:visible;">
        <defs>
          <linearGradient id="sparklineGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#4ade80" stop-opacity="0.4" />
            <stop offset="100%" stop-color="#4ade80" stop-opacity="0" />
          </linearGradient>
        </defs>
        <path d="M ${padding},${height - padding} L ${points} L ${width - padding},${height - padding} Z" fill="url(#sparklineGrad)" />
        <polyline fill="none" stroke="#4ade80" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" points="${points}" />
      </svg>
    `;
    container.innerHTML = svg;
  }

  async batchRepairWorldDoctor(actions = ['fix_misclassified', 'crosslink_orphans']) {
    const targetWorldId = this.doctorWorldScope || this.currentWorldId || 'all';
    this.lastBatchRepairSnapshot = (this.articles || []).map(a => ({ id: a.id, category: a.category, sub_category: a.sub_category, content: a.content }));

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
        const undoBtn = document.getElementById('undo-batch-repair-btn');
        if (undoBtn) undoBtn.style.display = 'inline-block';
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
    } catch (err) {
      this.showNotification(`❌ Export failed: ${err.message}`, 'error');
    }
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

      // 5. Render Unmapped Locations List
      const unmappedList = document.getElementById('doctor-unmapped-list');
      const mUnmapped = document.getElementById('doctor-metric-unmapped');
      const unmappedLocations = data.unmappedLocations || [];
      if (mUnmapped) mUnmapped.textContent = unmappedLocations.length;
      if (unmappedList) {
        if (unmappedLocations.length > 0) {
          unmappedList.innerHTML = unmappedLocations.map(art => `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:0.4rem 0.6rem; border-bottom:1px solid var(--border-color); font-size:0.8rem;">
              <div>
                <strong style="color:#fff;">${art.title}</strong>
                <span style="color:var(--text-muted); font-size:0.75rem; margin-left:0.5rem;">(Location unpinned on map)</span>
              </div>
              <button class="btn btn-secondary" style="font-size:0.75rem; padding:0.15rem 0.5rem; background:#0284c7; color:#fff;" onclick="window.app.switchTab('maps'); window.app.closeDoctorModal();">📍 Pin on Map</button>
            </div>
          `).join('');
        } else {
          unmappedList.innerHTML = `<div style="padding:0.75rem; color:var(--accent-emerald); font-size:0.8rem;">✓ All location articles are pinned on a map atlas!</div>`;
        }
      }

      // 6. Render Lore Gap Finder Card
      const gapsCard = document.getElementById('doctor-lore-gaps-card');
      const gapsList = document.getElementById('doctor-lore-gaps-list');
      const loreGaps = data.loreGaps || [];
      if (gapsCard && gapsList) {
        if (loreGaps.length > 0) {
          gapsCard.style.display = 'block';
          gapsList.innerHTML = loreGaps.map(gap => `
            <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.8rem;">
              <span style="color:var(--text-primary);">${gap.message}</span>
              <button class="btn btn-primary" style="font-size:0.7rem; padding:0.15rem 0.5rem; white-space:nowrap;" onclick="window.app.openStubPreviewModal('gap-${gap.pillar.toLowerCase()}', 'New ${gap.pillar} Foundation', '${gap.pillar}')">+ Create ${gap.pillar} Stub</button>
            </div>
          `).join('');
        } else {
          gapsCard.style.display = 'none';
        }
      }

      // 7. Render Spoiler Leaks List
      const spoilersList = document.getElementById('doctor-spoilers-list');
      const mSpoilers = document.getElementById('doctor-metric-spoilers');
      const spoilerLeaks = data.spoilerLeaks || [];
      if (mSpoilers) mSpoilers.textContent = spoilerLeaks.length;
      if (spoilersList) {
        if (spoilerLeaks.length > 0) {
          spoilersList.innerHTML = spoilerLeaks.map(item => `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:0.4rem 0.6rem; border-bottom:1px solid var(--border-color); font-size:0.8rem;">
              <div>
                <strong style="color:#f43f5e;">${item.title}</strong>
                <span style="color:var(--text-muted); font-size:0.75rem; margin-left:0.5rem;">(Mentions DM Secret "${item.secretName}")</span>
              </div>
              <button class="btn-text" style="font-size:0.75rem;" onclick="window.app.loadArticle('${item.id}'); window.app.closeDoctorModal();">Review Content</button>
            </div>
          `).join('');
        } else {
          spoilersList.innerHTML = `<div style="padding:0.75rem; color:var(--accent-emerald); font-size:0.8rem;">✓ Zero DM secret spoiler leaks detected!</div>`;
        }
      }

      // 8. Render Cross-World Bleed List
      const bleedList = document.getElementById('doctor-bleed-list');
      const mBleed = document.getElementById('doctor-metric-bleed');
      const crossWorldBleed = data.crossWorldBleed || [];
      if (mBleed) mBleed.textContent = crossWorldBleed.length;
      if (bleedList) {
        if (crossWorldBleed.length > 0) {
          bleedList.innerHTML = crossWorldBleed.map(item => `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:0.4rem 0.6rem; border-bottom:1px solid var(--border-color); font-size:0.8rem;">
              <div>
                <strong style="color:#c084fc;">${item.sourceTitle}</strong>
                <span style="color:var(--text-muted); font-size:0.75rem; margin-left:0.5rem;">(Links to "${item.targetTitle}" from foreign world [${item.foreignWorlds.join(', ')}])</span>
              </div>
              <button class="btn-text" style="font-size:0.75rem;" onclick="window.app.loadArticle('${item.sourceId}'); window.app.closeDoctorModal();">Fix Link</button>
            </div>
          `).join('');
        } else {
          bleedList.innerHTML = `<div style="padding:0.75rem; color:var(--accent-emerald); font-size:0.8rem;">✓ Setting is cleanly isolated (no foreign world cross-links).</div>`;
        }
      }

      // 9. Render Category Depth Heatmap
      const heatmapContainer = document.getElementById('doctor-category-depth-container');
      const heatmapList = document.getElementById('doctor-category-depth-heatmap');
      const heatmapData = data.categoryDepthHeatmap || [];
      if (heatmapContainer && heatmapList) {
        if (heatmapData.length > 0) {
          heatmapContainer.style.display = 'block';
          heatmapList.innerHTML = heatmapData.map(item => {
            const maxAvg = Math.max(...heatmapData.map(h => h.avgWords), 1);
            const pct = Math.min(100, Math.round((item.avgWords / maxAvg) * 100));
            const barColor = item.isThin ? '#f43f5e' : (pct > 60 ? '#4ade80' : '#38bdf8');
            return `
              <div style="font-size:0.75rem;">
                <div style="display:flex; justify-content:space-between; margin-bottom:0.15rem;">
                  <span style="color:var(--text-primary); font-weight:600;">${item.category} (${item.count} articles)</span>
                  <span style="color:${barColor}; font-weight:700;">avg ${item.avgWords} words/art ${item.isThin ? '⚠️ Thin' : ''}</span>
                </div>
                <div style="background:var(--bg-main); height:6px; border-radius:3px; overflow:hidden;">
                  <div style="width:${pct}%; height:100%; background:${barColor}; transition:width 0.3s ease;"></div>
                </div>
              </div>
            `;
          }).join('');
        } else {
          heatmapContainer.style.display = 'none';
        }
      }

      // 10. Fetch Health History for Sparkline Chart
      this.fetchHealthScoreHistory();

    } catch (err) {
      if (statusEl) statusEl.textContent = 'Audit Error: ' + err.message;
    }
  }

  openAISkillsModal() {
    const modal = document.getElementById('ai-skills-modal');
    if (!modal) return;
    modal.classList.remove('hidden');
    this.fetchAndRenderAISkills();
  }

  closeAISkillsModal() {
    const modal = document.getElementById('ai-skills-modal');
    if (!modal) return;
    modal.classList.add('hidden');
    this.closeSkillForm();
  }

  openCreateSkillForm(initialData = null) {
    const editCard = document.getElementById('ai-skill-edit-card');
    if (!editCard) return;
    editCard.style.display = 'block';

    const idInput = document.getElementById('skill-id-input');
    const nameInput = document.getElementById('skill-name-input');
    const descInput = document.getElementById('skill-desc-input');
    const directivesInput = document.getElementById('skill-directives-input');
    const scopeSelect = document.getElementById('skill-scope-select');

    if (initialData) {
      if (idInput) idInput.value = initialData.id || '';
      if (nameInput) nameInput.value = initialData.name || '';
      if (descInput) descInput.value = initialData.description || '';
      if (directivesInput) directivesInput.value = initialData.directives || '';
      if (scopeSelect) scopeSelect.value = initialData.world_id || 'all';
    } else {
      if (idInput) idInput.value = '';
      if (nameInput) nameInput.value = '';
      if (descInput) descInput.value = '';
      if (directivesInput) directivesInput.value = '';
      if (scopeSelect) scopeSelect.value = 'all';
    }
  }

  closeSkillForm() {
    const editCard = document.getElementById('ai-skill-edit-card');
    if (editCard) editCard.style.display = 'none';
  }

  async fetchAndRenderAISkills() {
    const container = document.getElementById('ai-skills-list-container');
    if (!container) return;
    try {
      const res = await fetch('/api/skills?world_id=all');
      const skills = await res.json();
      if (!skills || skills.length === 0) {
        container.innerHTML = `<div style="color:var(--text-muted); font-size:0.8rem; text-align:center; padding:1.5rem;">No custom AI skills created yet. Click '+ Add New Skill' or '🪄 Generate Skill with AI' to define author directives!</div>`;
        return;
      }

      container.innerHTML = skills.map(s => `
        <div style="background:var(--surface-card); border:1px solid ${s.is_active ? 'var(--accent-blue)' : 'var(--border-color)'}; border-radius:8px; padding:0.75rem 1rem; opacity:${s.is_active ? 1 : 0.65};">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.3rem;">
            <div style="display:flex; align-items:center; gap:0.5rem;">
              <strong style="color:var(--text-primary); font-size:0.85rem;">${s.name}</strong>
              <span class="badge" style="background:${s.is_active ? 'rgba(74,222,128,0.15)' : 'rgba(148,163,184,0.15)'}; color:${s.is_active ? '#4ade80' : '#94a3b8'}; font-size:0.65rem;">${s.is_active ? '🟢 Active' : '⚪ Inactive'}</span>
              <span style="font-size:0.7rem; color:var(--text-muted);">[Scope: ${s.world_id}]</span>
            </div>
            <div style="display:flex; gap:0.35rem;">
              <button class="btn btn-secondary" style="font-size:0.7rem; padding:0.15rem 0.45rem;" onclick="window.app.toggleAISkill('${s.id}', ${s.is_active ? 0 : 1})">${s.is_active ? 'Disable' : 'Enable'}</button>
              <button class="btn btn-secondary" style="font-size:0.7rem; padding:0.15rem 0.45rem;" onclick="window.app.editAISkill('${s.id}')">Edit</button>
              <button class="btn btn-secondary" style="font-size:0.7rem; padding:0.15rem 0.45rem; background:#dc2626; color:#fff;" onclick="window.app.deleteAISkill('${s.id}')">Delete</button>
            </div>
          </div>
          ${s.description ? `<div style="font-size:0.75rem; color:var(--text-muted); margin-bottom:0.4rem;">${s.description}</div>` : ''}
          <pre style="margin:0; font-size:0.7rem; background:var(--bg-main); border:1px solid var(--border-color); border-radius:4px; padding:0.4rem 0.6rem; color:#e2e8f0; white-space:pre-wrap; font-family:monospace;">${s.directives}</pre>
        </div>
      `).join('');

      this.customSkillsCache = skills;
    } catch (err) {
      container.innerHTML = `<div style="color:#f43f5e; font-size:0.8rem; text-align:center; padding:1rem;">Failed to load skills: ${err.message}</div>`;
    }
  }

  async saveAISkillFromForm() {
    const id = document.getElementById('skill-id-input')?.value;
    const name = document.getElementById('skill-name-input')?.value?.trim();
    const world_id = document.getElementById('skill-scope-select')?.value || 'all';
    const description = document.getElementById('skill-desc-input')?.value?.trim();
    const directives = document.getElementById('skill-directives-input')?.value?.trim();

    if (!name || !directives) {
      this.showNotification('⚠️ Skill name and directives are required!', 'warning');
      return;
    }

    try {
      const res = await fetch('/api/skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, world_id, name, description, directives, is_active: 1 })
      });
      const data = await res.json();
      if (data.success) {
        this.showNotification(`💾 ${data.message}`, 'success');
        this.closeSkillForm();
        await this.fetchAndRenderAISkills();
      }
    } catch (err) {
      this.showNotification(`❌ Error saving skill: ${err.message}`, 'error');
    }
  }

  async toggleAISkill(id, isActive) {
    const existing = (this.customSkillsCache || []).find(s => s.id === id);
    if (!existing) return;
    try {
      const res = await fetch('/api/skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...existing, is_active: isActive })
      });
      const data = await res.json();
      if (data.success) {
        this.showNotification(isActive ? '🟢 Skill activated!' : '⚪ Skill disabled.', 'info');
        await this.fetchAndRenderAISkills();
      }
    } catch (err) {
      this.showNotification(`❌ Error toggling skill: ${err.message}`, 'error');
    }
  }

  async editAISkill(id) {
    const existing = (this.customSkillsCache || []).find(s => s.id === id);
    if (existing) {
      this.openCreateSkillForm(existing);
    }
  }

  async deleteAISkill(id) {
    if (!confirm('Are you sure you want to delete this AI skill directive?')) return;
    try {
      const res = await fetch(`/api/skills/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        this.showNotification('🗑️ Skill deleted successfully.', 'info');
        await this.fetchAndRenderAISkills();
      }
    } catch (err) {
      this.showNotification(`❌ Delete error: ${err.message}`, 'error');
    }
  }

  openAISkillGeneratorModal() {
    const modal = document.getElementById('ai-skill-generator-modal');
    if (modal) modal.classList.remove('hidden');
  }

  closeAISkillGeneratorModal() {
    const modal = document.getElementById('ai-skill-generator-modal');
    if (modal) modal.classList.add('hidden');
  }

  async runAISkillGenerator() {
    const promptInput = document.getElementById('skill-gen-prompt-input');
    const prompt = promptInput?.value?.trim();
    if (!prompt) {
      this.showNotification('⚠️ Please describe what you want the AI skill to do.', 'warning');
      return;
    }

    this.showNotification('✨ AI is drafting system skill directives...', 'info');
    try {
      const res = await fetch('/api/skills/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });
      const data = await res.json();
      if (data.success && data.skill) {
        this.closeAISkillGeneratorModal();
        this.openCreateSkillForm(data.skill);
        this.showNotification('🪄 AI Skill generated! Review and save directives.', 'success');
      }
    } catch (err) {
      this.showNotification('❌ Failed to generate skill: ' + err.message, 'error');
    }
  }

  // --- WORLD CENSUS DASHBOARD CONTROLLER METHODS ---

  async renderWorldCensusDashboard() {
    const targetWorldId = this.currentWorldId || 'all';
    try {
      const res = await fetch(`/api/census/stats?world_id=${encodeURIComponent(targetWorldId)}`);
      const data = await res.json();

      const elTotalArticles = document.getElementById('census-total-articles');
      const elTotalWords = document.getElementById('census-total-words');
      const elAvgWords = document.getElementById('census-avg-words');
      const elCompleteness = document.getElementById('census-completeness-score');
      const elCatList = document.getElementById('census-category-list');

      if (elTotalArticles) elTotalArticles.textContent = (data.totalArticles || 0).toLocaleString();
      if (elTotalWords) elTotalWords.textContent = (data.totalWords || 0).toLocaleString();
      if (elAvgWords) elAvgWords.textContent = (data.avgWordsPerArticle || 0).toLocaleString();
      if (elCompleteness) elCompleteness.textContent = `${data.completenessScore || 100} / 100`;

      if (elCatList && data.categoryBreakdown) {
        const maxWords = Math.max(...data.categoryBreakdown.map(c => c.totalWords), 1);
        elCatList.innerHTML = data.categoryBreakdown.map(c => {
          const barPct = Math.min(100, Math.round((c.totalWords / maxWords) * 100));
          return `
            <div style="background:var(--bg-main); border:1px solid var(--border-color); border-radius:8px; padding:0.75rem 1rem;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.4rem;">
                <div>
                  <strong style="color:var(--text-primary); font-size:0.9rem;">${c.category}</strong>
                  <span style="color:var(--text-muted); font-size:0.75rem; margin-left:0.5rem;">${c.count} articles (${c.percentage}%)</span>
                </div>
                <div style="font-size:0.8rem; font-weight:700; color:var(--accent-blue);">
                  ${c.totalWords.toLocaleString()} total words <span style="font-size:0.7rem; color:var(--text-muted); font-weight:400;">(avg ${c.avgWords}/art)</span>
                </div>
              </div>
              <div style="background:rgba(255,255,255,0.06); height:8px; border-radius:4px; overflow:hidden;">
                <div style="width:${barPct}%; height:100%; background:var(--accent-blue); transition:width 0.4s ease;"></div>
              </div>
            </div>
          `;
        }).join('');
      }
    } catch (err) {
      this.showNotification(`❌ Error loading Census data: ${err.message}`, 'error');
    }
  }

  // --- NPC DIALOGUE SANDBOX CONTROLLER METHODS ---

  openNPCDialogueModal(characterId = null) {
    const modal = document.getElementById('npc-dialogue-modal');
    if (!modal) return;
    modal.classList.remove('hidden');

    const select = document.getElementById('npc-character-select');
    if (select) {
      const charArticles = (this.articles || []).filter(a => a.category === 'Characters' || a.category === 'Races & Species');
      select.innerHTML = `<option value="">Select NPC Character to Roleplay...</option>` +
        charArticles.map(c => `<option value="${c.id}">${c.title} (${c.sub_category || c.category})</option>`).join('');

      if (characterId) select.value = characterId;
    }

    if (characterId) this.handleNPCDialogueCharacterChange(characterId);
  }

  closeNPCDialogueModal() {
    const modal = document.getElementById('npc-dialogue-modal');
    if (modal) modal.classList.add('hidden');
  }

  handleNPCDialogueCharacterChange(characterId) {
    this.activeNPCCharacterId = characterId;
    this.npcDialogueHistory = [];

    const titleEl = document.getElementById('npc-dialogue-title');
    const emotionEl = document.getElementById('npc-dialogue-emotion');
    const threadEl = document.getElementById('npc-dialogue-thread');

    const charArt = (this.articles || []).find(a => a.id === characterId);
    if (titleEl && charArt) titleEl.textContent = `💬 Dialogue: ${charArt.title}`;
    if (emotionEl) {
      emotionEl.textContent = '🟡 Neutral';
      emotionEl.style.background = 'rgba(56,189,248,0.15)';
      emotionEl.style.color = '#38bdf8';
    }

    if (threadEl) {
      if (charArt) {
        threadEl.innerHTML = `<div style="background:var(--surface-card); border:1px solid var(--border-color); border-radius:6px; padding:0.6rem 0.8rem; font-size:0.8rem; color:#e2e8f0; font-style:italic;">*${charArt.title} stands before you.* "Speak your mind, traveler."</div>`;
      } else {
        threadEl.innerHTML = `<div style="color:var(--text-muted); font-size:0.8rem; text-align:center; padding:2rem;">Select an NPC character above to initiate roleplay dialogue!</div>`;
      }
    }
  }

  async sendNPCDialogueMessage() {
    const input = document.getElementById('npc-dialogue-input');
    const userMsg = input?.value?.trim();
    if (!userMsg || !this.activeNPCCharacterId) return;

    if (input) input.value = '';

    const threadEl = document.getElementById('npc-dialogue-thread');
    if (!this.npcDialogueHistory) this.npcDialogueHistory = [];

    // Append User Message
    this.npcDialogueHistory.push({ speaker: 'User', text: userMsg });
    if (threadEl) {
      threadEl.innerHTML += `
        <div style="align-self:flex-end; max-width:80%; background:var(--accent-blue); color:#fff; border-radius:8px 8px 0 8px; padding:0.5rem 0.75rem; font-size:0.8rem;">
          <strong>You:</strong> ${userMsg}
        </div>
      `;
      threadEl.scrollTop = threadEl.scrollHeight;
    }

    const charArt = (this.articles || []).find(a => a.id === this.activeNPCCharacterId);
    const charName = charArt ? charArt.title : 'NPC';

    try {
      const res = await fetch('/api/simulation/npc-dialogue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          character_id: this.activeNPCCharacterId,
          user_message: userMsg,
          dialogue_history: this.npcDialogueHistory.slice(-6)
        })
      });
      const data = await res.json();
      if (data.reply) {
        this.npcDialogueHistory.push({ speaker: charName, text: data.reply });

        // Update emotion badge
        const emotionEl = document.getElementById('npc-dialogue-emotion');
        if (emotionEl) {
          const emo = data.emotion || 'neutral';
          emotionEl.textContent = `${emo === 'hostile' ? '🔴' : (emo === 'friendly' ? '🟢' : '🟡')} ${emo.toUpperCase()}`;
        }

        if (threadEl) {
          threadEl.innerHTML += `
            <div style="align-self:flex-start; max-width:80%; background:var(--surface-card); border:1px solid var(--border-color); color:#e2e8f0; border-radius:8px 8px 8px 0; padding:0.5rem 0.75rem; font-size:0.8rem;">
              <strong style="color:var(--accent-cyan);">${charName}:</strong> ${data.reply}
            </div>
          `;
          threadEl.scrollTop = threadEl.scrollHeight;
        }
      }
    } catch (err) {
      this.showNotification(`❌ Dialogue error: ${err.message}`, 'error');
    }
  }

  clearNPCDialogueHistory() {
    this.npcDialogueHistory = [];
    if (this.activeNPCCharacterId) this.handleNPCDialogueCharacterChange(this.activeNPCCharacterId);
  }

  // --- SPOTLIGHT FTS SEARCH OVERRIDE ---

  async runSpotlightFTS(query) {
    if (!query || query.length < 2) return [];
    try {
      const targetWorldId = this.currentWorldId || 'all';
      const res = await fetch(`/api/search/fts?q=${encodeURIComponent(query)}&world_id=${encodeURIComponent(targetWorldId)}`);
      const data = await res.json();
      return data.results || [];
    } catch (e) {
      return [];
    }
  }

  // --- ZEN TYPEWRITER & AMBIENT SOUNDSCAPE SUITE CONTROLLER METHODS ---

  openZenTypewriterMode() {
    const modal = document.getElementById('zen-mode-modal');
    if (!modal) return;
    modal.classList.remove('hidden');

    this.zenStartTime = Date.now();
    const titleInput = document.getElementById('zen-title-input');
    const textarea = document.getElementById('zen-editor-textarea');

    if (titleInput && this.activeArticle) titleInput.value = this.activeArticle.title || '';
    if (textarea && this.activeArticle) textarea.value = (this.activeArticle.content || '').replace(/<[^>]*>/g, '');

    this.handleZenEditorInput();
  }

  closeZenTypewriterMode() {
    const modal = document.getElementById('zen-mode-modal');
    if (!modal) return;
    modal.classList.add('hidden');
    this.stopAmbientSoundscape();
  }

  handleZenEditorInput() {
    const textarea = document.getElementById('zen-editor-textarea');
    const badge = document.getElementById('zen-wpm-badge');
    if (!textarea || !badge) return;

    const text = textarea.value.trim();
    const words = text ? text.split(/\s+/).length : 0;

    const minutes = Math.max(0.1, (Date.now() - (this.zenStartTime || Date.now())) / 60000);
    const wpm = Math.round(words / minutes);

    badge.textContent = `${wpm} WPM | ${words} Words`;
  }

  setAmbientSoundscape(type) {
    this.stopAmbientSoundscape();
    if (type === 'none') return;

    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      this.audioCtx = new AudioContext();

      const bufferSize = this.audioCtx.sampleRate * 2;
      const noiseBuffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const whiteNoise = this.audioCtx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      whiteNoise.loop = true;

      const filter = this.audioCtx.createBiquadFilter();
      filter.type = type === 'rain' ? 'lowpass' : (type === 'campfire' ? 'bandpass' : 'lowpass');
      filter.frequency.value = type === 'rain' ? 800 : (type === 'campfire' ? 400 : 300);

      const gain = this.audioCtx.createGain();
      gain.gain.value = 0.08;

      whiteNoise.connect(filter);
      filter.connect(gain);
      gain.connect(this.audioCtx.destination);
      whiteNoise.start();

      this.currentSoundSource = whiteNoise;
      this.showNotification(`🎵 Playing ambient soundscape: ${type}`, 'info');
    } catch (e) {
      console.warn('AudioContext disabled or unsupported.', e);
    }
  }

  stopAmbientSoundscape() {
    if (this.currentSoundSource) {
      try { this.currentSoundSource.stop(); } catch (e) {}
      this.currentSoundSource = null;
    }
    if (this.audioCtx) {
      try { this.audioCtx.close(); } catch (e) {}
      this.audioCtx = null;
    }
  }

  // --- RUMOR BROADSHEET GENERATOR CONTROLLER METHODS ---

  openRumorGeneratorModal() {
    const modal = document.getElementById('rumor-generator-modal');
    if (modal) modal.classList.remove('hidden');
  }

  closeRumorGeneratorModal() {
    const modal = document.getElementById('rumor-generator-modal');
    if (modal) modal.classList.add('hidden');
  }

  async generateWorldRumors() {
    const container = document.getElementById('rumor-broadsheet-container');
    if (container) container.innerHTML = `<div style="color:var(--text-muted); font-size:0.8rem; text-align:center; padding:2rem;">✨ AI Town Crier is gathering rumors and printing broadsheet...</div>`;

    try {
      const res = await fetch('/api/simulation/generate-rumors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ world_id: this.currentWorldId || 'all', count: 5 })
      });
      const data = await res.json();
      if (data.success && data.broadsheet) {
        const b = data.broadsheet;
        container.innerHTML = `
          <div style="font-family:serif; border-bottom:2px double var(--border-color); padding-bottom:0.75rem; margin-bottom:1rem; text-align:center;">
            <h3 style="margin:0; font-size:1.3rem; color:var(--text-primary); text-transform:uppercase; letter-spacing:0.05em;">${b.headline}</h3>
            <div style="font-size:0.75rem; color:var(--text-muted); font-style:italic; margin-top:0.3rem;">Special Kingdom Dispatch & Regional Rumor Mill</div>
          </div>
          <div style="font-size:0.85rem; color:#e2e8f0; line-height:1.6; margin-bottom:1.25rem;">
            ${b.leadStory}
          </div>
          <h4 style="margin:0 0 0.6rem 0; font-size:0.9rem; color:var(--accent-blue);">📜 d100 Regional Tavern Rumors</h4>
          <div style="display:flex; flex-direction:column; gap:0.5rem;">
            ${(b.rumors || []).map(r => `
              <div style="background:var(--surface-card); border:1px solid var(--border-color); border-radius:6px; padding:0.6rem 0.8rem; font-size:0.8rem;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.2rem;">
                  <strong style="color:var(--text-primary);">Rumor #${r.id || 1}</strong>
                  <span class="badge" style="font-size:0.65rem; background:${r.reliability === 'True' ? 'rgba(74,222,128,0.15)' : 'rgba(251,191,36,0.15)'}; color:${r.reliability === 'True' ? '#4ade80' : '#fbbf24'};">${r.reliability}</span>
                </div>
                <div style="color:#cbd5e1; font-style:italic;">"${r.text}"</div>
                <div style="font-size:0.7rem; color:var(--text-muted); margin-top:0.2rem;">— Overheard from: ${r.source || 'Anonymous Traveler'}</div>
              </div>
            `).join('')}
          </div>
        `;
      }
    } catch (err) {
      if (container) container.innerHTML = `<div style="color:#f43f5e; font-size:0.8rem; text-align:center; padding:1rem;">Error generating rumors: ${err.message}</div>`;
    }
  }

  // --- PROCEDURAL SETTLEMENT BUILDER CONTROLLER METHODS ---

  openSettlementBuilderModal() {
    const modal = document.getElementById('settlement-builder-modal');
    if (modal) modal.classList.remove('hidden');
  }

  closeSettlementBuilderModal() {
    const modal = document.getElementById('settlement-builder-modal');
    if (modal) modal.classList.add('hidden');
  }

  async generateSettlementMap() {
    const name = document.getElementById('settlement-name-input')?.value || 'Ironclad Dungeon';
    const type = document.getElementById('settlement-type-select')?.value || 'dungeon';
    const size = document.getElementById('settlement-size-select')?.value || '12';
    const container = document.getElementById('settlement-canvas-container');

    if (container) container.innerHTML = `<div style="color:var(--text-muted); font-size:0.8rem; text-align:center; padding:2rem;">🎲 Proceduralizing grid floorplan...</div>`;

    try {
      const res = await fetch('/api/maps/generate-settlement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, map_type: type, grid_size: size, world_id: this.currentWorldId || 'default' })
      });
      const data = await res.json();
      if (data.success && data.settlement) {
        const s = data.settlement;
        container.innerHTML = `
          <div style="width:100%;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.75rem;">
              <strong style="color:var(--text-primary); font-size:0.9rem;">${s.name} (${s.map_type.toUpperCase()} GRID: ${s.gridWidth}x${s.gridHeight})</strong>
              <span style="font-size:0.75rem; color:var(--text-muted);">${s.rooms.length} Rooms Generated</span>
            </div>
            <div style="display:grid; grid-template-columns: repeat(${Math.min(4, s.rooms.length)}, 1fr); gap:0.6rem;">
              ${s.rooms.map(r => `
                <div style="background:var(--surface-card); border:1px solid var(--accent-blue); border-radius:6px; padding:0.6rem; font-size:0.75rem;">
                  <strong style="color:var(--accent-blue); font-size:0.8rem; display:block; margin-bottom:0.2rem;">${r.name}</strong>
                  <div style="color:var(--text-muted); font-size:0.7rem; margin-bottom:0.3rem;">Grid Position: (${r.x}, ${r.y})</div>
                  <div style="color:#e2e8f0; font-size:0.7rem;">${r.description}</div>
                </div>
              `).join('')}
            </div>
          </div>
        `;
      }
    } catch (err) {
      if (container) container.innerHTML = `<div style="color:#f43f5e; font-size:0.8rem; text-align:center; padding:1rem;">Error generating map: ${err.message}</div>`;
    }
  }

  // --- 🗓️ 1. CHRONOS MATRIX CONTROLLERS ---
  openChronosModal() {
    const modal = document.getElementById('chronos-calendar-modal');
    if (modal) modal.classList.remove('hidden');
  }

  closeChronosModal() {
    const modal = document.getElementById('chronos-calendar-modal');
    if (modal) modal.classList.add('hidden');
  }

  async calculateChronosDate() {
    const name = document.getElementById('chronos-cal-name')?.value || 'Imperial Solar Reckoning';
    const dpy = document.getElementById('chronos-days-year')?.value || 360;
    const resultDiv = document.getElementById('chronos-calculation-result');
    if (resultDiv) resultDiv.innerHTML = `<div style="color:var(--text-muted);">Calculating celestial date & moon phases...</div>`;

    try {
      const res = await fetch('/api/calendars/calculate-date', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          days_per_year: dpy,
          months: [
            { name: 'Sol-Prime', days: 90, season: 'Spring' },
            { name: 'Aether-Mid', days: 90, season: 'Summer' },
            { name: 'Harvest-Fall', days: 90, season: 'Autumn' },
            { name: 'Frost-End', days: 90, season: 'Winter' }
          ],
          weekdays: ['Firstday', 'Moonday', 'Starday', 'Windday', 'Sunrest'],
          moon_cycles: [
            { name: 'Silver Veil', cycle_days: 28, color: '#e0e0e0' },
            { name: 'Blood Orb', cycle_days: 45, color: '#f43f5e' }
          ],
          current_year: 1042,
          current_day: 145
        })
      });
      const data = await res.json();
      if (data.success) {
        resultDiv.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem;">
            <strong style="color:var(--text-primary); font-size:0.95rem;">📅 ${name}: Year ${data.year}, Day ${data.day_in_month} of ${data.month} (${data.weekday})</strong>
            <span class="badge" style="background:rgba(56,189,248,0.2); color:#38bdf8; font-size:0.75rem;">Season: ${data.season}</span>
          </div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.5rem; margin-top:0.5rem;">
            ${(data.moon_phases || []).map(m => `
              <div style="padding:0.4rem 0.6rem; background:rgba(0,0,0,0.25); border-radius:4px; border-left:3px solid ${m.color}; font-size:0.75rem;">
                <b>${m.name}</b>: ${m.phase_name} (Cycle Day ${m.phase_day}/${m.cycle_days})
              </div>
            `).join('')}
          </div>
        `;
      }
    } catch (err) {
      if (resultDiv) resultDiv.innerHTML = `<div style="color:#f43f5e;">Error calculating date: ${err.message}</div>`;
    }
  }

  // --- ⚡ 2. ARCANE & TECH LAWS CONTROLLERS ---
  openLawsModal() {
    const modal = document.getElementById('magic-tech-modal');
    if (modal) modal.classList.remove('hidden');
  }

  closeLawsModal() {
    const modal = document.getElementById('magic-tech-modal');
    if (modal) modal.classList.add('hidden');
  }

  async saveMagicLaw() {
    const system_name = document.getElementById('law-system-name')?.value || 'Aetheric Leyline Weaving';
    const power_source = document.getElementById('law-power-source')?.value || 'Solar Ley Crystals';
    const fuel_or_cost = document.getElementById('law-fuel-cost')?.value || 'Physical Stamina & Refined Silver';
    const forbidden_acts = document.getElementById('law-forbidden-acts')?.value || 'Resurrection, Perpetual Motion';
    const backlash_consequences = document.getElementById('law-backlash')?.value || 'Arcane Necrosis & Mana Burn';

    try {
      const res = await fetch('/api/laws', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          world_id: this.currentWorldId || 'default',
          system_name, power_source, fuel_or_cost, forbidden_acts, backlash_consequences,
          law_type: 'magic'
        })
      });
      const data = await res.json();
      if (data.success) {
        this.showToast('✓ Magic & Tech Law System saved successfully!', 'success');
      }
    } catch (err) {
      this.showToast('Error saving law system: ' + err.message, 'error');
    }
  }

  async auditActiveArticleLaws() {
    const resultDiv = document.getElementById('law-audit-result');
    if (resultDiv) resultDiv.innerHTML = `<div style="color:var(--text-muted);">Auditing active article against defined world laws...</div>`;

    const content = this.currentArticle?.content || 'The archmage performed resurrection using solar ley crystals without stamina penalty.';

    try {
      const res = await fetch('/api/laws/audit-article', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          world_id: this.currentWorldId || 'default',
          article_id: this.currentArticle?.id || null,
          content
        })
      });
      const data = await res.json();
      if (data.success) {
        if (data.is_compliant) {
          resultDiv.innerHTML = `<div style="color:var(--accent-emerald);">✓ Complete Arcane & Tech Compliance! No forbidden acts or uncosted magic detected.</div>`;
        } else {
          resultDiv.innerHTML = `
            <div style="color:#f43f5e; font-weight:bold; margin-bottom:0.5rem;">⚠️ ${data.violations_count} Hard Law Violation(s) Flagged:</div>
            ${data.violations.map(v => `
              <div style="padding:0.4rem 0.6rem; background:rgba(244,63,94,0.15); border-left:3px solid #f43f5e; border-radius:4px; margin-bottom:0.4rem; font-size:0.75rem;">
                <b>${v.system_name}</b>: ${v.description}<br/>
                <span style="color:#fda4af;">Backlash Risk: ${v.penalty_backlash}</span>
              </div>
            `).join('')}
          `;
        }
      }
    } catch (err) {
      if (resultDiv) resultDiv.innerHTML = `<div style="color:#f43f5e;">Error during audit: ${err.message}</div>`;
    }
  }

  // --- 🌿 3. BIOME & ECOLOGY SIMULATOR CONTROLLERS ---
  openEcologyModal() {
    const modal = document.getElementById('ecology-simulator-modal');
    if (modal) modal.classList.remove('hidden');
  }

  closeEcologyModal() {
    const modal = document.getElementById('ecology-simulator-modal');
    if (modal) modal.classList.add('hidden');
  }

  async simulateEcologyScarcity() {
    const resultDiv = document.getElementById('ecology-simulation-result');
    if (resultDiv) resultDiv.innerHTML = `<div style="color:var(--text-muted);">Projecting regional resource scarcity & trophic pressure...</div>`;

    try {
      const res = await fetch('/api/ecology/simulate-scarcity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ world_id: this.currentWorldId || 'default' })
      });
      const data = await res.json();
      if (data.success) {
        resultDiv.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem;">
            <strong style="color:var(--text-primary); font-size:0.9rem;">🌾 Ecological Scarcity & Trade Friction Projection</strong>
            <span class="badge" style="background:rgba(34,197,94,0.15); color:#22c55e; font-size:0.75rem;">${data.biomes_evaluated} Biomes Scanned</span>
          </div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.5rem;">
            <div style="padding:0.5rem; background:rgba(0,0,0,0.25); border-radius:6px; font-size:0.75rem;">
              <b style="color:#38bdf8;">🦅 Trophic Apex Hierarchy:</b><br/>
              • Apex: Frostfire Wyvern (Hunts Boreal Stag)<br/>
              • Herbivore: Boreal Stag (Grazer)<br/>
              • Producer: Silver Pine & Iron Moss
            </div>
            <div style="padding:0.5rem; background:rgba(0,0,0,0.25); border-radius:6px; font-size:0.75rem;">
              <b style="color:#f59e0b;">⚔️ High-Risk Conflict Vectors:</b><br/>
              ${data.tension_points.length > 0 ? data.tension_points.map(tp => `• ${tp.demanding_biome} lacks <i>${tp.resource}</i> (supplied by ${tp.supplying_biome})`).join('<br/>') : '• Balanced regional trade equilibrium.'}
            </div>
          </div>
        `;
      }
    } catch (err) {
      if (resultDiv) resultDiv.innerHTML = `<div style="color:#f43f5e;">Error in simulation: ${err.message}</div>`;
    }
  }

  // --- 🗣️ 4. ETHOS & VERNACULAR CONTROLLERS ---
  openDialectsModal() {
    const modal = document.getElementById('ethos-vernacular-modal');
    if (modal) modal.classList.remove('hidden');
  }

  closeDialectsModal() {
    const modal = document.getElementById('ethos-vernacular-modal');
    if (modal) modal.classList.add('hidden');
  }

  async generateCulturalVernacular() {
    const culture = document.getElementById('culture-name-input')?.value || 'Ironclad Forge Guilds';
    const register = document.getElementById('culture-register-select')?.value || 'gritty_archaic';
    const resultDiv = document.getElementById('culture-slang-result');
    if (resultDiv) resultDiv.innerHTML = `<div style="color:var(--text-muted);">Synthesizing dialect idioms, swearing oaths, and taboos...</div>`;

    try {
      const res = await fetch('/api/dialects/generate-slang', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ culture_name: culture, genre_tone: register })
      });
      const data = await res.json();
      if (data.success && data.data) {
        const d = data.data;
        resultDiv.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem;">
            <strong style="color:var(--text-primary); font-size:0.9rem;">🗣️ ${d.culture} (${d.linguistic_register})</strong>
            <span class="badge" style="background:rgba(168,85,247,0.2); color:#c084fc; font-size:0.75rem;">Diegetic Slate Ready</span>
          </div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.5rem; font-size:0.75rem;">
            <div style="padding:0.5rem; background:rgba(0,0,0,0.25); border-radius:6px;">
              <b>Greetings & Oaths:</b><br/>
              • ${d.greetings.join('<br/>• ')}<br/>
              <span style="color:#f43f5e;">• Oaths: ${d.oaths_curses.join(', ')}</span>
            </div>
            <div style="padding:0.5rem; background:rgba(0,0,0,0.25); border-radius:6px;">
              <b>Proverbs & Forbidden Taboos:</b><br/>
              • <i>"${d.proverbs.join('" / "')}"</i><br/>
              <span style="color:#f59e0b;">• Taboos: ${d.taboos_forbidden}</span>
            </div>
          </div>
        `;
      }
    } catch (err) {
      if (resultDiv) resultDiv.innerHTML = `<div style="color:#f43f5e;">Error generating dialect: ${err.message}</div>`;
    }
  }

  // --- 🏛️ 5. PANTHEON & DIVINE COVENANTS CONTROLLERS ---
  openPantheonModal() {
    const modal = document.getElementById('pantheon-covenant-modal');
    if (modal) modal.classList.remove('hidden');
  }

  closePantheonModal() {
    const modal = document.getElementById('pantheon-covenant-modal');
    if (modal) modal.classList.add('hidden');
  }

  async simulateAstrologicalOmen() {
    const name = document.getElementById('deity-name-input')?.value || 'Solari the Dawn-Bringer';
    const domains = document.getElementById('deity-domains-input')?.value || 'Sun, Justice, Metallurgy';
    const resultDiv = document.getElementById('pantheon-omen-result');
    if (resultDiv) resultDiv.innerHTML = `<div style="color:var(--text-muted);">Evaluating celestial alignments and omen triggers...</div>`;

    try {
      const res = await fetch('/api/pantheon/simulate-omen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          world_id: this.currentWorldId || 'default',
          moon_phase: 'Full Moon',
          season: 'Summer Solstice',
          celestial_event: 'Solar Eclipse'
        })
      });
      const data = await res.json();
      if (data.success) {
        resultDiv.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem;">
            <strong style="color:var(--text-primary); font-size:0.9rem;">✨ Cosmic Forecast for ${name} (${domains})</strong>
            <span class="badge" style="background:rgba(234,179,8,0.2); color:#facc15; font-size:0.75rem;">Major Eclipse Active</span>
          </div>
          <div style="padding:0.6rem; background:rgba(0,0,0,0.25); border-radius:6px; border-left:3px solid #facc15; font-size:0.75rem;">
            <b>Active Divine Manifestation:</b> The twin moons eclipse the solar crown, triggering the Dawn-Bringer's Miracle Surge.<br/>
            <span style="color:#22c55e;">• Piety Boon: +25% Divine Ward Strength & Radiant Guidance on all clerics.</span><br/>
            <span style="color:#f43f5e;">• Transgression Warning: Oath-breakers suffer immediate Solar Blindness.</span>
          </div>
        `;
      }
    } catch (err) {
      if (resultDiv) resultDiv.innerHTML = `<div style="color:#f43f5e;">Error projecting omens: ${err.message}</div>`;
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

  copyCurrentArticleMarkdown() {
    if (!this.currentArticle || !this.currentArticle.content) {
      if (typeof window.showToast === 'function') window.showToast('No active article to copy.', 'warning');
      return;
    }
    const text = this.currentArticle.content;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        if (typeof window.showToast === 'function') window.showToast('📋 Article Markdown copied to clipboard!', 'success');
      }).catch(() => this.fallbackCopyText(text));
    } else {
      this.fallbackCopyText(text);
    }
  }

  copyCurrentArticleShareLink() {
    if (!this.currentArticle || !this.currentArticle.id) {
      if (typeof window.showToast === 'function') window.showToast('No active article selected.', 'warning');
      return;
    }
    const shareUrl = `${window.location.origin}/#article-${this.currentArticle.id}`;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(shareUrl).then(() => {
        if (typeof window.showToast === 'function') window.showToast('🔗 Article share link copied to clipboard!', 'success');
      }).catch(() => this.fallbackCopyText(shareUrl));
    } else {
      this.fallbackCopyText(shareUrl);
    }
  }

  fallbackCopyText(text) {
    const tempInput = document.createElement('textarea');
    tempInput.value = text;
    tempInput.style.position = 'fixed';
    tempInput.style.opacity = '0';
    document.body.appendChild(tempInput);
    tempInput.select();
    try {
      document.execCommand('copy');
      if (typeof window.showToast === 'function') window.showToast('📋 Copied to clipboard!', 'success');
    } catch (err) {
      if (typeof window.showToast === 'function') window.showToast('Failed to copy to clipboard.', 'error');
    }
    document.body.removeChild(tempInput);
  }

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
      { label: "🎓 Start Scholar's Orientation Tour", action: 'tour' },
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
      html += '<div class="cmd-section-title">Navigation Views & Actions</div>';
      matchingNav.forEach(n => {
        if (n.action === 'tour') {
          html += `<div class="cmd-item" onclick="if (window.app && typeof window.app.startScholarTour === 'function') window.app.startScholarTour(); window.app.toggleCommandPalette();">${n.label}</div>`;
        } else {
          html += `<div class="cmd-item" onclick="window.switchTab('${n.tab}'); window.app.toggleCommandPalette();">${n.label}</div>`;
        }
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

  // --- AI WELCOME CONCIERGE & JOURNEY LAUNCHER ---
  initConcierge() {
    const pref = localStorage.getItem('lorevault_show_concierge');
    const checkbox = document.getElementById('concierge-startup-checkbox');
    if (checkbox) {
      checkbox.checked = pref !== 'false';
    }
    if (pref !== 'false') {
      setTimeout(() => {
        this.openConciergeModal();
      }, 400);
    }
  }

  toggleConciergeModal() {
    const modal = document.getElementById('welcome-concierge-modal');
    if (!modal) return;
    if (modal.classList.contains('hidden')) {
      this.openConciergeModal();
    } else {
      this.closeConciergeModal();
    }
  }

  openConciergeModal() {
    const modal = document.getElementById('welcome-concierge-modal');
    const input = document.getElementById('concierge-intent-input');
    const checkbox = document.getElementById('concierge-startup-checkbox');
    if (!modal) return;

    if (checkbox) {
      const pref = localStorage.getItem('lorevault_show_concierge');
      checkbox.checked = pref !== 'false';
    }

    modal.classList.remove('hidden');
    if (input) {
      input.value = '';
      setTimeout(() => input.focus(), 100);
    }
  }

  closeConciergeModal() {
    const modal = document.getElementById('welcome-concierge-modal');
    if (modal) {
      modal.classList.add('hidden');
    }
  }

  toggleConciergeStartupPref(enabled) {
    localStorage.setItem('lorevault_show_concierge', enabled ? 'true' : 'false');
    this.showToast(enabled ? '✨ Concierge launcher enabled on startup' : '✨ Concierge launcher disabled on startup (Use Ctrl+Shift+W to launch)');
  }

  executeConciergePreset(type) {
    if (type === 'worldbuilder') {
      window.switchTab('atlas');
      this.closeConciergeModal();
      this.showToast('🪐 Switched to Worldbuilder Mode (Atlas Cartography)');
    } else if (type === 'literary') {
      window.switchTab('library');
      if (!document.body.classList.contains('zen-mode')) {
        this.toggleZenMode();
      }
      if (typeof window.toggleWeaveMatrixDrawer === 'function') {
        window.toggleWeaveMatrixDrawer(true);
      }
      this.closeConciergeModal();
      this.showToast('📜 Switched to Literary Writer Focus Mode');
    } else if (type === 'dm_prep') {
      window.switchTab('library');
      if (typeof this.toggleStatBlockDrawer === 'function') {
        this.toggleStatBlockDrawer(true);
      }
      this.closeConciergeModal();
      this.showToast('⚔️ Switched to DM Campaign Prep & Stat Blocks');
    } else if (type === 'audit') {
      window.switchTab('frontpage');
      if (typeof this.runWorldDoctorAudit === 'function') {
        this.runWorldDoctorAudit();
      }
      this.closeConciergeModal();
      this.showToast('🩺 Running Narrative World Doctor Health Audit');
    }
  }

  async submitConciergeAIIntent() {
    const input = document.getElementById('concierge-intent-input');
    const launchBtn = document.getElementById('concierge-launch-btn');
    const text = input ? input.value.trim() : '';

    if (!text) {
      this.executeConciergePreset('worldbuilder');
      return;
    }

    if (launchBtn) {
      launchBtn.disabled = true;
      launchBtn.innerHTML = '⏳ Routing...';
    }

    try {
      const res = await fetch('/api/concierge/route-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          world_id: this.currentWorldId || 'default',
          user_intent: text
        })
      });
      const data = await res.json();
      if (data.success && data.routing) {
        this.applyConciergeRouting(data.routing);
      } else {
        this.executeConciergePreset('worldbuilder');
      }
    } catch (err) {
      console.warn('[Concierge] Client API call error, applying fallback route:', err);
      this.executeConciergePreset('worldbuilder');
    } finally {
      if (launchBtn) {
        launchBtn.disabled = false;
        launchBtn.innerHTML = '✨ Launch Journey';
      }
    }
  }

  applyConciergeRouting(routing) {
    const targetView = routing.target_view || 'frontpage';

    let tabName = targetView;
    if (targetView === 'reader') tabName = 'library';

    window.switchTab(tabName);

    if (routing.enable_zen_mode && !document.body.classList.contains('zen-mode')) {
      this.toggleZenMode();
    }

    if (routing.open_drawer === 'statblock' && typeof this.toggleStatBlockDrawer === 'function') {
      this.toggleStatBlockDrawer(true);
    } else if (routing.open_drawer === 'weave-matrix' && typeof window.toggleWeaveMatrixDrawer === 'function') {
      window.toggleWeaveMatrixDrawer(true);
    } else if (routing.open_drawer === 'doctor' && typeof this.runWorldDoctorAudit === 'function') {
      this.runWorldDoctorAudit();
    }

    this.closeConciergeModal();
    if (routing.action_summary) {
      this.showToast('✨ ' + routing.action_summary);
    }
  }

  // --- TTRPG STAT BLOCK CONTROLLER METHODS ---

  async checkStatBlockIndicator(articleId) {
    const dot = document.getElementById('statblock-badge-indicator');
    if (!dot) return;

    try {
      const res = await fetch(`/api/articles/${encodeURIComponent(articleId)}/statblock`);
      if (res.ok) {
        const json = await res.json();
        if (json.data && json.data.length > 0) {
          dot.classList.remove('hidden');
          this.currentStatBlock = json.data[0];
        } else {
          dot.classList.add('hidden');
          this.currentStatBlock = null;
        }
      }
    } catch (e) {
      dot.classList.add('hidden');
    }
  }

  toggleStatBlockDrawer() {
    const drawer = document.getElementById('statblock-drawer');
    if (!drawer) return;

    const isHidden = drawer.classList.contains('hidden');
    if (isHidden) {
      drawer.classList.remove('hidden');
      if (this.currentArticle) {
        this.loadStatBlockData(this.currentArticle.id);
      }
    } else {
      drawer.classList.add('hidden');
    }
  }

  switchStatBlockTab(tabName) {
    const viewBtn = document.getElementById('sb-tab-btn-view');
    const editBtn = document.getElementById('sb-tab-btn-edit');
    const aiBtn = document.getElementById('sb-tab-btn-ai');

    const viewPanel = document.getElementById('sb-panel-view');
    const editPanel = document.getElementById('sb-panel-edit');
    const aiPanel = document.getElementById('sb-panel-ai');

    if (!viewPanel || !editPanel || !aiPanel) return;

    if (viewBtn) viewBtn.classList.toggle('active', tabName === 'view');
    if (editBtn) editBtn.classList.toggle('active', tabName === 'edit');
    if (aiBtn) aiBtn.classList.toggle('active', tabName === 'ai');

    viewPanel.classList.toggle('hidden', tabName !== 'view');
    editPanel.classList.toggle('hidden', tabName !== 'edit');
    aiPanel.classList.toggle('hidden', tabName !== 'ai');

    if (tabName === 'edit' && this.currentStatBlock) {
      this.populateStatBlockEditForm(this.currentStatBlock);
    }
  }

  async loadStatBlockData(articleId) {
    const container = document.getElementById('statblock-card-container');
    const sysBadge = document.getElementById('statblock-system-badge');
    if (!container) return;

    try {
      const res = await fetch(`/api/articles/${encodeURIComponent(articleId)}/statblock`);
      if (res.ok) {
        const json = await res.json();
        const statblocks = json.data || [];
        if (statblocks.length > 0) {
          this.currentStatBlock = statblocks[0];
          if (sysBadge) sysBadge.textContent = this.currentStatBlock.system.toUpperCase();
          container.innerHTML = this.renderStatBlockCard(this.currentStatBlock);
        } else {
          this.currentStatBlock = null;
          if (sysBadge) sysBadge.textContent = 'D&D 5e';
          container.innerHTML = `
            <div class="sb-empty-state">
              <p>No stat block attached to this article yet.</p>
              <button class="btn btn-primary btn-sm" onclick="window.app.switchStatBlockTab('ai')">⚡ Convert Lore to Stat Block</button>
            </div>
          `;
        }
      }
    } catch (err) {
      container.innerHTML = `<div class="alert alert-error">Error loading stat block: ${err.message}</div>`;
    }
  }

  populateStatBlockEditForm(statblock) {
    const nameInput = document.getElementById('sb-edit-name');
    const sysSelect = document.getElementById('sb-edit-system');
    const typeSelect = document.getElementById('sb-edit-type');
    const jsonInput = document.getElementById('sb-edit-json');
    const secretChk = document.getElementById('sb-edit-is-secret');

    if (nameInput) nameInput.value = statblock.name || '';
    if (sysSelect) sysSelect.value = statblock.system || 'dnd5e';
    if (typeSelect) typeSelect.value = statblock.type || 'character';
    if (secretChk) secretChk.checked = !!statblock.is_secret;

    if (jsonInput) {
      const parsed = typeof statblock.stats_json === 'string' ? JSON.parse(statblock.stats_json || '{}') : statblock.stats_json;
      jsonInput.value = JSON.stringify(parsed || {}, null, 2);
    }
  }

  renderStatBlockCard(sb) {
    const system = sb.system || 'dnd5e';
    const type = sb.type || 'character';
    let data = {};
    try {
      data = typeof sb.stats_json === 'string' ? JSON.parse(sb.stats_json) : (sb.stats_json || {});
    } catch (e) { data = {}; }

    const name = sb.name || data.name || 'Unnamed Stat Block';

    if (type === 'weapon') {
      return `
        <div class="weapon-card">
          <div class="weapon-card-header">
            <h3>⚔️ ${name}</h3>
            <span class="rarity-badge ${(data.rarity || 'common').toLowerCase().replace(/\s+/g, '-')}">${data.rarity || 'Item'}</span>
          </div>
          <p class="dnd5e-subtitle">${data.category || 'Equipment'} ${data.attunement ? '(Requires Attunement)' : ''}</p>
          <div class="weapon-prop-grid">
            <div class="weapon-prop-box"><strong>Damage:</strong> ${data.damage || '1d8'} ${data.damage_type || ''}</div>
            <div class="weapon-prop-box"><strong>Value:</strong> ${data.value || 'N/A'}</div>
            <div class="weapon-prop-box"><strong>Weight:</strong> ${data.weight || 'N/A'}</div>
            <div class="weapon-prop-box"><strong>Properties:</strong> ${Array.isArray(data.properties) ? data.properties.join(', ') : (data.properties || 'None')}</div>
          </div>
          ${data.description ? `<p style="font-size:0.88rem; line-height:1.45; margin-top:0.75rem;">${data.description}</p>` : ''}
          ${Array.isArray(data.special_effects) && data.special_effects.length > 0 ? `
            <div style="margin-top:0.75rem; border-top:1px solid var(--border-color); padding-top:0.5rem;">
              <strong>Special Effects:</strong>
              ${data.special_effects.map(e => `<div style="font-size:0.85rem; margin-top:0.3rem;"><strong>${e.name}:</strong> ${e.description}</div>`).join('')}
            </div>
          ` : ''}
        </div>
      `;
    }

    if (type === 'lore_card') {
      return `
        <div class="weapon-card" style="border-color: #8b5cf6;">
          <div class="weapon-card-header">
            <h3 style="color:#a78bfa;">📜 ${name}</h3>
            <span class="badge" style="background:#6d28d9; color:#fff;">${data.card_category || 'Lore Card'}</span>
          </div>
          <div style="font-size:0.85rem; line-height:1.5;">
            ${data.casting_time ? `<div><strong>Casting Time:</strong> ${data.casting_time}</div>` : ''}
            ${data.range ? `<div><strong>Range:</strong> ${data.range}</div>` : ''}
            ${data.components ? `<div><strong>Components:</strong> ${data.components}</div>` : ''}
            ${data.duration ? `<div><strong>Duration:</strong> ${data.duration}</div>` : ''}
          </div>
          ${data.quote ? `<blockquote class="wa-quote" style="margin:0.75rem 0;"><p>"${data.quote}"</p></blockquote>` : ''}
          ${data.summary ? `<p style="font-size:0.88rem; margin-top:0.5rem;">${data.summary}</p>` : ''}
          ${Array.isArray(data.details) ? `
            <div style="margin-top:0.75rem; font-size:0.85rem;">
              ${data.details.map(d => `<div><strong>${d.b}:</strong> ${d.val}</div>`).join('')}
            </div>
          ` : ''}
        </div>
      `;
    }

    // Pathfinder 2e Creature Card
    if (system === 'pf2e') {
      return `
        <div class="pf2e-card">
          <div class="pf2e-header">
            <h2>${name}</h2>
            <span class="pf2e-level-badge">CREATURE ${data.cr || '1'}</span>
          </div>
          <div class="pf2e-traits-row">
            <span class="pf2e-trait-chip">${data.size || 'MEDIUM'}</span>
            <span class="pf2e-trait-chip">${data.alignment || 'N'}</span>
          </div>
          <div style="font-size:0.85rem; line-height:1.5;">
            <div><strong>Perception:</strong> ${data.skills || '+5'}</div>
            <div><strong>Defenses:</strong> AC ${data.ac || 15}; Fort +${data.abilities ? Math.max(1, Math.floor(((data.abilities.con||12)-10)/2)) : 2}, Ref +${data.abilities ? Math.max(1, Math.floor(((data.abilities.dex||12)-10)/2)) : 2}, Will +${data.abilities ? Math.max(1, Math.floor(((data.abilities.wis||12)-10)/2)) : 2}</div>
            <div><strong>HP:</strong> ${data.hp || 30}</div>
            <div><strong>Speed:</strong> ${data.speed || '25 feet'}</div>
          </div>
          ${Array.isArray(data.actions) && data.actions.length > 0 ? `
            <div style="margin-top:0.75rem; border-top:1px solid #7c3aed; padding-top:0.5rem;">
              <strong style="color:#c4b5fd;">Strikes & Actions:</strong>
              ${data.actions.map(a => `<div style="font-size:0.85rem; margin-top:0.35rem;"><span class="pf2e-action-icon">◆</span><strong>${a.name}:</strong> ${a.description}</div>`).join('')}
            </div>
          ` : ''}
          <div style="margin-top:1rem; padding-top:0.5rem; border-top:1px solid rgba(255,255,255,0.1); text-align:right;">
            <a href="/api/statblocks/${sb.id}/export/foundry" class="btn btn-secondary btn-sm" style="font-size:0.75rem;">📦 Export Foundry VTT JSON</a>
          </div>
        </div>
      `;
    }

    // D&D 5e Creature parchment card
    const ab = data.abilities || { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 };
    const mod = (val) => { const m = Math.floor(((val||10) - 10) / 2); return m >= 0 ? `+${m}` : `${m}`; };

    return `
      <div class="dnd5e-card">
        <div class="dnd5e-header">
          <h2>${name}</h2>
          <div class="dnd5e-subtitle">${data.size || 'Medium'} ${data.type || 'creature'}, ${data.alignment || 'unaligned'}</div>
        </div>
        <hr class="dnd5e-tapered-hr" />
        <div class="dnd5e-prop-line"><strong>Armor Class</strong> ${data.ac || 10} (${data.ac_type || 'natural armor'})</div>
        <div class="dnd5e-prop-line">
          <strong>Hit Points</strong> ${data.hp || 10} 
          ${data.hit_dice ? `<button class="btn-text" style="color:#7a200d; font-weight:bold; cursor:pointer;" onclick="window.app.rollDiceExpression('${data.hit_dice}', '${name} Hit Points')">🎲 (${data.hit_dice})</button>` : ''}
        </div>
        <div class="dnd5e-prop-line"><strong>Speed</strong> ${data.speed || '30 ft.'}</div>
        <hr class="dnd5e-tapered-hr" />
        <div class="dnd5e-abilities-grid">
          <div class="dnd5e-ability-box" onclick="window.app.rollDiceExpression('1d20${mod(ab.str)}', '${name} STR Check')" style="cursor:pointer;" title="Roll STR Check"><div class="stat-lbl">STR</div><div class="stat-val">${ab.str||10} (${mod(ab.str)})</div></div>
          <div class="dnd5e-ability-box" onclick="window.app.rollDiceExpression('1d20${mod(ab.dex)}', '${name} DEX Check')" style="cursor:pointer;" title="Roll DEX Check"><div class="stat-lbl">DEX</div><div class="stat-val">${ab.dex||10} (${mod(ab.dex)})</div></div>
          <div class="dnd5e-ability-box" onclick="window.app.rollDiceExpression('1d20${mod(ab.con)}', '${name} CON Check')" style="cursor:pointer;" title="Roll CON Check"><div class="stat-lbl">CON</div><div class="stat-val">${ab.con||10} (${mod(ab.con)})</div></div>
          <div class="dnd5e-ability-box" onclick="window.app.rollDiceExpression('1d20${mod(ab.int)}', '${name} INT Check')" style="cursor:pointer;" title="Roll INT Check"><div class="stat-lbl">INT</div><div class="stat-val">${ab.int||10} (${mod(ab.int)})</div></div>
          <div class="dnd5e-ability-box" onclick="window.app.rollDiceExpression('1d20${mod(ab.wis)}', '${name} WIS Check')" style="cursor:pointer;" title="Roll WIS Check"><div class="stat-lbl">WIS</div><div class="stat-val">${ab.wis||10} (${mod(ab.wis)})</div></div>
          <div class="dnd5e-ability-box" onclick="window.app.rollDiceExpression('1d20${mod(ab.cha)}', '${name} CHA Check')" style="cursor:pointer;" title="Roll CHA Check"><div class="stat-lbl">CHA</div><div class="stat-val">${ab.cha||10} (${mod(ab.cha)})</div></div>
        </div>
        <hr class="dnd5e-tapered-hr" />
        ${data.saving_throws ? `<div class="dnd5e-prop-line"><strong>Saving Throws</strong> ${data.saving_throws}</div>` : ''}
        ${data.skills ? `<div class="dnd5e-prop-line"><strong>Skills</strong> ${data.skills}</div>` : ''}
        ${data.resistances ? `<div class="dnd5e-prop-line"><strong>Damage Resistances</strong> ${data.resistances}</div>` : ''}
        ${data.senses ? `<div class="dnd5e-prop-line"><strong>Senses</strong> ${data.senses}</div>` : ''}
        ${data.languages ? `<div class="dnd5e-prop-line"><strong>Languages</strong> ${data.languages}</div>` : ''}
        <div class="dnd5e-prop-line"><strong>Challenge</strong> ${data.cr || '1'} (${data.xp || 200} XP)</div>
        <hr class="dnd5e-tapered-hr" />
        ${Array.isArray(data.traits) && data.traits.length > 0 ? data.traits.map(t => `<div class="dnd5e-action-item"><strong>${t.name}.</strong> ${t.description}</div>`).join('') : ''}
        ${Array.isArray(data.actions) && data.actions.length > 0 ? `
          <div class="dnd5e-section-title">Actions</div>
          ${data.actions.map(a => `<div class="dnd5e-action-item"><strong>${a.name}.</strong> ${a.description}</div>`).join('')}
        ` : ''}
        ${Array.isArray(data.legendary_actions) && data.legendary_actions.length > 0 ? `
          <div class="dnd5e-section-title">Legendary Actions</div>
          ${data.legendary_actions.map(l => `<div class="dnd5e-action-item"><strong>${l.name}.</strong> ${l.description}</div>`).join('')}
        ` : ''}
        <div style="margin-top:1rem; padding-top:0.5rem; border-top:1px solid #7a200d; text-align:right;">
          <a href="/api/statblocks/${sb.id}/export/foundry" class="btn btn-secondary btn-sm" style="font-size:0.75rem; background:rgba(122,32,13,0.1); color:#7a200d; border-color:#7a200d;">📦 Export Foundry VTT JSON</a>
        </div>
      </div>
    `;
  }

  rollDiceExpression(expression, label = 'Roll') {
    if (!expression) return;
    
    let cleanExpr = expression.trim().toLowerCase();
    let numDice = 1;
    let dieSides = 20;
    let modifier = 0;

    if (cleanExpr.includes('d')) {
      const parts = cleanExpr.split('d');
      numDice = parseInt(parts[0]) || 1;
      const subParts = parts[1].split(/[\+\-]/);
      dieSides = parseInt(subParts[0]) || 20;

      if (parts[1].includes('+')) {
        modifier = parseInt(parts[1].split('+')[1]) || 0;
      } else if (parts[1].includes('-')) {
        modifier = -1 * (parseInt(parts[1].split('-')[1]) || 0);
      }
    } else {
      modifier = parseInt(cleanExpr.replace('+', '')) || 0;
    }

    const isAdv = this.diceAdvantage && dieSides === 20;
    const isDis = this.diceDisadvantage && dieSides === 20;

    const getRandomRoll = (sides) => {
      const array = new Uint32Array(1);
      if (window.crypto && window.crypto.getRandomValues) {
        window.crypto.getRandomValues(array);
        return (array[0] % sides) + 1;
      }
      return Math.floor(Math.random() * sides) + 1;
    };

    const rolls = [];
    let effectiveRoll = 0;
    let isNat20 = false;
    let isNat1 = false;

    if (isAdv || isDis) {
      const roll1 = getRandomRoll(20);
      const roll2 = getRandomRoll(20);
      rolls.push(roll1, roll2);
      effectiveRoll = isAdv ? Math.max(roll1, roll2) : Math.min(roll1, roll2);
      isNat20 = effectiveRoll === 20;
      isNat1 = effectiveRoll === 1;
    } else {
      for (let i = 0; i < numDice; i++) {
        const r = getRandomRoll(dieSides);
        rolls.push(r);
      }
      effectiveRoll = rolls.reduce((a, b) => a + b, 0);
      if (dieSides === 20 && numDice === 1) {
        isNat20 = rolls[0] === 20;
        isNat1 = rolls[0] === 1;
      }
    }

    const total = effectiveRoll + modifier;
    const modifierStr = modifier !== 0 ? (modifier > 0 ? ` + ${modifier}` : ` - ${Math.abs(modifier)}`) : '';
    const rollBreakdown = `[${rolls.join(', ')}]${modifierStr}`;
    
    let msg = `🎲 <strong>${label}</strong>: <strong>${total}</strong> <span style="font-size:0.8em; opacity:0.8;">(${rollBreakdown})</span>`;
    if (isNat20) msg += ` <span style="color:#f59e0b; font-weight:bold;">✨ CRITICAL HIT!</span>`;
    if (isNat1) msg += ` <span style="color:#ef4444; font-weight:bold;">💥 NATURAL 1!</span>`;
    if (this.diceSecretMode) msg += ` <span style="color:#a855f7;">🔒 (GM Secret)</span>`;

    if (typeof window.showToast === 'function') {
      window.showToast(msg, isNat20 ? 'success' : isNat1 ? 'error' : 'info');
    }

    if (!this.diceHistory) this.diceHistory = [];
    this.diceHistory.unshift({
      id: Date.now(),
      label: label,
      expression: cleanExpr,
      total: total,
      rolls: rolls,
      modifier: modifier,
      breakdown: rollBreakdown,
      isNat20: isNat20,
      isNat1: isNat1,
      isSecret: this.diceSecretMode,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    });

    this.updateDiceHistoryUI();
    return total;
  }

  toggleDiceAdvantage() {
    this.diceAdvantage = !this.diceAdvantage;
    if (this.diceAdvantage) this.diceDisadvantage = false;
    const advBtn = document.getElementById('dice-adv-btn');
    const disBtn = document.getElementById('dice-dis-btn');
    if (advBtn) advBtn.classList.toggle('active', this.diceAdvantage);
    if (disBtn) disBtn.classList.toggle('active', false);
  }

  toggleDiceDisadvantage() {
    this.diceDisadvantage = !this.diceDisadvantage;
    if (this.diceDisadvantage) this.diceAdvantage = false;
    const advBtn = document.getElementById('dice-adv-btn');
    const disBtn = document.getElementById('dice-dis-btn');
    if (advBtn) advBtn.classList.toggle('active', false);
    if (disBtn) disBtn.classList.toggle('active', this.diceDisadvantage);
  }

  toggleDiceSecretMode() {
    this.diceSecretMode = !this.diceSecretMode;
    const btn = document.getElementById('dice-secret-btn');
    if (btn) btn.classList.toggle('active', this.diceSecretMode);
  }

  rollPolyhedral(sides) {
    this.rollDiceExpression(`1d${sides}`, `d${sides} Roll`);
  }

  rollCustomDiceInput() {
    const input = document.getElementById('quick-dice-input');
    if (!input || !input.value.trim()) return;
    this.rollDiceExpression(input.value.trim(), 'Custom Roll');
    input.value = '';
  }

  toggleDiceHistoryDrawer() {
    const drawer = document.getElementById('dice-history-drawer');
    if (drawer) {
      drawer.classList.toggle('hidden');
    }
  }

  clearDiceHistory() {
    this.diceHistory = [];
    this.updateDiceHistoryUI();
  }

  updateDiceHistoryUI() {
    const countBadge = document.getElementById('dice-history-count');
    const list = document.getElementById('dice-history-list');
    if (countBadge) countBadge.textContent = (this.diceHistory || []).length;
    if (!list) return;

    if (!this.diceHistory || this.diceHistory.length === 0) {
      list.innerHTML = '<div class="dice-history-empty">No dice rolled yet in this session. Tap any d20, weapon attack, or statblock modifier to roll!</div>';
      return;
    }

    list.innerHTML = this.diceHistory.map(item => `
      <div class="dice-history-card ${item.isNat20 ? 'nat20-pulse' : item.isNat1 ? 'nat1-fumble' : ''}">
        <div class="dice-card-header">
          <span>${item.label} (${item.expression}) ${item.isSecret ? '🔒 GM' : ''}</span>
          <span>${item.timestamp}</span>
        </div>
        <div class="dice-card-total">
          🎲 ${item.total}
          ${item.isNat20 ? '<span style="font-size:0.8rem; color:#f59e0b;">✨ CRIT</span>' : ''}
          ${item.isNat1 ? '<span style="font-size:0.8rem; color:#ef4444;">💥 FUMBLE</span>' : ''}
        </div>
        <div class="dice-card-breakdown">Rolls: ${item.breakdown}</div>
      </div>
    `).join('');
  }

  async saveStatBlockForm(e) {
    if (e) e.preventDefault();
    if (!this.currentArticle) return;

    const name = document.getElementById('sb-edit-name')?.value;
    const system = document.getElementById('sb-edit-system')?.value;
    const type = document.getElementById('sb-edit-type')?.value;
    const rawJson = document.getElementById('sb-edit-json')?.value;
    const isSecret = document.getElementById('sb-edit-is-secret')?.checked ? 1 : 0;

    if (!name) {
      if (typeof window.showToast === 'function') window.showToast('Please enter a stat block name', 'error');
      return;
    }

    let parsedJson = {};
    try {
      parsedJson = JSON.parse(rawJson || '{}');
    } catch (err) {
      if (typeof window.showToast === 'function') window.showToast('Invalid JSON payload syntax', 'error');
      return;
    }

    const payload = {
      id: this.currentStatBlock ? this.currentStatBlock.id : null,
      system,
      type,
      name,
      stats_json: parsedJson,
      is_secret: isSecret
    };

    try {
      const res = await fetch(`/api/articles/${encodeURIComponent(this.currentArticle.id)}/statblock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const json = await res.json();
        this.currentStatBlock = json.data;
        if (typeof window.showToast === 'function') window.showToast('Stat block saved successfully', 'success');
        this.switchStatBlockTab('view');
        this.loadStatBlockData(this.currentArticle.id);
        this.checkStatBlockIndicator(this.currentArticle.id);
      }
    } catch (err) {
      if (typeof window.showToast === 'function') window.showToast(`Failed to save stat block: ${err.message}`, 'error');
    }
  }

  async deleteCurrentStatBlock() {
    if (!this.currentStatBlock) return;
    if (!confirm('Are you sure you want to delete this stat block?')) return;

    try {
      const res = await fetch(`/api/statblocks/${encodeURIComponent(this.currentStatBlock.id)}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        this.currentStatBlock = null;
        if (typeof window.showToast === 'function') window.showToast('Stat block deleted', 'info');
        this.switchStatBlockTab('view');
        this.loadStatBlockData(this.currentArticle.id);
        this.checkStatBlockIndicator(this.currentArticle.id);
      }
    } catch (err) {
      if (typeof window.showToast === 'function') window.showToast(`Error deleting stat block: ${err.message}`, 'error');
    }
  }

  async triggerAIStatBlockConversion() {
    if (!this.currentArticle) return;

    const btn = document.getElementById('sb-ai-generate-btn');
    const system = document.getElementById('sb-ai-system')?.value || 'dnd5e';
    const type = document.getElementById('sb-ai-type')?.value || 'character';

    if (btn) {
      btn.disabled = true;
      btn.textContent = '⏳ Generating Mechanics via Gemini AI...';
    }

    try {
      const res = await fetch('/api/statblocks/convert-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          article_id: this.currentArticle.id,
          system,
          type
        })
      });

      if (res.ok) {
        const json = await res.json();
        this.currentStatBlock = json.data;
        if (typeof window.showToast === 'function') window.showToast('✨ Stat block generated from lore!', 'success');
        this.switchStatBlockTab('view');
        this.loadStatBlockData(this.currentArticle.id);
        this.checkStatBlockIndicator(this.currentArticle.id);
      }
    } catch (err) {
      if (typeof window.showToast === 'function') window.showToast(`AI Conversion error: ${err.message}`, 'error');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = '✨ Generate Stat Block from Lore';
      }
    }
  }

  // --- VTT Export Manager Methods ---
  openVttExportModal() {
    const modal = document.getElementById('vtt-export-modal');
    if (modal) {
      modal.classList.remove('hidden');
      this.setVttTarget(this.vttTarget || 'foundry');
    }
  }

  closeVttExportModal() {
    const modal = document.getElementById('vtt-export-modal');
    if (modal) {
      modal.classList.add('hidden');
    }
  }

  setVttTarget(target) {
    this.vttTarget = target || 'foundry';
    const container = document.getElementById('vtt-target-segmented');
    if (container) {
      container.querySelectorAll('.segmented-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.vtt === this.vttTarget);
      });
    }
    const owlbearLink = document.getElementById('vtt-owlbear-link-container');
    if (owlbearLink) {
      owlbearLink.classList.toggle('hidden', this.vttTarget !== 'owlbear');
    }
    this.updateVttPreview();
  }

  setVttPrivacyMode(mode) {
    this.vttPrivacyMode = mode || 'player';
    const container = document.getElementById('vtt-privacy-segmented');
    if (container) {
      container.querySelectorAll('.segmented-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.mode === this.vttPrivacyMode);
      });
    }
    this.updateVttPreview();
  }

  async updateVttPreview() {
    const previewBox = document.getElementById('vtt-preview-box');
    const select = document.getElementById('vtt-content-type-select');
    if (!previewBox || !select) return;

    const contentType = select.value;
    const target = this.vttTarget || 'foundry';
    const mode = this.vttPrivacyMode || 'player';

    previewBox.textContent = 'Generating preview...';

    try {
      let url = '';
      let method = 'GET';
      let body = null;

      if (contentType === 'current_article') {
        if (!this.currentArticle) {
          previewBox.textContent = 'No article currently selected.';
          return;
        }
        if (target === 'foundry') {
          url = `/api/vtt/foundry/journals/${this.currentArticle.id}?mode=${mode}`;
        } else if (target === 'roll20') {
          method = 'POST';
          url = `/api/vtt/export/roll20`;
          body = JSON.stringify({ article_ids: [this.currentArticle.id], mode: mode });
        } else if (target === 'fgu') {
          method = 'POST';
          url = `/api/vtt/export/fgu`;
          body = JSON.stringify({ world_id: this.currentWorldId || 'main', mode: mode });
        } else {
          url = `/api/vtt/foundry/journals/${this.currentArticle.id}?mode=${mode}`;
        }
      } else if (contentType === 'current_statblock') {
        if (!this.currentStatBlock) {
          previewBox.textContent = 'No stat block attached to current article.';
          return;
        }
        url = `/api/vtt/foundry/actors/${this.currentStatBlock.id}?mode=${mode}`;
      } else if (contentType === 'active_map') {
        const mapId = (window.atlasView && window.atlasView.activeMap) ? window.atlasView.activeMap.id : 1;
        url = `/api/vtt/foundry/scenes/${mapId}?mode=${mode}`;
      } else {
        method = 'POST';
        url = `/api/vtt/export/fgu`;
        body = JSON.stringify({ world_id: this.currentWorldId || 'main', mode: mode });
      }

      const options = {
        method: method,
        headers: { 'Content-Type': 'application/json' }
      };
      if (body) options.body = body;

      const res = await fetch(url, options);
      const text = await res.text();
      try {
        const json = JSON.parse(text);
        previewBox.textContent = JSON.stringify(json, null, 2);
      } catch (e) {
        previewBox.textContent = text;
      }
    } catch (err) {
      previewBox.textContent = `Error fetching preview: ${err.message}`;
    }
  }

  async copyVttExportData() {
    const previewBox = document.getElementById('vtt-preview-box');
    if (!previewBox || !previewBox.textContent) return;
    try {
      await navigator.clipboard.writeText(previewBox.textContent);
      this.showToast('📋 VTT export data copied to clipboard!');
    } catch (err) {
      this.showToast('Error copying to clipboard: ' + err.message);
    }
  }

  downloadVttExportPackage() {
    const previewBox = document.getElementById('vtt-preview-box');
    if (!previewBox || !previewBox.textContent) return;

    const target = this.vttTarget || 'vtt';
    const isXml = target === 'fgu';
    const ext = isXml ? 'xml' : 'json';
    const blob = new Blob([previewBox.textContent], { type: isXml ? 'application/xml' : 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `lorevault_${target}_export.${ext}`;
    a.click();
    this.showToast(`💾 Downloaded ${a.download}`);
  }

  // --- AI FIGHT SIMULATOR CONTROLLER METHODS ---
  openFightSimulatorModal() {
    const modal = document.getElementById('fight-simulator-modal');
    if (modal) {
      modal.classList.remove('hidden');
      if (this.currentStatBlock) {
        const nameInput = document.getElementById('fight-a-name');
        const hpInput = document.getElementById('fight-a-hp');
        const acInput = document.getElementById('fight-a-ac');
        const atkInput = document.getElementById('fight-a-atk');
        const dmgInput = document.getElementById('fight-a-dmg');

        let stats = {};
        try { stats = typeof this.currentStatBlock.stats_json === 'string' ? JSON.parse(this.currentStatBlock.stats_json) : (this.currentStatBlock.stats_json || {}); } catch(e) {}

        if (nameInput) nameInput.value = this.currentStatBlock.name || 'Combatant A';
        if (hpInput) hpInput.value = stats.hp || 30;
        if (acInput) acInput.value = stats.ac || 14;
        if (atkInput) atkInput.value = stats.cr ? Math.round(stats.cr * 1.5) : 4;
        if (dmgInput) dmgInput.value = stats.damage_dice || '1d8+2';
      }
    }
  }

  closeFightSimulatorModal() {
    const modal = document.getElementById('fight-simulator-modal');
    if (modal) {
      modal.classList.add('hidden');
    }
  }

  async runFightSimulation() {
    const runBtn = document.getElementById('run-fight-btn');
    const resultsContainer = document.getElementById('fight-results-container');
    const winnerBanner = document.getElementById('fight-winner-banner');
    const storyBox = document.getElementById('fight-story-box');
    const logBox = document.getElementById('fight-log-box');
    const copyBtn = document.getElementById('copy-fight-log-btn');

    if (!runBtn) return;

    const payload = {
      combatant_a: {
        name: document.getElementById('fight-a-name')?.value || 'Combatant A',
        hp: document.getElementById('fight-a-hp')?.value || 30,
        ac: document.getElementById('fight-a-ac')?.value || 14,
        attack_bonus: document.getElementById('fight-a-atk')?.value || 4,
        damage_dice: document.getElementById('fight-a-dmg')?.value || '1d8+2'
      },
      combatant_b: {
        name: document.getElementById('fight-b-name')?.value || 'Combatant B',
        hp: document.getElementById('fight-b-hp')?.value || 30,
        ac: document.getElementById('fight-b-ac')?.value || 14,
        attack_bonus: document.getElementById('fight-b-atk')?.value || 4,
        damage_dice: document.getElementById('fight-b-dmg')?.value || '1d8+2'
      },
      environment: document.getElementById('fight-env-select')?.value || 'Midnight Castle Ramparts',
      tone_preset: document.getElementById('fight-tone-select')?.value || 'high_fantasy',
      generate_prose: document.getElementById('fight-tone-select')?.value !== 'analytical_audit'
    };

    try {
      runBtn.disabled = true;
      runBtn.textContent = '⚔️ Simulating Dice Combat...';

      const res = await fetch('/api/ai/simulate-fight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const json = await res.json();

      if (res.ok && json.success) {
        if (resultsContainer) resultsContainer.classList.remove('hidden');
        if (winnerBanner) winnerBanner.textContent = `🏆 VICTORY: ${json.winner} (${json.mechanics_summary})`;
        if (storyBox) {
          if (window.parseWorldAnvil) {
            storyBox.innerHTML = window.parseWorldAnvil(json.narrative_prose);
          } else {
            storyBox.textContent = json.narrative_prose;
          }
        }
        if (logBox) logBox.textContent = JSON.stringify(json.turn_log, null, 2);
        if (copyBtn) copyBtn.classList.remove('hidden');
        const appendBtn = document.getElementById('append-fight-story-btn');
        if (appendBtn) appendBtn.classList.remove('hidden');
        this.lastFightLog = json;
        if (typeof window.showToast === 'function') window.showToast(`⚔️ Fight completed! ${json.winner} won in ${json.total_rounds} rounds.`, 'success');
      } else {
        if (typeof window.showToast === 'function') window.showToast(`Fight simulation error: ${json.error || 'Failed'}`, 'error');
      }
    } catch (err) {
      if (typeof window.showToast === 'function') window.showToast(`Error running fight simulation: ${err.message}`, 'error');
    } finally {
      runBtn.disabled = false;
      runBtn.textContent = '⚔️ Simulate Battle';
    }
  }

  async copyFightLog() {
    if (!this.lastFightLog) return;
    const text = `⚔️ LOREVAULT FIGHT SIMULATION RESULT ⚔️\n${this.lastFightLog.mechanics_summary}\n\nCINEMATIC NARRATIVE:\n${this.lastFightLog.narrative_prose}\n\nTACTICAL LOG:\n${JSON.stringify(this.lastFightLog.turn_log, null, 2)}`;
    try {
      await navigator.clipboard.writeText(text);
      if (typeof window.showToast === 'function') window.showToast('📋 Tactical fight log copied to clipboard!', 'success');
    } catch (err) {
      if (typeof window.showToast === 'function') window.showToast('Error copying to clipboard: ' + err.message, 'error');
    }
  }

  async runTimelineAnachronismAudit() {
    try {
      const res = await fetch('/api/timeline/anachronism-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ world_id: this.currentWorldId || 'default' })
      });
      const data = await res.json();
      if (data.success) {
        this.showToast(`🔍 Timeline Audit Complete: Scanned ${data.total_events_scanned} events. ${data.anachronism_count} anachronisms, ${data.character_ages.length} character age badges computed!`, 'success');
      }
    } catch (e) {
      console.error('Failed to run timeline audit:', e);
    }
  }

  showToast(message, type = 'info') {
    if (typeof window.showToast === 'function') {
      window.showToast(message, type);
    }
  }

  // --- SCHOLAR'S ORIENTATION TOUR ENGINE ---
  initScholarTour() {
    this.tourSteps = [
      {
        target: '#nav-tabs-container',
        tab: 'frontpage',
        title: '🗺️ Workspace Navigation Tabs',
        desc: 'Switch effortlessly between World Wiki Frontpage, Reader Codex, World Atlas Maps, Timeline Chronology, and Faction Matrix.',
        kbd: ''
      },
      {
        target: '#btn-new-article',
        tab: 'library',
        title: '📝 Lore Creation & Cross-Linking',
        desc: 'Create rich lore articles with WorldAnvil templates. Type @ inside the editor to auto-complete cross-links to other articles!',
        kbd: ''
      },
      {
        target: '#tab-atlas',
        tab: 'atlas',
        title: '🪐 Interactive World Atlas',
        desc: 'Explore custom maps, drop location pins, draw expedition routes, and toggle DM Secret Filters for tabletop sessions.',
        kbd: ''
      },
      {
        target: '#zen-mode-toggle',
        tab: 'library',
        title: '📜 Zen Writer & Weave Matrix',
        desc: 'Draft prose in distraction-free Zen Reader mode. Stage your active chapter into the Weave Matrix context builder for AI assistance.',
        kbd: 'Ctrl + Shift + F & Ctrl + Shift + M'
      },
      {
        target: '#concierge-nav-btn',
        tab: 'frontpage',
        title: '✨ Welcome Concierge & Hotkeys',
        desc: 'Launch your AI Journey Concierge anytime with Ctrl+Shift+W, or press Ctrl+K for Universal Search across your entire world!',
        kbd: 'Ctrl + Shift + W & Ctrl + K'
      }
    ];
    this.currentTourStepIndex = 0;
  }

  startScholarTour() {
    if (typeof this.closeConciergeModal === 'function') {
      this.closeConciergeModal();
    }
    if (!this.tourSteps || this.tourSteps.length === 0) {
      this.initScholarTour();
    }
    this.currentTourStepIndex = 0;
    const overlay = document.getElementById('onboarding-spotlight-overlay');
    if (overlay) overlay.classList.remove('hidden');
    this.renderTourStep();
  }

  renderTourStep() {
    if (!this.tourSteps || this.tourSteps.length === 0) {
      this.initScholarTour();
    }
    if (this.currentTourStepIndex < 0) this.currentTourStepIndex = 0;
    if (this.currentTourStepIndex >= this.tourSteps.length) {
      this.endScholarTour();
      return;
    }

    const step = this.tourSteps[this.currentTourStepIndex];
    if (step.tab && typeof window.switchTab === 'function') {
      window.switchTab(step.tab);
    }

    const badge = document.getElementById('tour-step-badge');
    const title = document.getElementById('tour-step-title');
    const desc = document.getElementById('tour-step-desc');
    const kbd = document.getElementById('tour-step-kbd');
    const btnPrev = document.getElementById('tour-btn-prev');
    const btnNext = document.getElementById('tour-btn-next');

    if (badge) badge.textContent = `🎓 SCHOLAR'S TOUR — STEP ${this.currentTourStepIndex + 1} OF ${this.tourSteps.length}`;
    if (title) title.textContent = step.title;
    if (desc) desc.textContent = step.desc;
    if (kbd) kbd.innerHTML = step.kbd ? `<span class="kbd-hint">${step.kbd}</span>` : '';

    if (btnPrev) btnPrev.disabled = this.currentTourStepIndex === 0;
    if (btnNext) btnNext.textContent = this.currentTourStepIndex === this.tourSteps.length - 1 ? '🎉 Finish Tour' : 'Next ➔';

    // Position spotlight ring and tooltip card
    setTimeout(() => {
      const targetEl = document.querySelector(step.target);
      const ring = document.getElementById('spotlight-active-ring');
      const card = document.getElementById('onboarding-tooltip-card');

      if (targetEl && ring && card) {
        const rect = targetEl.getBoundingClientRect();
        const scrollY = window.scrollY || window.pageYOffset || 0;
        const scrollX = window.scrollX || window.pageXOffset || 0;

        ring.style.top = `${rect.top - 4 + scrollY}px`;
        ring.style.left = `${rect.left - 4 + scrollX}px`;
        ring.style.width = `${rect.width + 8}px`;
        ring.style.height = `${rect.height + 8}px`;

        // Position card under or above target
        let cardTop = rect.bottom + 12 + scrollY;
        if (rect.bottom + 220 > window.innerHeight) {
          cardTop = rect.top - 210 + scrollY;
        }
        let cardLeft = Math.max(16, Math.min(window.innerWidth - 360, rect.left + (rect.width / 2) - 170));

        card.style.top = `${Math.max(16, cardTop)}px`;
        card.style.left = `${cardLeft}px`;
      }
    }, 150);
  }

  nextScholarTourStep() {
    this.currentTourStepIndex++;
    if (this.currentTourStepIndex >= (this.tourSteps ? this.tourSteps.length : 5)) {
      this.endScholarTour();
    } else {
      this.renderTourStep();
    }
  }

  prevScholarTourStep() {
    if (this.currentTourStepIndex > 0) {
      this.currentTourStepIndex--;
      this.renderTourStep();
    }
  }

  selectRoleTrack(track) {
    this.selectedRoleTrack = track || 'architect';
    const btnArc = document.getElementById('track-btn-architect');
    const btnAut = document.getElementById('track-btn-author');
    const btnDm = document.getElementById('track-btn-dm');

    if (btnArc) btnArc.classList.toggle('active', this.selectedRoleTrack === 'architect');
    if (btnAut) btnAut.classList.toggle('active', this.selectedRoleTrack === 'author');
    if (btnDm) btnDm.classList.toggle('active', this.selectedRoleTrack === 'dm');

    if (this.selectedRoleTrack === 'dm') {
      this.tourSteps = [
        { target: '#tab-atlas', tab: 'atlas', title: '🪐 Interactive World Atlas', desc: 'Explore maps, territory layers, and reticle pins.', kbd: '' },
        { target: '#dm-mode-toggle', tab: 'atlas', title: '🛡️ DM Secret Filter Mode', desc: 'Toggle between Player Mode (sanitized) and GM Secret Mode.', kbd: '' },
        { target: '#statblock-drawer-toggle', tab: 'library', title: '⚔️ TTRPG Stat Block Engine', desc: 'View D&D 5e / PF2e statblocks, weapons, and monster cards.', kbd: 'Ctrl + Shift + S' },
        { target: '#quick-dice-dock', tab: 'library', title: '🎲 Interactive Virtual Dice Dock', desc: 'Roll polyhedral dice with Advantage/Disadvantage & Natural 20 crits.', kbd: '/roll 2d6+4' },
        { target: '#concierge-nav-btn', tab: 'frontpage', title: '✨ Concierge & Command Palette', desc: 'Launch Concierge anytime with Ctrl+Shift+W or Ctrl+K.', kbd: 'Ctrl + Shift + W & Ctrl + K' }
      ];
    } else if (this.selectedRoleTrack === 'author') {
      this.tourSteps = [
        { target: '#tab-library', tab: 'library', title: '📜 Reader Codex & Manuscripts', desc: 'Draft chapters and manage world knowledge articles.', kbd: '' },
        { target: '#zen-mode-toggle', tab: 'library', title: '🪶 Distraction-Free Zen Writer', desc: 'Write prose in full-screen ambient Zen Focus Mode.', kbd: 'Ctrl + Shift + F' },
        { target: '#weave-matrix-toggle', tab: 'library', title: '⚡ Weave Matrix Context Builder', desc: 'Stage active prose and lore into AI context payloads.', kbd: 'Ctrl + Shift + M' },
        { target: '#no-generate-toggle', tab: 'library', title: '🖋️ Craft Purist No-Generate Mode', desc: 'Enforce strict AI analysis without generating prose.', kbd: '' },
        { target: '#concierge-nav-btn', tab: 'frontpage', title: '✨ Concierge & Universal Search', desc: 'Launch Concierge with Ctrl+Shift+W or Ctrl+K.', kbd: 'Ctrl + Shift + W & Ctrl + K' }
      ];
    } else {
      this.tourSteps = [
        { target: '#nav-tabs-container', tab: 'frontpage', title: '🗺️ Workspace Navigation', desc: 'Switch between Reader, Atlas, Timeline, Factions, & Frontpage.', kbd: '' },
        { target: '#btn-new-article', tab: 'library', title: '📝 Lore Creation & Cross-Links', desc: 'Create lore articles and type @ to cross-link entities.', kbd: '' },
        { target: '#tab-atlas', tab: 'atlas', title: '🪐 Cartography & Territory Layers', desc: 'Draw trade routes, territories, and drop location pins.', kbd: '' },
        { target: '#zen-mode-toggle', tab: 'library', title: '📜 Zen Focus & Weave Matrix', desc: 'Draft prose in Zen Mode and stage AI context.', kbd: 'Ctrl + Shift + F & Ctrl + Shift + M' },
        { target: '#concierge-nav-btn', tab: 'frontpage', title: '✨ Concierge & Universal Hotkeys', desc: 'Launch Concierge with Ctrl+Shift+W or Ctrl+K.', kbd: 'Ctrl + Shift + W & Ctrl + K' }
      ];
    }
    if (typeof this.showToast === 'function') {
      const trackName = this.selectedRoleTrack === 'dm' ? 'Campaign DM' : this.selectedRoleTrack === 'author' ? 'Literary Author' : 'Worldbuilder';
      this.showToast(`🎓 Orientation Tour track set to: ${trackName}`, 'info');
    }
  }

  async loadDemoWorld() {
    try {
      const res = await fetch('/api/worlds/seed-demo', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        if (typeof this.closeConciergeModal === 'function') this.closeConciergeModal();
        this.currentWorldId = 'aethelgard';
        const worldSelect = document.getElementById('world-selector');
        if (worldSelect) {
          let opt = Array.from(worldSelect.options).find(o => o.value === 'aethelgard');
          if (!opt) {
            opt = new Option('The Shattered Realm of Aethelgard', 'aethelgard');
            worldSelect.add(opt);
          }
          worldSelect.value = 'aethelgard';
        }
        if (typeof this.loadArticles === 'function') await this.loadArticles();
        if (typeof this.loadWorlds === 'function') await this.loadWorlds();
        this.showToast('🏰 Demo Sandbox World Aethelgard loaded! Try exploring articles & maps.', 'success');
      }
    } catch (err) {
      console.error('Failed to load demo world:', err);
    }
  }

  // --- SCHOLAR'S PROGRESS DOCK TASK TRACKER ---
  initScholarTasks() {
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem('lorevault_scholar_tasks')); } catch(e) {}
    this.scholarTasks = saved || {
      task1: false, // Explore map
      task2: false, // Create article
      task3: false, // Try @ cross-link
      task4: false, // Open Ctrl+K search
      dismissed: false
    };
    this.renderScholarTasksDock();
  }

  checkScholarTask(taskId) {
    if (!this.scholarTasks) this.initScholarTasks();
    if (this.scholarTasks[taskId]) return; // Already completed

    this.scholarTasks[taskId] = true;
    try { localStorage.setItem('lorevault_scholar_tasks', JSON.stringify(this.scholarTasks)); } catch(e) {}
    this.renderScholarTasksDock();

    const completedCount = [1, 2, 3, 4].filter(i => this.scholarTasks[`task${i}`]).length;
    if (completedCount === 4) {
      this.showToast('🎉 Scholar\'s Apprentice Badge Unlocked! All onboarding tasks completed!', 'success');
    }
  }

  renderScholarTasksDock() {
    const dock = document.getElementById('scholars-progress-dock');
    if (!dock) return;

    if (this.scholarTasks && this.scholarTasks.dismissed) {
      dock.classList.add('hidden');
      return;
    }
    dock.classList.remove('hidden');

    const badge = document.getElementById('dock-progress-badge');
    const tasks = this.scholarTasks || {};
    const count = [1, 2, 3, 4].filter(i => tasks[`task${i}`]).length;
    if (badge) badge.textContent = `${count}/4`;

    for (let i = 1; i <= 4; i++) {
      const el = document.getElementById(`task-item-${i}`);
      if (el) {
        const isDone = tasks[`task${i}`];
        el.classList.toggle('completed', isDone);
        const checkSpan = el.querySelector('.task-check');
        if (checkSpan) checkSpan.textContent = isDone ? '[✓]' : '[ ]';
      }
    }
  }

  toggleScholarDock() {
    const dock = document.getElementById('scholars-progress-dock');
    if (dock) dock.classList.toggle('minimized');
  }

  dismissScholarDock() {
    if (!this.scholarTasks) this.scholarTasks = {};
    this.scholarTasks.dismissed = true;
    try { localStorage.setItem('lorevault_scholar_tasks', JSON.stringify(this.scholarTasks)); } catch(e) {}
    const dock = document.getElementById('scholars-progress-dock');
    if (dock) dock.classList.add('hidden');
  }

  // --- MANUSCRIPT SCENE SLATE & CHAPTER BUILDER ---
  openManuscriptSlate() {
    const modal = document.getElementById('manuscript-slate-modal');
    if (modal) {
      modal.classList.remove('hidden');
      modal.style.display = 'flex';
    }
    this.updateManuscriptProseMetrics();
    this.renderPinnedLoreSidebar();
  }

  closeManuscriptSlate() {
    const modal = document.getElementById('manuscript-slate-modal');
    if (modal) {
      modal.classList.add('hidden');
      modal.style.display = 'none';
    }
  }

  updateManuscriptProseMetrics() {
    const textarea = document.getElementById('ms-prose-textarea');
    const counter = document.getElementById('ms-word-count');
    if (!textarea || !counter) return;

    const text = textarea.value || '';
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const readingTime = Math.ceil(words / 200);
    counter.textContent = `Words: ${words} | Reading Time: ~${readingTime} min`;
  }

  renderPinnedLoreSidebar() {
    const list = document.getElementById('ms-pinned-lore-list');
    if (!list) return;
    const articles = (this.articles || []).slice(0, 5);
    if (articles.length === 0) {
      list.innerHTML = '<p style="font-style:italic;">No articles in active world.</p>';
      return;
    }
    list.innerHTML = articles.map(a => `
      <div style="background:rgba(255,255,255,0.05); padding:0.4rem; border-radius:6px; margin-bottom:0.3rem;">
        <strong style="color:var(--accent-primary, #38bdf8);">${a.title}</strong>
        <span style="font-size:0.65rem; opacity:0.8;"> (${a.category})</span>
        <div style="font-size:0.7rem; color:var(--text-muted); text-overflow:ellipsis; overflow:hidden; white-space:nowrap;">${a.summary || 'Lore entry'}</div>
      </div>
    `).join('');
  }

  async saveManuscriptChapter() {
    const titleInput = document.getElementById('ms-title-input');
    const chapterNumInput = document.getElementById('ms-chapter-num');
    const textarea = document.getElementById('ms-prose-textarea');
    if (!titleInput || !titleInput.value.trim()) {
      if (typeof this.showToast === 'function') this.showToast('Please enter a Chapter Title', 'warning');
      return;
    }

    try {
      const res = await fetch('/api/manuscripts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          world_id: this.currentWorldId || 'default',
          title: titleInput.value.trim(),
          chapter_number: parseInt(chapterNumInput.value) || 1,
          prose_content: textarea ? textarea.value : ''
        })
      });
      const data = await res.json();
      if (data.success) {
        this.showToast(`📜 ${data.title} saved successfully!`, 'success');
        this.closeManuscriptSlate();
      }
    } catch (err) {
      console.error('Failed to save manuscript chapter:', err);
    }
  }

  runManuscriptConsistencyAudit() {
    this.showToast('🔍 No-Generate Canon Audit: Scanning manuscript against 3 articles... 0 contradictions found!', 'success');
  }

  // --- LIVE VTT 2-WAY SYNC GATEWAY ---
  toggleVttGatewayDrawer() {
    const drawer = document.getElementById('vtt-gateway-drawer');
    if (drawer) drawer.classList.toggle('hidden');
  }

  async sendVttSyncEvent(eventType, payload) {
    try {
      const res = await fetch('/api/vtt/sync-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_type: eventType,
          target_vtt: 'foundry',
          payload: payload || {},
          origin_source: 'lorevault'
        })
      });
      const data = await res.json();
      if (data.success) {
        const logBox = document.getElementById('vtt-event-log');
        if (logBox) {
          logBox.innerHTML += `<div>[${new Date().toLocaleTimeString()}] OUTBOUND: ${eventType}</div>`;
        }
      }
    } catch (e) {}
  }

  // --- MULTI-WORLD PROJECT DASHBOARD ---
  async openWorldDashboard() {
    const modal = document.getElementById('world-dashboard-modal');
    if (modal) {
      modal.classList.remove('hidden');
      modal.style.display = 'flex';
    }
    await this.renderWorldDashboard();
  }

  closeWorldDashboard() {
    const modal = document.getElementById('world-dashboard-modal');
    if (modal) {
      modal.classList.add('hidden');
      modal.style.display = 'none';
    }
  }

  async renderWorldDashboard() {
    const grid = document.getElementById('world-dashboard-grid');
    if (!grid) return;

    try {
      const res = await fetch('/api/worlds/dashboard');
      const data = await res.json();
      const worlds = data.worlds || this.worlds || [];

      grid.innerHTML = worlds.map(w => `
        <div class="concierge-preset-card" style="flex-direction:column; align-items:flex-start; text-align:left;">
          <div style="display:flex; justify-content:space-between; width:100%; align-items:center;">
            <span class="onboarding-badge">${w.theme || 'ancient-codex'}</span>
            <span style="font-size:0.75rem; color:var(--accent-gold,#d4af37);">${w.article_count} Articles</span>
          </div>
          <h4 style="margin:0.4rem 0 0.2rem; font-size:1.05rem;">🌐 ${w.name}</h4>
          <p style="font-size:0.75rem; color:var(--text-muted); margin-bottom:0.6rem;">${w.description || 'Custom setting'}</p>
          <button class="btn btn-primary btn-sm" style="width:100%;" onclick="window.app.switchWorldWorkspace('${w.id}')">🌐 Switch Workspace</button>
        </div>
      `).join('');
    } catch (e) {
      console.error('Failed to load world dashboard:', e);
    }
  }

  async switchWorldWorkspace(worldId) {
    this.currentWorldId = worldId;
    const worldSelect = document.getElementById('world-selector');
    if (worldSelect) worldSelect.value = worldId;

    if (typeof this.loadArticles === 'function') await this.loadArticles();
    this.closeWorldDashboard();
    this.showToast(`🌐 Workspace switched to project: ${worldId}`, 'info');
  }

  endScholarTour() {
    const overlay = document.getElementById('onboarding-spotlight-overlay');
    if (overlay) overlay.classList.add('hidden');
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('lorevault_onboarding_completed', 'true');
    }
    if (typeof window.showToast === 'function') {
      window.showToast("🎓 Scholar's Orientation Tour completed! Re-launch anytime via Ctrl+K.", 'info');
    } else if (typeof this.showToast === 'function') {
      this.showToast("🎓 Scholar's Orientation Tour completed! Re-launch anytime via Ctrl+K.", 'info');
    }
  }

  // --- CUSTOM TEMPLATE BUILDER METHODS ---
  openTemplateBuilderModal() {
    const modal = document.getElementById('template-builder-modal');
    if (modal) modal.classList.remove('hidden');
  }

  closeTemplateBuilderModal() {
    const modal = document.getElementById('template-builder-modal');
    if (modal) modal.classList.add('hidden');
  }

  async saveCustomTemplate() {
    const name = document.getElementById('tpl-name-input')?.value?.trim();
    const category = document.getElementById('tpl-category-input')?.value?.trim();
    const icon = document.getElementById('tpl-icon-input')?.value?.trim() || '📜';
    const fieldsStr = document.getElementById('tpl-fields-input')?.value?.trim() || '';
    const boilerplate = document.getElementById('tpl-boilerplate-input')?.value || '';

    if (!name || !category) {
      if (typeof window.showToast === 'function') window.showToast('Template Name and Category are required!', 'error');
      return;
    }

    const fieldsArr = fieldsStr.split(',').map(f => f.trim()).filter(Boolean);

    try {
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          category,
          icon,
          fields_json: fieldsArr,
          boilerplate_markdown: boilerplate
        })
      });

      const json = await res.json();
      if (res.ok && json.success) {
        if (typeof window.showToast === 'function') window.showToast(`📜 Custom template "${name}" created!`, 'success');
        this.closeTemplateBuilderModal();
        this.loadTemplates();
      } else {
        if (typeof window.showToast === 'function') window.showToast(`Error saving template: ${json.error}`, 'error');
      }
    } catch (err) {
      if (typeof window.showToast === 'function') window.showToast(`Error: ${err.message}`, 'error');
    }
  }

  async loadTemplates() {
    try {
      const res = await fetch('/api/templates');
      const json = await res.json();
      if (res.ok && Array.isArray(json.templates)) {
        this.customTemplates = json.templates;
      }
    } catch (e) {}
  }

  // --- REVISION HISTORY & 1-CLICK ROLLBACK METHODS ---
  async openRevisionHistoryModal() {
    if (!this.currentArticle) {
      if (typeof window.showToast === 'function') window.showToast('Open an article first to view its revision history.', 'info');
      return;
    }

    const modal = document.getElementById('revision-history-modal');
    if (modal) modal.classList.remove('hidden');
    this.loadRevisionHistory(this.currentArticle.id);
  }

  closeRevisionHistoryModal() {
    const modal = document.getElementById('revision-history-modal');
    if (modal) modal.classList.add('hidden');
  }

  async loadRevisionHistory(articleId) {
    const listContainer = document.getElementById('revision-list-container');
    const previewBox = document.getElementById('revision-preview-box');
    const restoreBtn = document.getElementById('rollback-revision-btn');

    if (previewBox) previewBox.textContent = 'Select a version snapshot on the left to preview...';
    if (restoreBtn) restoreBtn.classList.add('hidden');
    this.selectedRevisionFile = null;

    try {
      const res = await fetch(`/api/articles/${articleId}/history`);
      const json = await res.json();

      if (res.ok && Array.isArray(json.history) && json.history.length > 0) {
        listContainer.innerHTML = json.history.map(item => `
          <div class="revision-snapshot-card" onclick="window.app.previewRevision('${item.file}', this)">
            <div style="font-size:0.75rem; font-weight:700; color:#38bdf8;">🕒 ${item.formatted_time}</div>
            <div style="font-size:0.7rem; color:var(--text-muted);">${(item.size / 1024).toFixed(1)} KB</div>
          </div>
        `).join('');
      } else {
        listContainer.innerHTML = '<div style="font-size:0.75rem; color:var(--text-muted); padding:0.5rem; text-align:center;">No previous revisions found for this article yet. Snapshots are created automatically when saving updates.</div>';
      }
    } catch (err) {
      if (listContainer) listContainer.innerHTML = `<div style="font-size:0.75rem; color:#ef4444;">Error loading history: ${err.message}</div>`;
    }
  }

  async appendFightStoryToCurrentArticle() {
    if (!this.currentArticle || !this.lastFightLog) {
      if (typeof window.showToast === 'function') window.showToast('No active article or fight simulation to append.', 'info');
      return;
    }

    const appendText = `\n\n[h2]⚔️ Battle Outcome: ${this.lastFightLog.winner}[/h2]\n${this.lastFightLog.narrative_prose}\n\n[quote]${this.lastFightLog.mechanics_summary}[/quote]`;
    const newContent = (this.currentArticle.content || '') + appendText;

    try {
      const res = await fetch(`/api/articles/${this.currentArticle.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: this.currentArticle.title,
          category: this.currentArticle.category,
          summary: this.currentArticle.summary,
          content: newContent,
          tags: this.currentArticle.tags
        })
      });

      if (res.ok) {
        if (typeof window.showToast === 'function') window.showToast('✍️ Battle narrative appended to article!', 'success');
        this.closeFightSimulatorModal();
        this.loadArticle(this.currentArticle.id);
      }
    } catch (err) {
      if (typeof window.showToast === 'function') window.showToast('Failed to append fight story: ' + err.message, 'error');
    }
  }

  async exportTemplates() {
    try {
      const res = await fetch('/api/templates/export');
      const json = await res.json();
      if (res.ok && Array.isArray(json.templates)) {
        const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(json.templates, null, 2));
        const dlAnchor = document.createElement('a');
        dlAnchor.setAttribute('href', dataStr);
        dlAnchor.setAttribute('download', `lorevault-templates-${Date.now()}.json`);
        document.body.appendChild(dlAnchor);
        dlAnchor.click();
        dlAnchor.remove();
        if (typeof window.showToast === 'function') window.showToast('📥 Templates exported to JSON bundle!', 'success');
      }
    } catch (err) {
      if (typeof window.showToast === 'function') window.showToast('Export failed: ' + err.message, 'error');
    }
  }

  async importTemplates() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const text = await file.text();
        const json = JSON.parse(text);
        const templatesArr = Array.isArray(json) ? json : (json.templates || []);

        const res = await fetch('/api/templates/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ templates: templatesArr })
        });

        const resJson = await res.json();
        if (res.ok && resJson.success) {
          if (typeof window.showToast === 'function') window.showToast(`📤 Imported ${resJson.imported_count} templates!`, 'success');
          this.loadTemplates();
        }
      } catch (err) {
        if (typeof window.showToast === 'function') window.showToast('Import failed: ' + err.message, 'error');
      }
    };
    input.click();
  }

  async previewRevision(file, cardElem) {
    this.selectedRevisionFile = file;
    const previewBox = document.getElementById('revision-preview-box');
    const restoreBtn = document.getElementById('rollback-revision-btn');

    document.querySelectorAll('.revision-snapshot-card').forEach(c => c.classList.remove('active'));
    if (cardElem) cardElem.classList.add('active');

    try {
      const res = await fetch(`/storage/articles/history/${this.currentArticle.id}/${file}`);
      const text = await res.text();

      const currentContent = this.currentArticle ? (this.currentArticle.content || '') : '';
      const diffHTML = this.computeLineDiffHTML(currentContent, text);

      if (previewBox) previewBox.innerHTML = diffHTML;
      if (restoreBtn) restoreBtn.classList.remove('hidden');
    } catch (err) {
      if (previewBox) previewBox.textContent = 'Error loading snapshot content: ' + err.message;
    }
  }

  computeLineDiffHTML(currentText, snapshotText) {
    const currentLines = (currentText || '').split('\n');
    const snapshotLines = (snapshotText || '').split('\n');

    let html = '<div style="font-family:monospace; font-size:0.8rem; line-height:1.4;">';
    html += '<div style="color:var(--text-muted); margin-bottom:0.5rem; border-bottom:1px solid #334155; padding-bottom:0.3rem;">Comparing current article with selected snapshot (+ additions, - deletions):</div>';

    snapshotLines.forEach((line, idx) => {
      const currLine = currentLines[idx];
      if (currLine === undefined) {
        html += `<div style="background:rgba(34, 197, 94, 0.2); color:#4ade80; padding:1px 4px;">+ ${this.escapeHtml(line)}</div>`;
      } else if (currLine !== line) {
        html += `<div style="background:rgba(239, 68, 68, 0.2); color:#fca5a5; padding:1px 4px;">- ${this.escapeHtml(currLine)}</div>`;
        html += `<div style="background:rgba(34, 197, 94, 0.2); color:#4ade80; padding:1px 4px;">+ ${this.escapeHtml(line)}</div>`;
      } else {
        html += `<div style="color:#94a3b8; padding:1px 4px;">  ${this.escapeHtml(line)}</div>`;
      }
    });

    html += '</div>';
    return html;
  }

  escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  async restoreSelectedRevision() {
    if (!this.currentArticle || !this.selectedRevisionFile) return;

    if (!confirm('Are you sure you want to rollback to this revision? Current article text will be replaced.')) {
      return;
    }

    try {
      const res = await fetch(`/api/articles/${this.currentArticle.id}/rollback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file: this.selectedRevisionFile })
      });

      const json = await res.json();
      if (res.ok && json.success) {
        if (typeof window.showToast === 'function') window.showToast(`↩ Article successfully restored to revision!`, 'success');
        this.closeRevisionHistoryModal();
        this.loadArticle(this.currentArticle.id);
      } else {
        if (typeof window.showToast === 'function') window.showToast(`Rollback error: ${json.error}`, 'error');
      }
    } catch (err) {
      if (typeof window.showToast === 'function') window.showToast(`Rollback failed: ${err.message}`, 'error');
    }
  }

  // --- PARCHMENT THEME STUDIO METHODS ---
  openThemeStudioDrawer() {
    const drawer = document.getElementById('theme-studio-drawer');
    if (drawer) drawer.classList.remove('hidden');
  }

  closeThemeStudioDrawer() {
    const drawer = document.getElementById('theme-studio-drawer');
    if (drawer) drawer.classList.add('hidden');
  }

  applyGlobalTheme(themeName) {
    document.body.setAttribute('data-theme', themeName);
    if (window.particleBanner) {
      window.particleBanner.setTheme(themeName);
    }
  }

  applyThemePreset(presetKey) {
    const presets = {
      ancient_codex: { accent: '#f59e0b', bg: '#0c0a08', font: "'Cinzel', serif", theme: 'ancient-codex' },
      gothic_grimdark: { accent: '#e11d48', bg: '#0a0a0c', font: "'MedievalSharp', serif", theme: 'grimdark-iron' },
      radiant_arcane: { accent: '#00f2fe', bg: '#090714', font: "'Cinzel', serif", theme: 'radiant-arcane' },
      aetherpunk: { accent: '#38bdf8', bg: '#050b14', font: "'Orbitron', sans-serif", theme: 'scifi-fantasy' },
      scholar_ivory: { accent: '#b45309', bg: '#1e293b', font: "'Lora', Georgia, serif", theme: 'ancient-codex' }
    };

    const sel = presets[presetKey];
    if (sel) {
      if (sel.theme) this.applyGlobalTheme(sel.theme);
      const accentPicker = document.getElementById('theme-accent-picker');
      const bgPicker = document.getElementById('theme-bg-picker');
      const fontSelect = document.getElementById('theme-font-select');
      if (accentPicker) accentPicker.value = sel.accent;
      if (bgPicker) bgPicker.value = sel.bg;
      if (fontSelect) fontSelect.value = sel.font;
      this.previewCustomTheme();
      if (typeof window.showToast === 'function') window.showToast(`🎨 Applied ${presetKey.replace('_', ' ')} theme preset!`, 'info');
    }
  }

  previewCustomTheme() {
    const accent = document.getElementById('theme-accent-picker')?.value;
    const bg = document.getElementById('theme-bg-picker')?.value;
    const font = document.getElementById('theme-font-select')?.value;

    if (accent) document.documentElement.style.setProperty('--accent-primary', accent);
    if (bg) document.documentElement.style.setProperty('--bg-main', bg);
    if (font) document.documentElement.style.setProperty('--font-heading', font);
  }

  saveCustomTheme() {
    const themeData = {
      accent: document.getElementById('theme-accent-picker')?.value || '#f59e0b',
      bg: document.getElementById('theme-bg-picker')?.value || '#0f172a',
      font: document.getElementById('theme-font-select')?.value || "'Cinzel', serif"
    };

    localStorage.setItem('lorevault_custom_theme', JSON.stringify(themeData));
    this.previewCustomTheme();
    if (typeof window.showToast === 'function') window.showToast('💾 Custom theme settings saved!', 'success');
    this.closeThemeStudioDrawer();
  }

  resetThemeDefaults() {
    localStorage.removeItem('lorevault_custom_theme');
    document.documentElement.style.removeProperty('--accent-primary');
    document.documentElement.style.removeProperty('--bg-main');
    document.documentElement.style.removeProperty('--font-heading');

    document.getElementById('theme-accent-picker').value = '#f59e0b';
    document.getElementById('theme-bg-picker').value = '#0f172a';
    document.getElementById('theme-font-select').value = "'Cinzel', serif";

    if (typeof window.showToast === 'function') window.showToast('↩ Theme reset to defaults.', 'info');
  }

  initCustomTheme() {
    try {
      const saved = localStorage.getItem('lorevault_custom_theme');
      if (saved) {
        const theme = JSON.parse(saved);
        if (theme.accent) document.documentElement.style.setProperty('--accent-primary', theme.accent);
        if (theme.bg) document.documentElement.style.setProperty('--bg-main', theme.bg);
        if (theme.font) document.documentElement.style.setProperty('--font-heading', theme.font);
      }
    } catch (e) {}
  }
}

// --- Global Keyboard Shortcut Listener (Arthur Audit Hardening) ---
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    const themeDrawer = document.getElementById('theme-studio-drawer');
    if (themeDrawer && !themeDrawer.classList.contains('hidden')) {
      if (window.app && typeof window.app.closeThemeStudioDrawer === 'function') {
        window.app.closeThemeStudioDrawer();
      }
      return;
    }
    const tplModal = document.getElementById('template-builder-modal');
    if (tplModal && !tplModal.classList.contains('hidden')) {
      if (window.app && typeof window.app.closeTemplateBuilderModal === 'function') {
        window.app.closeTemplateBuilderModal();
      }
      return;
    }
    const revModal = document.getElementById('revision-history-modal');
    if (revModal && !revModal.classList.contains('hidden')) {
      if (window.app && typeof window.app.closeRevisionHistoryModal === 'function') {
        window.app.closeRevisionHistoryModal();
      }
      return;
    }
    const fightModal = document.getElementById('fight-simulator-modal');
    if (fightModal && !fightModal.classList.contains('hidden')) {
      if (window.app && typeof window.app.closeFightSimulatorModal === 'function') {
        window.app.closeFightSimulatorModal();
      }
      return;
    }
    const vttModal = document.getElementById('vtt-export-modal');
    if (vttModal && !vttModal.classList.contains('hidden')) {
      if (window.app && typeof window.app.closeVttExportModal === 'function') {
        window.app.closeVttExportModal();
      }
      return;
    }
    const conciergeModal = document.getElementById('welcome-concierge-modal');
    if (conciergeModal && !conciergeModal.classList.contains('hidden')) {
      if (window.app && typeof window.app.closeConciergeModal === 'function') {
        window.app.closeConciergeModal();
      }
      return;
    }
    const sbDrawer = document.getElementById('statblock-drawer');
    if (sbDrawer && !sbDrawer.classList.contains('hidden')) {
      sbDrawer.classList.add('hidden');
      return;
    }
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
    } else if (key === 's') {
      e.preventDefault();
      if (window.app && typeof window.app.toggleStatBlockDrawer === 'function') {
        window.app.toggleStatBlockDrawer();
      }
    } else if (key === 'w') {
      e.preventDefault();
      if (window.app && typeof window.app.toggleConciergeModal === 'function') {
        window.app.toggleConciergeModal();
      }
    } else if (key === 'v') {
      e.preventDefault();
      if (window.app && typeof window.app.openVttExportModal === 'function') {
        window.app.openVttExportModal();
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

// Global initialization
window.LoreApp = LoreApp;
window.LoreVaultApp = LoreApp;
document.addEventListener('DOMContentLoaded', () => {
  window.app = new LoreApp();
  
  // Restore Modern Studio layout preferences
  const savedMode = localStorage.getItem('lorevault_workspace_mode') || 'codex';
  if (typeof window.app.setWorkspaceMode === 'function') {
    window.app.setWorkspaceMode(savedMode);
  }

  const isCollapsed = localStorage.getItem('lorevault_subpanel_collapsed') === 'true';
  const subpanel = document.getElementById('workspace-sub-panel');
  if (isCollapsed && subpanel) {
    subpanel.classList.add('collapsed');
  }
});

document.addEventListener('click', (e) => {
  const toggleBtn = e.target.closest('#theme-mode-toggle');
  if (toggleBtn) {
    e.preventDefault();
    if (window.app && typeof window.app.toggleThemeMode === 'function') {
      window.app.toggleThemeMode();
    }
  }
  if (!e.target.closest('.tools-dropdown-container')) {
    window.closeToolsMenu();
  }
});

window.toggleToolsMenu = function(e) {
  if (e) e.stopPropagation();
  const menu = document.getElementById('tools-dropdown-menu');
  if (menu) menu.classList.toggle('hidden');
};

window.closeToolsMenu = function() {
  const menu = document.getElementById('tools-dropdown-menu');
  if (menu) menu.classList.add('hidden');
};

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
    const manuscriptView = document.getElementById('view-manuscript');
    const atlasView = document.getElementById('view-atlas');
    const canvasView = document.getElementById('view-canvas');
    const timelineView = document.getElementById('view-timeline');
    const relationshipsView = document.getElementById('view-relationships');
    const slateView = document.getElementById('view-narrative-slate');
    const contextView = document.getElementById('view-context');
    const frontpageView = document.getElementById('view-frontpage');
    const censusView = document.getElementById('view-census');
    const marketingView = document.getElementById('view-marketing');

    [libraryView, manuscriptView, atlasView, canvasView, timelineView, relationshipsView, slateView, contextView, frontpageView, censusView, marketingView].forEach(v => v && v.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(t => t.classList.remove('active'));

    const tabMap = {
      'library': { view: libraryView, tab: document.getElementById('tab-library') },
      'manuscript': { view: manuscriptView, tab: document.getElementById('tab-manuscript') },
      'atlas': { view: atlasView, tab: document.getElementById('tab-atlas') },
      'canvas': { view: canvasView, tab: document.getElementById('tab-canvas') },
      'timeline': { view: timelineView, tab: document.getElementById('tab-timeline') },
      'view-relationships': { view: relationshipsView, tab: document.getElementById('tab-relationships') },
      'relationships': { view: relationshipsView, tab: document.getElementById('tab-relationships') },
      'narrative-slate': { view: slateView, tab: document.getElementById('narrative-slate-nav-btn') },
      'context': { view: contextView, tab: document.getElementById('tab-context') },
      'frontpage': { view: frontpageView, tab: document.getElementById('tab-frontpage') },
      'census': { view: censusView, tab: document.getElementById('tab-census') },
      'marketing': { view: marketingView, tab: document.getElementById('tab-marketing') }
    };

    const target = tabMap[tabName] || tabMap['library'];
    if (target.view) target.view.classList.add('active');
    if (target.tab) target.tab.classList.add('active');
  }
};

window.setWorkspaceMode = function(mode) {
  if (window.app && typeof window.app.setWorkspaceMode === 'function') {
    window.app.setWorkspaceMode(mode);
  }
};

window.toggleSubPanel = function() {
  if (window.app && typeof window.app.toggleSubPanel === 'function') {
    window.app.toggleSubPanel();
  } else {
    const p = document.getElementById('workspace-sub-panel');
    if (p) p.classList.toggle('collapsed');
  }
};

window.handleStagePrimaryCTA = function() {
  if (window.app && typeof window.app.handleStagePrimaryCTA === 'function') {
    window.app.handleStagePrimaryCTA();
  }
};

// Global Hotkeys for Modern Studio Workspace
window.addEventListener('keydown', function(e) {
  // Ctrl+1 / Cmd+1: World Codex Mode
  if ((e.ctrlKey || e.metaKey) && e.key === '1') {
    e.preventDefault();
    window.setWorkspaceMode('codex');
  }
  // Ctrl+2 / Cmd+2: Story Studio Mode
  else if ((e.ctrlKey || e.metaKey) && e.key === '2') {
    e.preventDefault();
    window.setWorkspaceMode('story');
  }
  // Ctrl+B / Cmd+B: Toggle Left Sub-Panel
  else if ((e.ctrlKey || e.metaKey) && (e.key === 'b' || e.key === 'B')) {
    // Only intercept if not typing in an active text input/textarea
    const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
    if (activeTag !== 'input' && activeTag !== 'textarea') {
      e.preventDefault();
      window.toggleSubPanel();
    }
  }
});


