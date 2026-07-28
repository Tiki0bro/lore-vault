/**
 * Interactive Lore Knowledge Graph Viewer
 * Visualizes cross-references between characters, locations, factions, species, and magic lore.
 */

class LoreGraph {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.nodes = [];
    this.links = [];
    this.hoveredNode = null;
    this.selectedNode = null;

    this.categoryColors = {
      'Characters': '#38bdf8',
      'Locations': '#4ade80',
      'Factions': '#f43f5e',
      'Species': '#a855f7',
      'Magic & Tech': '#fbbf24',
      'History': '#ec4899',
      'Items': '#06b6d4',
      'Default': '#94a3b8'
    };

    this.initEvents();
  }

  setData(nodes, links) {
    const width = this.canvas.width = this.canvas.parentElement.clientWidth || 800;
    const height = this.canvas.height = this.canvas.parentElement.clientHeight || 500;

    // Position nodes evenly in a circular force layout
    const radius = Math.min(width, height) * 0.35;
    const centerX = width / 2;
    const centerY = height / 2;

    this.nodes = nodes.map((node, i) => {
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

    this.nodeMap = new Map(this.nodes.map(n => [n.id, n]));

    this.links = links.map(link => ({
      source: this.nodeMap.get(link.source),
      target: this.nodeMap.get(link.target)
    })).filter(l => l.source && l.target);

    this.animate();
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
