import type { Article, World } from '../../types/lore';

export type ImageStylePreset = 
  | 'realism' 
  | 'anime' 
  | 'concept_art' 
  | 'comic'
  // Legacy backward-compatibility aliases
  | 'grimdark' 
  | 'illuminated' 
  | 'high_fantasy' 
  | 'charcoal' 
  | 'blueprint' 
  | 'cyberpunk' 
  | 'portrait';

export type ImageAspectRatio = 'banner' | 'square' | 'portrait' | 'cinematic';

export interface StylePresetMeta {
  id: ImageStylePreset;
  name: string;
  description: string;
  promptSuffix: string;
  badgeColor: string;
}

export const IMAGE_STYLE_PRESETS: Record<ImageStylePreset, StylePresetMeta> = {
  realism: {
    id: 'realism',
    name: 'Photorealism',
    description: 'Hyper-realistic photography, 8k resolution, authentic skin texture, cinematic lighting, natural shadows',
    promptSuffix: 'photorealistic portrait, 35mm photograph, authentic skin pores and detailed textures, natural rim lighting, 8k resolution, hyper-realistic masterpiece',
    badgeColor: 'border-amber-600/60 text-amber-200 bg-amber-950/40',
  },
  anime: {
    id: 'anime',
    name: 'Anime Style',
    description: 'High-end Japanese anime aesthetic, vibrant cell shading, expressive eyes, Makoto Shinkai / Ufotable lighting',
    promptSuffix: 'high-quality anime illustration, aesthetic Japanese animation style, vibrant cell shading, intricate linework, glowing cinematic lighting, masterpiece, key visual',
    badgeColor: 'border-pink-600/60 text-pink-300 bg-pink-950/40',
  },
  concept_art: {
    id: 'concept_art',
    name: 'Digital Concept Art',
    description: 'Polished AAA video game concept art, sweeping digital painting, moody atmospheric depth, ArtStation trending',
    promptSuffix: 'epic digital concept art, AAA video game character design, dynamic lighting, atmospheric brushwork, textured digital painting, trending on ArtStation, highly detailed',
    badgeColor: 'border-cyan-600/60 text-cyan-300 bg-cyan-950/40',
  },
  comic: {
    id: 'comic',
    name: 'Comic Book / Cartoon',
    description: 'Dynamic Marvel & DC comic style, bold ink contour lines, vivid halftone colors, dramatic hero shading',
    promptSuffix: 'modern comic book illustration, dynamic Marvel and DC graphic novel style, bold black ink linework, vivid colored inks, dramatic crosshatch shading, superhero comic cover art',
    badgeColor: 'border-red-600/60 text-red-300 bg-red-950/40',
  },

  // Legacy mappings for existing history items
  grimdark: {
    id: 'grimdark',
    name: 'Photorealism',
    description: 'Chiaroscuro lighting, textured brushwork, gritty fantasy atmosphere',
    promptSuffix: 'photorealistic portrait, 35mm photograph, authentic skin pores and detailed textures, natural rim lighting, 8k resolution, hyper-realistic masterpiece',
    badgeColor: 'border-amber-700/60 text-amber-300 bg-amber-950/40',
  },
  illuminated: {
    id: 'illuminated',
    name: 'Illuminated Manuscript',
    description: 'Medieval parchment, antique woodcut etching, gold leaf filigree',
    promptSuffix: 'ancient medieval illuminated manuscript style, aged vellum parchment texture, antique woodcut print, gold leaf filigree details, sepia ink wash',
    badgeColor: 'border-yellow-700/60 text-yellow-300 bg-yellow-950/40',
  },
  high_fantasy: {
    id: 'high_fantasy',
    name: 'Digital Concept Art',
    description: 'Cinematic digital art, radiant ether glow, majestic composition',
    promptSuffix: 'epic digital concept art, AAA video game character design, dynamic lighting, atmospheric brushwork, textured digital painting, trending on ArtStation, highly detailed',
    badgeColor: 'border-cyan-700/60 text-cyan-300 bg-cyan-950/40',
  },
  charcoal: {
    id: 'charcoal',
    name: 'Gothic Ink & Charcoal',
    description: 'Heavy ink crosshatching, charcoal wash, haunting shadows',
    promptSuffix: 'dark gothic etching, pen and ink crosshatching, charcoal wash, ominous atmospheric shadows, dark fantasy illustration, high contrast',
    badgeColor: 'border-zinc-700/60 text-zinc-300 bg-zinc-900',
  },
  blueprint: {
    id: 'blueprint',
    name: 'Arcane Blueprint',
    description: 'Alchemical diagrams, glowing runes, celestial schematics',
    promptSuffix: 'arcane alchemical schematic, parchment blueprint with glowing magical runes, technical grimoire illustration, celestial geometry diagram',
    badgeColor: 'border-purple-700/60 text-purple-300 bg-purple-950/40',
  },
  cyberpunk: {
    id: 'cyberpunk',
    name: 'Comic Book / Cartoon',
    description: 'Rain-slick neon reflections, gritty synth aesthetic',
    promptSuffix: 'modern comic book illustration, dynamic Marvel and DC graphic novel style, bold black ink linework, vivid colored inks, dramatic crosshatch shading, superhero comic cover art',
    badgeColor: 'border-rose-700/60 text-rose-300 bg-rose-950/40',
  },
  portrait: {
    id: 'portrait',
    name: 'Photorealism',
    description: 'Dramatic lighting, intricate costume details, expressive gaze',
    promptSuffix: 'photorealistic portrait, 35mm photograph, authentic skin pores and detailed textures, natural rim lighting, 8k resolution, hyper-realistic masterpiece',
    badgeColor: 'border-emerald-700/60 text-emerald-300 bg-emerald-950/40',
  },
};

