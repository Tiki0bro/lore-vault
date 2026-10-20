import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useLoreStore } from '../../store/useLoreStore';
import type { ArticleCategory, Article } from '../../types/lore';
import { 
  GiPerson, 
  GiCastle, 
  GiDragonShield, 
  GiBroadsword, 
  GiHourglass, 
  GiScrollUnfurled,
  GiPadlock,
  GiQuillInk,
} from 'react-icons/gi';
import { 
  ChevronDown, 
  ChevronRight, 
  Plus, 
  Search, 
  X, 
  Filter, 
  MoreVertical, 
  Copy, 
  Trash2, 
  ChevronsUpDown, 
  Tag, 
  ArrowUpDown, 
  Layers,
  Sparkles
} from 'lucide-react';
import { ImageGenerator } from '../../lib/ai/imageGenerator';
import { resolveAssetUrl } from '../../lib/storage/vaultStorage';

export type GroupByMode = 'category' | 'tag' | 'flat';
export type SortMode = 'name-asc' | 'name-desc' | 'updated' | 'category';
export type SecretFilterMode = 'all' | 'public' | 'secret';

interface CodexBinderProps {
  onArticleSelect?: (articleId: string) => void;
  className?: string;
}

interface CategoryMeta {
  label: string;
  singularLabel: string;
  icon: React.FC<{ className?: string }>;
  colorClass: string;
  badgeClass: string;
  borderClass: string;
}

const CATEGORY_CONFIG: Record<ArticleCategory, CategoryMeta> = {
  Character: {
    label: 'Characters',
    singularLabel: 'Character',
    icon: GiPerson,
    colorClass: 'text-emerald-400',
    badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    borderClass: 'border-emerald-500/30',
  },
  Location: {
    label: 'Locations',
    singularLabel: 'Location',
    icon: GiCastle,
    colorClass: 'text-amber-400',
    badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    borderClass: 'border-amber-500/30',
  },
  Faction: {
    label: 'Factions',
    singularLabel: 'Faction',
    icon: GiDragonShield,
    colorClass: 'text-blue-400',
    badgeClass: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    borderClass: 'border-blue-500/30',
  },
  Item: {
    label: 'Items',
    singularLabel: 'Item',
    icon: GiBroadsword,
    colorClass: 'text-purple-400',
    badgeClass: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    borderClass: 'border-purple-500/30',
  },
  Event: {
    label: 'Events',
    singularLabel: 'Event',
    icon: GiHourglass,
    colorClass: 'text-rose-400',
    badgeClass: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    borderClass: 'border-rose-500/30',
  },
  Lore: {
    label: 'General Lore',
    singularLabel: 'General Lore',
    icon: GiScrollUnfurled,
    colorClass: 'text-cyan-400',
    badgeClass: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    borderClass: 'border-cyan-500/30',
  },
};

const ORDERED_CATEGORIES: ArticleCategory[] = ['Character', 'Location', 'Faction', 'Item', 'Event', 'Lore'];

