/**
 * FrontpageView Component — Cinematic Public World Wiki Portal & Frontpage Suite
 */
class FrontpageView {
  constructor(containerId, options = {}) {
    this.containerId = containerId;
    this.worldId = options.worldId || 'default';
    this.data = null;
  }

  async init() {
    await this.fetchFrontpage();
    this.render();
  }

  async fetchFrontpage() {
    try {
      const res = await fetch(`/api/worlds/${this.worldId}/frontpage`);
      this.data = await res.json();
    } catch (e) {
      console.error('Failed to fetch frontpage payload:', e);
    }
  }

  render() {
    const container = document.getElementById(this.containerId);
    if (!container || !this.data) return;

    const { world, stats, pinnedArticles } = this.data;

    container.innerHTML = `
      <div class="frontpage-wrapper">
        <div class="frontpage-hero-banner" style="background-image: linear-gradient(to bottom, rgba(0,0,0,0.3), rgba(11,15,25,0.95)), url('${world.banner_image || '/uploads/images/default-banner.png'}');">
          <div class="hero-content">
            <h1>${world.name}</h1>
            <p class="hero-tagline">“${world.tagline || 'An intricate custom setting waiting to be explored.'}”</p>
            <button id="customize-frontpage-btn" class="tool-btn" style="margin-top:12px;"><i class="fa-solid fa-gear"></i> Customize Frontpage</button>
          </div>
        </div>

        <div class="frontpage-metrics-dock">
          <div class="metric-chip"><i class="fa-solid fa-book"></i> <strong>${stats.totalArticles}</strong> Articles</div>
          <div class="metric-chip"><i class="fa-solid fa-folder-tree"></i> <strong>${stats.totalCategories}</strong> Categories</div>
          <button class="tool-btn primary" onclick="window.switchTab('atlas')"><i class="fa-solid fa-map"></i> World Atlas</button>
          <button class="tool-btn" onclick="window.app.openGraphModal()"><i class="fa-solid fa-network-wired"></i> Knowledge Graph</button>
          <button id="copy-portal-share-btn" class="tool-btn"><i class="fa-solid fa-share-nodes"></i> Copy Public Share Link</button>
        </div>

        <section class="frontpage-section">
          <h2 style="margin-bottom: 16px;">⭐ Featured Lore Spotlight</h2>
          <div class="featured-spotlight-grid">
            ${pinnedArticles.length ? pinnedArticles.map(art => `
              <div class="spotlight-card" onclick="window.app.selectArticle('${art.id}'); window.switchTab('library');">
                <span class="category-badge">${art.category}</span>
                <h3 style="margin: 8px 0;">${art.title}</h3>
                <p style="font-size:0.9rem; color:var(--text-secondary, #94a3b8);">${art.summary || (art.content ? art.content.substring(0, 110) + '...' : 'No summary available.')}</p>
              </div>
            `).join('') : '<p>No featured lore spotlight entries pinned yet.</p>'}
          </div>
        </section>
      </div>

      <!-- Customize Frontpage Modal -->
      <div id="customize-frontpage-modal" class="modal-overlay" style="display:none;">
        <div class="modal-card">
          <div class="modal-header">
            <h3><i class="fa-solid fa-sliders"></i> Customize World Frontpage</h3>
            <button id="close-frontpage-modal-btn" class="drawer-close-btn">&times;</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label>Tagline / Synopsis Quote</label>
              <input type="text" id="frontpage-tagline-input" class="form-control" value="${world.tagline || ''}">
            </div>
            <div class="form-group">
              <label>Banner Image URL</label>
              <input type="text" id="frontpage-banner-input" class="form-control" value="${world.banner_image || ''}">
            </div>
          </div>
          <div class="modal-footer" style="display:flex; justify-content:flex-end; gap:10px; margin-top:16px;">
            <button id="cancel-frontpage-modal-btn" class="tool-btn">Cancel</button>
            <button id="save-frontpage-modal-btn" class="tool-btn primary">Save Changes</button>
          </div>
        </div>
      </div>
    `;

    this.bindEvents();
  }

  bindEvents() {
    const btn = document.getElementById('customize-frontpage-btn');
    const modal = document.getElementById('customize-frontpage-modal');
    if (btn && modal) {
      btn.addEventListener('click', () => modal.style.display = 'flex');
    }

    const closeBtn = document.getElementById('close-frontpage-modal-btn');
    const cancelBtn = document.getElementById('cancel-frontpage-modal-btn');
    if (closeBtn) closeBtn.addEventListener('click', () => modal.style.display = 'none');
    if (cancelBtn) cancelBtn.addEventListener('click', () => modal.style.display = 'none');

    const saveBtn = document.getElementById('save-frontpage-modal-btn');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => this.saveChanges());
    }

    const copyBtn = document.getElementById('copy-portal-share-btn');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        const url = `${window.location.origin}/view/${this.worldId}`;
        navigator.clipboard.writeText(url);
        alert(`World Frontpage Public Link copied to clipboard:\n${url}`);
      });
    }
  }

  async saveChanges() {
    const tagline = document.getElementById('frontpage-tagline-input').value;
    const banner = document.getElementById('frontpage-banner-input').value;

    try {
      const res = await fetch(`/api/worlds/${this.worldId}/frontpage`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tagline, banner_image: banner })
      });
      const data = await res.json();
      if (data.success) {
        document.getElementById('customize-frontpage-modal').style.display = 'none';
        await this.init();
      }
    } catch (e) {
      alert('Failed to update frontpage settings.');
    }
  }
}

window.FrontpageView = FrontpageView;
