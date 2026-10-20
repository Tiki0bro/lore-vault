import React, { useState, useEffect, useMemo } from 'react';
import { useLoreStore } from '../../store/useLoreStore';
import Fuse from 'fuse.js';
import { Search, X, Tag } from 'lucide-react';
import { 
  GiPerson, 
  GiCastle, 
  GiDragonShield, 
  GiBroadsword, 
  GiHourglass, 
  GiScrollUnfurled,
  GiPadlock
} from 'react-icons/gi';

export const SearchPalette: React.FC = () => {
  const { 
    isSearchPaletteOpen, 
    setSearchPaletteOpen, 
    articles, 
    activeWorldId,
    isPlayerMode,
    setActiveView,
    setSelectedArticleId
  } = useLoreStore();

  const [query, setQuery] = useState('');

  // Handle Ctrl+K keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchPaletteOpen(!isSearchPaletteOpen);
      }
      if (e.key === 'Escape' && isSearchPaletteOpen) {
        setSearchPaletteOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchPaletteOpen, setSearchPaletteOpen]);

  // Filter by active world and player mode
  const visibleArticles = useMemo(() => {
    const worldArticles = articles.filter((a) => a.worldId === activeWorldId);
    return isPlayerMode ? worldArticles.filter((a) => !a.isSecret) : worldArticles;
  }, [articles, activeWorldId, isPlayerMode]);

  // Fuzzy search index
  const fuse = useMemo(() => {
    return new Fuse(visibleArticles, {
      keys: ['title', 'summary', 'tags', 'category'],
      threshold: 0.35,
    });
  }, [visibleArticles]);

  const searchResults = useMemo(() => {
    if (!query.trim()) return visibleArticles.slice(0, 6);
    return fuse.search(query).map((res) => res.item);
  }, [query, fuse, visibleArticles]);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Character': return <GiPerson className="w-4 h-4 text-emerald-400" />;
      case 'Location': return <GiCastle className="w-4 h-4 text-amber-400" />;
      case 'Faction': return <GiDragonShield className="w-4 h-4 text-blue-400" />;
      case 'Item': return <GiBroadsword className="w-4 h-4 text-purple-400" />;
      case 'Event': return <GiHourglass className="w-4 h-4 text-rose-400" />;
      default: return <GiScrollUnfurled className="w-4 h-4 text-zinc-400" />;
    }
  };

  if (!isSearchPaletteOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-start justify-center pt-20 px-4 animate-in fade-in duration-150">
      <div 
        className="w-full max-w-xl bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl shadow-black overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3 border-b border-zinc-800 bg-zinc-950/60">
          <Search className="w-5 h-5 text-zinc-400 mr-3" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search characters, locations, factions, and lore tags..."
            className="w-full bg-transparent text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none"
            autoFocus
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-zinc-500 hover:text-zinc-300 p-1">
              <X className="w-4 h-4" />
            </button>
          )}
          <button 
            onClick={() => setSearchPaletteOpen(false)}
            className="text-xs text-zinc-500 hover:text-zinc-300 ml-2 px-1.5 py-0.5 rounded border border-zinc-800"
          >
            ESC
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto p-2 divide-y divide-zinc-800/40">
          {searchResults.length === 0 ? (
            <div className="py-10 text-center text-sm text-zinc-500">
              No lore articles matched your query.
            </div>
          ) : (
            searchResults.map((art) => (
              <div
                key={art.id}
                onClick={() => {
                  setSelectedArticleId(art.id);
                  setActiveView('manuscript');
                  setSearchPaletteOpen(false);
                }}
                className="group p-3 rounded-lg hover:bg-zinc-800/70 cursor-pointer transition-colors flex items-start gap-3"
              >
                <div className="mt-0.5 p-1.5 rounded-md bg-zinc-950 border border-zinc-800 group-hover:border-amber-500/30">
                  {getCategoryIcon(art.category)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-zinc-200 group-hover:text-amber-300 transition-colors truncate">
                      {art.title}
                    </span>
                    <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                      {art.category}
                    </span>
                    {art.isSecret && (
                      <span className="flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.2 rounded bg-rose-950 text-rose-300 border border-rose-800">
                        <GiPadlock className="w-3 h-3" /> GM SECRET
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-400 truncate mt-0.5">
                    {art.summary}
                  </p>
                  
                  {art.tags.length > 0 && (
                    <div className="flex items-center gap-1.5 mt-1.5">
                      {art.tags.map((t) => (
                        <span key={t} className="flex items-center gap-1 text-[10px] text-zinc-500">
                          <Tag className="w-2.5 h-2.5" /> {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer info */}
        <div className="px-4 py-2 border-t border-zinc-800/80 bg-zinc-950/40 text-[11px] text-zinc-500 flex justify-between items-center">
          <span>Search powered by fuzzy match</span>
          {isPlayerMode && (
            <span className="text-emerald-400 font-medium">Player Mode active (Secrets hidden)</span>
          )}
        </div>
      </div>
    </div>
  );
};