export const CodexBinder: React.FC<CodexBinderProps> = ({ onArticleSelect, className = '' }) => {
  const { 
    articles, 
    activeWorldId, 
    isPlayerMode, 
    selectedArticleId,
    setSelectedArticleId,
    createArticle, 
    updateArticle,
    deleteArticle 
  } = useLoreStore();

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [secretFilter, setSecretFilter] = useState<SecretFilterMode>('all');
  const [groupBy, setGroupBy] = useState<GroupByMode>('category');
  const [sortMode, setSortMode] = useState<SortMode>('name-asc');
  
  // Collapsible Dropdown Folders state (Track explicitly collapsed groups; empty = all expanded)
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  // UI Menus State
  const [isNewMenuOpen, setIsNewMenuOpen] = useState(false);
  const [activeContextMenuArticleId, setActiveContextMenuArticleId] = useState<string | null>(null);
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);

  const newMenuRef = useRef<HTMLDivElement>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (newMenuRef.current && !newMenuRef.current.contains(e.target as Node)) {
        setIsNewMenuOpen(false);
      }
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setActiveContextMenuArticleId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter articles by active world and player mode
  const worldArticles = useMemo(() => {
    return articles.filter(a => !a.worldId || a.worldId === activeWorldId);
  }, [articles, activeWorldId]);

  const visibleArticles = useMemo(() => {
    return isPlayerMode ? worldArticles.filter(a => !a.isSecret) : worldArticles;
  }, [worldArticles, isPlayerMode]);

  // Filter and Sort Articles
  const filteredArticles = useMemo(() => {
    let result = [...visibleArticles];

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(a => 
        a.title.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q) ||
        a.summary.toLowerCase().includes(q) ||
        (a.tags && a.tags.some(t => t.toLowerCase().includes(q)))
      );
    }

    // Category filter dropdown
    if (selectedCategoryFilter !== 'all') {
      result = result.filter(a => a.category === selectedCategoryFilter);
    }

    // GM Secret filter
    if (!isPlayerMode) {
      if (secretFilter === 'public') {
        result = result.filter(a => !a.isSecret);
      } else if (secretFilter === 'secret') {
        result = result.filter(a => a.isSecret);
      }
    }

    // Sorting
    result.sort((a, b) => {
      switch (sortMode) {
        case 'name-asc':
          return a.title.localeCompare(b.title);
        case 'name-desc':
          return b.title.localeCompare(a.title);
        case 'updated':
          return new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime();
        case 'category':
          return a.category.localeCompare(b.category) || a.title.localeCompare(b.title);
        default:
          return 0;
      }
    });

    return result;
  }, [visibleArticles, searchQuery, selectedCategoryFilter, secretFilter, sortMode, isPlayerMode]);

  // Helper to determine if a group is currently expanded
  // When searching, all groups with matching content are automatically expanded
  const isGroupExpanded = (groupKey: string) => {
    if (searchQuery.trim().length > 0) return true;
    return !collapsedGroups[groupKey];
  };

  // Toggle single category dropdown
  const toggleGroup = (groupKey: string) => {
    setCollapsedGroups(prev => ({
      ...prev,
      [groupKey]: !prev[groupKey]
    }));
  };

  // Expand all / Collapse all category dropdowns
  const areAllExpanded = useMemo(() => {
    const keysToCheck = groupBy === 'category' 
      ? ORDERED_CATEGORIES 
      : Object.keys(collapsedGroups);
    return keysToCheck.length > 0 && keysToCheck.every(k => !collapsedGroups[k]);
  }, [collapsedGroups, groupBy]);

  const toggleExpandAll = () => {
    if (areAllExpanded) {
      // Collapse all
      const next: Record<string, boolean> = {};
      if (groupBy === 'category') {
        ORDERED_CATEGORIES.forEach(c => { next[c] = true; });
      }
      setCollapsedGroups(next);
    } else {
      // Expand all
      setCollapsedGroups({});
    }
  };

  // Create article handler
  const handleCreateArticle = (category: ArticleCategory = 'Lore') => {
    const newArt: Article = {
      id: `art-${Date.now()}`,
      worldId: activeWorldId,
      title: `Untitled ${category}`,
      category,
      summary: `New ${category.toLowerCase()} document waiting to be penned.`,
      content: `<h2>${category} Overview</h2><p>Begin documenting lore here...</p>`,
      tags: [category],
      isSecret: false,
      updatedAt: new Date().toISOString(),
    };
    createArticle(newArt);
    setSelectedArticleId(newArt.id);
    onArticleSelect?.(newArt.id);
    setCollapsedGroups(prev => ({ ...prev, [category]: false }));
    setIsNewMenuOpen(false);
  };

  // Duplicate article handler
  const handleDuplicateArticle = (art: Article) => {
    const duplicated: Article = {
      ...art,
      id: `art-${Date.now()}`,
      title: `${art.title} (Copy)`,
      updatedAt: new Date().toISOString(),
    };
    createArticle(duplicated);
    setSelectedArticleId(duplicated.id);
    onArticleSelect?.(duplicated.id);
    setActiveContextMenuArticleId(null);
  };

  // Delete article handler
  const handleDeleteArticle = (art: Article) => {
    if (confirm(`Are you sure you want to delete "${art.title}"?`)) {
      deleteArticle(art.id);
      setActiveContextMenuArticleId(null);
    }
  };

  // Quick move category handler
  const handleMoveCategory = (art: Article, newCat: ArticleCategory) => {
    updateArticle(art.id, { category: newCat });
    setCollapsedGroups(prev => ({ ...prev, [newCat]: false }));
    setActiveContextMenuArticleId(null);
  };

  const getCategoryIcon = (category: string) => {
    const config = CATEGORY_CONFIG[category as ArticleCategory];
    if (config) {
      const Icon = config.icon;
      return <Icon className={`w-4 h-4 ${config.colorClass}`} />;
    }
    return <GiScrollUnfurled className="w-4 h-4 text-zinc-400" />;
  };

  // Grouped by Category Data
  const categoryGroups = useMemo(() => {
    const groups: { category: ArticleCategory; articles: Article[]; count: number }[] = [];

    ORDERED_CATEGORIES.forEach(cat => {
      const catArticles = filteredArticles.filter(a => a.category === cat);
      groups.push({
        category: cat,
        articles: catArticles,
        count: catArticles.length,
      });
    });

    // Check for any unconventional categories not in standard list
    const otherArticles = filteredArticles.filter(a => !ORDERED_CATEGORIES.includes(a.category as ArticleCategory));
    if (otherArticles.length > 0) {
      const uniqueOthers = Array.from(new Set(otherArticles.map(a => a.category)));
      uniqueOthers.forEach(otherCat => {
        const matching = otherArticles.filter(a => a.category === otherCat);
        groups.push({
          category: otherCat as ArticleCategory,
          articles: matching,
          count: matching.length,
        });
      });
    }

    return groups;
  }, [filteredArticles]);

  // Grouped by Tag Data
  const tagGroups = useMemo(() => {
    if (groupBy !== 'tag') return [];
    const tagMap: Record<string, Article[]> = {};
    const untagged: Article[] = [];

    filteredArticles.forEach(art => {
      if (!art.tags || art.tags.length === 0) {
        untagged.push(art);
      } else {
        art.tags.forEach(tag => {
          if (!tagMap[tag]) tagMap[tag] = [];
          tagMap[tag].push(art);
        });
      }
    });

    const groups = Object.entries(tagMap).map(([tag, list]) => ({
      tag,
      articles: list,
      count: list.length,
    })).sort((a, b) => a.tag.localeCompare(b.tag));

    if (untagged.length > 0) {
      groups.push({
        tag: 'Untagged',
        articles: untagged,
        count: untagged.length,
      });
    }

    return groups;
  }, [filteredArticles, groupBy]);

  return (
    <aside className={`w-80 border-r border-zinc-800 bg-zinc-950 flex flex-col z-10 transition-all select-none ${className}`}>
      {/* 1. TOP HEADER & NEW ENTRY ACTION */}
      <div className="p-3 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/90 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <GiQuillInk className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-heading font-bold text-sm text-zinc-100 tracking-wide">
                Codex Binder
              </span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-zinc-800/80 text-amber-400/90 border border-zinc-700/60">
                {visibleArticles.length}
              </span>
            </div>
            <span className="text-[10px] text-zinc-500 block leading-none mt-0.5">
              Vault Lore Organization
            </span>
          </div>
        </div>

        {/* "+ New" Dropdown Button */}
        <div className="relative" ref={newMenuRef}>
          <div className="flex items-center rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-semibold hover:bg-amber-500/25 transition-colors overflow-hidden">
            <button
              onClick={() => handleCreateArticle('Lore')}
              className="px-2.5 py-1 flex items-center gap-1 hover:text-amber-200 cursor-pointer"
              title="Create New Lore Entry"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New</span>
            </button>
            <button
              onClick={() => setIsNewMenuOpen(!isNewMenuOpen)}
              className="px-1 py-1 border-l border-amber-500/30 hover:bg-amber-500/30 cursor-pointer"
              title="Choose Entry Category"
            >
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isNewMenuOpen ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {/* New Article Category Dropdown Menu */}
          {isNewMenuOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-48 bg-zinc-900 border border-zinc-700/80 rounded-xl shadow-2xl p-1 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-2.5 py-1 text-[10px] uppercase font-bold text-zinc-400 tracking-wider border-b border-zinc-800">
                Create Lore Document
              </div>
              <div className="p-1 space-y-0.5">
                {ORDERED_CATEGORIES.map(cat => {
                  const cfg = CATEGORY_CONFIG[cat];
                  const Icon = cfg.icon;
                  return (
                    <button
                      key={cat}
                      onClick={() => handleCreateArticle(cat)}
                      className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs text-zinc-300 hover:bg-amber-500/15 hover:text-amber-200 transition-colors text-left cursor-pointer"
                    >
                      <Icon className={`w-3.5 h-3.5 ${cfg.colorClass}`} />
                      <span>{cfg.singularLabel}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2. SEARCH BAR */}
      <div className="p-2.5 border-b border-zinc-800/80 bg-zinc-950 flex flex-col gap-2">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-2.5" />
          <input
            type="text"
            placeholder="Search lore entries, tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-7 py-1.5 rounded-lg bg-zinc-900/90 border border-zinc-800 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500/70 focus:bg-zinc-900 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-2 p-0.5 text-zinc-500 hover:text-zinc-300 cursor-pointer"
              title="Clear search"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* 3. ORGANIZATION & FILTER CONTROLS TOOLBAR */}
        <div className="flex items-center justify-between text-xs gap-1">
          {/* Category Dropdown Filter */}
          <div className="relative flex-1">
            <select
              value={selectedCategoryFilter}
              onChange={(e) => setSelectedCategoryFilter(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800/90 text-zinc-300 text-[11px] px-2 py-1 rounded-md font-medium focus:outline-none focus:border-amber-500/60 cursor-pointer appearance-none truncate pr-5"
              title="Filter by Category"
            >
              <option value="all">All Categories ({visibleArticles.length})</option>
              {ORDERED_CATEGORIES.map(cat => {
                const count = visibleArticles.filter(a => a.category === cat).length;
                return (
                  <option key={cat} value={cat}>
                    {CATEGORY_CONFIG[cat].label} ({count})
                  </option>
                );
              })}
            </select>
            <ChevronDown className="w-3 h-3 text-zinc-500 absolute right-1.5 top-2 pointer-events-none" />
          </div>

          {/* Toggle More Filters / Grouping */}
          <button
            onClick={() => setShowFiltersPanel(!showFiltersPanel)}
            className={`p-1.5 rounded-md border text-[11px] flex items-center gap-1 transition-colors cursor-pointer ${
              showFiltersPanel || secretFilter !== 'all' || groupBy !== 'category' || sortMode !== 'name-asc'
                ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
            }`}
            title="Binder Organization & Sort Options"
          >
            <Filter className="w-3 h-3" />
          </button>

          {/* Expand / Collapse All Folders */}
          <button
            onClick={toggleExpandAll}
            className="p-1.5 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 transition-colors cursor-pointer"
            title={areAllExpanded ? "Collapse All Folders" : "Expand All Folders"}
          >
            <ChevronsUpDown className="w-3 h-3" />
          </button>
        </div>

        {/* 4. EXPANDABLE ORGANIZATION PANEL (Group By, Sort, Visibility) */}
        {showFiltersPanel && (
          <div className="p-2.5 rounded-xl bg-zinc-900/90 border border-zinc-800 flex flex-col gap-2 mt-0.5 text-[11px] animate-in fade-in duration-150">
            {/* View / Grouping Mode */}
            <div className="flex items-center justify-between">
              <span className="text-zinc-400 flex items-center gap-1">
                <Layers className="w-3 h-3 text-amber-400" />
                <span>Group By:</span>
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setGroupBy('category')}
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors cursor-pointer ${
                    groupBy === 'category'
                      ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300'
                      : 'bg-zinc-800/80 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Category
                </button>
                <button
                  onClick={() => setGroupBy('tag')}
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors cursor-pointer ${
                    groupBy === 'tag'
                      ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300'
                      : 'bg-zinc-800/80 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Tags
                </button>
                <button
                  onClick={() => setGroupBy('flat')}
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors cursor-pointer ${
                    groupBy === 'flat'
                      ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300'
                      : 'bg-zinc-800/80 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Flat
                </button>
              </div>
            </div>

            {/* Sort Mode Dropdown */}
            <div className="flex items-center justify-between">
              <span className="text-zinc-400 flex items-center gap-1">
                <ArrowUpDown className="w-3 h-3 text-amber-400" />
                <span>Sort By:</span>
              </span>
              <select
                value={sortMode}
                onChange={(e) => setSortMode(e.target.value as SortMode)}
                className="bg-zinc-800 border border-zinc-700 text-zinc-200 text-[10px] px-2 py-0.5 rounded font-medium focus:outline-none focus:border-amber-500 cursor-pointer"
              >
                <option value="name-asc">Title (A → Z)</option>
                <option value="name-desc">Title (Z → A)</option>
                <option value="updated">Recently Updated</option>
                <option value="category">Category</option>
              </select>
            </div>

            {/* GM Secret Filter (Only in DM mode) */}
            {!isPlayerMode && (
              <div className="flex items-center justify-between pt-1 border-t border-zinc-800/80">
                <span className="text-zinc-400 flex items-center gap-1">
                  <GiPadlock className="w-3 h-3 text-rose-400" />
                  <span>Visibility:</span>
                </span>
                <div className="flex items-center gap-1">
                  {(['all', 'public', 'secret'] as SecretFilterMode[]).map(mode => (
                    <button
                      key={mode}
                      onClick={() => setSecretFilter(mode)}
                      className={`px-1.5 py-0.5 rounded text-[10px] capitalize font-medium transition-colors cursor-pointer ${
                        secretFilter === mode
                          ? 'bg-zinc-800 text-amber-300 border border-zinc-700'
                          : 'text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 5. ARTICLES LIST & COLLAPSIBLE CATEGORY DROPDOWNS */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {/* Empty Search Result */}
        {filteredArticles.length === 0 && (
          <div className="py-12 px-4 text-center text-zinc-500 flex flex-col items-center">
            <GiScrollUnfurled className="w-8 h-8 text-zinc-700 mb-2" />
            <span className="text-xs font-semibold text-zinc-400">
              No matching articles
            </span>
            <span className="text-[11px] text-zinc-500 mt-0.5">
              {searchQuery ? `No results for "${searchQuery}"` : 'Your vault is currently empty'}
            </span>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="mt-3 px-2.5 py-1 text-xs text-amber-400 hover:text-amber-300 font-medium underline cursor-pointer"
              >
                Clear Search Query
              </button>
            )}
          </div>
        )}

        {/* MODE A: GROUP BY CATEGORY (Default collapsible dropdown folders) */}
        {groupBy === 'category' && categoryGroups.map(grp => {
          // If searching or filtering, skip empty categories unless selected filter matches
          const isFilterActive = selectedCategoryFilter !== 'all' || searchQuery.trim().length > 0;
          if (isFilterActive && grp.count === 0) return null;

          const isExpanded = isGroupExpanded(grp.category);
          const config = CATEGORY_CONFIG[grp.category] || {
            label: grp.category,
            singularLabel: grp.category,
            icon: GiScrollUnfurled,
            colorClass: 'text-zinc-400',
            badgeClass: 'bg-zinc-800 text-zinc-300 border-zinc-700',
            borderClass: 'border-zinc-700',
          };
          const Icon = config.icon;

          return (
            <div 
              key={grp.category}
              className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 overflow-hidden transition-all shadow-xs"
            >
              {/* Category Dropdown Header */}
              <div className="w-full flex items-center justify-between p-2 hover:bg-zinc-900/80 transition-colors">
                <button
                  onClick={() => toggleGroup(grp.category)}
                  className="flex-1 flex items-center gap-2 text-left cursor-pointer min-w-0"
                >
                  <div className="text-zinc-400 hover:text-zinc-200 p-0.5">
                    {isExpanded ? (
                      <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />
                    )}
                  </div>

                  <div className={`p-1 rounded-md bg-zinc-950 border ${config.borderClass}`}>
                    <Icon className={`w-3.5 h-3.5 ${config.colorClass}`} />
                  </div>

                  <span className="font-heading font-semibold text-xs text-zinc-200 truncate">
                    {config.label}
                  </span>

                  <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full border ${config.badgeClass}`}>
                    {grp.count}
                  </span>
                </button>

                {/* Inline Quick Add (+) Button for this Category */}
                <button
                  onClick={() => handleCreateArticle(grp.category)}
                  className="p-1 rounded text-zinc-500 hover:text-amber-300 hover:bg-zinc-800 transition-colors cursor-pointer ml-1"
                  title={`Add New ${config.singularLabel}`}
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Collapsible Dropdown Content */}
              {isExpanded && (
                <div className="p-1 pt-0.5 space-y-1 border-t border-zinc-800/60 bg-zinc-950/40">
                  {grp.articles.length === 0 ? (
                    <div className="py-3 px-3 text-center">
                      <span className="text-[11px] text-zinc-500 italic block">
                        No {config.label.toLowerCase()} penned yet.
                      </span>
                      <button
                        onClick={() => handleCreateArticle(grp.category)}
                        className="mt-1.5 text-[11px] text-amber-400/90 hover:text-amber-300 font-semibold inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add First {config.singularLabel}</span>
                      </button>
                    </div>
                  ) : (
                    grp.articles.map(art => renderArticleItem(art))
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* MODE B: GROUP BY TAG (Collapsible tag folders) */}
        {groupBy === 'tag' && tagGroups.map(grp => {
          const isExpanded = isGroupExpanded(grp.tag);

          return (
            <div 
              key={grp.tag}
              className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 overflow-hidden transition-all shadow-xs"
            >
              <div className="w-full flex items-center justify-between p-2 hover:bg-zinc-900/80 transition-colors">
                <button
                  onClick={() => toggleGroup(grp.tag)}
                  className="flex-1 flex items-center gap-2 text-left cursor-pointer min-w-0"
                >
                  <div className="text-zinc-400 p-0.5">
                    {isExpanded ? (
                      <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />
                    )}
                  </div>
                  <Tag className="w-3.5 h-3.5 text-amber-400" />
                  <span className="font-medium text-xs text-zinc-200 truncate">
                    #{grp.tag}
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700">
                    {grp.count}
                  </span>
                </button>
              </div>

              {isExpanded && (
                <div className="p-1 pt-0.5 space-y-1 border-t border-zinc-800/60 bg-zinc-950/40">
                  {grp.articles.map(art => renderArticleItem(art))}
                </div>
              )}
            </div>
          );
        })}

        {/* MODE C: FLAT LIST */}
        {groupBy === 'flat' && (
          <div className="space-y-1">
            {filteredArticles.map(art => renderArticleItem(art))}
          </div>
        )}
      </div>

      {/* 6. BINDER STATS FOOTER */}
      <div className="p-2 px-3 border-t border-zinc-800 bg-zinc-950 flex items-center justify-between text-[10px] text-zinc-500">
        <span className="flex items-center gap-1 font-mono">
          <Sparkles className="w-3 h-3 text-amber-400/80" />
          <span>{filteredArticles.length} / {visibleArticles.length} Loaded</span>
        </span>
        <div className="flex items-center gap-2">
          {!isPlayerMode && (
            <span className="flex items-center gap-0.5 text-rose-400/80">
              <GiPadlock className="w-2.5 h-2.5" />
              <span>{visibleArticles.filter(a => a.isSecret).length} Secrets</span>
            </span>
          )}
          <span className="text-zinc-600">·</span>
          <span>{ORDERED_CATEGORIES.length} Categories</span>
        </div>
      </div>
    </aside>
  );

  // Helper: Render individual article item card
  function renderArticleItem(art: Article) {
    const isSelected = art.id === selectedArticleId;
    const isMenuOpen = activeContextMenuArticleId === art.id;

    return (
      <div 
        key={art.id} 
        className="relative group/item"
      >
        <button
          onClick={() => {
            setSelectedArticleId(art.id);
            onArticleSelect?.(art.id);
          }}
          className={`w-full text-left p-2 rounded-lg transition-all flex items-start gap-2.5 cursor-pointer relative ${
            isSelected
              ? 'bg-amber-500/15 border border-amber-500/40 text-zinc-100 shadow-sm shadow-amber-500/10'
              : 'hover:bg-zinc-900/90 text-zinc-400 hover:text-zinc-200 border border-transparent'
          }`}
        >
          {/* Category Icon or Cover Art Thumbnail */}
          {art.coverImageUrl ? (
            <div className="mt-0.5 w-7 h-7 rounded-md overflow-hidden border border-amber-500/30 flex-shrink-0 bg-zinc-900 relative shadow-sm">
              <img 
                src={resolveAssetUrl(art.coverImageUrl)} 
                alt={art.title} 
                className="w-full h-full object-cover" 
                onError={(e) => {
                  e.currentTarget.src = ImageGenerator.generateProceduralFallbackSvg(
                    art.title,
                    'grimdark',
                    80,
                    80
                  );
                }}
              />
            </div>
          ) : (
            <div className="mt-0.5 p-1 rounded bg-zinc-900 border border-zinc-800 flex-shrink-0">
              {getCategoryIcon(art.category)}
            </div>
          )}

          <div className="flex-1 min-w-0 pr-5">
            <div className="flex items-center justify-between gap-1">
              <span className={`font-medium text-xs truncate ${isSelected ? 'text-amber-200 font-semibold' : 'text-zinc-200'}`}>
                {art.title}
              </span>
              {art.isSecret && (
                <GiPadlock className="w-3 h-3 text-rose-400 flex-shrink-0" title="GM Secret" />
              )}
            </div>

            {/* Snippet / Tags */}
            <span className="text-[10px] text-zinc-500 block truncate mt-0.5">
              {art.summary || 'No summary penned.'}
            </span>

            {/* Tag Pills */}
            {art.tags && art.tags.length > 0 && (
              <div className="flex items-center gap-1 mt-1 flex-wrap">
                {art.tags.slice(0, 2).map((t, i) => (
                  <span key={i} className="text-[9px] px-1 py-0.2 rounded bg-zinc-900 text-zinc-400 border border-zinc-800 truncate max-w-[80px]">
                    #{t}
                  </span>
                ))}
                {art.tags.length > 2 && (
                  <span className="text-[9px] text-zinc-500">+{art.tags.length - 2}</span>
                )}
              </div>
            )}
          </div>
        </button>

        {/* Article Item Action Menu Trigger */}
        <div className="absolute right-1.5 top-2 opacity-0 group-hover/item:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setActiveContextMenuArticleId(isMenuOpen ? null : art.id);
            }}
            className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 cursor-pointer"
            title="Article Options"
          >
            <MoreVertical className="w-3 h-3" />
          </button>
        </div>

        {/* Action Menu Dropdown */}
        {isMenuOpen && (
          <div 
            ref={contextMenuRef}
            className="absolute right-2 top-8 w-44 bg-zinc-900 border border-zinc-700/80 rounded-xl shadow-2xl p-1 z-50 animate-in fade-in zoom-in-95 duration-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-2 py-1 text-[10px] uppercase font-bold text-zinc-500 tracking-wider border-b border-zinc-800">
              Entry Actions
            </div>

            <button
              onClick={() => handleDuplicateArticle(art)}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 transition-colors text-left cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5 text-zinc-400" />
              <span>Duplicate</span>
            </button>

            {/* Change Category Submenu */}
            <div className="py-1 border-t border-zinc-800">
              <span className="px-2 text-[10px] text-zinc-500 font-semibold block mb-0.5">
                Move Category:
              </span>
              {ORDERED_CATEGORIES.filter(c => c !== art.category).map(cat => (
                <button
                  key={cat}
                  onClick={() => handleMoveCategory(art, cat)}
                  className="w-full flex items-center gap-2 px-2 py-1 rounded text-[11px] text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 transition-colors text-left cursor-pointer"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400/80" />
                  <span>{CATEGORY_CONFIG[cat].singularLabel}</span>
                </button>
              ))}
            </div>

            <div className="py-1 border-t border-zinc-800">
              <button
                onClick={() => {
                  updateArticle(art.id, { isSecret: !art.isSecret });
                  setActiveContextMenuArticleId(null);
                }}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 transition-colors text-left cursor-pointer"
              >
                <GiPadlock className="w-3.5 h-3.5 text-rose-400" />
                <span>{art.isSecret ? 'Make Public' : 'Make GM Secret'}</span>
              </button>

              <button
                onClick={() => handleDeleteArticle(art)}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs text-rose-400 hover:bg-rose-950/40 hover:text-rose-300 transition-colors text-left cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Entry</span>
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }
};
