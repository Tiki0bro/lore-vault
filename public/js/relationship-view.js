class RelationshipView {
  constructor() {
    this.relationships = [];
    this.entities = [];
    this.currentWorldId = 'default';
    this.selectedRel = null;
  }

  async init(worldId = 'default') {
    this.currentWorldId = worldId;
    this.bindEvents();
    await this.fetchData();
  }

  bindEvents() {
    document.getElementById('rel-ai-extract-btn')?.addEventListener('click', () => this.extractRelationships());
    document.getElementById('rel-drawer-close')?.addEventListener('click', () => this.closeDrawer());
    document.getElementById('drawer-save-btn')?.addEventListener('click', () => this.saveRelationship());
    document.getElementById('drawer-spark-btn')?.addEventListener('click', () => this.sparkConflict());
    document.getElementById('drawer-delete-btn')?.addEventListener('click', () => this.deleteRelationship());
    document.getElementById('drawer-sentiment-slider')?.addEventListener('input', (e) => {
      document.getElementById('drawer-sentiment-val').textContent = e.target.value;
    });
  }

  async fetchData() {
    try {
      const res = await fetch(`/api/worlds/${this.currentWorldId}/relationships`);
      const data = await res.json();
      this.relationships = data.relationships || [];
      this.extractEntityList();
      this.renderGrid();
    } catch (err) {
      console.error('Failed to load relationships:', err);
    }
  }

  extractEntityList() {
    const set = new Set();
    this.relationships.forEach(r => {
      if (r.source_entity_title) set.add(r.source_entity_title);
      if (r.target_entity_title) set.add(r.target_entity_title);
    });
    this.entities = Array.from(set).sort();
  }

  renderGrid() {
    const container = document.getElementById('relationship-grid-container');
    if (!container) return;

    if (this.entities.length === 0) {
      container.innerHTML = `<div class="empty-state" style="padding: 2rem; text-align: center; color: var(--text-muted);">No relationship data yet. Click <strong>✨ AI Extract Relationships</strong> to analyze world lore!</div>`;
      return;
    }

    let html = `<table class="rel-matrix-table"><thead><tr><th class="sticky-col sticky-row">Entity</th>`;
    this.entities.forEach(ent => {
      html += `<th class="sticky-row">${this.escapeHtml(ent)}</th>`;
    });
    html += `</tr></thead><tbody>`;

    this.entities.forEach(source => {
      html += `<tr><th class="sticky-col">${this.escapeHtml(source)}</th>`;
      this.entities.forEach(target => {
        if (source === target) {
          html += `<td class="self-cell">—</td>`;
        } else {
          const rel = this.relationships.find(r => 
            (r.source_entity_title === source && r.target_entity_title === target) ||
            (r.source_entity_title === target && r.target_entity_title === source)
          );
          const type = rel ? rel.relationship_type : 'neutral';
          const label = rel ? type.replace('_', ' ') : '+';
          html += `<td><span class="rel-badge ${type}" onclick="window.relationshipView.openDrawer('${this.escapeHtml(source)}', '${this.escapeHtml(target)}')">${label}</span></td>`;
        }
      });
      html += `</tr>`;
    });

    html += `</tbody></table>`;
    container.innerHTML = html;
  }

  openDrawer(source, target) {
    const drawer = document.getElementById('relationship-detail-drawer');
    if (!drawer) return;

    this.selectedRel = this.relationships.find(r => 
      (r.source_entity_title === source && r.target_entity_title === target) ||
      (r.source_entity_title === target && r.target_entity_title === source)
    ) || {
      world_id: this.currentWorldId,
      source_entity_title: source,
      target_entity_title: target,
      relationship_type: 'neutral',
      sentiment_score: 0,
      summary: '',
      is_secret: 0
    };

    document.getElementById('rel-drawer-title').textContent = `${source} ↔ ${target}`;
    document.getElementById('drawer-rel-type').value = this.selectedRel.relationship_type;
    document.getElementById('drawer-sentiment-slider').value = this.selectedRel.sentiment_score;
    document.getElementById('drawer-sentiment-val').textContent = this.selectedRel.sentiment_score;
    document.getElementById('drawer-summary').value = this.selectedRel.summary || '';
    document.getElementById('drawer-is-secret').checked = !!this.selectedRel.is_secret;
    document.getElementById('drawer-conflict-results').classList.add('hidden');

    drawer.classList.remove('hidden');
  }

  closeDrawer() {
    document.getElementById('relationship-detail-drawer')?.classList.add('hidden');
  }

  async saveRelationship() {
    if (!this.selectedRel) return;

    const payload = {
      world_id: this.currentWorldId,
      source_entity_title: this.selectedRel.source_entity_title,
      target_entity_title: this.selectedRel.target_entity_title,
      relationship_type: document.getElementById('drawer-rel-type').value,
      sentiment_score: parseInt(document.getElementById('drawer-sentiment-slider').value, 10),
      summary: document.getElementById('drawer-summary').value,
      is_secret: document.getElementById('drawer-is-secret').checked ? 1 : 0
    };

    try {
      await fetch('/api/relationships', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      this.closeDrawer();
      await this.fetchData();
    } catch (err) {
      alert('Failed to save relationship: ' + err.message);
    }
  }

  async deleteRelationship() {
    if (!this.selectedRel || !this.selectedRel.id) {
      this.closeDrawer();
      return;
    }
    if (!confirm('Are you sure you want to delete this relationship?')) return;
    try {
      await fetch(`/api/relationships/${this.selectedRel.id}`, { method: 'DELETE' });
      this.closeDrawer();
      await this.fetchData();
    } catch (err) {
      alert('Failed to delete relationship: ' + err.message);
    }
  }

  async extractRelationships() {
    const btn = document.getElementById('rel-ai-extract-btn');
    if (btn) btn.disabled = true;
    try {
      const res = await fetch('/api/relationships/auto-extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ world_id: this.currentWorldId })
      });
      const data = await res.json();
      alert(`AI Extraction Complete! ${data.count || 0} relationships found.`);
      await this.fetchData();
    } catch (err) {
      alert('AI Extraction Failed: ' + err.message);
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  async sparkConflict() {
    if (!this.selectedRel) return;
    const container = document.getElementById('drawer-conflict-results');
    if (container) {
      container.classList.remove('hidden');
      container.innerHTML = '⚡ Generating story conflict hooks...';
    }

    try {
      const res = await fetch('/api/relationships/spark-conflict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          world_id: this.currentWorldId,
          source_entity_title: this.selectedRel.source_entity_title,
          target_entity_title: this.selectedRel.target_entity_title
        })
      });
      const data = await res.json();
      if (data.hooks && container) {
        let html = '<h4>🔥 Story Conflict Sparks</h4>';
        data.hooks.forEach(h => {
          html += `<div class="conflict-card"><strong>[${h.type}] ${this.escapeHtml(h.title)}</strong><p>${this.escapeHtml(h.description)}</p></div>`;
        });
        container.innerHTML = html;
      }
    } catch (err) {
      if (container) container.innerHTML = 'Failed to generate conflicts: ' + err.message;
    }
  }

  escapeHtml(str) {
    return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
}

window.relationshipView = new RelationshipView();
