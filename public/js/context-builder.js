/**
 * LoreWeaver Weave Matrix & Prompt Synthesizer
 * 4-Bucket State Engine: System Tone, World Scope, Active Slate & Personas, Scene Beats & Task
 */

const ContextBuilder = {
  articles: [],
  state: {
    system: {
      preset: 'session_prep',
      tone: 'Action',
      customInstructions: '',
      excludeSecrets: true
    },
    world: {
      selectedCategories: new Set(),
      selectedTags: new Set(),
      summariesOnly: false,
      searchTerm: ''
    },
    slate: {
      selectedArticleIds: new Set(),
      relationships: {}, // { articleId: 'Ally' | 'Rival' | 'Nemesis' | 'Confidential' | 'Neutral' }
      activeBucket: 'system'
    },
    workingState: {
      taskPreset: 'scene',
      taskInstructions: '',
      sceneBeats: ''
    },
    inspector: {
      isOpen: false,
      serializer: 'Markdown'
    },
    snapshots: {}
  },

  init(articlesList) {
    this.articles = articlesList || [];
    this.loadSavedSnapshots();
    this.initFilterOptions();
    
    // Default select first 2 articles if none selected yet
    if (this.state.slate.selectedArticleIds.size === 0 && this.articles.length > 0) {
      this.articles.slice(0, Math.min(2, this.articles.length)).forEach(a => {
        this.state.slate.selectedArticleIds.add(a.id);
      });
    }

    this.renderAll();
    this.compileContext();
  },

  initFilterOptions() {
    // Collect unique categories and tags
    const categories = new Set();
    const tags = new Set();
    this.articles.forEach(a => {
      if (a.category) categories.add(a.category);
      if (a.tags && Array.isArray(a.tags)) {
        a.tags.forEach(t => tags.add(t));
      } else if (typeof a.tags === 'string' && a.tags.trim()) {
        a.tags.split(',').forEach(t => tags.add(t.trim()));
      }
    });

    this.allCategories = Array.from(categories);
    this.allTags = Array.from(tags);
  },

  renderAll() {
    this.renderHeaderControls();
    this.renderTray();
    this.renderBucketTabs();
    this.renderWorldScopeFilters();
    this.renderSlatePersonas();
    this.renderInspectorState();
    this.updateTokenMeter();
  },

  // --- WORKFLOW PRESETS ---
  applyPreset(presetName) {
    this.state.system.preset = presetName;

    if (presetName === 'session_prep') {
      this.state.system.excludeSecrets = true;
      this.state.system.tone = 'Academic';
      this.state.system.customInstructions = 'Focus on structural world-building, NPC motivations, and location parameters for DM session prep.';
      this.state.inspector.serializer = 'Markdown';
      this.state.workingState.taskPreset = 'consistency';
      this.state.workingState.taskInstructions = 'TASK: Generate a DM prep briefing highlighting key secrets, faction tensions, and location hazards for tonight\'s session.';
      this.state.slate.activeBucket = 'world';
    } else if (presetName === 'cowriter') {
      this.state.system.excludeSecrets = false;
      this.state.system.tone = 'Action';
      this.state.system.customInstructions = 'Write immersive narrative prose with rich sensory detail, dialogue flair, and high dramatic stakes.';
      this.state.inspector.serializer = 'Markdown';
      this.state.workingState.taskPreset = 'scene';
      this.state.workingState.taskInstructions = 'TASK: Write a dramatic narrative scene featuring the active slate characters in a high-stakes encounter.';
      this.state.slate.activeBucket = 'slate';
    } else if (presetName === 'developer') {
      this.state.system.excludeSecrets = true;
      this.state.system.tone = 'Gritty';
      this.state.inspector.isOpen = true;
      this.state.inspector.serializer = 'JSON';
      this.state.workingState.taskPreset = 'custom';
      this.state.workingState.taskInstructions = 'TASK: Format lore context payload for direct LLM API integration with structured JSON schema.';
    } else if (presetName === 'custom') {
      this.state.slate.activeBucket = 'system';
    }

    // Synchronize UI Elements
    const presetDropdown = document.getElementById('cb-workflow-preset');
    if (presetDropdown) presetDropdown.value = presetName;

    const toggle = document.getElementById('cb-exclude-secrets-toggle');
    if (toggle) toggle.checked = this.state.system.excludeSecrets;

    const badge = document.getElementById('cb-current-preset-badge');
    if (badge) {
      const labels = {
        session_prep: '🧙‍♂️ Session Prep Mode',
        cowriter: '✍️ Co-Writer Slate Mode',
        developer: '🛠️ Developer API Mode',
        custom: '⚙️ Custom Setup Mode'
      };
      badge.textContent = labels[presetName] || 'Custom Setup';
    }

    this.renderAll();
    this.compileContext();
  },

  // --- BUCKET TAB SWITCHING ---
  switchBucketTab(tabName) {
    this.state.slate.activeBucket = tabName;
    
    // Update navigation tab states
    const tabs = ['system', 'world', 'slate', 'workingState'];
    tabs.forEach(t => {
      const tabEl = document.getElementById(`tab-bucket-${t}`);
      const panelEl = document.getElementById(`panel-bucket-${t}`);
      if (tabEl) tabEl.classList.toggle('active', t === tabName);
      if (panelEl) panelEl.classList.toggle('active', t === tabName);
    });
  },

  renderBucketTabs() {
    this.switchBucketTab(this.state.slate.activeBucket || 'system');
    
    // Update tab badges
    const badgeWorld = document.getElementById('badge-bucket-world');
    if (badgeWorld) {
      const count = this.state.world.selectedCategories.size + this.state.world.selectedTags.size;
      badgeWorld.textContent = count > 0 ? `${count} Filters` : 'All Lore';
    }

    const badgeSlate = document.getElementById('badge-bucket-slate');
    if (badgeSlate) {
      badgeSlate.textContent = `${this.state.slate.selectedArticleIds.size} Items`;
    }
  },

  // --- ACTIVE CONTEXT TRAY (LEFT COLUMN) ---
  renderTray() {
    const container = document.getElementById('context-article-list');
    const selectedCountEl = document.getElementById('selected-count');
    
    if (selectedCountEl) {
      selectedCountEl.textContent = `${this.state.slate.selectedArticleIds.size} Selected`;
    }

    if (!container) return;

    // Filter articles based on search term & category selection
    const search = (this.state.world.searchTerm || '').toLowerCase();
    const filtered = this.articles.filter(art => {
      const matchesSearch = !search || 
        art.title.toLowerCase().includes(search) || 
        (art.category && art.category.toLowerCase().includes(search)) ||
        (art.content && art.content.toLowerCase().includes(search));
      
      const matchesCategory = this.state.world.selectedCategories.size === 0 || 
        this.state.world.selectedCategories.has(art.category);

      return matchesSearch && matchesCategory;
    });

    if (filtered.length === 0) {
      container.innerHTML = `<div class="empty-tray-state">No matching lore entries found.</div>`;
      return;
    }

    container.innerHTML = filtered.map(art => {
      const isChecked = this.state.slate.selectedArticleIds.has(art.id);
      const catClass = (art.category || 'general').toLowerCase().replace(/[^a-z0-9]/g, '');
      const rel = this.state.slate.relationships[art.id] || 'Neutral';
      
      return `
        <div class="tray-article-card ${isChecked ? 'active' : ''}" onclick="ContextBuilder.toggleArticle('${art.id}', event)">
          <div class="card-checkbox-col">
            <input type="checkbox" ${isChecked ? 'checked' : ''} onclick="event.stopPropagation(); ContextBuilder.toggleArticle('${art.id}')">
          </div>
          <div class="card-info-col">
            <div class="card-title-row">
              <span class="card-title">${this.escapeHtml(art.title)}</span>
              ${isChecked ? `<span class="rel-badge rel-${rel.toLowerCase()}">${rel}</span>` : ''}
            </div>
            <div class="card-meta-row">
              <span class="badge badge-${catClass}">${art.category || 'General'}</span>
              ${art.summary ? `<span class="summary-preview">${this.escapeHtml(art.summary.substring(0, 45))}...</span>` : ''}
            </div>
          </div>
        </div>
      `;
    }).join('');

    this.renderCategoryFilters();
  },

  renderCategoryFilters() {
    const filterContainer = document.getElementById('cb-category-filters');
    if (!filterContainer || !this.allCategories) return;

    filterContainer.innerHTML = `
      <button class="cat-pill ${this.state.world.selectedCategories.size === 0 ? 'active' : ''}" 
              onclick="ContextBuilder.clearCategoryFilters()">All</button>
      ${this.allCategories.map(cat => {
        const isSel = this.state.world.selectedCategories.has(cat);
        return `<button class="cat-pill ${isSel ? 'active' : ''}" 
                        onclick="ContextBuilder.toggleCategoryFilter('${this.escapeHtml(cat)}')">${this.escapeHtml(cat)}</button>`;
      }).join('')}
    `;
  },

  handleSearch(val) {
    this.state.world.searchTerm = val;
    this.renderTray();
  },

  toggleCategoryFilter(cat) {
    if (this.state.world.selectedCategories.has(cat)) {
      this.state.world.selectedCategories.delete(cat);
    } else {
      this.state.world.selectedCategories.add(cat);
    }
    this.renderTray();
    this.renderBucketTabs();
    this.compileContext();
  },

  clearCategoryFilters() {
    this.state.world.selectedCategories.clear();
    this.renderTray();
    this.renderBucketTabs();
    this.compileContext();
  },

  toggleArticle(id, evt) {
    if (evt && (evt.target.tagName === 'INPUT' || evt.target.tagName === 'SELECT')) {
      return; // prevent duplicate event handling from inner inputs
    }
    if (this.state.slate.selectedArticleIds.has(id)) {
      this.state.slate.selectedArticleIds.delete(id);
    } else {
      this.state.slate.selectedArticleIds.add(id);
    }
    this.renderTray();
    this.renderSlatePersonas();
    this.renderBucketTabs();
    this.compileContext();
  },

  selectAll() {
    this.articles.forEach(a => this.state.slate.selectedArticleIds.add(a.id));
    this.renderTray();
    this.renderSlatePersonas();
    this.renderBucketTabs();
    this.compileContext();
  },

  clearAll() {
    this.state.slate.selectedArticleIds.clear();
    this.renderTray();
    this.renderSlatePersonas();
    this.renderBucketTabs();
    this.compileContext();
  },

  // --- BUCKET 1: SYSTEM TONE ---
  selectTone(tone) {
    this.state.system.tone = tone;
    const chips = document.querySelectorAll('#cb-tone-chips .tone-chip');
    chips.forEach(chip => {
      chip.classList.toggle('active', chip.getAttribute('data-tone') === tone);
    });
    this.compileContext();
  },

  updateSystemInstructions(text) {
    this.state.system.customInstructions = text;
    this.compileContext();
  },

  toggleExcludeSecrets(val) {
    this.state.system.excludeSecrets = val;
    this.compileContext();
  },

  // --- BUCKET 2: WORLD SCOPE FILTERS ---
  renderWorldScopeFilters() {
    const catGrid = document.getElementById('cb-world-category-grid');
    if (catGrid && this.allCategories) {
      catGrid.innerHTML = this.allCategories.map(cat => {
        const isChecked = this.state.world.selectedCategories.has(cat);
        return `
          <label class="cb-chip-checkbox ${isChecked ? 'active' : ''}">
            <input type="checkbox" ${isChecked ? 'checked' : ''} onchange="ContextBuilder.toggleCategoryFilter('${this.escapeHtml(cat)}')">
            <span>${this.escapeHtml(cat)}</span>
          </label>
        `;
      }).join('');
    }

    const tagGrid = document.getElementById('cb-world-tag-grid');
    if (tagGrid && this.allTags) {
      tagGrid.innerHTML = this.allTags.map(tag => {
        const isChecked = this.state.world.selectedTags.has(tag);
        return `
          <label class="cb-chip-checkbox ${isChecked ? 'active' : ''}">
            <input type="checkbox" ${isChecked ? 'checked' : ''} onchange="ContextBuilder.toggleTagFilter('${this.escapeHtml(tag)}')">
            <span>#${this.escapeHtml(tag)}</span>
          </label>
        `;
      }).join('');
    }
  },

  toggleTagFilter(tag) {
    if (this.state.world.selectedTags.has(tag)) {
      this.state.world.selectedTags.delete(tag);
    } else {
      this.state.world.selectedTags.add(tag);
    }
    this.renderWorldScopeFilters();
    this.renderBucketTabs();
    this.compileContext();
  },

  toggleSummariesOnly(val) {
    this.state.world.summariesOnly = val;
    this.compileContext();
  },

  // --- BUCKET 3: ACTIVE SLATE PERSONAS & RELATIONSHIPS ---
  renderSlatePersonas() {
    const container = document.getElementById('cb-slate-articles-container');
    if (!container) return;

    const selectedIds = Array.from(this.state.slate.selectedArticleIds);
    const selectedArticles = this.articles.filter(a => selectedIds.includes(a.id));

    if (selectedArticles.length === 0) {
      container.innerHTML = `
        <div class="empty-slate-notice">
          <p>No active lore entries or personas currently added to slate.</p>
          <button class="btn btn-secondary btn-sm" onclick="ContextBuilder.switchBucketTab('system')">Select Lore Threads from the Codex</button>
        </div>
      `;
      return;
    }

    container.innerHTML = selectedArticles.map(art => {
      const rel = this.state.slate.relationships[art.id] || 'Neutral';
      return `
        <div class="slate-persona-card">
          <div class="persona-card-header">
            <div class="persona-title-group">
              <strong>${this.escapeHtml(art.title)}</strong>
              <span class="badge badge-${(art.category || 'general').toLowerCase()}">${art.category}</span>
            </div>
            <button class="btn-remove-persona" onclick="ContextBuilder.toggleArticle('${art.id}')" title="Remove from Slate">✕</button>
          </div>
          <div class="persona-card-body">
            <p class="persona-summary">${this.escapeHtml(art.summary || art.content?.substring(0, 100) || 'No summary available.')}</p>
            <div class="relationship-selector-group">
              <label>Character Dynamics / Role:</label>
              <select onchange="ContextBuilder.updateRelationship('${art.id}', this.value)">
                <option value="Ally" ${rel === 'Ally' ? 'selected' : ''}>🤝 Ally / Protagonist</option>
                <option value="Rival" ${rel === 'Rival' ? 'selected' : ''}>⚔️ Rival / Faction Lead</option>
                <option value="Nemesis" ${rel === 'Nemesis' ? 'selected' : ''}>💀 Nemesis / Antagonist</option>
                <option value="Confidential" ${rel === 'Confidential' ? 'selected' : ''}>🔒 Confidential / Secret</option>
                <option value="Neutral" ${rel === 'Neutral' ? 'selected' : ''}>⚖️ Neutral / Background</option>
              </select>
            </div>
          </div>
        </div>
      `;
    }).join('');
  },

  updateRelationship(articleId, relType) {
    this.state.slate.relationships[articleId] = relType;
    this.renderTray();
    this.compileContext();
  },

  // --- BUCKET 4: SCENE BEATS & TASK ---
  handleTaskPresetChange(presetVal) {
    this.state.workingState.taskPreset = presetVal;
    const taskInput = document.getElementById('custom-llm-instructions');

    let text = '';
    if (presetVal === 'scene') {
      text = 'TASK: Write a vivid, dramatic scene set in the selected location featuring the active slate characters. Ensure character traits, magic laws, and faction conflicts detailed in the lore context are strictly respected.';
    } else if (presetVal === 'consistency') {
      text = 'TASK: Review the draft text for lore consistency. Highlight any contradictions with canonical character traits, magic rules, or faction dynamics specified in this context.';
    } else if (presetVal === 'brainstorm') {
      text = 'TASK: Brainstorm 5 compelling plot hooks, unexpected secrets, or narrative twists involving the selected lore entities.';
    } else if (presetVal === 'dialogue') {
      text = 'TASK: Generate a sharp dialogue interaction between the active slate personas, highlighting their contrasting motivations and secret agendas.';
    }

    if (taskInput) {
      taskInput.value = text;
      this.state.workingState.taskInstructions = text;
    }
    this.compileContext();
  },

  updateTaskInstructions(text) {
    this.state.workingState.taskInstructions = text;
    this.compileContext();
  },

  updateSceneBeats(text) {
    this.state.workingState.sceneBeats = text;
    this.compileContext();
  },

  // --- DEVELOPER INSPECTOR & SERIALIZERS ---
  toggleInspector() {
    this.state.inspector.isOpen = !this.state.inspector.isOpen;
    this.renderInspectorState();
  },

  renderInspectorState() {
    const panel = document.getElementById('cb-inspector-panel');
    const btnChevron = document.getElementById('cb-inspector-chevron');
    if (panel) panel.classList.toggle('hidden', !this.state.inspector.isOpen);
    if (btnChevron) btnChevron.textContent = this.state.inspector.isOpen ? '▼' : '▲';

    const serializerBtns = document.querySelectorAll('.serializer-btn');
    serializerBtns.forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-fmt') === this.state.inspector.serializer);
    });
  },

  setSerializer(fmt) {
    this.state.inspector.serializer = fmt;
    this.renderInspectorState();
    this.compileContext();
  },

  // --- PROMPT COMPILATION ENGINE ---
  async compileContext() {
    const selectedIds = Array.from(this.state.slate.selectedArticleIds);
    const selectedArticles = this.articles.filter(a => selectedIds.includes(a.id));

    // Prepare Bucket Content Texts
    const systemText = this.buildSystemBucketText();
    const worldText = this.buildWorldBucketText();
    const slateText = this.buildSlateBucketText(selectedArticles);
    const taskText = this.buildTaskBucketText();

    // Serialize full output based on format
    const fmt = this.state.inspector.serializer || 'Markdown';
    let fullOutput = '';

    if (fmt === 'XML') {
      fullOutput = `<context_pack>\n  <system_directives>\n${systemText}\n  </system_directives>\n  <world_scope>\n${worldText}\n  </world_scope>\n  <active_slate>\n${slateText}\n  </active_slate>\n  <task_beats>\n${taskText}\n  </task_beats>\n</context_pack>`;
    } else if (fmt === 'JSON') {
      fullOutput = JSON.stringify({
        system_directives: systemText,
        world_scope: worldText,
        active_slate: selectedArticles.map(a => ({
          id: a.id,
          title: a.title,
          category: a.category,
          relationship: this.state.slate.relationships[a.id] || 'Neutral',
          content: this.processSecretStripping(this.state.world.summariesOnly ? (a.summary || a.content) : (a.content || a.summary))
        })),
        task_beats: taskText
      }, null, 2);
    } else if (fmt === 'YAML') {
      fullOutput = `system_directives: |\n  ${systemText.replace(/\n/g, '\n  ')}\nworld_scope: |\n  ${worldText.replace(/\n/g, '\n  ')}\nactive_slate:\n` + 
        selectedArticles.map(a => `  - title: "${a.title}"\n    role: "${this.state.slate.relationships[a.id] || 'Neutral'}"\n    content: "${(this.processSecretStripping(a.summary || a.content || '')).replace(/"/g, '\\"')}"`).join('\n') +
        `\ntask_beats: |\n  ${taskText.replace(/\n/g, '\n  ')}`;
    } else {
      // Default: Markdown
      fullOutput = `## System Directives & Tone\n${systemText}\n\n## World Scope & Lore\n${worldText}\n\n## Active Slate & Personas\n${slateText}\n\n## Task & Scene Beats\n${taskText}`;
    }

    // Update Output Element
    const outputEl = document.getElementById('compiled-llm-output');
    if (outputEl) {
      outputEl.value = fullOutput;
    }

    // Calculate Token Statistics
    this.updateTokenMeter(systemText, worldText, slateText, taskText, fullOutput);
  },

  buildSystemBucketText() {
    let toneDesc = `NARRATIVE TONE: ${this.state.system.tone || 'Action'}`;
    if (this.state.system.excludeSecrets) {
      toneDesc += '\nSECURITY DIRECTIVE: Exclude all DM secrets, secret GM tags, and spoilered lore notes.';
    }
    if (this.state.system.customInstructions) {
      toneDesc += `\nCUSTOM DIRECTIVE: ${this.state.system.customInstructions}`;
    }
    return toneDesc;
  },

  buildWorldBucketText() {
    const cats = Array.from(this.state.world.selectedCategories).join(', ') || 'All Lore Categories';
    const tags = Array.from(this.state.world.selectedTags).map(t => `#${t}`).join(', ') || 'No tag constraints';
    const mode = this.state.world.summariesOnly ? 'Summaries Only' : 'Full Article Lore Content';
    return `Scope: [${cats}] | Tags: [${tags}] | Detail Level: ${mode}`;
  },

  buildSlateBucketText(selectedArticles) {
    if (selectedArticles.length === 0) return 'No articles or personas selected in active slate.';

    return selectedArticles.map(art => {
      const rel = this.state.slate.relationships[art.id] || 'Neutral';
      const body = this.state.world.summariesOnly 
        ? (art.summary || art.content?.substring(0, 200) || '')
        : (art.content || art.summary || '');
      
      const cleanBody = this.processSecretStripping(body);

      return `### ${art.title} (${art.category || 'Lore'}) - Role: [${rel}]\n${cleanBody}`;
    }).join('\n\n');
  },

  buildTaskBucketText() {
    let task = this.state.workingState.taskInstructions || 'Write a dramatic scene using the context provided.';
    if (this.state.workingState.sceneBeats) {
      task += `\n\nSTRUCTURAL SCENE BEATS:\n${this.state.workingState.sceneBeats}`;
    }
    return task;
  },

  processSecretStripping(text) {
    if (!text) return '';
    if (!this.state.system.excludeSecrets) return text;
    // Strip [SECRET]...[/SECRET] and [DM_NOTE]...[/DM_NOTE]
    return text
      .replace(/\[SECRET\][\s\S]*?\[\/SECRET\]/gi, '[RESTRICTED SECRET]')
      .replace(/\[DM_NOTE\][\s\S]*?\[\/DM_NOTE\]/gi, '');
  },

  // --- TOKEN CAPACITY METER & BREAKDOWN ---
  updateTokenMeter(sysText = '', worldText = '', slateText = '', taskText = '', totalText = '') {
    // Approx token calculation heuristic: ~3.8 characters per token
    const calc = t => Math.ceil((t || '').length / 3.8);

    const sysTokens = calc(sysText);
    const worldTokens = calc(worldText);
    const slateTokens = calc(slateText);
    const taskTokens = calc(taskText);

    const totalChars = (totalText || sysText + worldText + slateText + taskText).length;
    const totalTokens = calc(totalText) || (sysTokens + worldTokens + slateTokens + taskTokens);

    const maxTokens = 4096;
    const pct = Math.min(100, Math.round((totalTokens / maxTokens) * 100));

    // Live Meter Elements
    const countDisplay = document.getElementById('cb-token-count-text');
    const fillBar = document.getElementById('cb-token-gauge-fill');

    if (countDisplay) {
      countDisplay.textContent = `${totalTokens.toLocaleString()} / 4,096 Tokens`;
      countDisplay.style.color = pct > 90 ? '#ef4444' : pct > 75 ? '#f59e0b' : '#38bdf8';
    }

    if (fillBar) {
      fillBar.style.width = `${pct}%`;
      fillBar.style.backgroundColor = pct > 90 ? '#ef4444' : pct > 75 ? '#f59e0b' : '#38bdf8';
    }

    // Breakdown Table Rows
    const share = tok => totalTokens > 0 ? `${Math.round((tok / totalTokens) * 100)}%` : '0%';

    const tbody = document.getElementById('cb-token-table-body');
    if (tbody) {
      tbody.innerHTML = `
        <tr><td>🎭 System Tone</td><td>${sysText.length}</td><td>${sysTokens}</td><td>${share(sysTokens)}</td></tr>
        <tr><td>🌍 World Scope</td><td>${worldText.length}</td><td>${worldTokens}</td><td>${share(worldTokens)}</td></tr>
        <tr><td>👥 Active Slate</td><td>${slateText.length}</td><td>${slateTokens}</td><td>${share(slateTokens)}</td></tr>
        <tr><td>📜 Scene Beats & Task</td><td>${taskText.length}</td><td>${taskTokens}</td><td>${share(taskTokens)}</td></tr>
        <tr class="total-row">
          <td><strong>Total Prompt Payload</strong></td>
          <td><strong>${totalChars.toLocaleString()}</strong></td>
          <td><strong>${totalTokens.toLocaleString()}</strong></td>
          <td><strong>100%</strong></td>
        </tr>
      `;
    }
  },

  // --- SNAPSHOT MANAGEMENT ---
  loadSavedSnapshots() {
    try {
      const saved = localStorage.getItem('lore_vault_context_snapshots');
      this.state.snapshots = saved ? JSON.parse(saved) : this.getDefaultSnapshots();
    } catch (e) {
      this.state.snapshots = this.getDefaultSnapshots();
    }
    this.renderSnapshotDropdown();
  },

  getDefaultSnapshots() {
    return {
      'snap-1': {
        name: '🧙‍♂️ Session 12 Dungeon Prep',
        preset: 'session_prep',
        tone: 'Academic',
        serializer: 'Markdown',
        taskInstructions: 'Generate room-by-room dungeon hazards and creature tactics for tonight\'s session.'
      },
      'snap-2': {
        name: '⚔️ Elena & Corvus Shadow Duel',
        preset: 'cowriter',
        tone: 'Action',
        serializer: 'Markdown',
        taskInstructions: 'Write a high-stakes confrontation in the cathedral ruin.'
      }
    };
  },

  renderSnapshotDropdown() {
    const dropdown = document.getElementById('cb-load-snapshot');
    if (!dropdown) return;

    dropdown.innerHTML = `<option value="">📂 Load Slate Snapshot...</option>` +
      Object.keys(this.state.snapshots).map(id => {
        const snap = this.state.snapshots[id];
        return `<option value="${id}">${this.escapeHtml(snap.name)}</option>`;
      }).join('');
  },

  openSaveSnapshotModal() {
    const name = prompt('Enter a title for this Slate Snapshot:', `Slate Backup - ${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`);
    if (!name) return;

    const id = `snap-${Date.now()}`;
    this.state.snapshots[id] = {
      name,
      preset: this.state.system.preset,
      tone: this.state.system.tone,
      selectedArticleIds: Array.from(this.state.slate.selectedArticleIds),
      relationships: { ...this.state.slate.relationships },
      serializer: this.state.inspector.serializer,
      taskInstructions: this.state.workingState.taskInstructions,
      sceneBeats: this.state.workingState.sceneBeats
    };

    try {
      localStorage.setItem('lore_vault_context_snapshots', JSON.stringify(this.state.snapshots));
    } catch (e) {
      console.warn('LocalStorage save failed:', e);
    }

    this.renderSnapshotDropdown();
    const dropdown = document.getElementById('cb-load-snapshot');
    if (dropdown) dropdown.value = id;
    alert(`✓ Slate snapshot "${name}" saved!`);
  },

  loadSnapshot(id) {
    if (!id || !this.state.snapshots[id]) return;
    const snap = this.state.snapshots[id];

    if (snap.preset) this.state.system.preset = snap.preset;
    if (snap.tone) this.state.system.tone = snap.tone;
    if (snap.serializer) this.state.inspector.serializer = snap.serializer;
    if (snap.taskInstructions) this.state.workingState.taskInstructions = snap.taskInstructions;
    if (snap.sceneBeats) this.state.workingState.sceneBeats = snap.sceneBeats;
    if (snap.selectedArticleIds) this.state.slate.selectedArticleIds = new Set(snap.selectedArticleIds);
    if (snap.relationships) this.state.slate.relationships = { ...snap.relationships };

    this.renderAll();
    this.compileContext();
  },

  // --- COPY TO CLIPBOARD ---
  copyToClipboard() {
    const outputEl = document.getElementById('compiled-llm-output');
    if (!outputEl || !outputEl.value) {
      alert('Nothing to copy yet. Compile a context prompt first!');
      return;
    }
    navigator.clipboard.writeText(outputEl.value).then(() => {
      const copyBtn = document.getElementById('copy-context-btn');
      if (copyBtn) {
        const original = copyBtn.innerHTML;
        copyBtn.innerHTML = `✓ Copied!`;
        copyBtn.style.backgroundColor = '#10b981';
        setTimeout(() => {
          copyBtn.innerHTML = original;
          copyBtn.style.backgroundColor = '';
        }, 2000);
      }
    });
  },

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
};

window.ContextBuilder = ContextBuilder;
