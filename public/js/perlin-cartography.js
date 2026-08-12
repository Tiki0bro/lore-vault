/**
 * PerlinCartographyEngine — Client-side HTML5 2D Perlin Noise Cartography Generator
 * Generates heightmaps, ocean contours, mountain hachure shading, and vintage cartography themes.
 */
class PerlinCartographyEngine {
  constructor() {
    this.perm = this.buildPermutationTable(12345);
  }

  /**
   * Set seed and regenerate permutation table
   * @param {number|string} seed 
   */
  setSeed(seed) {
    this.perm = this.buildPermutationTable(seed);
  }

  /**
   * Build deterministic 512-byte permutation table from seed
   * @param {number|string} seed 
   * @returns {Uint8Array}
   */
  buildPermutationTable(seed) {
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;

    let s = (typeof seed === 'number' ? Math.floor(Math.abs(seed)) : String(seed).split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)) % 2147483647;
    if (s <= 0) s += 2147483646;

    for (let i = 255; i > 0; i--) {
      s = (s * 16807) % 2147483647;
      const j = Math.floor((s / 2147483647) * (i + 1));
      const tmp = p[i];
      p[i] = p[j];
      p[j] = tmp;
    }

    const perm = new Uint8Array(512);
    for (let i = 0; i < 512; i++) {
      perm[i] = p[i & 255];
    }
    return perm;
  }

  fade(t) {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  lerp(t, a, b) {
    return a + t * (b - a);
  }

  grad(hash, x, y) {
    const h = hash & 7;
    const u = h < 4 ? x : y;
    const v = h < 4 ? y : x;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }

  /**
   * 2D Perlin Noise generator returning float in approx [-1, 1]
   */
  noise2D(x, y) {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;

    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);

    const u = this.fade(xf);
    const v = this.fade(yf);

    const A = this.perm[X] + Y;
    const B = this.perm[X + 1] + Y;

    return this.lerp(
      v,
      this.lerp(
        u,
        this.grad(this.perm[A], xf, yf),
        this.grad(this.perm[B], xf - 1, yf)
      ),
      this.lerp(
        u,
        this.grad(this.perm[A + 1], xf, yf - 1),
        this.grad(this.perm[B + 1], xf - 1, yf - 1)
      )
    );
  }

  /**
   * Fractal Brownian Motion (fBm) multi-octave Perlin noise
   */
  fractalNoise2D(x, y, octaves = 4, persistence = 0.5, lacunarity = 2.0) {
    let total = 0;
    let frequency = 1;
    let amplitude = 1;
    let maxValue = 0;

    for (let i = 0; i < octaves; i++) {
      total += this.noise2D(x * frequency, y * frequency) * amplitude;
      maxValue += amplitude;
      amplitude *= persistence;
      frequency *= lacunarity;
    }

    return total / maxValue;
  }

  /**
   * Calculate geography preset mask multiplier given normalized coords (0..1)
   * @param {number} nx 
   * @param {number} ny 
   * @param {string} preset 
   * @returns {number}
   */
  calculatePresetMask(nx, ny, preset) {
    const dx = nx - 0.5;
    const dy = ny - 0.5;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (preset === 'pangaea') {
      return Math.max(0, 1.0 - Math.min(1.0, dist * 2.2));
    }
    if (preset === 'archipelago') {
      const wave = (Math.sin(nx * Math.PI * 4) + Math.cos(ny * Math.PI * 4)) * 0.25;
      return Math.max(0.1, 0.5 + wave);
    }
    if (preset === 'inland_sea') {
      return (dist > 0.18 && dist < 0.44) ? 1.0 : (dist <= 0.18 ? 0.25 : 0.2);
    }
    if (preset === 'mountain_fjords') {
      return Math.max(0.1, 1.0 - Math.abs(dy * 1.8));
    }

    // Default falloff
    return Math.max(0, 1.0 - Math.min(1.0, dist * 2.0));
  }

  /**
   * Get color palette for requested cartographic aesthetic theme
   * @param {string} theme 
   * @returns {Object}
   */
  getColorsForTheme(theme) {
    if (theme === 'void') {
      return {
        ocean: '#090d16',
        shallow: '#0f172a',
        coast: '#38bdf8',
        land: '#1e293b',
        highland: '#334155',
        mountain: '#475569',
        snow: '#94a3b8',
        ink: '#e2e8f0',
        grid: 'rgba(56, 189, 248, 0.1)'
      };
    }
    if (theme === 'emerald') {
      return {
        ocean: '#064e3b',
        shallow: '#047857',
        coast: '#34d399',
        land: '#065f46',
        highland: '#047857',
        mountain: '#022c22',
        snow: '#a7f3d0',
        ink: '#ecfdf5',
        grid: 'rgba(52, 211, 153, 0.12)'
      };
    }
    // Default: Vintage Parchment
    return {
      ocean: '#d8c5aa',
      shallow: '#e8dabf',
      coast: '#7c6a5a',
      land: '#f5efe6',
      highland: '#d4c0a8',
      mountain: '#8c7662',
      snow: '#faf6f0',
      ink: '#2c221e',
      grid: 'rgba(44, 34, 30, 0.08)'
    };
  }

  /**
   * Render complete cartography map to target HTML5 Canvas
   * @param {HTMLCanvasElement} canvas 
   * @param {Object} options 
   */
  renderToCanvas(canvas, options = {}) {
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width || 1920;
    const height = canvas.height || 1080;
    const seed = options.seed !== undefined ? options.seed : 12345;
    const preset = options.preset || 'pangaea';
    const theme = options.theme || 'parchment';
    const scale = options.scale || 0.003;
    const octaves = options.octaves || 4;

    this.setSeed(seed);
    const colors = this.getColorsForTheme(theme);

    // 1. Fill base ocean canvas background
    ctx.fillStyle = colors.ocean;
    ctx.fillRect(0, 0, width, height);

    // 2. Render heightmap elevation & ocean depth contours
    const step = 2; // Pixel step resolution for performance & crispness
    const elevations = new Float32Array(Math.ceil(width / step) * Math.ceil(height / step));
    const gridW = Math.ceil(width / step);

    let idx = 0;
    for (let y = 0; y < height; y += step) {
      const ny = y / height;
      for (let x = 0; x < width; x += step) {
        const nx = x / width;
        const rawNoise = (this.fractalNoise2D(x * scale, y * scale, octaves) + 1) / 2;
        const mask = this.calculatePresetMask(nx, ny, preset);
        const elev = rawNoise * mask;

        elevations[idx++] = elev;

        let fillStyle = colors.ocean;
        if (elev > 0.65) {
          fillStyle = colors.snow;
        } else if (elev > 0.52) {
          fillStyle = colors.mountain;
        } else if (elev > 0.44) {
          fillStyle = colors.highland;
        } else if (elev > 0.38) {
          fillStyle = colors.land;
        } else if (elev > 0.32) {
          fillStyle = colors.shallow;
        }

        ctx.fillStyle = fillStyle;
        ctx.fillRect(x, y, step, step);
      }
    }

    // 3. Render Procedural Rivers (flowing down elevation gradients from peaks to ocean)
    ctx.strokeStyle = colors.coast;
    ctx.lineWidth = 2.5;
    const riverSeeds = [];
    for (let gy = 4; gy < Math.ceil(height / step) - 4; gy += 8) {
      for (let gx = 4; gx < gridW - 4; gx += 8) {
        const gIdx = gy * gridW + gx;
        if (elevations[gIdx] > 0.58 && riverSeeds.length < 6) {
          riverSeeds.push({ gx, gy });
        }
      }
    }

    riverSeeds.forEach(({ gx, gy }) => {
      ctx.beginPath();
      let curX = gx;
      let curY = gy;
      ctx.moveTo(curX * step, curY * step);

      for (let stepCount = 0; stepCount < 60; stepCount++) {
        let lowestElev = elevations[curY * gridW + curX];
        let nextX = curX;
        let nextY = curY;

        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const nx = curX + dx;
            const ny = curY + dy;
            if (nx >= 0 && nx < gridW && ny >= 0 && ny < Math.ceil(height / step)) {
              const nElev = elevations[ny * gridW + nx];
              if (nElev < lowestElev) {
                lowestElev = nElev;
                nextX = nx;
                nextY = ny;
              }
            }
          }
        }

        if (nextX === curX && nextY === curY) break;
        curX = nextX;
        curY = nextY;
        ctx.lineTo(curX * step, curY * step);
        if (lowestElev < 0.35) break; // Reached ocean
      }
      ctx.stroke();
    });

    // 4. Render Mountain Peak Stamps & Forest Tree Icons
    for (let gy = 4; gy < Math.ceil(height / step) - 4; gy += 6) {
      for (let gx = 4; gx < gridW - 4; gx += 6) {
        const gIdx = gy * gridW + gx;
        const elev = elevations[gIdx];
        const px = gx * step;
        const py = gy * step;

        if (elev > 0.53) {
          // Draw Hand-Drawn Mountain Peak Stamp (▲)
          this.drawMountainIcon(ctx, px, py, 14, colors.mountain, colors.ink);
        } else if (elev >= 0.38 && elev < 0.44 && (gx + gy) % 12 === 0) {
          // Draw Forest Tree Cluster Icon (🌲)
          this.drawTreeClusterIcon(ctx, px, py, 8, colors.shallow, colors.ink);
        }
      }
    }

    // 5. Render Cartography Lat/Long Grid Lines
    ctx.strokeStyle = colors.grid;
    ctx.lineWidth = 1;
    const gridSpacing = 150;
    for (let x = gridSpacing; x < width; x += gridSpacing) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = gridSpacing; y < height; y += gridSpacing) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // 6. Render Compass Rose in Ocean Corner
    this.drawCompassRose(ctx, width - 120, height - 120, 45, colors.ink);

    // 7. Render Aged Cartography Border Frame
    ctx.strokeStyle = colors.ink;
    ctx.lineWidth = 6;
    ctx.strokeRect(16, 16, width - 32, height - 32);

    ctx.lineWidth = 2;
    ctx.strokeRect(24, 24, width - 48, height - 48);

    // Corner flourishes
    const cornerSize = 20;
    const corners = [
      [24, 24],
      [width - 24, 24],
      [24, height - 24],
      [width - 24, height - 24]
    ];
    corners.forEach(([cx, cy]) => {
      ctx.beginPath();
      ctx.arc(cx, cy, cornerSize, 0, Math.PI * 2);
      ctx.stroke();
    });
  }

  /**
   * Helper: Draw Mountain Triangle Peak Icon (▲)
   */
  drawMountainIcon(ctx, x, y, size, color, inkColor) {
    ctx.beginPath();
    ctx.moveTo(x, y - size);
    ctx.lineTo(x - size * 0.8, y + size * 0.6);
    ctx.lineTo(x + size * 0.8, y + size * 0.6);
    if (typeof ctx.closePath === 'function') ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = inkColor;
    ctx.lineWidth = 1.2;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x, y - size);
    ctx.lineTo(x + size * 0.2, y + size * 0.6);
    ctx.stroke();
  }

  /**
   * Helper: Draw Forest Tree Cluster Icon (🌲)
   */
  drawTreeClusterIcon(ctx, x, y, size, color, inkColor) {
    ctx.beginPath();
    ctx.arc(x, y - size * 0.4, size * 0.5, 0, Math.PI * 2);
    ctx.arc(x - size * 0.3, y, size * 0.4, 0, Math.PI * 2);
    ctx.arc(x + size * 0.3, y, size * 0.4, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = inkColor;
    ctx.lineWidth = 0.8;
    ctx.stroke();
  }

  /**
   * Helper: Draw Intricate Compass Rose
   */
  drawCompassRose(ctx, cx, cy, size, color) {
    if (!ctx || typeof ctx.translate !== 'function' || typeof ctx.rotate !== 'function') return;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    ctx.arc(0, 0, size, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, 0, size * 0.85, 0, Math.PI * 2);
    ctx.stroke();

    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2;
      ctx.save();
      ctx.rotate(angle);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-size * 0.15, -size * 0.3);
      ctx.lineTo(0, -size * 1.15);
      ctx.lineTo(size * 0.15, -size * 0.3);
      if (typeof ctx.closePath === 'function') ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    ctx.font = 'bold 14px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('N', 0, -size * 1.35);

    ctx.restore();
  }

  /**
   * Export Canvas contents to PNG Blob
   * @param {HTMLCanvasElement} canvas 
   * @returns {Promise<Blob>}
   */
  exportToBlob(canvas) {
    return new Promise((resolve, reject) => {
      if (!canvas) {
        return reject(new Error('Canvas element required for exportToBlob'));
      }

      if (typeof canvas.toBlob === 'function') {
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            // Fallback for environments where toBlob callback receives null or buffer
            const dataUrl = canvas.toDataURL ? canvas.toDataURL('image/png') : null;
            resolve(dataUrl || new Blob([], { type: 'image/png' }));
          }
        }, 'image/png');
      } else {
        // Fallback for mock environments
        resolve(new Blob([], { type: 'image/png' }));
      }
    });
  }
}

// Global browser window attachment
if (typeof window !== 'undefined') {
  window.PerlinCartographyEngine = PerlinCartographyEngine;
}

// CommonJS module export for testing environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { PerlinCartographyEngine };
}
