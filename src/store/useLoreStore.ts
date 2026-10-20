import { create } from 'zustand';
import type { 
  World, 
  Article, 
  MapPin, 
  Statblock, 
  ViewMode, 
  DiceRollResult,
  ThemeMode,
  WorkspaceMode,
  NovelChapter,
  TerritoryPolygon,
  MapRoute,
  TimelineEvent,
  AiSettings
} from '../types/lore';
import { vaultStorage } from '../lib/storage/vaultStorage';

interface LoreStoreState {
  // Theme & Workspace
  theme: ThemeMode;
  activeWorkspace: WorkspaceMode;
  isWorldImporterOpen: boolean;

  // World Context & View
  worlds: World[];
  activeWorldId: string;
  activeView: ViewMode;
  isPlayerMode: boolean; // DM secret filtering
  isSearchPaletteOpen: boolean;
  isDiceDockOpen: boolean;
  is3dDiceOpen: boolean;
  isAiDrawerOpen: boolean;
  isPinPlacementMode: boolean;
  articles: Article[];
  mapPins: MapPin[];
  statblocks: Statblock[];
  diceHistory: DiceRollResult[];

  // Timeline Chronos
  timelineEvents: TimelineEvent[];
  addTimelineEvent: (event: TimelineEvent) => void;
  updateTimelineEvent: (id: string, updates: Partial<TimelineEvent>) => void;
  deleteTimelineEvent: (id: string) => void;

  // Novel Studio
  novelChapters: NovelChapter[];
  activeChapterId: string;
  projectTargetWordCount: number;
  setProjectTargetWordCount: (count: number) => void;
  reorderChapters: (fromOrChapters: number | NovelChapter[], toIndex?: number) => void;

  // Scene Slate (Context Pinning)
  sceneSlateArticleIds: string[];
  toggleSceneSlateArticle: (articleId: string) => void;
  clearSceneSlate: () => void;

  // AI Settings
  aiSettings: AiSettings;
  updateAiSettings: (updates: Partial<AiSettings>) => void;

  // Cartography & Atlas Layers
  territories: TerritoryPolygon[];
  routes: MapRoute[];
  isFogLayerEnabled: boolean;
  isTerritoryLayerEnabled: boolean;
  isRouteLayerEnabled: boolean;
  fogBrushMode: 'reveal' | 'conceal';
  fogBrushSize: number;

  // Actions
  addTerritory: (terr: TerritoryPolygon) => void;
  updateTerritory: (id: string, updates: Partial<TerritoryPolygon>) => void;
  deleteTerritory: (id: string) => void;
  addRoute: (route: MapRoute) => void;
  deleteRoute: (id: string) => void;
  toggleFogLayer: () => void;
  toggleTerritoryLayer: () => void;
  toggleRouteLayer: () => void;
  setFogBrushMode: (mode: 'reveal' | 'conceal') => void;
  setFogBrushSize: (size: number) => void;
  saveFogData: (mapId: string, dataUrl: string) => void;
  getFogData: (mapId: string) => string | null;
  setTheme: (theme: ThemeMode) => void;
  setActiveWorkspace: (workspace: WorkspaceMode) => void;
  setWorldImporterOpen: (open: boolean) => void;
  setActiveWorldId: (id: string) => void;
  setActiveView: (view: ViewMode) => void;
  togglePlayerMode: () => void;
  setSearchPaletteOpen: (open: boolean) => void;
  setDiceDockOpen: (open: boolean) => void;
  toggleDiceDock: () => void;
  set3dDiceOpen: (open: boolean) => void;
  toggle3dDice: () => void;
  setAiDrawerOpen: (open: boolean) => void;
  toggleAiDrawer: () => void;
  setPinPlacementMode: (active: boolean) => void;
  addDiceRoll: (roll: DiceRollResult) => void;
  clearDiceHistory: () => void;
  
  // Article Actions
  selectedArticleId: string;
  setSelectedArticleId: (id: string) => void;
  updateArticle: (id: string, updates: Partial<Article>) => void;
  createArticle: (article: Article) => void;
  deleteArticle: (id: string) => void;

