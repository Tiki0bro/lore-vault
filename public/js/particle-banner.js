/**
 * ParticleBannerManager - LoreVault Hardware-Accelerated Ambient Canvas Engine
 * Renders low-overhead procedural floating embers (Radiant Arcane) and falling ash (Grimdark Iron)
 */
class ParticleBannerManager {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.particles = [];
    this.animFrameId = null;
    this.isRunning = false;
    this.theme = 'radiant-arcane';
    this.maxParticles = 35;
    this.boundLoop = this.loop.bind(this);
  }

  init(canvasElement, theme = 'radiant-arcane') {
    if (!canvasElement) return;
    this.canvas = canvasElement;
    this.ctx = this.canvas.getContext('2d');
    this.theme = theme;

    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());

    // Auto-pause when invisible / offscreen
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            this.start();
          } else {
            this.stop();
          }
        });
      }, { threshold: 0.05 });
      observer.observe(this.canvas);
    } else {
      this.start();
    }

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.stop();
      } else if (this.canvas && this.canvas.offsetParent !== null) {
        this.start();
      }
    });

    this.spawnParticles();
  }

  resizeCanvas() {
    if (!this.canvas) return;
    const rect = this.canvas.parentElement ? this.canvas.parentElement.getBoundingClientRect() : { width: 800, height: 120 };
    this.canvas.width = rect.width || 800;
    this.canvas.height = rect.height || 120;
  }

  setTheme(newTheme) {
    this.theme = newTheme;
    this.spawnParticles();
  }

  spawnParticles() {
    this.particles = [];
    const width = this.canvas ? this.canvas.width : 800;
    const height = this.canvas ? this.canvas.height : 120;

    for (let i = 0; i < this.maxParticles; i++) {
      this.particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 2.2 + 0.8,
        speedX: (Math.random() - 0.5) * 0.6,
        speedY: this.theme === 'grimdark-iron' ? (Math.random() * 0.8 + 0.3) : -(Math.random() * 0.7 + 0.2),
        opacity: Math.random() * 0.7 + 0.2,
        pulseSpeed: Math.random() * 0.02 + 0.005,
        pulseDir: Math.random() > 0.5 ? 1 : -1
      });
    }
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.loop();
  }

  stop() {
    this.isRunning = false;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  loop() {
    if (!this.isRunning || !this.ctx || !this.canvas) return;

    const width = this.canvas.width;
    const height = this.canvas.height;

    this.ctx.clearRect(0, 0, width, height);

    const isArcane = this.theme === 'radiant-arcane';
    const isGrimdark = this.theme === 'grimdark-iron';

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];

      // Update position
      p.x += p.speedX;
      p.y += p.speedY;

      // Opacity pulse
      p.opacity += p.pulseSpeed * p.pulseDir;
      if (p.opacity >= 0.95 || p.opacity <= 0.15) {
        p.pulseDir *= -1;
      }

      // Boundary reset
      if (isGrimdark && p.y > height) {
        p.y = 0;
        p.x = Math.random() * width;
      } else if (!isGrimdark && p.y < 0) {
        p.y = height;
        p.x = Math.random() * width;
      }
      if (p.x < 0) p.x = width;
      if (p.x > width) p.x = 0;

      // Draw particle
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);

      if (isArcane) {
        this.ctx.fillStyle = `rgba(0, 242, 254, ${p.opacity})`;
        this.ctx.shadowBlur = 8;
        this.ctx.shadowColor = '#00f2fe';
      } else if (isGrimdark) {
        this.ctx.fillStyle = `rgba(225, 29, 72, ${p.opacity})`;
        this.ctx.shadowBlur = 6;
        this.ctx.shadowColor = '#e11d48';
      } else {
        this.ctx.fillStyle = `rgba(212, 175, 55, ${p.opacity})`;
        this.ctx.shadowBlur = 5;
        this.ctx.shadowColor = '#d4af37';
      }

      this.ctx.fill();
    }

    this.animFrameId = requestAnimationFrame(this.boundLoop);
  }
}

// Global Export
if (typeof window !== 'undefined') {
  window.ParticleBannerManager = ParticleBannerManager;
  window.particleBanner = new ParticleBannerManager();
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ParticleBannerManager };
}
