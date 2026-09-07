/**
 * LoreVault - Manuscript Studio & Writer's Journey Suite
 * Pillars: Manuscript Binder, Margin Inspector, Zen Studio, Prose Telemetry, Socratic Scene Auditor & Voice Mirror
 */

class ManuscriptView {
  constructor() {
    this.currentWorldId = 'default';
    this.chapters = [];
    this.acts = [];
    this.activeChapterId = null;
    this.autosaveTimer = null;
    this.wpmTimer = null;
    this.typingStartTime = null;
    this.wordsTypedInSession = 0;
    this.isTypewriterMode = false;
    this.telemetryDebounce = null;

    // Typography state
    this.currentFont = localStorage.getItem('lorevault_manuscript_font') || 'serif';
    this.currentWidth = localStorage.getItem('lorevault_manuscript_width') || 'focus';
    this.fontSizeLevel = Number(localStorage.getItem('lorevault_manuscript_fontsize')) || 1; // 0=sm, 1=md, 2=lg

    // Word sprint state
    this.sprintDuration = 15 * 60;
    this.sprintRemaining = 15 * 60;
    this.sprintRunning = false;
    this.sprintTimer = null;
    this.sprintStartWords = 0;

    // Lore companion state
    this.loreArticles = [];
    this.companionOpen = false;
  }

  async init(worldId = 'default') {
    this.currentWorldId = worldId;
    await this.loadManuscriptData();
    this.bindEvents();
    this.initMarginInspector();
    this.applyStoredTypography();
    this.loadLoreCompanionArticles();
  }