  // Map Pin Actions
  addMapPin: (pin: MapPin) => void;
  deleteMapPin: (id: string) => void;

  // Statblock Actions
  addStatblock: (statblock: Statblock) => void;
  updateStatblock: (id: string, updates: Partial<Statblock>) => void;
  deleteStatblock: (id: string) => void;

  // Novel Chapter Actions
  setActiveChapterId: (id: string) => void;
  updateChapter: (id: string, updates: Partial<NovelChapter>) => void;
  addChapter: (chapter: NovelChapter) => void;
  deleteChapter: (id: string) => void;

  // World Actions
  deleteWorld: (worldId: string) => void;

  // Universal World Importer
  importWorldData: (payload: {
    world: World;
    articles?: Article[];
    mapPins?: MapPin[];
    statblocks?: Statblock[];
    chapters?: NovelChapter[];
    cleanSlate?: boolean;
  }) => void;
}

export const applyThemeToDocument = (theme: ThemeMode) => {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-theme', theme);
  if (theme === 'scholars-parchment') {
    document.documentElement.classList.remove('dark');
    document.documentElement.classList.add('light');
  } else {
    document.documentElement.classList.add('dark');
    document.documentElement.classList.remove('light');
  }
};

const savedTheme = (typeof window !== 'undefined' ? localStorage.getItem('lorevault_theme') : null) as ThemeMode || 'ancient-codex';
applyThemeToDocument(savedTheme);

const initialWorlds = vaultStorage.loadWorlds();
const initialArticles = vaultStorage.loadArticles();
const defaultWorldId = initialWorlds[0]?.id || 'world-dalari-codex';
const godpulseArticle = initialArticles.find(a => a.worldId === defaultWorldId && a.title.toLowerCase().includes('godpulse'));
const defaultArticleId = godpulseArticle?.id || initialArticles.find(a => a.worldId === defaultWorldId)?.id || initialArticles[0]?.id || '';

