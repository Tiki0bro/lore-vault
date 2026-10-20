import type { 
  World, 
  Article, 
  MapPin, 
  Statblock, 
  DiceRollResult, 
  NovelChapter,
  TerritoryPolygon,
  MapRoute,
  TimelineEvent,
  AiSettings
} from '../../types/lore';

import dalariBundle from './dalariBundle.json';

export const resolveAssetUrl = (url?: string | null): string => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  // For relative asset URLs on GitHub Pages (e.g. /lore-vault/), prefix with base URL
  const base = import.meta.env.BASE_URL || '/';
  const cleanPath = url.startsWith('/') ? url.slice(1) : url;
  const cleanBase = base.endsWith('/') ? base : `${base}/`;
  return `${cleanBase}${cleanPath}`;
};

const STORAGE_KEYS = {
  WORLDS: 'lorevault_worlds_v2',
  ARTICLES: 'lorevault_articles_v2',
  MAP_PINS: 'lorevault_map_pins_v2',
  STATBLOCKS: 'lorevault_statblocks_v2',
  DICE_HISTORY: 'lorevault_dice_v2',
  NOVEL_CHAPTERS: 'lorevault_novel_chapters_v2',
  TERRITORIES: 'lorevault_territories_v2',
  ROUTES: 'lorevault_routes_v2',
  FOG_STATES: 'lorevault_fog_v2',
  TIMELINE_EVENTS: 'lorevault_timeline_events_v2',
  AI_SETTINGS: 'lorevault_ai_settings_v2',
  SCENE_SLATE: 'lorevault_scene_slate_v2',
  PROJECT_WORD_COUNT: 'lorevault_project_word_count_v2',
};

export const defaultSeedWorlds: World[] = (dalariBundle.worlds as World[]) || [];

export const defaultSeedArticles: Article[] = (dalariBundle.articles as Article[]) || [];

export const defaultSeedMapPins: MapPin[] = (dalariBundle.mapPins as unknown as MapPin[]) || [];

export const defaultSeedStatblocks: Statblock[] = ((dalariBundle.statblocks || []) as unknown as Statblock[]);

export const defaultSeedChapters: NovelChapter[] = [
  {
    id: 'chap-1',
    bookId: 'book-1',
    actId: 'act-1',
    chapterNumber: 1,
    title: 'The Pyre of the Silver Dawn',
    povCharacterId: 'art-1',
    targetWordCount: 3500,
    currentWordCount: 2450,
    status: 'polished',
    summary: 'High Inquisitor Vaelen oversees the purge of a rogue celestial coven in the outer ruins.',
    content: `<h2>Chapter 1: The Pyre of the Silver Dawn</h2><p>The dawn broke not with birdsong, but with the hollow toll of bronze armor scraping over basalt. High Inquisitor Vaelen stood upon the terrace, watching the banners of the Silver Dawn billow in the ash-laden wind.</p><p>"Burn the celestial relics first," Vaelen commanded, his voice cold as winter frost. "Leave no fragment unsealed."</p><p>Behind him, the Sunken Citadel groaned under the weight of the rising tide.</p>`,
  },
  {
    id: 'chap-2',
    bookId: 'book-1',
    actId: 'act-1',
    chapterNumber: 2,
    title: 'Echoes in the Sunken Fens',
    povCharacterId: 'art-2',
    targetWordCount: 4000,
    currentWordCount: 1820,
    status: 'draft',
    summary: 'A covert party approaches the flooded perimeter of Karas as the lunar eclipse begins.',
    content: `<h2>Chapter 2: Echoes in the Sunken Fens</h2><p>Mire water seeped through the seams of her boots. The Weeping Fens were unforgiving to those who traveled without a lantern of celestial glass.</p><p>"Do you hear it?" whispered Lyra, crouching behind the petrified roots of an ironwood tree. The water began to churn with pale luminescence.</p>`,
  },
  {
    id: 'chap-3',
    bookId: 'book-1',
    actId: 'act-2',
    chapterNumber: 3,
    title: 'The Bell That Never Rings',
    povCharacterId: 'art-3',
    targetWordCount: 3000,
    currentWordCount: 950,
    status: 'draft',
    summary: 'Inside the cloister of the Hollow Bell, a solitary monk contemplates breaking the sacred vow of silence.',
    content: `<h2>Chapter 3: The Bell That Never Rings</h2><p>Silence was not the absence of sound; it was an active restraint, held tight like a drawn bowstring. Brother Kaelen knelt before the towering obsidian campanile, his breath misting in the freezing monastery air.</p>`,
  },
];