export const CORE_STYLE_KEYS: ImageStylePreset[] = ['realism', 'anime', 'concept_art', 'comic'];

export interface ImageGenerationOptions {
  prompt: string;
  style?: ImageStylePreset;
  aspectRatio?: ImageAspectRatio;
  seed?: number;
  enhancePrompt?: boolean;
}

export class ImageGenerator {
  /**
   * Calculate width and height based on aspect ratio
   */
  public static getDimensions(ratio: ImageAspectRatio = 'banner'): { width: number; height: number } {
    switch (ratio) {
      case 'banner':
        return { width: 1280, height: 540 }; // 21:9 panoramic banner
      case 'portrait':
        return { width: 768, height: 1024 }; // 3:4 portrait
      case 'cinematic':
        return { width: 1280, height: 720 }; // 16:9 widescreen
      case 'square':
      default:
        return { width: 800, height: 800 }; // 1:1 square
    }
  }

  /**
   * Suggest an intelligent prompt based on an article's context
   */
  public static suggestPrompt(article: Article, world?: World): { prompt: string; style: ImageStylePreset } {
    const genre = world?.genre || 'Dark Fantasy';
    const title = article.title.trim();
    const summary = article.summary ? article.summary.replace(/<[^>]+>/g, '').trim() : '';
    const cleanContent = article.content ? article.content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : '';

    let defaultStyle: ImageStylePreset = 'realism';
    if (genre === 'Sci-Fi') defaultStyle = 'concept_art';
    else if (genre === 'High Fantasy') defaultStyle = 'concept_art';

    let prompt = '';

    switch (article.category) {
      case 'Character': {
        defaultStyle = 'realism';
        // Extract descriptive attributes from summary or prose if present
        const contextText = `${summary} ${cleanContent.slice(0, 300)}`;
        const hasRace = contextText.match(/\b(human|elf|elven|dwarf|dwarven|orc|orcish|tiefling|halfling|gnome|android|cyborg)\b/i);
        const hasGender = contextText.match(/\b(male|female|man|woman|matriarch|patriarch|knight|guard|warrior|mage|inquisitor)\b/i);
        const hasHair = contextText.match(/\b(silver|black|blonde|brown|red|white|grey|gray|raven|golden)\s+(hair|beard|mane|locks)\b/i);

        const raceDesc = hasRace ? hasRace[0] : (genre === 'Sci-Fi' ? 'human' : 'human');
        const roleDesc = hasGender ? hasGender[0] : 'character';
        const hairDesc = hasHair ? hasHair[0] : 'weathered features with intense gaze';

        prompt = `${title}, ${raceDesc} ${roleDesc}, ${hairDesc}, detailed period-accurate attire, upper body portrait`;
        break;
      }
      case 'Location':
        defaultStyle = 'concept_art';
        prompt = `${title}, vista of ancient architectural structure and surroundings, atmospheric lighting, dramatic skies, sweeping panorama`;
        break;
      case 'Faction':
        defaultStyle = 'comic';
        prompt = `Emblem, banners and stronghold of ${title}, heraldic sigils, armored members assembled in courtyard, atmospheric lighting`;
        break;
      case 'Item':
        defaultStyle = 'concept_art';
        prompt = `${title}, legendary relic artifact, intricate craftsmanship, ethereal glow and runic etchings, resting upon an altar pedestal`;
        break;
      case 'Event':
        defaultStyle = 'comic';
        prompt = `${title}, climactic epochal confrontation, dynamic action, monumental perspective with atmospheric lighting and smoke`;
        break;
      case 'Lore':
      default:
        defaultStyle = 'realism';
        prompt = `${title}, ancient astrological maps and forbidden historical archives, mysterious reverent atmosphere with textured chiaroscuro shadows`;
        break;
    }

    if (summary) {
      // Append summary snippet
      prompt = `${prompt}, ${summary.slice(0, 100)}`;
    }

    return { prompt, style: defaultStyle };
  }

