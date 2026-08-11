/**
 * Interactive Lore Knowledge Graph Viewer
 * Visualizes cross-references between characters, locations, factions, species, and magic lore.
 * Includes interactive category filter chips for node filtering.
 */

class LoreGraph {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.nodes = [];
    this.allNodes = [];
    this.links = [];
    this.allLinks = [];
    this.hoveredNode = null;
    this.selectedNode = null;
    this.activeFilter = 'all';

    this.categoryColors = {
      'Characters': '#38bdf8',
      'Locations': '#4ade80',
      'Factions': '#f43f5e',
      'Races & Species': '#a855f7',
      'Species': '#a855f7',
      'Magic & Tech': '#fbbf24',
      'History': '#ec4899',
      'Items': '#06b6d4',
      'Default': '#94a3b8'
    };

    this.categoryIcons = {
      'Characters': '👤',
      'Locations': '🏰',
      'Factions': '🛡️',
      'Races & Species': '🧬',
      'Magic & Tech': '🔮',
      'History': '📜',
      'Items': '⚔️'
    };

    this.primaryCategories = [
      'Characters',
      'Locations',
      'Factions',
      'Races & Species',
      'Magic & Tech',
      'History',
      'Items'
    ];

    this.initEvents();
    this.renderFilterChips();
  }

  /**
   * Renders the 8 filter chips (All Nodes + 7 primary categories)
   * into the #graph-category-filters container.
   */
  renderFilterChips() {
    const container = document.getElementById('graph-category-filters');
    if (!container) return;

    container.innerHTML = '';

    // "All Nodes" chip
    const allChip = document.createElement('button');
    allChip.className = 'graph-filter-chip active';
    allChip.textContent = '🌐 All Nodes';
    allChip.dataset.category = 'all';
    allChip.addEventListener('click', () => this.filterNodesByCategory('all'));
    container.appendChild(allChip);

    // 7 primary category chips
    this.primaryCategories.forEach(cat => {
      const chip = document.createElement('button');
      chip.className = 'graph-filter-chip';
      chip.dataset.category = cat;
      const icon = this.categoryIcons[cat] || '📄';
      chip.textContent = `${icon} ${cat}`;
      chip.addEventListener('click', () => this.filterNodesByCategory(cat));
      container.appendChild(chip);
    });
  }

  setData(nodes, links) {
    const width = this.canvas.width = this.canvas.parentElement.clientWidth || 800;
    const height = this.canvas.height = this.canvas.parentElement.clientHeight || 500;

    // Position nodes evenly in a circular force layout
    const radius = Math.min(width, height) * 0.35;
    const centerX = width / 2;
    const centerY = height / 2;

    this.allNodes = nodes.map((node, i) => {
      const angle = (i / nodes.length) * 2 * Math.PI;
      return {
        ...node,
        x: centerX + radius * Math.cos(angle) + (Math.random() * 40 - 20),
        y: centerY + radius * Math.sin(angle) + (Math.random() * 40 - 20),
        vx: 0,
        vy: 0,
        radius: 18
      };
    });

    this.allLinks = links.map(link => ({
      source: link.source,
      target: link.target
    }));

    // Apply current filter
    this.applyFilter();
  }

  /**
   * Filters visible graph nodes by category.
   * Updates the graph simulation/physics without re-instantiating full canvas.
   * @param {string} category - Category name or 'all' for all nodes.
   */
  filterNodesByCategory(category) {
    this.activeFilter = category;
    this.updateFilterChipStates();
    this.applyFilter();
  }

  /**
   * Applies the current activeFilter to node/link datasets and redraws.
   * Does not re-instantiate the canvas — only updates visible datasets.
   */
  applyFilter() {
    if (this.activeFilter === 'all') {
      this.nodes = [...this.allNodes];
    } else {
      this.nodes = this.allNodes.filter(n => n.category === this.activeFilter);
    }

    // Build nodeMap from visible nodes
    this.nodeMap = new Map(this.nodes.map(n => [n.id, n]));

    // Filter links to only those connecting visible nodes
    this.links = this.allLinks
      .map(link => ({
        source: this.nodeMap.get(link.source),
        target: this.nodeMap.get(link.target)
      }))
      .filter(l => l.source && l.target);

    // Clear hovered state if filtered out
    if (this.hoveredNode && !this.nodeMap.has(this.hoveredNode.id)) {
      this.hoveredNode = null;
      this.canvas.style.cursor = 'default';
    }

    this.animate();
  }

  /**
   * Updates the active state CSS classes on graph filter chip buttons.
   */
  updateFilterChipStates() {
    const container = document.getElementById('graph-category-filters');
    if (!container) return;

    const chips = container.querySelectorAll('.graph-filter-chip');
    chips.forEach(chip => {
      if (chip.dataset.category === this.activeFilter) {
        chip.classList.add('active');
      } else {
        chip.classList.remove('active');
      }
    });
  }

  animate() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.drawLinks();
    this.drawNodes();
  }

  drawLinks() {
    this.ctx.lineWidth = 1.5;
    this.links.forEach(link => {
      this.ctx.strokeStyle = 'rgba(148, 163, 184, 0.25)';
      if (this.hoveredNode && (link.source === this.hoveredNode || link.target === this.hoveredNode)) {
        this.ctx.strokeStyle = '#38bdf8';
        this.ctx.lineWidth = 2.5;
      }
      this.ctx.beginPath();
      this.ctx.moveTo(link.source.x, link.source.y);
      this.ctx.lineTo(link.target.x, link.target.y);
      this.ctx.stroke();
    });
  }

  drawNodes() {
    this.nodes.forEach(node => {
      const color = this.categoryColors[node.category] || this.categoryColors['Default'];
      
      // Node Shadow
      this.ctx.shadowBlur = this.hoveredNode === node ? 15 : 6;
      this.ctx.shadowColor = color;

      // Circle fill
      this.ctx.fillStyle = color;
      this.ctx.beginPath();
      this.ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
      this.ctx.fill();

      // Border
      this.ctx.lineWidth = 2;
      this.ctx.strokeStyle = '#0f172a';
      this.ctx.stroke();

      // Reset shadow for text
      this.ctx.shadowBlur = 0;

      // Label text below node
      this.ctx.fillStyle = '#f8fafc';
      this.ctx.font = '12px Outfit, Inter, sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(node.title, node.x, node.y + node.radius + 16);
    });
  }

  initEvents() {
    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      let found = null;
      for (const node of this.nodes) {
        const dist = Math.hypot(node.x - mx, node.y - my);
        if (dist <= node.radius + 5) {
          found = node;
          break;
        }
      }

      if (this.hoveredNode !== found) {
        this.hoveredNode = found;
        this.canvas.style.cursor = found ? 'pointer' : 'default';
        this.animate();
      }
    });

    this.canvas.addEventListener('click', () => {
      if (this.hoveredNode) {
        window.app.loadArticle(this.hoveredNode.id);
      }
    });
  }
}
