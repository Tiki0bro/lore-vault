export interface MapGenerationOptions {
  seed: number;
  width: number;
  height: number;
  theme: 'vintage' | 'arcane' | 'obsidian';
  preset: 'continental' | 'archipelago' | 'coastal';
}

export class PerlinCartographyEngine {
  private perm: Uint8Array;

  constructor(seed = 12345) {
    this.perm = this.buildPermutationTable(seed);
  }

  private buildPermutationTable(seed: number): Uint8Array {
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;

    let s = Math.floor(Math.abs(seed)) % 2147483647;
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

  private fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  private lerp(t: number, a: number, b: number): number {
    return a + t * (b - a);
  }

  private grad(hash: number, x: number, y: number): number {
    const h = hash & 7;
    const u = h < 4 ? x : y;
    const v = h < 4 ? y : x;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }

  public noise(x: number, y: number): number {
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
      this.lerp(u, this.grad(this.perm[A], xf, yf), this.grad(this.perm[B], xf - 1, yf)),
      this.lerp(u, this.grad(this.perm[A + 1], xf, yf - 1), this.grad(this.perm[B + 1], xf - 1, yf - 1))
    );
  }

  public generateMapDataUrl(options: MapGenerationOptions): string {
    const { width, height, theme, preset } = options;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    const imgData = ctx.createImageData(width, height);
    const data = imgData.data;

    const scale = preset === 'archipelago' ? 0.008 : preset === 'coastal' ? 0.004 : 0.005;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        // Multi-octave fractal noise
        let n = this.noise(x * scale, y * scale) * 0.6;
        n += this.noise(x * scale * 2, y * scale * 2) * 0.25;
        n += this.noise(x * scale * 4, y * scale * 4) * 0.15;
        
        // Normalize [-1, 1] to [0, 1]
        let elevation = (n + 1) / 2;

        // Radial falloff towards edges for island/continent effect
        const dx = (x / width - 0.5) * 2;
        const dy = (y / height - 0.5) * 2;
        const dist = Math.sqrt(dx * dx + dy * dy);
        elevation = Math.max(0, elevation - dist * 0.35);

        let r = 24, g = 24, b = 27; // default dark obsidian

        if (theme === 'vintage') {
          if (elevation < 0.38) {
            // Deep water
            r = 21; g = 32; b = 43;
          } else if (elevation < 0.44) {
            // Shallow water
            r = 30; g = 48; b = 60;
          } else if (elevation < 0.48) {
            // Sand / Coastline
            r = 194; g = 178; b = 128;
          } else if (elevation < 0.65) {
            // Lowlands / Grass
            r = 76; g = 94; b = 65;
          } else if (elevation < 0.82) {
            // Highlands / Rock
            r = 110; g = 98; b = 89;
          } else {
            // Peaks / Snow
            r = 220; g = 215; b = 210;
          }
        } else if (theme === 'arcane') {
          if (elevation < 0.42) {
            r = 15; g = 10; b = 28;
          } else if (elevation < 0.46) {
            r = 45; g = 25; b = 75;
          } else if (elevation < 0.68) {
            r = 20; g = 50; b = 70;
          } else {
            r = 139; g = 92; b = 246; // radiant violet
          }
        } else {
          // Dark obsidian
          if (elevation < 0.44) {
            r = 9; g = 9; b = 11;
          } else if (elevation < 0.70) {
            r = 39; g = 39; b = 42;
          } else {
            r = 113; g = 113; b = 122;
          }
        }

        const idx = (y * width + x) * 4;
        data[idx] = r;
        data[idx + 1] = g;
        data[idx + 2] = b;
        data[idx + 3] = 255;
      }
    }

    ctx.putImageData(imgData, 0, 0);

    // Subtle map grid overlay
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.08)';
    ctx.lineWidth = 1;
    for (let gx = 50; gx < width; gx += 100) {
      ctx.beginPath();
      ctx.moveTo(gx, 0);
      ctx.lineTo(gx, height);
      ctx.stroke();
    }
    for (let gy = 50; gy < height; gy += 100) {
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.lineTo(width, gy);
      ctx.stroke();
    }

    return canvas.toDataURL('image/png');
  }
}