  /**
   * Build the complete enriched prompt for image generation
   */
  public static buildFullPrompt(basePrompt: string, style: ImageStylePreset = 'grimdark', enhance = true): string {
    const cleaned = basePrompt.trim().replace(/[.\s]+$/, '');
    if (!enhance) return cleaned;

    const styleMeta = IMAGE_STYLE_PRESETS[style] || IMAGE_STYLE_PRESETS.grimdark;
    return `${cleaned}, ${styleMeta.promptSuffix}`;
  }

  /** Random seed in the range Pollinations accepts. */
  public static randomSeed(): number {
    return Math.floor(Math.random() * 2_000_000_000);
  }

  /**
   * "HD" dimensions: same aspect ratio scaled up so the long side is ~2048px.
   * Re-rendering with the same seed + prompt at a larger size gives a close (not identical) image.
   */
  public static getHdDimensions(ratio: ImageAspectRatio): { width: number; height: number } {
    const { width, height } = this.getDimensions(ratio);
    const factor = Math.min(2, 2048 / Math.max(width, height));
    return { width: Math.round((width * factor) / 8) * 8, height: Math.round((height * factor) / 8) * 8 };
  }

  /**
   * Deterministic Pollinations URL. Same prompt + style + seed + size => same image,
   * which is what makes seed locking ("Remix") and HD re-renders possible.
   */
  public static buildUrl(params: {
    prompt: string;
    style: ImageStylePreset;
    seed: number;
    width: number;
    height: number;
    enhancePrompt?: boolean;
  }): string {
    const fullPrompt = this.buildFullPrompt(params.prompt, params.style, params.enhancePrompt ?? true);
    const qs = new URLSearchParams({
      width: String(params.width),
      height: String(params.height),
      seed: String(params.seed),
      nologo: 'true',
      private: 'true',
    });
    return `https://image.pollinations.ai/prompt/${encodeURIComponent(fullPrompt)}?${qs.toString()}`;
  }

  /**
   * Load an image with retries + backoff. The free tier can rate-limit or be slow,
   * so a failed attempt is retried a couple of times before giving up.
   */
  public static async loadWithRetry(url: string, attempts = 3, timeoutMs = 60000): Promise<string> {
    let lastError: unknown;
    for (let i = 0; i < attempts; i++) {
      try {
        // Cache-bust retries only (same seed => same image), so the browser doesn't reuse a failed response.
        const attemptUrl = i === 0 ? url : `${url}&retry=${i}`;
        await this.preloadImage(attemptUrl, timeoutMs);
        return attemptUrl;
      } catch (e) {
        lastError = e;
        await new Promise((r) => setTimeout(r, 2500 * (i + 1)));
      }
    }
    throw lastError instanceof Error ? lastError : new Error('Image failed to load');
  }

  /**
   * Primary image generator:
   * Returns a ready-to-use image URL.
   */
  public static async generateImage(options: ImageGenerationOptions): Promise<string> {
    const { prompt, style = 'grimdark', aspectRatio = 'banner', enhancePrompt = true } = options;
    const { width, height } = this.getDimensions(aspectRatio);
    const seed = options.seed || this.randomSeed();

    // Pollinations.ai running FLUX: free, no API key, CORS friendly
    const pollinationsUrl = this.buildUrl({ prompt, style, seed, width, height, enhancePrompt });

    // Pre-test image loading to ensure no broken links
    try {
      return await this.loadWithRetry(pollinationsUrl, 1, 10000);
    } catch {
      // Fallback: If network rate-limits (HTTP 402 / x402) or is offline, generate stylized procedural lore art
      return this.generateProceduralFallbackSvg(prompt, style, width, height, seed);
    }
  }

  /**
   * Preload an image URL to verify it resolves
   */
  public static preloadImage(url: string, timeoutMs = 8000): Promise<void> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const timer = setTimeout(() => {
        img.src = '';
        reject(new Error('Image request timed out'));
      }, timeoutMs);

