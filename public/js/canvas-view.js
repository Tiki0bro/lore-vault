/**
 * LoreVault Spatial Canvas & Interactive Mindmap View (CanvasView)
 * Renders zoomable/pannable 2D spatial canvas with draggable node cards, SVG relationship edges, and auto-layout presets.
 */

class CanvasView {
  constructor(containerId) {
    this.container = typeof containerId === 'string' ? document.getElementById(containerId) : containerId;
    this.worldId = 'default';
    this.nodes = [];
    this.edges = [];
    this.zoomLevel = 1.0;
    this.panX = 0;
    this.panY = 0;
    this.isPanning = false;
    this.startPanX = 0;
    this.startPanY = 0;
    this.activeDragNode = null;
    this.dragOffsetX = 0;
    this.dragOffsetY = 0;
    this.mode = 'drag'; // 'drag' or 'pan'

    if (window.LoreEvents) {
      window.LoreEvents.on('world:changed', (wId) => {
        this.worldId = wId;
        this.loadNodes(wId);
      });
      window.LoreEvents.on('article:updated', () => this.loadNodes(this.worldId));
      window.LoreEvents.on('article:deleted', () => this.loadNodes(this.worldId));
    }
  }

  init() {
    if (!this.container) return;
    this.renderSkeleton();
    this.bindEvents();
    this.loadNodes(this.worldId);
  }

  renderSkeleton() {
    this.container.innerHTML = `
      <div class="canvas-view-wrapper">
        <div class="canvas-toolbar">
          <div class="canvas-toolbar-group">
            <span class="canvas-title">🗺️ Spatial Lore Canvas</span>
            <span class="badge" id="canvas-node-count">0 Nodes</span>
          </div>

          <div class="canvas-toolbar-group">
            <label class="canvas-tool-label">Layout:</label>
            <select id="canvas-layout-select" class="toolbar-select" onchange="window.canvasView.applyLayout(this.value)">
              <option value="grid">Grid Layout</option>
              <option value="circle">Circular Web</option>
              <option value="timeline">Chronological Line</option>
            </select>
            <button class="btn btn-secondary btn-sm" onclick="window.canvasView.applyLayout(document.getElementById('canvas-layout-select').value)">⚡ Arrange</button>
          </div>

          <div class="canvas-toolbar-group">
            <button class="btn btn-secondary btn-sm" onclick="window.canvasView.zoom(0.15)">🔍+</button>
            <button class="btn btn-secondary btn-sm" onclick="window.canvasView.zoom(-0.15)">🔍-</button>
            <button class="btn btn-secondary btn-sm" onclick="window.canvasView.resetZoom()">🎯 Reset View</button>
            <button class="btn btn-primary btn-sm" onclick="window.canvasView.saveNodePositions()">💾 Save Positions</button>
          </div>
        </div>

        <div class="canvas-viewport" id="canvas-viewport">
          <svg class="canvas-svg-layer" id="canvas-svg-layer"></svg>
          <div class="canvas-node-layer" id="canvas-node-layer"></div>
        </div>
      </div>
    `;

    this.viewport = document.getElementById('canvas-viewport');
    this.svgLayer = document.getElementById('canvas-svg-layer');
    this.nodeLayer = document.getElementById('canvas-node-layer');
  }

  bindEvents() {
    if (!this.viewport) return;

    this.viewport.addEventListener('mousedown', (e) => {
      if (e.target.closest('.canvas-node-card')) return;
      this.isPanning = true;
      this.startPanX = e.clientX - this.panX;
      this.startPanY = e.clientY - this.panY;
      this.viewport.style.cursor = 'grabbing';
    });

    window.addEventListener('mousemove', (e) => {
      if (this.isPanning) {
        this.panX = e.clientX - this.startPanX;
        this.panY = e.clientY - this.startPanY;
        this.updateTransform();
      } else if (this.activeDragNode) {
        const rect = this.viewport.getBoundingClientRect();
        const mouseX = (e.clientX - rect.left - this.panX) / this.zoomLevel;
        const mouseY = (e.clientY - rect.top - this.panY) / this.zoomLevel;

        const posX = Math.max(0.02, Math.min(0.98, (mouseX - this.dragOffsetX) / rect.width));
        const posY = Math.max(0.02, Math.min(0.98, (mouseY - this.dragOffsetY) / rect.height));

        this.activeDragNode.pos_x = posX;
        this.activeDragNode.pos_y = posY;
        this.renderNodesAndEdges();
      }
    });

    window.addEventListener('mouseup', () => {
      if (this.isPanning) {
        this.isPanning = false;
        this.viewport.style.cursor = 'grab';
      }
      if (this.activeDragNode) {
        this.activeDragNode = null;
      }
    });

    this.viewport.addEventListener('wheel', (e) => {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.1 : -0.1;
      this.zoom(delta);
    });
  }

  async loadNodes(worldId) {
    this.worldId = worldId || 'default';
    const isPlayerMode = localStorage.getItem('lorevault_mode_player') === 'true';
    const modeParam = isPlayerMode ? '?mode=player' : '';

    try {
      const res = await fetch(`/api/worlds/${this.worldId}/canvas-nodes${modeParam}`);
      if (!res.ok) throw new Error('Failed to load canvas nodes');
      const data = await res.json();
      this.nodes = data.nodes || [];
      this.edges = data.edges || [];

      const countBadge = document.getElementById('canvas-node-count');
      if (countBadge) countBadge.textContent = `${this.nodes.length} Nodes`;

      this.renderNodesAndEdges();
    } catch (err) {
      console.error('Canvas load error:', err);
    }
  }

