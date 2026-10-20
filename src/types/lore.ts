export type ViewMode = 'manuscript' | 'atlas' | 'canvas' | 'bestiary' | 'timeline';

export type WorkspaceMode = 'codex' | 'novel';

export type ThemeMode = 
  | 'ancient-codex' 
  | 'radiant-arcane' 
  | 'grimdark-iron' 
  | 'scholars-parchment';

export type ArticleCategory = 
  | 'Character' 
  | 'Location' 
  | 'Faction' 
  | 'Item' 
  | 'Event' 
  | 'Lore';

export interface World {
  id: string;
  name: string;
  description: string;
  genre: 'High Fantasy' | 'Dark Fantasy' | 'Sci-Fi' | 'Gothic Horror' | 'Steampunk';
  createdAt: string;
}

export interface ArticleImage {
  id: string;
  url: string;
  caption?: string;
  prompt?: string;
  createdAt: string;
}

export interface Article {
  id: string;
  worldId: string;
  title: string;
  category: ArticleCategory;
  summary: string;
  content: string; // TipTap / Markdown text
  tags: string[];
  isSecret: boolean;
  updatedAt: string;
  coverImageUrl?: string;
  coverImagePrompt?: string;
  images?: ArticleImage[];
}

export type TimelineCategory = 'Cataclysm' | 'Faction' | 'Settlement' | 'Character' | 'Discovery' | 'War' | 'Dynasty' | 'Era' | 'Origin' | string;

export interface TimelineEvent {
  id: string;
  worldId: string;
  year: string;
  yearNumeric: number;
  title: string;
  category: TimelineCategory;
  description: string;
  articleId?: string;
  isSecret: boolean;
}

export interface MapPin {
  id: string;
  mapId: string;
  worldId: string;
  articleId?: string;
  label: string;
  xPct: number; // 0.00 to 100.00
  yPct: number;
  category: 'Settlement' | 'Dungeon' | 'Monolith' | 'Tavern' | 'Danger';
  icon: string;
  color: string;
  isSecret: boolean;
}

export interface StatblockAction {
  id: string;
  name: string;
  desc: string;
  attackBonus?: number;
  formula?: string; // e.g. 1d20+5 or DC 13
}

export interface Statblock {
  id: string;
  worldId: string;
  articleId?: string;
  system: 'dnd5e' | 'pf2e';
  name: string;
  size: string;
  creatureType: string;
  alignment: string;
  cr: string;
  ac: number;
  acType: string;
  hp: number;
  hpFormula: string;
  speed: string;
  abilities: {
    str: number;
    dex: number;
    con: number;
    int: number;
    wis: number;
    cha: number;
  };
  actions: StatblockAction[];
  isSecret: boolean;
}

export interface DiceRollResult {
  id: string;
  expression: string;
  total: number;
  rolls: number[];
  isCriticalHit?: boolean;
  isFumble?: boolean;
  isSecret?: boolean;
  timestamp: string;
}

export interface NovelBook {
  id: string;
  worldId: string;
  title: string;
  targetWordCount: number;
  currentWordCount: number;
}

export interface NovelAct {
  id: string;
  bookId: string;
  title: string;
  order: number;
}

export interface NovelChapter {
  id: string;
  actId: string;
  bookId: string;
  chapterNumber: number;
  title: string;
  povCharacterId?: string;
  targetWordCount: number;
  currentWordCount: number;
  status: 'draft' | 'revision' | 'polished';
  summary?: string;
  content: string; // TipTap HTML or markdown
}

export interface TerritoryPolygon {
  id: string;
  mapId: string;
  worldId: string;
  name: string;
  factionName: string;
  ruler?: string;
  color: string;
  fillOpacity: number;
  points: Array<{ xPct: number; yPct: number }>; // normalized 0-100 coordinates
  controlPct: number;
  threatLevel: 'Low' | 'Medium' | 'High' | 'Forbidden';
  isSecret: boolean;
  notes?: string;
  articleId?: string;
  rulerArticleId?: string;
  associatedArticleIds?: string[];
}

export interface MapRouteWaypoint {
  id: string;
  label?: string;
  xPct: number;
  yPct: number;
}

export interface MapRoute {
  id: string;
  mapId: string;
  worldId: string;
  name: string;
  color: string;
  waypoints: MapRouteWaypoint[];
  totalMiles: number;
  travelDaysFoot: number;
  travelDaysMount: number;
  travelDaysSail: number;
  isSecret: boolean;
}

export interface MapFogState {
  mapId: string;
  worldId: string;
  dataUrl: string; // PNG mask
  updatedAt: string;
}

export type AiProviderType = 'gemini' | 'ollama' | 'simulation';

export type TonePreset = 
  | 'high_fantasy' 
  | 'grimdark' 
  | 'scifi' 
  | 'gothic' 
  | 'academic' 
  | 'mythic';

export interface AiSettings {
  provider: AiProviderType;
  geminiApiKey: string;
  geminiModel: string;
  ollamaEndpoint: string;
  ollamaModel: string;
  tonePreset: TonePreset;
  noGenerateMode: boolean; // Craft purist mode
  systemPromptCustom?: string;
}

export interface NpcDialogueMessage {
  id: string;
  speaker: 'npc' | 'user';
  speakerName: string;
  text: string;
  timestamp: string;
}


