/**
 * TimelineView Component — Interactive Chronology Timeline Engine
 */
class TimelineView {
  constructor(containerId, options = {}) {
    this.containerId = containerId;
    this.worldId = options.worldId || 'default';
    this.events = [];
  }

  async init() {
    await this.fetchTimeline();
    this.render();
  }

  async fetchTimeline() {
    try {
      const res = await fetch(`/api/worlds/${this.worldId}/timeline`);
      const data = await res.json();
      this.events = Array.isArray(data.events) ? data.events : [];
    } catch (e) {
      console.error('Failed to fetch timeline events:', e);
      this.events = [];
    }
  }

  render() {
    const container = document.getElementById(this.containerId);
    if (!container) return;

    container.innerHTML = `
      <div class="timeline-wrapper">
        <div class="timeline-header">
          <div class="timeline-header-left">
            <h2>⏳ World Chronology Timeline</h2>
            <span class="badge"><strong>${this.events.length}</strong> Events Recorded</span>
          </div>
          <div class="timeline-header-right">
            <button id="add-timeline-event-btn" class="tool-btn primary"><i class="fa-solid fa-plus"></i> Add Event</button>
          </div>
        </div>

        <div class="timeline-body">
          ${this.events.length ? `
            <div class="timeline-track">
              ${this.events.map((ev, idx) => `
                <div class="timeline-card" data-id="${ev.id}">
                  <div class="timeline-card-node"></div>
                  <div class="timeline-card-content">
                    <div class="timeline-card-meta">
                      <span class="epoch-badge">${ev.epoch_name || 'Common Era'}</span>
                      <span class="year-badge"><strong>${ev.display_year}</strong></span>
                    </div>
                    <h3>${ev.title}</h3>
                    <p>${ev.summary || 'No summary recorded.'}</p>
                    <button class="drawer-close-btn delete-ev-btn" data-id="${ev.id}" style="font-size:0.8rem; padding: 2px 6px;">&times; Delete</button>
                  </div>
                </div>
              `).join('')}
            </div>
          ` : `
            <div class="timeline-empty-state">
              <i class="fa-solid fa-hourglass-start" style="font-size: 2.5rem; color: var(--accent-amber); margin-bottom: 12px;"></i>
              <h3>No Chronology Events Recorded</h3>
              <p>Click "Add Event" to record historical epochs, battles, and milestones for this world.</p>
            </div>
          `}
        </div>
      </div>

      <!-- Add Event Modal -->
      <div id="add-timeline-modal" class="modal-overlay" style="display:none;">
        <div class="modal-card">
          <div class="modal-header">
            <h3><i class="fa-solid fa-hourglass-half"></i> Record Chronology Event</h3>
            <button id="close-timeline-modal-btn" class="drawer-close-btn">&times;</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label>Event Title *</label>
              <input type="text" id="ev-title-input" class="form-control" placeholder="e.g. The Battle of Frostpeak">
            </div>
            <div class="form-group">
              <label>Epoch / Age Name</label>
              <input type="text" id="ev-epoch-input" class="form-control" placeholder="e.g. First Age, Age of Ashes">
            </div>
            <div class="form-group">
              <label>Display Year / Date *</label>
              <input type="text" id="ev-year-input" class="form-control" placeholder="e.g. Year 142, 302 PA">
            </div>
            <div class="form-group">
              <label>Sort Order Key (Numeric for Chronological Ordering)</label>
              <input type="number" id="ev-sort-input" class="form-control" placeholder="e.g. 142">
            </div>
            <div class="form-group">
              <label>Event Summary</label>
              <textarea id="ev-summary-input" class="form-control" rows="3" placeholder="Historical details and outcome..."></textarea>
            </div>
          </div>
          <div class="modal-footer" style="display:flex; justify-content:flex-end; gap:10px; margin-top:16px;">
            <button id="cancel-timeline-modal-btn" class="tool-btn">Cancel</button>
            <button id="save-timeline-modal-btn" class="tool-btn primary">Save Event</button>
          </div>
        </div>
      </div>
    `;

    this.bindEvents();
  }

  bindEvents() {
    const addBtn = document.getElementById('add-timeline-event-btn');
    const modal = document.getElementById('add-timeline-modal');
    if (addBtn && modal) {
      addBtn.addEventListener('click', () => modal.style.display = 'flex');
    }

    const closeBtn = document.getElementById('close-timeline-modal-btn');
    const cancelBtn = document.getElementById('cancel-timeline-modal-btn');
    if (closeBtn) closeBtn.addEventListener('click', () => modal.style.display = 'none');
    if (cancelBtn) cancelBtn.addEventListener('click', () => modal.style.display = 'none');

    const saveBtn = document.getElementById('save-timeline-modal-btn');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => this.saveEvent());
    }

    const container = document.getElementById(this.containerId);
    if (container) {
      container.querySelectorAll('.delete-ev-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const id = btn.getAttribute('data-id');
          this.deleteEvent(id);
        });
      });
    }
  }

  async saveEvent() {
    const title = document.getElementById('ev-title-input').value;
    const epoch_name = document.getElementById('ev-epoch-input').value;
    const display_year = document.getElementById('ev-year-input').value;
    const sort_order = document.getElementById('ev-sort-input').value;
    const summary = document.getElementById('ev-summary-input').value;

    if (!title || !display_year) {
      alert('Title and Display Year are required.');
      return;
    }

    try {
      const res = await fetch('/api/timeline-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          world_id: this.worldId,
          title,
          epoch_name,
          display_year,
          sort_order: sort_order ? parseFloat(sort_order) : undefined,
          summary
        })
      });
      const data = await res.json();
      if (data.success) {
        document.getElementById('add-timeline-modal').style.display = 'none';
        await this.init();
      }
    } catch (e) {
      alert('Failed to save timeline event.');
    }
  }

  async deleteEvent(id) {
    if (!confirm('Are you sure you want to delete this timeline event?')) return;
    try {
      const res = await fetch(`/api/timeline-events/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        await this.init();
      }
    } catch (e) {
      alert('Failed to delete timeline event.');
    }
  }
}

window.TimelineView = TimelineView;