export const defaultSeedTerritories: TerritoryPolygon[] = [
  {
    id: 'terr-1',
    mapId: 'map-1',
    worldId: 'world-1',
    name: 'Silver Dawn Protectorate',
    factionName: 'The Silver Dawn',
    ruler: 'High Inquisitor Vaelen',
    articleId: 'art-1',
    rulerArticleId: 'art-1',
    associatedArticleIds: ['art-1', 'art-2'],
    color: '#f59e0b',
    fillOpacity: 0.25,
    controlPct: 75,
    threatLevel: 'High',
    isSecret: false,
    notes: 'Heavily patrolled military zone fortified with sunstone bastions.',
    points: [
      { xPct: 20, yPct: 25 },
      { xPct: 45, yPct: 20 },
      { xPct: 50, yPct: 45 },
      { xPct: 30, yPct: 55 },
      { xPct: 18, yPct: 40 },
    ],
  },
  {
    id: 'terr-2',
    mapId: 'map-1',
    worldId: 'world-1',
    name: 'The Weeping Fens & Sunken Reach',
    factionName: 'Independent / Astral Remnants',
    ruler: 'None (Untamed Mire)',
    articleId: 'art-2',
    associatedArticleIds: ['art-2'],
    color: '#10b981',
    fillOpacity: 0.2,
    controlPct: 30,
    threatLevel: 'Medium',
    isSecret: false,
    notes: 'Flooded abyssal swamps submerged in celestial brine.',
    points: [
      { xPct: 52, yPct: 35 },
      { xPct: 78, yPct: 30 },
      { xPct: 82, yPct: 60 },
      { xPct: 60, yPct: 65 },
      { xPct: 48, yPct: 50 },
    ],
  },
  {
    id: 'terr-3',
    mapId: 'map-1',
    worldId: 'world-1',
    name: 'Sanctum of Silence',
    factionName: 'The Order of the Hollow Bell',
    ruler: 'The Silent Abbot',
    articleId: 'art-3',
    associatedArticleIds: ['art-3'],
    color: '#8b5cf6',
    fillOpacity: 0.3,
    controlPct: 90,
    threatLevel: 'Forbidden',
    isSecret: true,
    notes: 'Hermetic alpine sanctum hidden within perpetual cloud cover.',
    points: [
      { xPct: 65, yPct: 68 },
      { xPct: 88, yPct: 65 },
      { xPct: 85, yPct: 90 },
      { xPct: 62, yPct: 88 },
    ],
  },
];

export const defaultSeedRoutes: MapRoute[] = [
  {
    id: 'route-1',
    mapId: 'map-1',
    worldId: 'world-1',
    name: "The Pilgrim's March",
    color: '#f59e0b',
    totalMiles: 84,
    travelDaysFoot: 3.5,
    travelDaysMount: 2.6,
    travelDaysSail: 1.8,
    isSecret: false,
    waypoints: [
      { id: 'wp-1', label: 'Bastion Gate', xPct: 25, yPct: 35 },
      { id: 'wp-2', label: 'Crossroads Tavern', xPct: 42, yPct: 40 },
      { id: 'wp-3', label: 'Fen Edge Outpost', xPct: 58, yPct: 48 },
      { id: 'wp-4', label: 'Sunken Citadel Approach', xPct: 72, yPct: 52 },
    ],
  },
];

export const defaultSeedTimelineEvents: TimelineEvent[] = [
  {
    id: 'evt-1',
    worldId: 'world-1',
    year: '142 AF',
    yearNumeric: 142,
    title: 'The Cataclysm of Stars',
    category: 'Cataclysm',
    description: 'A shower of radiant astral monoliths pierced the crust of Aethelgard, shattering the old empires and flooding the lowlands with temporal brine.',
    articleId: 'art-2',
    isSecret: false,
  },
  {
    id: 'evt-2',
    worldId: 'world-1',
    year: '155 AF',
    yearNumeric: 155,
    title: 'Founding of the Silver Dawn',
    category: 'Faction',
    description: 'High Inquisitor Vaelen consolidated surviving zealots into the Silver Dawn to eradicate celestial anomalies and quarantine monolith zones.',
    articleId: 'art-1',
    isSecret: false,
  },
  {
    id: 'evt-3',
    worldId: 'world-1',
    year: '189 AF',
    yearNumeric: 189,
    title: 'The Submergence of Karas',
    category: 'Settlement',
    description: 'The ancient citadel was swallowed by the Weeping Fens when star-weavers submerged the vault to contain an astral temporal rift.',
    articleId: 'art-2',
    isSecret: false,
  },
  {
    id: 'evt-4',
    worldId: 'world-1',
    year: '210 AF',
    yearNumeric: 210,
    title: 'Discovery of the Obsidian Codex',
    category: 'Discovery',
    description: 'Archivists in the subterranean vaults unearthed the Obsidian Codex, detailing forbidden coordinates of fallen celestial vessels.',
    isSecret: true,
  },
];

