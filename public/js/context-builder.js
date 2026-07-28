/**
 * LLM Context Synthesizer & Book Writing Assistant
 */

const ContextBuilder = {
  selectedArticleIds: new Set(),
  articles: [],

  init(articlesList) {
    this.articles = articlesList || [];
    this.renderArticlePicker();
  },

  toggleArticle(id) {
    if (this.selectedArticleIds.has(id)) {
      this.selectedArticleIds.delete(id);
    } else {
      this.selectedArticleIds.add(id);
    }
    this.updateSelectedCount();
    this.renderArticlePicker();
  },

  selectAll() {
    this.articles.forEach(a => this.selectedArticleIds.add(a.id));
    this.updateSelectedCount();
    this.renderArticlePicker();
  },

  clearAll() {
    this.selectedArticleIds.clear();
    this.updateSelectedCount();
    this.renderArticlePicker();
  },

  updateSelectedCount() {
    const el = document.getElementById('selected-count');
    if (el) el.textContent = `${this.selectedArticleIds.size} Selected`;
  },

  renderArticlePicker() {
    const container = document.getElementById('context-article-list');
    if (!container) return;

    if (this.articles.length === 0) {
      container.innerHTML = `<div class="empty-state">No lore articles available yet.</div>`;
      return;
    }

    container.innerHTML = this.articles.map(art => {
      const isChecked = this.selectedArticleIds.has(art.id);
      return `
        <label class="context-item ${isChecked ? 'active' : ''}">
          <input type="checkbox" ${isChecked ? 'checked' : ''} onchange="ContextBuilder.toggleArticle('${art.id}')">
          <div class="context-item-info">
            <span class="context-item-title">${art.title}</span>
            <span class="context-item-category badge badge-${art.category.toLowerCase().replace(/[^a-z0-9]/g, '')}">${art.category}</span>
          </div>
        </label>
      `;
    }).join('');
  },

  async compileContext() {
    const ids = Array.from(this.selectedArticleIds);
    if (ids.length === 0) {
      alert('Please select at least one lore article to include in the context pack.');
      return;
    }

    const summariesOnly = document.getElementById('summaries-only-check')?.checked || false;
    const instructions = document.getElementById('custom-llm-instructions')?.value || '';
    const preset = document.getElementById('preset-selector')?.value || 'custom';

    let customText = instructions;
    if (preset === 'scene') {
      customText = `TASK: Write a dramatic scene taking place in the selected location. Ensure character traits, magic laws, and faction conflicts detailed in the lore context are strictly respected.`;
    } else if (preset === 'consistency') {
      customText = `TASK: Review the following draft scene for lore consistency. Highlight any contradictions with the canonical character traits, factions, or world rules provided.`;
    } else if (preset === 'brainstorm') {
      customText = `TASK: Brainstorm 5 plot hooks or secret lore twists involving the selected factions and location lore.`;
    }

    try {
      const response = await fetch('/api/context/compile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          articleIds: ids,
          includeSummariesOnly: summariesOnly,
          customInstructions: customText
        })
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      const outputEl = document.getElementById('compiled-llm-output');
      if (outputEl) {
        outputEl.value = data.compiledPrompt;
      }
    } catch (err) {
      alert('Failed to compile context: ' + err.message);
    }
  },

  copyToClipboard() {
    const outputEl = document.getElementById('compiled-llm-output');
    if (!outputEl || !outputEl.value) {
      alert('Nothing to copy yet. Compile a context pack first!');
      return;
    }
    navigator.clipboard.writeText(outputEl.value).then(() => {
      const copyBtn = document.getElementById('copy-context-btn');
      const original = copyBtn.innerHTML;
      copyBtn.innerHTML = `✓ Copied to Clipboard!`;
      copyBtn.classList.add('success');
      setTimeout(() => {
        copyBtn.innerHTML = original;
        copyBtn.classList.remove('success');
      }, 2500);
    });
  }
};
