import type { World, Article, MapPin, Statblock, ArticleCategory } from '../../../types/lore';
import type { ImportPreviewResult } from './types';

export class UniversalWorldImporter {
  /**
   * Main entry point: Inspect raw file content (JSON or Markdown) and return a structured preview
   */
  public static parse(content: string, fileName = 'Imported World'): ImportPreviewResult {
    const trimmed = content.trim();

    // 1. Try parsing as JSON
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      return this.parseJson(trimmed, fileName);
    }

    // 2. Otherwise treat as Markdown / Obsidian text
    return this.parseMarkdown(trimmed, fileName);
  }

  /**
   * Parse JSON formats: V2 Backup, Legacy Master JSON, or custom entity bundle
   */
  private static parseJson(rawJson: string, fileName: string): ImportPreviewResult {
    try {
      const data = JSON.parse(rawJson);

      // Case A: Full V2 Vault Backup
      if (data.version?.startsWith('2.') && Array.isArray(data.worlds)) {
        const primaryWorld: World = data.worlds[0] || {
          id: `imported-${Date.now()}`,
          name: fileName.replace(/\.[^/.]+$/, ''),
          description: 'Imported from LoreVault V2 Backup.',
          genre: 'Dark Fantasy',
          createdAt: new Date().toISOString(),
        };

        return {
          isValid: true,
          sourceType: 'v2_backup',
          world: primaryWorld,
          articles: Array.isArray(data.articles) ? data.articles : [],
          mapPins: Array.isArray(data.mapPins) ? data.mapPins : [],
          statblocks: Array.isArray(data.statblocks) ? data.statblocks : [],
          chapters: Array.isArray(data.novelChapters) ? data.novelChapters : [],
        };
      }

      // Case B: Legacy LoreVault Master Export / SQLite JSON
      if (Array.isArray(data.articles) || Array.isArray(data.lore_articles) || data.lore_statblocks) {
        const generatedWorldId = `world-legacy-${Date.now()}`;
        const rawWorldName = data.world_name || data.worldName || fileName.replace(/\.[^/.]+$/, '');

        const world: World = {
          id: generatedWorldId,
          name: rawWorldName,
          description: data.description || 'Migrated from legacy LoreVault Master repository.',
          genre: data.genre || 'Dark Fantasy',
          createdAt: new Date().toISOString(),
        };

        const rawArticles = data.articles || data.lore_articles || [];
        const articles: Article[] = rawArticles.map((raw: any, idx: number) => ({
          id: raw.id || `art-migrated-${idx}-${Date.now()}`,
          worldId: generatedWorldId,
          title: raw.title || `Article ${idx + 1}`,
          category: this.normalizeCategory(raw.category),
          summary: raw.summary || (raw.content ? raw.content.substring(0, 120) : 'Imported lore entry.'),
          content: raw.content || raw.body || '',
          tags: Array.isArray(raw.tags) ? raw.tags : typeof raw.tags === 'string' ? raw.tags.split(',') : ['Migrated'],
          isSecret: Boolean(raw.is_secret === 1 || raw.isSecret === true),
          updatedAt: raw.updated_at || new Date().toISOString(),
        }));

        const rawPins = data.map_pins || data.mapPins || [];
        const mapPins: MapPin[] = rawPins.map((raw: any, idx: number) => ({
          id: raw.id || `pin-migrated-${idx}`,
          mapId: raw.map_id || raw.mapId || 'map-1',
          worldId: generatedWorldId,
          articleId: raw.article_id || raw.articleId,
          label: raw.label || raw.title || `Pin ${idx + 1}`,
          xPct: typeof raw.x_pct === 'number' ? raw.x_pct : typeof raw.xPct === 'number' ? raw.xPct : 50,
          yPct: typeof raw.y_pct === 'number' ? raw.y_pct : typeof raw.yPct === 'number' ? raw.yPct : 50,
          category: raw.category || 'Settlement',
          icon: raw.icon || 'GiCastle',
          color: raw.color || '#f59e0b',
          isSecret: Boolean(raw.is_secret === 1 || raw.isSecret === true),
        }));

        const rawStatblocks = data.lore_statblocks || data.statblocks || [];
        const statblocks: Statblock[] = rawStatblocks.map((raw: any, idx: number) => ({
          id: raw.id || `sb-migrated-${idx}`,
          worldId: generatedWorldId,
          articleId: raw.article_id || raw.articleId,
          system: raw.system || 'dnd5e',
          name: raw.name || `Creature ${idx + 1}`,
          size: raw.size || 'Medium',
          creatureType: raw.creature_type || raw.creatureType || 'Humanoid',
          alignment: raw.alignment || 'Neutral',
          cr: String(raw.cr || '1'),
          ac: typeof raw.ac === 'number' ? raw.ac : 12,
          acType: raw.ac_type || raw.acType || 'natural armor',
          hp: typeof raw.hp === 'number' ? raw.hp : 40,
          hpFormula: raw.hp_formula || raw.hpFormula || '5d8 + 10',
          speed: raw.speed || '30 ft.',
          abilities: raw.abilities || { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
          actions: Array.isArray(raw.actions) ? raw.actions : [],
          isSecret: Boolean(raw.is_secret === 1 || raw.isSecret === true),
        }));

        return {
          isValid: true,
          sourceType: 'legacy_master',
          world,
          articles,
          mapPins,
          statblocks,
          chapters: [],
        };
      }

      // Case C: Single World object or Generic JSON
      const worldName = data.name || fileName.replace(/\.[^/.]+$/, '');
      const worldId = data.id || `world-custom-${Date.now()}`;
      return {
        isValid: true,
        sourceType: 'custom_json',
        world: {
          id: worldId,
          name: worldName,
          description: data.description || 'Imported JSON world dataset.',
          genre: data.genre || 'High Fantasy',
          createdAt: new Date().toISOString(),
        },
        articles: Array.isArray(data.articles) ? data.articles : [],
        mapPins: Array.isArray(data.mapPins) ? data.mapPins : [],
        statblocks: Array.isArray(data.statblocks) ? data.statblocks : [],
        chapters: Array.isArray(data.chapters) ? data.chapters : [],
      };
    } catch (err: any) {
      return {
        isValid: false,
        error: `JSON parse error: ${err.message}`,
        sourceType: 'custom_json',
        world: {} as World,
        articles: [],
        mapPins: [],
        statblocks: [],
        chapters: [],
      };
    }
  }

  /**
   * Parse Markdown / Obsidian file with YAML frontmatter
   */
  private static parseMarkdown(rawMd: string, fileName: string): ImportPreviewResult {
    try {
      const generatedWorldId = `world-md-${Date.now()}`;
      const defaultTitle = fileName.replace(/\.[^/.]+$/, '');
      
      let title = defaultTitle;
      let category: ArticleCategory = 'Lore';
      let tags: string[] = ['Markdown'];
      let isSecret = false;
      let body = rawMd;

      // Extract YAML frontmatter
      const yamlMatch = rawMd.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
      if (yamlMatch) {
        const frontmatterBlock = yamlMatch[1];
        body = yamlMatch[2].trim();

        frontmatterBlock.split(/\r?\n/).forEach((line) => {
          const colonIdx = line.indexOf(':');
          if (colonIdx > 0) {
            const key = line.slice(0, colonIdx).trim().toLowerCase();
            const val = line.slice(colonIdx + 1).trim();
            if (key === 'title') title = val.replace(/^["']|["']$/g, '');
            if (key === 'category') category = this.normalizeCategory(val);
            if (key === 'is_secret' || key === 'secret') isSecret = val === 'true' || val === '1';
            if (key === 'tags') {
              tags = val.replace(/^\[|\]$/g, '').split(',').map((t) => t.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
            }
          }
        });
      }

      // Convert [[WikiLink]] to @[WikiLink] syntax
      const convertedContent = body.replace(/\[\[(.*?)\]\]/g, '@[$1]');

      const article: Article = {
        id: `art-md-${Date.now()}`,
        worldId: generatedWorldId,
        title,
        category,
        summary: body.slice(0, 150) + (body.length > 150 ? '...' : ''),
        content: `<h2>${title}</h2><p>${convertedContent.replace(/\n\n/g, '</p><p>')}</p>`,
        tags,
        isSecret,
        updatedAt: new Date().toISOString(),
      };

      const world: World = {
        id: generatedWorldId,
        name: `World of ${title}`,
        description: `Imported from markdown archive ${fileName}.`,
        genre: 'Dark Fantasy',
        createdAt: new Date().toISOString(),
      };

      return {
        isValid: true,
        sourceType: 'markdown_vault',
        world,
        articles: [article],
        mapPins: [],
        statblocks: [],
        chapters: [],
      };
    } catch (err: any) {
      return {
        isValid: false,
        error: `Markdown parse error: ${err.message}`,
        sourceType: 'markdown_vault',
        world: {} as World,
        articles: [],
        mapPins: [],
        statblocks: [],
        chapters: [],
      };
    }
  }

  private static normalizeCategory(cat: string): ArticleCategory {
    if (!cat) return 'Lore';
    const c = cat.toLowerCase();
    if (c.includes('char') || c.includes('npc')) return 'Character';
    if (c.includes('loc') || c.includes('place') || c.includes('citadel')) return 'Location';
    if (c.includes('fact') || c.includes('order') || c.includes('guild')) return 'Faction';
    if (c.includes('item') || c.includes('relic') || c.includes('weapon')) return 'Item';
    if (c.includes('event') || c.includes('battle') || c.includes('era')) return 'Event';
    return 'Lore';
  }
}