export const defaultAiSettings: AiSettings = {
  provider: 'gemini',
  geminiApiKey: '',
  geminiModel: 'gemini-2.0-flash',
  ollamaEndpoint: 'http://localhost:11434',
  ollamaModel: 'llama3.2',
  tonePreset: 'high_fantasy',
  noGenerateMode: false,
};

export const vaultStorage = {
  loadTerritories(): TerritoryPolygon[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.TERRITORIES);
      if (!data) return defaultSeedTerritories;
      const parsed: TerritoryPolygon[] = JSON.parse(data);
      // Merge in seed linkages if missing
      return parsed.map((t) => {
        const seed = defaultSeedTerritories.find((s) => s.id === t.id);
        if (seed) {
          return {
            ...seed,
            ...t,
            articleId: t.articleId || seed.articleId,
            rulerArticleId: t.rulerArticleId || seed.rulerArticleId,
            associatedArticleIds: t.associatedArticleIds || seed.associatedArticleIds,
          };
        }
        return t;
      });
    } catch {
      return defaultSeedTerritories;
    }
  },

  saveTerritories(territories: TerritoryPolygon[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.TERRITORIES, JSON.stringify(territories));
    } catch (e) {
      console.error('Failed to save territories', e);
    }
  },

  loadRoutes(): MapRoute[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.ROUTES);
      return data ? JSON.parse(data) : defaultSeedRoutes;
    } catch {
      return defaultSeedRoutes;
    }
  },

  saveRoutes(routes: MapRoute[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.ROUTES, JSON.stringify(routes));
    } catch (e) {
      console.error('Failed to save routes', e);
    }
  },

  loadFogState(mapId: string): string | null {
    try {
      const data = localStorage.getItem(`${STORAGE_KEYS.FOG_STATES}_${mapId}`);
      return data || null;
    } catch {
      return null;
    }
  },

  saveFogState(mapId: string, dataUrl: string): void {
    try {
      localStorage.setItem(`${STORAGE_KEYS.FOG_STATES}_${mapId}`, dataUrl);
    } catch (e) {
      console.error('Failed to save fog state', e);
    }
  },

  loadNovelChapters(): NovelChapter[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.NOVEL_CHAPTERS);
      return data ? JSON.parse(data) : defaultSeedChapters;
    } catch {
      return defaultSeedChapters;
    }
  },

  saveNovelChapters(chapters: NovelChapter[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.NOVEL_CHAPTERS, JSON.stringify(chapters));
    } catch (e) {
      console.error('Failed to save novel chapters', e);
    }
  },
  loadWorlds(): World[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.WORLDS);
      if (!data) return defaultSeedWorlds;
      const parsed: World[] = JSON.parse(data);
      // If user only had the legacy placeholder demo worlds, prefer Dalari seed data
      const hasDalari = parsed.some((w) => w.id === 'world-dalari-codex' || w.id === 'world-silverhawks-campaign');
      if (!hasDalari && parsed.some((w) => w.id === 'world-1')) {
        return defaultSeedWorlds;
      }
      return parsed.length > 0 ? parsed : defaultSeedWorlds;
    } catch {
      return defaultSeedWorlds;
    }
  },

  saveWorlds(worlds: World[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.WORLDS, JSON.stringify(worlds));
    } catch (e) {
      console.error('Failed to save worlds', e);
    }
  },

  loadArticles(): Article[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.ARTICLES);
      if (!data) return defaultSeedArticles;
      const parsed: Article[] = JSON.parse(data);
      const hasDalari = parsed.some((a) => a.worldId === 'world-dalari-codex' || a.worldId === 'world-silverhawks-campaign');
      if (!hasDalari && parsed.some((a) => a.worldId === 'world-1')) {
        return defaultSeedArticles;
      }
      return parsed.map((art) => {
        const seed = defaultSeedArticles.find((s) => s.id === art.id);
        if (seed && !art.coverImageUrl && seed.coverImageUrl) {
          return {
            ...art,
            coverImageUrl: seed.coverImageUrl,
            coverImagePrompt: seed.coverImagePrompt,
          };
        }
        return art;
      });
    } catch {
      return defaultSeedArticles;
    }
  },

  saveArticles(articles: Article[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.ARTICLES, JSON.stringify(articles));
    } catch (e) {
      console.error('Failed to save articles', e);
    }
  },

  loadMapPins(): MapPin[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.MAP_PINS);
      if (!data) return defaultSeedMapPins;
      const parsed: MapPin[] = JSON.parse(data);
      const hasDalari = parsed.some((p) => p.worldId === 'world-dalari-codex' || p.worldId === 'world-silverhawks-campaign');
      if (!hasDalari && parsed.some((p) => p.worldId === 'world-1')) {
        return defaultSeedMapPins;
      }
      return parsed.length > 0 ? parsed : defaultSeedMapPins;
    } catch {
      return defaultSeedMapPins;
    }
  },

  saveMapPins(pins: MapPin[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.MAP_PINS, JSON.stringify(pins));
    } catch (e) {
      console.error('Failed to save map pins', e);
    }
  },

  loadStatblocks(): Statblock[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.STATBLOCKS);
      return data ? JSON.parse(data) : defaultSeedStatblocks;
    } catch {
      return defaultSeedStatblocks;
    }
  },

  saveStatblocks(statblocks: Statblock[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.STATBLOCKS, JSON.stringify(statblocks));
    } catch (e) {
      console.error('Failed to save statblocks', e);
    }
  },

  loadDiceHistory(): DiceRollResult[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.DICE_HISTORY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveDiceHistory(history: DiceRollResult[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.DICE_HISTORY, JSON.stringify(history.slice(0, 50)));
    } catch (e) {
      console.error('Failed to save dice history', e);
    }
  },

  loadTimelineEvents(): TimelineEvent[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.TIMELINE_EVENTS);
      return data ? JSON.parse(data) : defaultSeedTimelineEvents;
    } catch {
      return defaultSeedTimelineEvents;
    }
  },

  saveTimelineEvents(events: TimelineEvent[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.TIMELINE_EVENTS, JSON.stringify(events));
    } catch (e) {
      console.error('Failed to save timeline events', e);
    }
  },

  loadAiSettings(): AiSettings {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.AI_SETTINGS);
      return data ? { ...defaultAiSettings, ...JSON.parse(data) } : defaultAiSettings;
    } catch {
      return defaultAiSettings;
    }
  },

  saveAiSettings(settings: AiSettings): void {
    try {
      localStorage.setItem(STORAGE_KEYS.AI_SETTINGS, JSON.stringify(settings));
    } catch (e) {
      console.error('Failed to save AI settings', e);
    }
  },

  loadSceneSlate(): string[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SCENE_SLATE);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveSceneSlate(articleIds: string[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.SCENE_SLATE, JSON.stringify(articleIds));
    } catch (e) {
      console.error('Failed to save scene slate', e);
    }
  },

  loadProjectTargetWordCount(): number {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PROJECT_WORD_COUNT);
      return data ? parseInt(data, 10) || 50000 : 50000;
    } catch {
      return 50000;
    }
  },

  saveProjectTargetWordCount(count: number): void {
    try {
      localStorage.setItem(STORAGE_KEYS.PROJECT_WORD_COUNT, count.toString());
    } catch (e) {
      console.error('Failed to save project word count', e);
    }
  },

  exportVaultBackup(): string {
    const backup = {
      version: '2.0.0',
      exportedAt: new Date().toISOString(),
      worlds: this.loadWorlds(),
      articles: this.loadArticles(),
      mapPins: this.loadMapPins(),
      statblocks: this.loadStatblocks(),
      diceHistory: this.loadDiceHistory(),
      novelChapters: this.loadNovelChapters(),
      timelineEvents: this.loadTimelineEvents(),
      aiSettings: this.loadAiSettings(),
    };
    return JSON.stringify(backup, null, 2);
  },

  importVaultBackup(jsonString: string): boolean {
    try {
      const data = JSON.parse(jsonString);
      if (Array.isArray(data.worlds)) this.saveWorlds(data.worlds);
      if (Array.isArray(data.articles)) this.saveArticles(data.articles);
      if (Array.isArray(data.mapPins)) this.saveMapPins(data.mapPins);
      if (Array.isArray(data.statblocks)) this.saveStatblocks(data.statblocks);
      if (Array.isArray(data.diceHistory)) this.saveDiceHistory(data.diceHistory);
      if (Array.isArray(data.novelChapters)) this.saveNovelChapters(data.novelChapters);
      return true;
    } catch (e) {
      console.error('Invalid vault backup format', e);
      return false;
    }
  },
};