  async loadManuscriptData() {
    try {
      const res = await fetch(`/api/manuscripts/${this.currentWorldId}`);
      const data = await res.json();
      if (data && data.success) {
        this.chapters = data.chapters || [];
        this.acts = data.acts || [];
        this.renderBinder(data);
        if (this.chapters.length > 0 && !this.activeChapterId) {
          this.selectChapter(this.chapters[0].id);
        } else if (this.activeChapterId) {
          const current = this.chapters.find(c => c.id === this.activeChapterId);
          if (current) this.renderActiveChapter(current);
          else if (this.chapters[0]) this.selectChapter(this.chapters[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load manuscript data:', err);
    }
  }

  renderBinder(data) {
    const listContainer = document.getElementById('manuscript-chapter-list');
    const progressBar = document.getElementById('manuscript-overall-progress');
    const metricsLabel = document.getElementById('manuscript-metrics-label');

    if (progressBar) {
      progressBar.style.width = `${data.progress_pct || 0}%`;
    }
    if (metricsLabel) {
      metricsLabel.textContent = `${(data.total_words || 0).toLocaleString()} / ${(data.target_words || 50000).toLocaleString()} words (${data.progress_pct || 0}%) • ${data.total_chapters || 0} Chapters`;
    }

    if (!listContainer) return;

    if (!data.acts || data.acts.length === 0 || data.total_chapters === 0) {
      listContainer.innerHTML = `
        <div class="empty-binder-card" style="padding: 2rem; text-align: center; color: var(--text-muted);">
          <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">📖</div>
          <h4>No Chapters in Manuscript</h4>
          <p>Begin your novel or campaign story by adding your first chapter.</p>
          <button class="btn btn-primary" onclick="window.manuscriptView.openCreateChapterModal()" style="margin-top: 1rem;">+ Add Chapter 1</button>
        </div>
      `;
      return;
    }

    let html = '';
    data.acts.forEach(act => {
      html += `
        <div class="manuscript-act-group" data-act="${act.act_number}">
          <div class="manuscript-act-header">
            <span class="act-title"><i class="fa-solid fa-bookmark"></i> ${act.act_title}</span>
            <span class="act-word-badge">${(act.act_words || 0).toLocaleString()} w</span>
          </div>
          <div class="manuscript-chapter-cards">
      `;

      (act.chapters || []).forEach(ch => {
        const isActive = ch.id === this.activeChapterId ? 'active' : '';
        const statusClass = `status-${(ch.status || 'Draft').toLowerCase()}`;
        const povTag = ch.pov_character_name ? `<span class="pov-badge">👤 ${this.escapeHtml(ch.pov_character_name)}</span>` : '';
        const locTag = ch.location_name ? `<span class="loc-badge">📍 ${this.escapeHtml(ch.location_name)}</span>` : '';

        html += `
          <div class="manuscript-chapter-card ${isActive}" data-id="${ch.id}" onclick="window.manuscriptView.selectChapter('${ch.id}')">
            <div class="chapter-card-top">
              <span class="chapter-num">Ch. ${ch.chapter_number}</span>
              <span class="chapter-status-pill ${statusClass}">${ch.status || 'Draft'}</span>
            </div>
            <div class="chapter-card-title">${this.escapeHtml(ch.title)}</div>
            <div class="chapter-card-meta">
              <span class="chapter-word-count">${(ch.current_word_count || 0).toLocaleString()} / ${ch.target_word_count || 3000} w</span>
              ${povTag}
              ${locTag}
            </div>
          </div>
        `;
      });

      html += `
          </div>
        </div>
      `;
    });

    listContainer.innerHTML = html;
  }

  selectChapter(chapterId) {
    this.activeChapterId = chapterId;
    const chapter = this.chapters.find(c => c.id === chapterId);
    if (!chapter) return;

    // Highlight card
    document.querySelectorAll('.manuscript-chapter-card').forEach(c => {
      c.classList.toggle('active', c.dataset.id === chapterId);
    });

    this.renderActiveChapter(chapter);
  }

  renderActiveChapter(chapter) {
    const titleInput = document.getElementById('manuscript-edit-title');
    const actInput = document.getElementById('manuscript-edit-act');
    const numInput = document.getElementById('manuscript-edit-num');
    const statusSelect = document.getElementById('manuscript-edit-status');
    const targetWordsInput = document.getElementById('manuscript-edit-target-words');
    const summaryInput = document.getElementById('manuscript-edit-summary');
    const contentTextarea = document.getElementById('manuscript-edit-content');

    if (titleInput) titleInput.value = chapter.title || '';
    if (actInput) actInput.value = chapter.act_number || 1;
    if (numInput) numInput.value = chapter.chapter_number || 1;
    if (statusSelect) statusSelect.value = chapter.status || 'Draft';
    if (targetWordsInput) targetWordsInput.value = chapter.target_word_count || 3000;
    if (summaryInput) summaryInput.value = chapter.summary || '';
    if (contentTextarea) {
      contentTextarea.value = chapter.content || '';
      this.runProseTelemetry(chapter.content || '');
    }

    this.updateWordCountBadge(chapter.content || '');
  }

  async saveCurrentChapter(isSilent = false) {
    if (!this.activeChapterId) return;

    const titleInput = document.getElementById('manuscript-edit-title');
    const actInput = document.getElementById('manuscript-edit-act');
    const numInput = document.getElementById('manuscript-edit-num');
    const statusSelect = document.getElementById('manuscript-edit-status');
    const targetWordsInput = document.getElementById('manuscript-edit-target-words');
    const summaryInput = document.getElementById('manuscript-edit-summary');
    const contentTextarea = document.getElementById('manuscript-edit-content');

    const payload = {
      id: this.activeChapterId,
      world_id: this.currentWorldId,
      title: titleInput ? titleInput.value : 'Untitled Chapter',
      act_number: actInput ? Number(actInput.value) : 1,
      chapter_number: numInput ? Number(numInput.value) : 1,
      status: statusSelect ? statusSelect.value : 'Draft',
      target_word_count: targetWordsInput ? Number(targetWordsInput.value) : 3000,
      summary: summaryInput ? summaryInput.value : '',
      content: contentTextarea ? contentTextarea.value : ''
    };

    try {
      const res = await fetch('/api/manuscripts/chapters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data && data.success) {
        // Also buffer to autosave
        this.saveAutosaveBuffer(this.activeChapterId, payload.content);
        if (!isSilent) {
          if (window.showToast) window.showToast('Chapter saved successfully', 'success');
        }
        this.setAutosaveStatus('🟢 Saved');
        await this.loadManuscriptData();
      }
    } catch (err) {
      console.error('Failed to save chapter:', err);
      this.setAutosaveStatus('🔴 Save Error');
    }
  }

  async saveAutosaveBuffer(chapterId, content) {
    try {
      await fetch('/api/manuscripts/autosave-buffer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target_id: chapterId,
          target_type: 'chapter',
          content: content,
          word_count: content.trim() ? content.trim().split(/\s+/).length : 0
        })
      });
    } catch (e) {}
  }

  setAutosaveStatus(text) {
    const el = document.getElementById('manuscript-autosave-indicator');
    if (el) el.textContent = text;
  }

  updateWordCountBadge(text) {
    const badge = document.getElementById('manuscript-chapter-words-badge');
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    if (badge) badge.textContent = `${words.toLocaleString()} words`;
  }

  // --- 4. PROSE TELEMETRY ENGINE ---
  async runProseTelemetry(text) {
    if (!text || !text.trim()) {
      this.renderTelemetryResults(null);
      return;
    }

    try {
      const res = await fetch('/api/prose/analyze-telemetry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });
      const data = await res.json();
      if (data && data.success) {
        this.renderTelemetryResults(data);
      }
    } catch (err) {
      console.error('Telemetry error:', err);
    }
  }

  renderTelemetryResults(data) {
    const sparklineElem = document.getElementById('telemetry-sparkline');
    const sensoryElem = document.getElementById('telemetry-sensory-bar');
    const dialogueElem = document.getElementById('telemetry-dialogue-ratio');
    const readabilityElem = document.getElementById('telemetry-readability-badge');
    const adverbElem = document.getElementById('telemetry-adverb-badge');

    if (!data || data.total_words === 0) {
      if (sparklineElem) sparklineElem.innerHTML = '<span style="color:var(--text-muted); font-size:0.8rem;">Type to see sentence rhythm</span>';
      return;
    }

    // Sparkline of sentence lengths
    if (sparklineElem && data.sentence_metrics && data.sentence_metrics.sparkline) {
      const points = data.sentence_metrics.sparkline;
      const maxLen = Math.max(...points, 35);
      const svgBars = points.map((len, idx) => {
        const h = Math.min(30, Math.max(4, Math.round((len / maxLen) * 30)));
        const color = len < 10 ? '#38bdf8' : (len <= 25 ? '#10b981' : '#f59e0b');
        return `<rect x="${idx * 8}" y="${32 - h}" width="6" height="${h}" rx="2" fill="${color}"><title>Sentence ${idx + 1}: ${len} words</title></rect>`;
      }).join('');
      sparklineElem.innerHTML = `<svg width="${points.length * 8}" height="34" style="overflow:visible;">${svgBars}</svg>`;
    }

    // Dialogue ratio
    if (dialogueElem && data.dialogue_ratio) {
      dialogueElem.innerHTML = `
        <div style="display:flex; justify-content:space-between; font-size:0.75rem; margin-bottom:2px;">
          <span>💬 Dialogue: ${data.dialogue_ratio.dialogue_pct}%</span>
          <span>📖 Narration: ${data.dialogue_ratio.narrative_pct}%</span>
        </div>
        <div style="width:100%; height:6px; background:var(--surface-card); border-radius:3px; overflow:hidden; display:flex;">
          <div style="width:${data.dialogue_ratio.dialogue_pct}%; background:#8b5cf6;"></div>
          <div style="width:${data.dialogue_ratio.narrative_pct}%; background:#3b82f6;"></div>
        </div>
      `;
    }

    // Sensory breakdown
    if (sensoryElem && data.sensory_density) {
      const s = data.sensory_density;
      sensoryElem.innerHTML = `
        <span title="Visual cues" class="sensory-chip">👁️ ${s.visual}</span>
        <span title="Auditory cues" class="sensory-chip">👂 ${s.auditory}</span>
        <span title="Tactile cues" class="sensory-chip">✋ ${s.tactile}</span>
        <span title="Olfactory cues" class="sensory-chip">👃 ${s.olfactory}</span>
        <span title="Gustatory cues" class="sensory-chip">👅 ${s.gustatory}</span>
      `;
    }

    if (readabilityElem && data.readability) {
      readabilityElem.textContent = `Grade ${data.readability.flesch_kincaid_grade} (Ease: ${data.readability.reading_ease})`;
    }

    if (adverbElem && data.stylistic_friction) {
      adverbElem.textContent = `${data.stylistic_friction.adverb_density_pct}% Adverbs (${data.stylistic_friction.adverb_count})`;
    }
  }

  // --- 2. DYNAMIC MARGIN INSPECTOR ---
  initMarginInspector() {
    const editor = document.getElementById('manuscript-edit-content');
    if (!editor) return;

    let hoverTimeout = null;

    editor.addEventListener('mouseup', () => {
      const selected = window.getSelection().toString().trim();
      if (selected && selected.length >= 3 && selected.length <= 40) {
        this.inspectEntity(selected);
      }
    });

    editor.addEventListener('input', () => {
      clearTimeout(this.telemetryDebounce);
      this.setAutosaveStatus('🟡 Editing...');
      this.telemetryDebounce = setTimeout(() => {
        this.saveCurrentChapter(true);
        this.runProseTelemetry(editor.value);
      }, 1200);
    });
  }

  async inspectEntity(queryOrId) {
    try {
      const res = await fetch(`/api/lore/inspector-entity?world_id=${this.currentWorldId}&query=${encodeURIComponent(queryOrId)}`);
      const data = await res.json();
      if (data && data.success && data.entity) {
        this.showMarginInspectorCard(data.entity);
      }
    } catch (e) {}
  }

  showMarginInspectorCard(entity) {
    const card = document.getElementById('lore-margin-inspector');
    if (!card) return;

    card.innerHTML = `
      <div class="margin-card-header">
        <span class="margin-card-cat badge">${this.escapeHtml(entity.category)}</span>
        <button class="margin-close-btn" onclick="document.getElementById('lore-margin-inspector').classList.add('hidden')">✕</button>
      </div>
      <h4 class="margin-card-title">${this.escapeHtml(entity.title)}</h4>
      <p class="margin-card-summary">${this.escapeHtml(entity.summary)}</p>
      ${entity.statblock ? `<div class="margin-stat-row"><strong>AC:</strong> ${entity.statblock.armor_class} • <strong>HP:</strong> ${entity.statblock.hit_points} • <strong>CR:</strong> ${entity.statblock.challenge_rating}</div>` : ''}
      ${entity.relationships && entity.relationships.length > 0 ? `
        <div class="margin-rel-list">
          <small><strong>Ties:</strong></small>
          ${entity.relationships.map(r => `<span class="rel-tag">${r.relationship_type}: ${this.escapeHtml(r.target_entity_title)}</span>`).join(' ')}
        </div>
      ` : ''}
    `;

    card.classList.remove('hidden');
  }

  // --- 5. SOCRATIC AUDITOR & VOICE MIRROR ---
  async runSocraticSceneAudit() {
    const content = document.getElementById('manuscript-edit-content')?.value || '';
    const modal = document.getElementById('socratic-auditor-modal');
    const container = document.getElementById('socratic-audit-results');

    if (!content.trim()) {
      if (window.showToast) window.showToast('Please write some chapter content first', 'warning');
      return;
    }

    const socraticBtn = document.getElementById('manuscript-socratic-btn');
    if (socraticBtn) {
      socraticBtn.disabled = true;
      socraticBtn.dataset.origText = socraticBtn.innerHTML;
      socraticBtn.innerHTML = '⏳ Auditing...';
    }

    if (modal) modal.classList.remove('hidden');
    if (container) container.innerHTML = '<div style="padding:2rem; text-align:center;"><span class="spinner"></span> Arthur Vance is stress-testing narrative causality and stakes...</div>';

    try {
      const res = await fetch('/api/prose/socratic-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scene_text: content,
          world_id: this.currentWorldId,
          scene_goal: document.getElementById('manuscript-edit-summary')?.value || 'Chapter scene progress'
        })
      });
      const data = await res.json();
      if (data && data.success) {
        this.renderSocraticResults(data);
      }
    } catch (err) {
      if (container) container.innerHTML = '<div class="alert alert-danger">Failed to run Socratic audit.</div>';
    } finally {
      if (socraticBtn) {
        socraticBtn.disabled = false;
        socraticBtn.innerHTML = socraticBtn.dataset.origText || '🔍 Socratic Audit';
      }
    }
  }

  renderSocraticResults(data) {
    const container = document.getElementById('socratic-audit-results');
    if (!container) return;

    let probesHtml = (data.five_whys_probes || []).map(p => `
      <div class="socratic-probe-card severity-${(p.severity || 'medium').toLowerCase()}">
        <div class="probe-q">🔍 <strong>${this.escapeHtml(p.probe)}</strong></div>
        <div class="probe-finding">${this.escapeHtml(p.audit_finding)}</div>
      </div>
    `).join('');

    container.innerHTML = `
      <div class="socratic-score-banner">
        <div>
          <h3>Verdict: <span class="verdict-tag">${this.escapeHtml(data.socratic_verdict || 'Pass')}</span></h3>
          <p>Scene Health & Stakes Integrity Score</p>
        </div>
        <div class="score-circle">${data.scene_health_score || 85}</div>
      </div>

      <div class="socratic-section">
        <h4>⚡ Cost of Failure & Stakes</h4>
        <p>${this.escapeHtml(data.cost_of_failure_analysis || 'Stakes are balanced.')}</p>
      </div>

      <div class="socratic-section">
        <h4>🔥 Arthur's 5-Whys Interrogation Probes</h4>
        <div class="probes-grid">${probesHtml}</div>
      </div>

      <div class="socratic-section">
        <h4>💡 Actionable Narrative Recommendations</h4>
        <ul>
          ${(data.arthurs_recommendations || []).map(r => `<li>${this.escapeHtml(r)}</li>`).join('')}
        </ul>
      </div>
    `;
  }

  async runVoiceMirror() {
    const content = document.getElementById('manuscript-edit-content')?.value || '';
    const modal = document.getElementById('voice-mirror-modal');
    const container = document.getElementById('voice-mirror-results');
    const charName = prompt('Enter Character Name to analyze dialogue tone:');

    if (!charName) return;

    const voiceBtn = document.getElementById('manuscript-voice-btn');
    if (voiceBtn) {
      voiceBtn.disabled = true;
      voiceBtn.dataset.origText = voiceBtn.innerHTML;
      voiceBtn.innerHTML = '⏳ Analyzing...';
    }

    if (modal) modal.classList.remove('hidden');
    if (container) container.innerHTML = `<div style="padding:2rem; text-align:center;"><span class="spinner"></span> Elena Rostova is comparing dialogue against ${this.escapeHtml(charName)}'s voice...</div>`;

    try {
      const res = await fetch('/api/prose/voice-mirror', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scene_text: content,
          character_name: charName,
          world_id: this.currentWorldId
        })
      });
      const data = await res.json();
      if (data && data.success) {
        container.innerHTML = `
          <div class="voice-score-banner">
            <div>
              <h3>Character: <strong>${this.escapeHtml(data.character_name)}</strong></h3>
              <p>Voice Tone Rating: <span class="badge badge-primary">${this.escapeHtml(data.tone_rating || 'Distinct')}</span></p>
            </div>
            <div class="score-circle">${data.voice_consistency_score || 88}</div>
          </div>
          <div class="voice-section">
            <h4>🗣️ Speech Cadence & Quirk Analysis</h4>
            <p>${this.escapeHtml(data.speech_quirk_analysis || 'Clean dialogue cadence.')}</p>
          </div>
          <div class="voice-section">
            <h4>🖋️ Elena's Dialogue Craft Notes</h4>
            <ul>
              ${(data.elena_craft_notes || []).map(n => `<li>${this.escapeHtml(n)}</li>`).join('')}
            </ul>
          </div>
        `;
      }
    } catch (e) {
      if (container) container.innerHTML = '<div class="alert alert-danger">Failed to run Voice Mirror.</div>';
    } finally {
      if (voiceBtn) {
        voiceBtn.disabled = false;
        voiceBtn.innerHTML = voiceBtn.dataset.origText || '🗣️ Voice Mirror';
      }
    }
  }

  async openCreateChapterModal() {
    const title = prompt('Enter New Chapter Title:');
    if (!title) return;

    const nextNum = (this.chapters.length || 0) + 1;
    try {
      const res = await fetch('/api/manuscripts/chapters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          world_id: this.currentWorldId,
          act_number: 1,
          chapter_number: nextNum,
          title: title,
          target_word_count: 3000,
          status: 'Draft',
          content: ''
        })
      });
      const data = await res.json();
      if (data && data.success) {
        if (window.showToast) window.showToast('Chapter created!', 'success');
        await this.loadManuscriptData();
        this.selectChapter(data.id);
      }
    } catch (e) {}
  }

  async deleteCurrentChapter() {
    if (!this.activeChapterId) return;
    if (!confirm('Are you sure you want to delete this chapter? This action cannot be undone.')) return;

    try {
      const res = await fetch(`/api/manuscripts/chapters/${this.activeChapterId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data && data.success) {
        if (window.showToast) window.showToast('Chapter deleted', 'info');
        this.activeChapterId = null;
        await this.loadManuscriptData();
      }
    } catch (e) {}
  }

  async exportManuscript() {
    try {
      const res = await fetch('/api/manuscripts/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          world_id: this.currentWorldId,
          include_summaries: true,
          mode: 'dm'
        })
      });
      const data = await res.json();
      if (data && data.success) {
        const blob = new Blob([data.compiled_manuscript], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `manuscript_${this.currentWorldId}.md`;
        a.click();
        URL.revokeObjectURL(url);
        if (window.showToast) window.showToast(`Manuscript exported (${data.word_count.toLocaleString()} words)`, 'success');
      }
    } catch (e) {
      alert('Failed to export manuscript: ' + e.message);
    }
  }

  toggleTypewriterFocus() {
    const editorContainer = document.getElementById('manuscript-editor-pane');
    if (!editorContainer) return;

    this.isTypewriterMode = !this.isTypewriterMode;
    editorContainer.classList.toggle('typewriter-zen-mode', this.isTypewriterMode);
    if (window.showToast) {
      window.showToast(this.isTypewriterMode ? 'Zen Typewriter Mode Enabled' : 'Standard Editor Mode', 'info');
    }
  }

  bindEvents() {
    if (this.eventsBound) return;
    this.eventsBound = true;

    const saveBtn = document.getElementById('manuscript-save-btn');
    if (saveBtn) saveBtn.addEventListener('click', () => this.saveCurrentChapter());

    const addBtn = document.getElementById('manuscript-add-chapter-btn');
    if (addBtn) addBtn.addEventListener('click', () => this.openCreateChapterModal());

    const exportBtn = document.getElementById('manuscript-export-btn');
    if (exportBtn) exportBtn.addEventListener('click', () => this.exportManuscript());

    const socraticBtn = document.getElementById('manuscript-socratic-btn');
    if (socraticBtn) socraticBtn.addEventListener('click', () => this.runSocraticSceneAudit());

    const voiceBtn = document.getElementById('manuscript-voice-btn');
    if (voiceBtn) voiceBtn.addEventListener('click', () => this.runVoiceMirror());

    const zenBtn = document.getElementById('manuscript-typewriter-btn');
    if (zenBtn) zenBtn.addEventListener('click', () => this.toggleTypewriterFocus());

    const deleteBtn = document.getElementById('manuscript-delete-chapter-btn');
    if (deleteBtn) deleteBtn.addEventListener('click', () => this.deleteCurrentChapter());
  }

  /* ==========================================================================
     LITERARY TYPOGRAPHY ENGINE & READING WIDTH
     ========================================================================== */

  applyStoredTypography() {
    this.setFont(this.currentFont);
    this.setWidth(this.currentWidth);
    this.applyFontSize();
  }

  setFont(fontName) {
    this.currentFont = fontName || 'serif';
    const textarea = document.getElementById('manuscript-edit-content');
    if (textarea) {
      textarea.classList.remove('font-serif', 'font-sans', 'font-mono');
      textarea.classList.add(`font-${this.currentFont}`);
    }
    document.querySelectorAll('.prose-tool-btn[data-font]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.font === this.currentFont);
    });
    localStorage.setItem('lorevault_manuscript_font', this.currentFont);
  }

  setWidth(widthName) {
    this.currentWidth = widthName || 'focus';
    const textarea = document.getElementById('manuscript-edit-content');
    if (textarea) {
      textarea.classList.remove('width-focus', 'width-wide', 'width-full');
      textarea.classList.add(`width-${this.currentWidth}`);
    }
    document.querySelectorAll('.prose-tool-btn[data-width]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.width === this.currentWidth);
    });
    localStorage.setItem('lorevault_manuscript_width', this.currentWidth);
  }

  adjustFontSize(delta) {
    this.fontSizeLevel = Math.max(0, Math.min(2, this.fontSizeLevel + delta));
    this.applyFontSize();
    localStorage.setItem('lorevault_manuscript_fontsize', this.fontSizeLevel);
  }

  applyFontSize() {
    const textarea = document.getElementById('manuscript-edit-content');
    if (!textarea) return;
    textarea.classList.remove('font-size-sm', 'font-size-md', 'font-size-lg');
    const classes = ['font-size-sm', 'font-size-md', 'font-size-lg'];
    textarea.classList.add(classes[this.fontSizeLevel]);
  }

  /* ==========================================================================
     PROSE FORMATTING ACTIONS
     ========================================================================== */

  applyFormat(type) {
    const textarea = document.getElementById('manuscript-edit-content');
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const val = textarea.value;
    const selected = val.substring(start, end);

    let replacement = '';
    let cursorOffset = 0;

    if (type === 'bold') {
      replacement = `**${selected || 'bold text'}**`;
      cursorOffset = selected ? replacement.length : 2;
    } else if (type === 'italic') {
      replacement = `*${selected || 'italic text'}*`;
      cursorOffset = selected ? replacement.length : 1;
    } else if (type === 'heading') {
      replacement = `\n## ${selected || 'Chapter Heading'}\n`;
      cursorOffset = replacement.length;
    } else if (type === 'quote') {
      replacement = `\n> ${selected || 'Blockquote prose text...'}\n`;
      cursorOffset = replacement.length;
    } else if (type === 'break') {
      replacement = `\n\n* * *\n\n`;
      cursorOffset = replacement.length;
    } else if (type === 'link') {
      const entity = prompt('Enter Lore Entity Title to link (e.g. Elena Rostova):');
      if (!entity) return;
      replacement = `@[${entity}]`;
      cursorOffset = replacement.length;
    }

    textarea.value = val.substring(0, start) + replacement + val.substring(end);
    textarea.focus();
    textarea.setSelectionRange(start + cursorOffset, start + cursorOffset);
    this.triggerAutosave();
    this.updateWordCountBadge(textarea.value);
  }

  /* ==========================================================================
     WORD SPRINT ENGINE
     ========================================================================== */

  toggleSprintHUD() {
    const hud = document.getElementById('manuscript-sprint-hud');
    if (hud) {
      hud.classList.toggle('hidden');
    }
  }

  toggleSprint() {
    const toggleBtn = document.getElementById('sprint-toggle-btn');
    if (this.sprintRunning) {
      this.pauseSprint();
      if (toggleBtn) toggleBtn.textContent = 'Resume';
    } else {
      this.startSprint();
      if (toggleBtn) toggleBtn.textContent = 'Pause';
    }
  }

  startSprint() {
    this.sprintRunning = true;
    const textarea = document.getElementById('manuscript-edit-content');
    const curWords = (textarea?.value || '').trim().split(/\s+/).filter(Boolean).length;
    if (this.sprintStartWords === 0) {
      this.sprintStartWords = curWords;
    }

    if (this.sprintTimer) clearInterval(this.sprintTimer);
    this.sprintTimer = setInterval(() => {
      if (this.sprintRemaining > 0) {
        this.sprintRemaining--;
        this.updateSprintDisplay();
      } else {
        this.pauseSprint();
        if (window.showToast) window.showToast('🎉 Word Sprint Complete! Great drafting focus!', 'success');
      }
    }, 1000);
  }

  pauseSprint() {
    this.sprintRunning = false;
    if (this.sprintTimer) clearInterval(this.sprintTimer);
    this.sprintTimer = null;
  }

  resetSprint(minutes = 15) {
    this.pauseSprint();
    this.sprintDuration = minutes * 60;
    this.sprintRemaining = minutes * 60;
    const textarea = document.getElementById('manuscript-edit-content');
    this.sprintStartWords = (textarea?.value || '').trim().split(/\s+/).filter(Boolean).length;
    const toggleBtn = document.getElementById('sprint-toggle-btn');
    if (toggleBtn) toggleBtn.textContent = 'Start';
    this.updateSprintDisplay();
  }

  updateSprintDisplay() {
    const countdownEl = document.getElementById('sprint-countdown');
    const sessionWordsEl = document.getElementById('sprint-session-words');
    const wpmEl = document.getElementById('sprint-wpm');

    const m = Math.floor(this.sprintRemaining / 60);
    const s = this.sprintRemaining % 60;
    if (countdownEl) countdownEl.textContent = `${m}:${s < 10 ? '0' : ''}${s}`;

    const textarea = document.getElementById('manuscript-edit-content');
    const curWords = (textarea?.value || '').trim().split(/\s+/).filter(Boolean).length;
    const typed = Math.max(0, curWords - this.sprintStartWords);

    if (sessionWordsEl) sessionWordsEl.textContent = typed;
    const elapsedMinutes = Math.max(0.1, (this.sprintDuration - this.sprintRemaining) / 60);
    if (wpmEl) wpmEl.textContent = Math.round(typed / elapsedMinutes);
  }

  /* ==========================================================================
     SCENE SCRATCHPAD
     ========================================================================== */

  toggleScratchpad() {
    const drawer = document.getElementById('manuscript-scratchpad-drawer');
    if (drawer) drawer.classList.toggle('hidden');
  }

  /* ==========================================================================
     SIDE-BY-SIDE LORE COMPANION DOCK
     ========================================================================== */

  toggleLoreCompanion() {
    const dock = document.getElementById('manuscript-lore-dock');
    if (!dock) return;
    this.companionOpen = !this.companionOpen;
    dock.classList.toggle('hidden', !this.companionOpen);
    const btn = document.getElementById('manuscript-lore-companion-btn');
    if (btn) btn.classList.toggle('active', this.companionOpen);
    if (this.companionOpen && this.loreArticles.length === 0) {
      this.loadLoreCompanionArticles();
    }
  }

  async loadLoreCompanionArticles() {
    try {
      const res = await fetch(`/api/articles?world_id=${this.currentWorldId}`);
      const data = await res.json();
      this.loreArticles = (data && data.articles) ? data.articles : (data || []);
      this.renderLoreCompanionList(this.loreArticles);
    } catch (e) {
      console.warn('Failed to load lore companion articles:', e);
    }
  }

  renderLoreCompanionList(articles) {
    const list = document.getElementById('lore-dock-articles-list');
    if (!list) return;

    if (!articles || articles.length === 0) {
      list.innerHTML = '<div style="padding:1rem; text-align:center; color:var(--text-muted); font-size:0.8rem;">No articles found.</div>';
      return;
    }

    list.innerHTML = articles.slice(0, 40).map(a => `
      <div class="lore-dock-card" onclick="window.manuscriptView.previewCompanionArticle('${a.id}')">
        <div class="lore-dock-card-title">${this.escapeHtml(a.title)}</div>
        <div class="lore-dock-card-summary">${this.escapeHtml(a.summary || a.category || 'General Lore')}</div>
        <div class="lore-dock-actions">
          <button class="btn btn-secondary btn-sm" onclick="event.stopPropagation(); window.manuscriptView.insertLoreMention('${this.escapeHtml(a.title)}')" title="Insert @[Title]">@[Link]</button>
        </div>
      </div>
    `).join('');
  }

  filterLoreCompanion(query) {
    const q = (query || '').toLowerCase().trim();
    const filtered = this.loreArticles.filter(a => 
      !q || 
      (a.title && a.title.toLowerCase().includes(q)) || 
      (a.category && a.category.toLowerCase().includes(q)) ||
      (a.tags && a.tags.toLowerCase().includes(q))
    );
    this.renderLoreCompanionList(filtered);
  }

  previewCompanionArticle(articleId) {
    const article = this.loreArticles.find(a => a.id === articleId);
    const previewContainer = document.getElementById('lore-dock-preview');
    if (!article || !previewContainer) return;

    previewContainer.classList.remove('hidden');
    previewContainer.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.4rem;">
        <strong style="color:var(--accent-gold); font-size:0.9rem;">${this.escapeHtml(article.title)}</strong>
        <button class="close-btn-sm" onclick="document.getElementById('lore-dock-preview').classList.add('hidden')">✕</button>
      </div>
      <div style="font-size:0.75rem; color:var(--text-muted); margin-bottom:0.4rem;">Category: ${this.escapeHtml(article.category || 'General')}</div>
      <p style="font-size:0.8rem; line-height:1.4; color:var(--text-secondary); margin-bottom:0.5rem;">${this.escapeHtml(article.summary || (article.content ? article.content.substring(0, 200) + '...' : 'No excerpt available.'))}</p>
      <div style="display:flex; gap:0.4rem;">
        <button class="btn btn-secondary btn-sm" onclick="window.manuscriptView.insertLoreMention('${this.escapeHtml(article.title)}')">📋 Insert Mention</button>
      </div>
    `;
  }

  insertLoreMention(title) {
    this.applyFormatText(`@[${title}]`);
    if (window.showToast) window.showToast(`Inserted @[${title}]`, 'info');
  }

  applyFormatText(textToInsert) {
    const textarea = document.getElementById('manuscript-edit-content');
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const val = textarea.value;

    textarea.value = val.substring(0, start) + textToInsert + val.substring(end);
    textarea.focus();
    textarea.setSelectionRange(start + textToInsert.length, start + textToInsert.length);
    this.triggerAutosave();
    this.updateWordCountBadge(textarea.value);
  }

  escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
}

window.ManuscriptView = ManuscriptView;
window.manuscriptView = new ManuscriptView();
