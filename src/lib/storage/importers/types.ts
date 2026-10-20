import type { World, Article, MapPin, Statblock, NovelChapter } from '../../../types/lore';

export type ImportSourceType = 'v2_backup' | 'legacy_master' | 'markdown_vault' | 'custom_json';

export interface ImportPreviewResult {
  isValid: boolean;
  error?: string;
  sourceType: ImportSourceType;
  world: World;
  articles: Article[];
  mapPins: MapPin[];
  statblocks: Statblock[];
  chapters: NovelChapter[];
}