  renderNodesAndEdges() {
    if (!this.nodeLayer || !this.svgLayer || !this.viewport) return;
    const rect = this.viewport.getBoundingClientRect();
    const width = Math.max(800, rect.width || 1000);
    const height = Math.max(600, rect.height || 700);

    // Build node position map
    const posMap = {};
    this.nodeLayer.innerHTML = '';

    this.nodes.forEach(node => {
      const px = node.pos_x * width;
      const py = node.pos_y * height;
      posMap[node.id] = { x: px, y: py, node };

      const card = document.createElement('div');
      card.className = `canvas-node-card ${node.is_secret ? 'is-secret-node' : ''}`;
      card.style.left = `${px}px`;
      card.style.top = `${py}px`;

      const categoryIcon = this.getCategoryIcon(node.category);
      card.innerHTML = `
        <div class="node-header">
          <span class="node-cat">${categoryIcon} ${node.category}</span>
          ${node.pinned ? '<span class="pinned-badge">📌</span>' : ''}
        </div>
        <div class="node-title">${node.title}</div>
        <div class="node-summary">${node.summary ? node.summary.substring(0, 70) + '...' : 'No summary'}</div>
        <div class="node-actions">
          <button class="btn-xs btn-secondary" onclick="window.app.openArticleReader('${node.entity_id}')">📖 Open</button>
        </div>
      `;

      card.addEventListener('mousedown', (e) => {
        if (e.target.tagName === 'BUTTON') return;
        e.stopPropagation();
        this.activeDragNode = node;
        const cardRect = card.getBoundingClientRect();
        this.dragOffsetX = (e.clientX - cardRect.left) / this.zoomLevel;
        this.dragOffsetY = (e.clientY - cardRect.top) / this.zoomLevel;
      });

      this.nodeLayer.appendChild(card);
    });

    // Render SVG relationship curves
    let svgHtml = '';
    this.edges.forEach(edge => {
      const src = posMap[edge.source_id];
      const tgt = posMap[edge.target_id];
      if (!src || !tgt) return;

      const strokeColor = this.getSentimentColor(edge.sentiment);
      const midX = (src.x + tgt.x) / 2;
      const midY = (src.y + tgt.y) / 2 - 20;

      svgHtml += `
        <path d="M ${src.x + 80} ${src.y + 40} Q ${midX + 80} ${midY + 40} ${tgt.x + 80} ${tgt.y + 40}"
              stroke="${strokeColor}" stroke-width="2.5" fill="none" stroke-dasharray="${edge.sentiment === 'tense' ? '5,5' : 'none'}" />
        <text x="${midX + 80}" y="${midY + 35}" fill="${strokeColor}" font-size="11" text-anchor="middle" font-weight="600">${edge.label || edge.relationship_type}</text>
      `;
    });

    this.svgLayer.innerHTML = svgHtml;
    this.updateTransform();
  }

  updateTransform() {
    if (this.nodeLayer && this.svgLayer) {
      const transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.zoomLevel})`;
      this.nodeLayer.style.transform = transform;
      this.svgLayer.style.transform = transform;
    }
  }

  zoom(delta) {
    this.zoomLevel = Math.max(0.4, Math.min(2.5, this.zoomLevel + delta));
    this.updateTransform();
  }

  resetZoom() {
    this.zoomLevel = 1.0;
    this.panX = 0;
    this.panY = 0;
    this.updateTransform();
  }

  async applyLayout(algorithm) {
    try {
      const res = await fetch('/api/canvas/auto-layout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ world_id: this.worldId, algorithm: algorithm || 'grid' })
      });
      const data = await res.json();
      if (data.success) {
        if (window.app && window.app.showToast) window.app.showToast(`Applied ${algorithm} layout preset!`, 'success');
        this.loadNodes(this.worldId);
      }
    } catch (err) {
      console.error('Layout error:', err);
    }
  }

  async saveNodePositions() {
    const payload = {
      world_id: this.worldId,
      positions: this.nodes.map(n => ({
        entity_type: n.entity_type || 'article',
        entity_id: n.entity_id,
        pos_x: n.pos_x,
        pos_y: n.pos_y,
        pinned: n.pinned ? 1 : 0
      }))
    };

    try {
      const res = await fetch('/api/canvas/positions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        if (window.app && window.app.showToast) window.app.showToast('Canvas positions saved successfully!', 'success');
      }
    } catch (err) {
      console.error('Save positions error:', err);
    }
  }

  getCategoryIcon(category) {
    const icons = {
      'Locations': '🏰',
      'Characters': '👤',
      'Factions': '⚔️',
      'Items': '🗡️',
      'Lore & History': '📜',
      'Races & Species': '🧬',
      'General': '📌'
    };
    return icons[category] || '📁';
  }

  getSentimentColor(sentiment) {
    const colors = {
      'positive': '#10b981',
      'negative': '#ef4444',
      'tense': '#f59e0b',
      'secret': '#a855f7'
    };
    return colors[sentiment] || '#0ea5e9';
  }
}

window.CanvasView = CanvasView;
