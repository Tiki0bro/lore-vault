import { create } from 'zustand';
import type { ImageAspectRatio, ImageStylePreset } from '../lib/ai/imageGenerator';

/**
 * A finished generation. Only the URL + recipe is stored (not image bytes),
 * so hundreds of entries fit comfortably in localStorage.
 */
export interface ArtGeneration {
  id: string;
  worldId: string;
  articleId?: string;
  prompt: string; // the user's base prompt (style suffix is re-applied from `style`)
  style: ImageStylePreset;
  ratio: ImageAspectRatio;
  seed: number;
  width: number;
  height: number;
  url: string;
  isHd: boolean;
  favorite: boolean;
  createdAt: string;
}

const STORAGE_KEY = 'lorevault_art_history_v1';
const MAX_ENTRIES = 300; // favorites are never evicted

function load(): ArtGeneration[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ArtGeneration[]) : [];
  } catch {
    return [];
  }
}

function save(items: ArtGeneration[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (e) {
    console.error('Failed to save art history', e);
  }
}

function trim(items: ArtGeneration[]): ArtGeneration[] {
  if (items.length <= MAX_ENTRIES) return items;
  const result: ArtGeneration[] = [];
  let nonFavKept = 0;
  const nonFavBudget = MAX_ENTRIES - items.filter((i) => i.favorite).length;
  for (const item of items) {
    // items are newest-first, so the oldest non-favorites are dropped
    if (item.favorite) result.push(item);
    else if (nonFavKept < nonFavBudget) {
      result.push(item);
      nonFavKept++;
    }
  }
  return result;
}

interface ArtStoreState {
  history: ArtGeneration[];
  addGeneration: (gen: ArtGeneration) => void;
  toggleFavorite: (id: string) => void;
  removeGeneration: (id: string) => void;
}

export const useArtStore = create<ArtStoreState>((set) => ({
  history: load(),

  addGeneration: (gen) =>
    set((state) => {
      const updated = trim([gen, ...state.history.filter((h) => h.url !== gen.url)]);
      save(updated);
      return { history: updated };
    }),

  toggleFavorite: (id) =>
    set((state) => {
      const updated = state.history.map((h) => (h.id === id ? { ...h, favorite: !h.favorite } : h));
      save(updated);
      return { history: updated };
    }),

  removeGeneration: (id) =>
    set((state) => {
      const updated = state.history.filter((h) => h.id !== id);
      save(updated);
      return { history: updated };
    }),
}));