      img.onload = () => {
        clearTimeout(timer);
        resolve();
      };
      img.onerror = (e) => {
        clearTimeout(timer);
        reject(e);
      };
      img.src = url;
    });
  }

  /**
   * Offline/Local Procedural SVG Fallback generator:
   * Creates an atmospheric, beautifully styled lore seal / emblem canvas.
   * Uses seed to generate distinct geometric mandalas and star glyphs for variations.
   */
  public static generateProceduralFallbackSvg(
    title: string, 
    style: ImageStylePreset, 
    width: number, 
    height: number,
    seed: number = 0
  ): string {
    const safeTitle = title.replace(/[<>&"]/g, '').slice(0, 40);
    const primaryColors: Record<ImageStylePreset, { bg1: string; bg2: string; accent: string; glow: string }> = {
      realism: { bg1: '#0f1115', bg2: '#1f242d', accent: '#f59e0b', glow: 'rgba(245, 158, 11, 0.25)' },
      anime: { bg1: '#160824', bg2: '#2f124d', accent: '#ec4899', glow: 'rgba(236, 72, 153, 0.35)' },
      concept_art: { bg1: '#071626', bg2: '#0e2e4f', accent: '#06b6d4', glow: 'rgba(6, 182, 212, 0.35)' },
      comic: { bg1: '#180709', bg2: '#381016', accent: '#ef4444', glow: 'rgba(239, 68, 68, 0.35)' },
      grimdark: { bg1: '#120d09', bg2: '#2a1a0f', accent: '#f59e0b', glow: 'rgba(245, 158, 11, 0.25)' },
      illuminated: { bg1: '#1c170e', bg2: '#362a19', accent: '#eab308', glow: 'rgba(234, 179, 8, 0.3)' },
      high_fantasy: { bg1: '#0a192f', bg2: '#1e3a5f', accent: '#38bdf8', glow: 'rgba(56, 189, 248, 0.3)' },
      charcoal: { bg1: '#09090b', bg2: '#18181b', accent: '#d4d4d8', glow: 'rgba(212, 212, 216, 0.15)' },
      blueprint: { bg1: '#0f172a', bg2: '#1e1b4b', accent: '#a855f7', glow: 'rgba(168, 85, 247, 0.3)' },
      cyberpunk: { bg1: '#0d0221', bg2: '#240046', accent: '#f43f5e', glow: 'rgba(244, 63, 94, 0.3)' },
      portrait: { bg1: '#141416', bg2: '#27272a', accent: '#10b981', glow: 'rgba(16, 185, 129, 0.25)' },
    };

    const c = primaryColors[style] || primaryColors.realism;
    const variationMod = Math.abs(seed % 4);
    const rotation = (seed % 360);
    const radiusMod = 45 + (variationMod * 6);

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <defs>
        <radialGradient id="grad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="${c.bg2}" />
          <stop offset="100%" stop-color="${c.bg1}" />
        </radialGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="6" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      <rect width="100%" height="100%" fill="url(#grad)" />
      
      <!-- Decorative Borders -->
      <rect x="20" y="20" width="${width - 40}" height="${height - 40}" fill="none" stroke="${c.accent}" stroke-width="1.5" stroke-opacity="0.4" rx="12" />
      <rect x="28" y="28" width="${width - 56}" height="${height - 56}" fill="none" stroke="${c.accent}" stroke-width="0.75" stroke-dasharray="8 4" stroke-opacity="0.3" rx="8" />

      <!-- Celestial Lore Sigil in Center -->
      <g transform="translate(${width / 2}, ${height / 2 - 20}) rotate(${rotation})" filter="url(#glow)">
        <circle r="${radiusMod + 12}" fill="none" stroke="${c.accent}" stroke-width="1.5" stroke-opacity="0.6" />
        <circle r="${radiusMod}" fill="none" stroke="${c.accent}" stroke-width="1" stroke-dasharray="4 6" stroke-opacity="0.5" />
        ${variationMod % 2 === 0 ? `
          <polygon points="0,-42 36,20 -36,20" fill="none" stroke="${c.accent}" stroke-width="1.2" stroke-opacity="0.7" />
          <polygon points="0,42 36,-20 -36,-20" fill="none" stroke="${c.accent}" stroke-width="1.2" stroke-opacity="0.7" />
        ` : `
          <rect x="-30" y="-30" width="60" height="60" fill="none" stroke="${c.accent}" stroke-width="1.2" stroke-opacity="0.7" />
          <rect x="-30" y="-30" width="60" height="60" transform="rotate(45)" fill="none" stroke="${c.accent}" stroke-width="1.2" stroke-opacity="0.7" />
        `}
        <circle r="8" fill="${c.accent}" fill-opacity="0.8" />
      </g>

      <!-- Atmospheric Title Typography -->
      <text x="${width / 2}" y="${height / 2 + 75}" font-family="Cinzel, Georgia, serif" font-size="22" font-weight="bold" fill="#f4f4f5" text-anchor="middle" letter-spacing="3" opacity="0.95">${safeTitle}</text>
      <text x="${width / 2}" y="${height / 2 + 105}" font-family="sans-serif" font-size="11" font-weight="600" fill="${c.accent}" text-anchor="middle" letter-spacing="4" text-transform="uppercase" opacity="0.75">Lore Vault Archival Record</text>
    </svg>`;

    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }
}
