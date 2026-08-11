class RelationshipView {
  constructor() {
    this.relationships = [];
    this.entities = [];
    this.entityCategoryMap = {};
    this.currentWorldId = 'default';
    this.selectedRel = null;
    this.eventsBound = false;
  }

  async init(worldId = 'default') {
    this.currentWorldId = worldId;
    if (!this.eventsBound) {
      this.bindEvents();
      this.eventsBound = true;
    }
    await this.fetchData();
  }

  bindEvents() {
    document.getElementById('rel-ai-extract-btn')?.addEventListener('click', () => this.extractRelationships());
    document.getElementById('rel-add-btn')?.addEventListener('click', () => this.handleAddRelationship());
    document.getElementById('rel-drawer-close')?.addEventListener('click', () => this.closeDrawer());
    document.getElementById('drawer-save-btn')?.addEventListener('click', () => this.saveRelationship());
    document.getElementById('drawer-spark-btn')?.addEventListener('click', () => this.sparkConflict());
    document.getElementById('drawer-delete-btn')?.addEventListener('click', () => this.deleteRelationship());
    document.getElementById('drawer-sentiment-slider')?.addEventListener('input', (e) => {
      document.getElementById('drawer-sentiment-val').textContent = e.target.value;
    });

    // Toolbar filters and search listeners
    document.getElementById('rel-category-filter')?.addEventListener('change', () => this.renderGrid());
    document.getElementById('rel-type-filter')?.addEventListener('change', () => this.renderGrid());
    document.getElementById('rel-search-input')?.addEventListener('input', () => this.renderGrid());

    // Delegated click handler on relationship grid container for matrix badges
    const container = document.getElementById('relationship-grid-container');
    container?.addEventListener('click', (e) => {
      const badge = e.target.closest('.rel-badge');
      if (badge) {
        const source = badge.getAttribute('data-source');
        const target = badge.getAttribute('data-target');
        if (source && target) {
          this.openDrawer(source, target);
        }
      }
    });
  }

  handleAddRelationship() {
    const source = prompt("Enter Source Entity Name (e.g. House Vance or D'Kara):");
    if (!source || !source.trim()) return;
    const target = prompt("Enter Target Entity Name (e.g. Iron Guild or Kaelen):");
    if (!target || !target.trim()) return;

    this.openDrawer(source.trim(), target.trim());
  }

  async fetchData() {
    try {
      const [relRes, artRes] = await Promise.allSettled([
        fetch(`/api/worlds/${this.currentWorldId}/relationships`),
        fetch(`/api/articles?world_id=${this.currentWorldId}`)
      ]);

      if (relRes.status === 'fulfilled' && relRes.value.ok) {
        const data = await relRes.value.json();
        this.relationships = data.relationships || [];
      } else {
        this.relationships = [];
      }

      this.entityCategoryMap = {};
      if (artRes.status === 'fulfilled' && artRes.value.ok) {
        const artData = await artRes.value.json();
        const articles = Array.isArray(artData) ? artData : (artData.articles || []);
        articles.forEach(a => {
          if (a.title) {
            this.entityCategoryMap[a.title] = a.category || 'General';
          }
        });
      }

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

    const catVal = document.getElementById('rel-category-filter')?.value || 'all';
    const typeVal = document.getElementById('rel-type-filter')?.value || 'all';
    const searchVal = (document.getElementById('rel-search-input')?.value || '').trim().toLowerCase();

    const visibleEntities = this.entities.filter(ent => {
      // 1. Text search query filter
      if (searchVal && !ent.toLowerCase().includes(searchVal)) {
        return false;
      }

      // 2. Category filter
      if (catVal !== 'all') {
        const cat = (this.entityCategoryMap[ent] || '').toLowerCase();
        if (catVal === 'factions') {
          const isFaction = cat.startsWith('faction') || ent.toLowerCase().includes('faction') || ent.toLowerCase().includes('house') || ent.toLowerCase().includes('guild') || ent.toLowerCase().includes('clan') || ent.toLowerCase().includes('order');
          if (!isFaction && cat !== '') return false;
        } else if (catVal === 'characters') {
          const isChar = cat.startsWith('character') || cat.startsWith('person') || cat.startsWith('npc');
          if (!isChar && cat !== '') return false;
        }
      }

      // 3. Relationship type filter
      if (typeVal !== 'all') {
        const hasType = this.relationships.some(r =>
          (r.source_entity_title === ent || r.target_entity_title === ent) &&
          r.relationship_type === typeVal
        );
        if (!hasType) return false;
      }

      return true;
    });

    if (visibleEntities.length === 0) {
      container.innerHTML = `<div class="empty-state" style="padding: 2rem; text-align: center; color: var(--text-muted);">No relationships or entities match the selected filters.</div>`;
      return;
    }

    let html = `<table class="rel-matrix-table"><thead><tr><th class="sticky-col sticky-row">Entity</th>`;
    visibleEntities.forEach(ent => {
      html += `<th class="sticky-row">${this.escapeHtml(ent)}</th>`;
    });
    html += `</tr></thead><tbody>`;

    visibleEntities.forEach(source => {
      html += `<tr><th class="sticky-col">${this.escapeHtml(source)}</th>`;
      visibleEntities.forEach(target => {
        if (source === target) {
          html += `<td class="self-cell">—</td>`;
        } else {
          const rel = this.relationships.find(r => 
            (r.source_entity_title === source && r.target_entity_title === target) ||
            (r.source_entity_title === target && r.target_entity_title === source)
          );
          const type = rel ? rel.relationship_type : 'neutral';
          const label = rel ? type.replace('_', ' ') : '+';
          html += `<td><span class="rel-badge ${type}" data-source="${this.escapeHtml(source)}" data-target="${this.escapeHtml(target)}">${this.escapeHtml(label)}</span></td>`;
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
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}

window.relationshipView = new RelationshipView();
