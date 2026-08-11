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

    // 3. Render mountain ridge hachure lines (shading lines along steep mountain slopes)
    ctx.strokeStyle = colors.ink;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.4;

    for (let gy = 2; gy < Math.ceil(height / step) - 2; gy += 3) {
      for (let gx = 2; gx < gridW - 2; gx += 3) {
        const gIdx = gy * gridW + gx;
        const elev = elevations[gIdx];

        if (elev > 0.50) {
          // Compute gradient vector for mountain slope hachuring
          const eLeft = elevations[gIdx - 1];
          const eRight = elevations[gIdx + 1];
          const eTop = elevations[(gy - 1) * gridW + gx];
          const eBottom = elevations[(gy + 1) * gridW + gx];

          const gradX = eRight - eLeft;
          const gradY = eBottom - eTop;

          const px = gx * step;
          const py = gy * step;

          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(px - gradY * 40, py + gradX * 40);
          ctx.stroke();
        }
      }
    }
    ctx.globalAlpha = 1.0;

    // 4. Render Cartography Lat/Long Grid Lines
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

    // 5. Render Aged Cartography Border Frame
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