export const useLoreStore = create<LoreStoreState>((set) => ({
  theme: savedTheme,
  activeWorkspace: 'codex',
  isWorldImporterOpen: false,

  worlds: initialWorlds,
  activeWorldId: defaultWorldId,
  activeView: 'manuscript',
  isPlayerMode: false,
  isSearchPaletteOpen: false,
  isDiceDockOpen: false,
  is3dDiceOpen: false,
  isAiDrawerOpen: false,
  isPinPlacementMode: false,
  articles: initialArticles,
  selectedArticleId: defaultArticleId,
  mapPins: vaultStorage.loadMapPins(),
  statblocks: vaultStorage.loadStatblocks(),
  diceHistory: vaultStorage.loadDiceHistory(),

  novelChapters: vaultStorage.loadNovelChapters(),
  activeChapterId: 'chap-1',
  projectTargetWordCount: vaultStorage.loadProjectTargetWordCount(),

  timelineEvents: vaultStorage.loadTimelineEvents(),
  sceneSlateArticleIds: vaultStorage.loadSceneSlate(),
  aiSettings: vaultStorage.loadAiSettings(),

  territories: vaultStorage.loadTerritories(),
  routes: vaultStorage.loadRoutes(),
  isFogLayerEnabled: true,
  isTerritoryLayerEnabled: true,
  isRouteLayerEnabled: true,
  fogBrushMode: 'reveal',
  fogBrushSize: 45,

  addTerritory: (terr) => set((state) => {
    const updated = [...state.territories, terr];
    vaultStorage.saveTerritories(updated);
    return { territories: updated };
  }),
  updateTerritory: (id, updates) => set((state) => {
    const updated = state.territories.map(t => t.id === id ? { ...t, ...updates } : t);
    vaultStorage.saveTerritories(updated);
    return { territories: updated };
  }),
  deleteTerritory: (id) => set((state) => {
    const updated = state.territories.filter(t => t.id !== id);
    vaultStorage.saveTerritories(updated);
    return { territories: updated };
  }),
  addRoute: (route) => set((state) => {
    const updated = [...state.routes, route];
    vaultStorage.saveRoutes(updated);
    return { routes: updated };
  }),
  deleteRoute: (id) => set((state) => {
    const updated = state.routes.filter(r => r.id !== id);
    vaultStorage.saveRoutes(updated);
    return { routes: updated };
  }),
  toggleFogLayer: () => set((state) => ({ isFogLayerEnabled: !state.isFogLayerEnabled })),
  toggleTerritoryLayer: () => set((state) => ({ isTerritoryLayerEnabled: !state.isTerritoryLayerEnabled })),
  toggleRouteLayer: () => set((state) => ({ isRouteLayerEnabled: !state.isRouteLayerEnabled })),
  setFogBrushMode: (mode) => set({ fogBrushMode: mode }),
  setFogBrushSize: (size) => set({ fogBrushSize: size }),
  saveFogData: (mapId, dataUrl) => vaultStorage.saveFogState(mapId, dataUrl),
  getFogData: (mapId) => vaultStorage.loadFogState(mapId),

  setTheme: (theme) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('lorevault_theme', theme);
    }
    applyThemeToDocument(theme);
    set({ theme });
  },

  setActiveWorkspace: (workspace) => set({ activeWorkspace: workspace }),
  setWorldImporterOpen: (open) => set({ isWorldImporterOpen: open }),

  setActiveWorldId: (id) => set((state) => {
    const firstArticle = state.articles.find((a) => a.worldId === id);
    return {
      activeWorldId: id,
      selectedArticleId: firstArticle ? firstArticle.id : '',
    };
  }),

  deleteWorld: (worldId) => set((state) => {
    if (state.worlds.length <= 1) return state;
    const remainingWorlds = state.worlds.filter((w) => w.id !== worldId);
    const nextActiveWorldId = state.activeWorldId === worldId ? remainingWorlds[0].id : state.activeWorldId;
    const remainingArticles = state.articles.filter((a) => a.worldId !== worldId);
    const remainingPins = state.mapPins.filter((p) => p.worldId !== worldId);
    const remainingStatblocks = state.statblocks.filter((s) => s.worldId !== worldId);
    const remainingChapters = state.novelChapters.filter((c) => c.bookId !== worldId);
    const remainingTerritories = state.territories.filter((t) => t.worldId !== worldId);
    const remainingRoutes = state.routes.filter((r) => r.worldId !== worldId);

    vaultStorage.saveWorlds(remainingWorlds);
    vaultStorage.saveArticles(remainingArticles);
    vaultStorage.saveMapPins(remainingPins);
    vaultStorage.saveStatblocks(remainingStatblocks);
    vaultStorage.saveNovelChapters(remainingChapters);
    vaultStorage.saveTerritories(remainingTerritories);
    vaultStorage.saveRoutes(remainingRoutes);

    const firstArticle = remainingArticles.find((a) => a.worldId === nextActiveWorldId);

    return {
      worlds: remainingWorlds,
      activeWorldId: nextActiveWorldId,
      selectedArticleId: firstArticle ? firstArticle.id : '',
      articles: remainingArticles,
      mapPins: remainingPins,
      statblocks: remainingStatblocks,
      novelChapters: remainingChapters,
      territories: remainingTerritories,
      routes: remainingRoutes,
    };
  }),
  setActiveView: (view) => set({ activeView: view }),
  togglePlayerMode: () => set((state) => ({ isPlayerMode: !state.isPlayerMode })),
  setSearchPaletteOpen: (open) => set({ isSearchPaletteOpen: open }),
  setDiceDockOpen: (open) => set({ isDiceDockOpen: open }),
  toggleDiceDock: () => set((state) => ({ isDiceDockOpen: !state.isDiceDockOpen })),
  set3dDiceOpen: (open) => set({ is3dDiceOpen: open }),
  toggle3dDice: () => set((state) => ({ is3dDiceOpen: !state.is3dDiceOpen })),
  setAiDrawerOpen: (open) => set({ isAiDrawerOpen: open }),
  toggleAiDrawer: () => set((state) => ({ isAiDrawerOpen: !state.isAiDrawerOpen })),
  setPinPlacementMode: (active) => set({ isPinPlacementMode: active }),
  
  addDiceRoll: (roll) => set((state) => {
    const updated = [roll, ...state.diceHistory.slice(0, 49)];
    vaultStorage.saveDiceHistory(updated);
    return { diceHistory: updated };
  }),

  clearDiceHistory: () => set(() => {
    vaultStorage.saveDiceHistory([]);
    return { diceHistory: [] };
  }),

  setSelectedArticleId: (id) => set({ selectedArticleId: id }),

  updateArticle: (id, updates) => set((state) => {
    const updated = state.articles.map((art) => 
      art.id === id ? { ...art, ...updates, updatedAt: new Date().toISOString() } : art
    );
    vaultStorage.saveArticles(updated);
    return { articles: updated };
  }),

  createArticle: (article) => set((state) => {
    const updated = [article, ...state.articles];
    vaultStorage.saveArticles(updated);
    return { articles: updated };
  }),

  deleteArticle: (id) => set((state) => {
    const updated = state.articles.filter((art) => art.id !== id);
    vaultStorage.saveArticles(updated);
    return { articles: updated };
  }),

  addMapPin: (pin) => set((state) => {
    const updated = [...state.mapPins, pin];
    vaultStorage.saveMapPins(updated);
    return { mapPins: updated };
  }),

  deleteMapPin: (id) => set((state) => {
    const updated = state.mapPins.filter((p) => p.id !== id);
    vaultStorage.saveMapPins(updated);
    return { mapPins: updated };
  }),

  addStatblock: (sb) => set((state) => {
    const updated = [sb, ...state.statblocks];
    vaultStorage.saveStatblocks(updated);
    return { statblocks: updated };
  }),

  updateStatblock: (id, updates) => set((state) => {
    const updated = state.statblocks.map((sb) => 
      sb.id === id ? { ...sb, ...updates } : sb
    );
    vaultStorage.saveStatblocks(updated);
    return { statblocks: updated };
  }),

  deleteStatblock: (id) => set((state) => {
    const updated = state.statblocks.filter((sb) => sb.id !== id);
    vaultStorage.saveStatblocks(updated);
    return { statblocks: updated };
  }),

  // Novel Actions
  setActiveChapterId: (id) => set({ activeChapterId: id }),
  updateChapter: (id, updates) => set((state) => {
    const updated = state.novelChapters.map((ch) =>
      ch.id === id ? { ...ch, ...updates } : ch
    );
    vaultStorage.saveNovelChapters(updated);
    return { novelChapters: updated };
  }),
  addChapter: (ch) => set((state) => {
    const updated = [...state.novelChapters, ch];
    vaultStorage.saveNovelChapters(updated);
    return { novelChapters: updated, activeChapterId: ch.id };
  }),
  deleteChapter: (id) => set((state) => {
    const updated = state.novelChapters.filter((ch) => ch.id !== id);
    vaultStorage.saveNovelChapters(updated);
    return { novelChapters: updated, activeChapterId: updated[0]?.id || '' };
  }),

  // Project Word Count & Chapter Reordering
  setProjectTargetWordCount: (count) => {
    vaultStorage.saveProjectTargetWordCount(count);
    set({ projectTargetWordCount: count });
  },
  reorderChapters: (fromOrChapters, toIndex) => set((state) => {
    let updated: NovelChapter[];
    if (Array.isArray(fromOrChapters)) {
      updated = fromOrChapters;
    } else if (typeof fromOrChapters === 'number' && typeof toIndex === 'number') {
      updated = [...state.novelChapters];
      const [moved] = updated.splice(fromOrChapters, 1);
      if (moved) {
        updated.splice(toIndex, 0, moved);
      }
    } else {
      return state;
    }
    updated = updated.map((ch, idx) => ({ ...ch, chapterNumber: idx + 1 }));
    vaultStorage.saveNovelChapters(updated);
    return { novelChapters: updated };
  }),

  // Timeline Actions
  addTimelineEvent: (ev) => set((state) => {
    const updated = [ev, ...state.timelineEvents];
    vaultStorage.saveTimelineEvents(updated);
    return { timelineEvents: updated };
  }),
  updateTimelineEvent: (id, updates) => set((state) => {
    const updated = state.timelineEvents.map((ev) =>
      ev.id === id ? { ...ev, ...updates } : ev
    );
    vaultStorage.saveTimelineEvents(updated);
    return { timelineEvents: updated };
  }),
  deleteTimelineEvent: (id) => set((state) => {
    const updated = state.timelineEvents.filter((ev) => ev.id !== id);
    vaultStorage.saveTimelineEvents(updated);
    return { timelineEvents: updated };
  }),

  // Scene Slate (Context Pinning)
  toggleSceneSlateArticle: (articleId) => set((state) => {
    const exists = state.sceneSlateArticleIds.includes(articleId);
    const updated = exists 
      ? state.sceneSlateArticleIds.filter((id) => id !== articleId)
      : [...state.sceneSlateArticleIds, articleId];
    vaultStorage.saveSceneSlate(updated);
    return { sceneSlateArticleIds: updated };
  }),
  clearSceneSlate: () => {
    vaultStorage.saveSceneSlate([]);
    set({ sceneSlateArticleIds: [] });
  },

  // AI Settings Actions
  updateAiSettings: (updates) => set((state) => {
    const updated = { ...state.aiSettings, ...updates };
    vaultStorage.saveAiSettings(updated);
    return { aiSettings: updated };
  }),

  // Universal World Importer
  importWorldData: (payload) => set((state) => {
    if (payload.cleanSlate) {
      const updatedWorlds = [payload.world];
      const updatedArticles = payload.articles || [];
      const updatedMapPins = payload.mapPins || [];
      const updatedStatblocks = payload.statblocks || [];
      const updatedChapters = payload.chapters || [];

      vaultStorage.saveWorlds(updatedWorlds);
      vaultStorage.saveArticles(updatedArticles);
      vaultStorage.saveMapPins(updatedMapPins);
      vaultStorage.saveStatblocks(updatedStatblocks);
      vaultStorage.saveNovelChapters(updatedChapters);

      return {
        worlds: updatedWorlds,
        activeWorldId: payload.world.id,
        selectedArticleId: updatedArticles[0]?.id || '',
        articles: updatedArticles,
        mapPins: updatedMapPins,
        statblocks: updatedStatblocks,
        novelChapters: updatedChapters,
        isWorldImporterOpen: false,
      };
    }

    const existingWorldIndex = state.worlds.findIndex((w) => w.id === payload.world.id);
    let updatedWorlds = [...state.worlds];
    if (existingWorldIndex >= 0) {
      updatedWorlds[existingWorldIndex] = payload.world;
    } else {
      updatedWorlds = [payload.world, ...updatedWorlds];
    }
    vaultStorage.saveWorlds(updatedWorlds);

    const updatedArticles = payload.articles && payload.articles.length > 0 
      ? [...payload.articles, ...state.articles.filter(a => a.worldId !== payload.world.id)]
      : state.articles;
    vaultStorage.saveArticles(updatedArticles);

    const updatedMapPins = payload.mapPins && payload.mapPins.length > 0
      ? [...payload.mapPins, ...state.mapPins.filter(p => p.worldId !== payload.world.id)]
      : state.mapPins;
    vaultStorage.saveMapPins(updatedMapPins);

    const updatedStatblocks = payload.statblocks && payload.statblocks.length > 0
      ? [...payload.statblocks, ...state.statblocks.filter(s => s.worldId !== payload.world.id)]
      : state.statblocks;
    vaultStorage.saveStatblocks(updatedStatblocks);

    const updatedChapters = payload.chapters && payload.chapters.length > 0
      ? [...payload.chapters, ...state.novelChapters]
      : state.novelChapters;
    vaultStorage.saveNovelChapters(updatedChapters);

    const firstArticle = updatedArticles.find((a) => a.worldId === payload.world.id);

    return {
      worlds: updatedWorlds,
      activeWorldId: payload.world.id,
      selectedArticleId: firstArticle ? firstArticle.id : state.selectedArticleId,
      articles: updatedArticles,
      mapPins: updatedMapPins,
      statblocks: updatedStatblocks,
      novelChapters: updatedChapters,
      isWorldImporterOpen: false,
    };
  }),
}));

if (typeof window !== 'undefined') {
  (window as any).__loreStore = useLoreStore;
}
