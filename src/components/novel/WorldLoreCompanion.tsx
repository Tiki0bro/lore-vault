import React, { useState } from 'react';
import { useLoreStore } from '../../store/useLoreStore';
import { 
  Search, 
  BookMarked, 
  ChevronRight, 
  Copy, 
  Check, 
  X, 
  Sparkles,
  Pin
} from 'lucide-react';
import type { Article } from '../../types/lore';

interface WorldLoreCompanionProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertMention?: (articleTitle: string) => void;
}

export const WorldLoreCompanion: React.FC<WorldLoreCompanionProps> = ({
  isOpen,
  onClose,
  onInsertMention,
}) => {
  const { 
    articles, 
    activeWorldId, 
    isPlayerMode,
    sceneSlateArticleIds,
    toggleSceneSlateArticle,
    clearSceneSlate
  } = useLoreStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!isOpen) return null;

  const worldArticles = articles.filter((a) => a.worldId === activeWorldId && (!isPlayerMode || !a.isSecret));

  const filtered = worldArticles.filter((a) => {
    const q = searchQuery.toLowerCase();
    return (
      a.title.toLowerCase().includes(q) ||
      a.category.toLowerCase().includes(q) ||
      a.summary.toLowerCase().includes(q)
    );
  });

  const handleCopyQuote = (art: Article) => {
    navigator.clipboard.writeText(`@[${art.title}]`);
    setCopiedId(art.id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <aside className="w-84 border-l border-zinc-800 bg-zinc-950 flex flex-col z-20 shadow-2xl animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="p-3.5 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
        <div className="flex items-center gap-2">
          <BookMarked className="w-4 h-4 text-amber-400" />
          <h3 className="font-heading font-bold text-xs text-zinc-100">
            World Lore Companion
          </h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Search Input */}
      <div className="p-3 border-b border-zinc-800 bg-zinc-950">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-2.5" />
          <input
            type="text"
            placeholder="Search characters, factions, locations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-400"
          />
        </div>
      </div>

      {/* Scene Slate Active Pill / Counter */}
      {sceneSlateArticleIds.length > 0 && (
        <div className="px-3 py-1.5 bg-amber-500/10 border-b border-amber-500/20 flex items-center justify-between text-[11px]">
          <div className="flex items-center gap-1.5 text-amber-300 font-semibold">
            <Pin className="w-3 h-3 text-amber-400" />
            <span>Scene Slate: {sceneSlateArticleIds.length} Pinned</span>
          </div>
          <button
            onClick={clearSceneSlate}
            className="text-[10px] text-zinc-400 hover:text-amber-300 cursor-pointer"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {selectedArticle ? (
          /* Detailed View */
          <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-3 animate-in fade-in duration-100">
            <button
              onClick={() => setSelectedArticle(null)}
              className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer font-semibold"
            >
              ← Back to list
            </button>

            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500">
                  {selectedArticle.category}
                </span>
                {selectedArticle.isSecret && (
                  <span className="text-[10px] font-bold text-rose-400">SECRET</span>
                )}
              </div>
              <h4 className="font-heading font-bold text-sm text-zinc-100 mt-0.5">
                {selectedArticle.title}
              </h4>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed italic bg-zinc-950/60 p-2.5 rounded-lg border border-zinc-800/80">
              "{selectedArticle.summary}"
            </p>

            {/* Quick Actions */}
            <div className="flex items-center gap-2 pt-2 border-t border-zinc-800">
              <button
                onClick={() => {
                  if (onInsertMention) {
                    onInsertMention(selectedArticle.title);
                  } else {
                    handleCopyQuote(selectedArticle);
                  }
                }}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-semibold hover:bg-amber-500/30 transition-colors cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Insert @Mention</span>
              </button>

              {/* Pin / Unpin from Scene Slate */}
              <button
                onClick={() => toggleSceneSlateArticle(selectedArticle.id)}
                className={`p-1.5 rounded-lg border transition-colors cursor-pointer flex items-center gap-1 text-xs font-semibold ${
                  sceneSlateArticleIds.includes(selectedArticle.id)
                    ? 'bg-amber-500 text-zinc-950 border-amber-400'
                    : 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700'
                }`}
                title={sceneSlateArticleIds.includes(selectedArticle.id) ? 'Remove from Scene Slate' : 'Pin to Scene Slate (injected into AI writing context)'}
              >
                <Pin className="w-3.5 h-3.5" />
                <span className="text-[11px]">{sceneSlateArticleIds.includes(selectedArticle.id) ? 'Pinned' : 'Pin'}</span>
              </button>

              <button
                onClick={() => handleCopyQuote(selectedArticle)}
                className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors cursor-pointer"
                title="Copy WikiLink"
              >
                {copiedId === selectedArticle.id ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>
        ) : (
          /* Article Cards List */
          filtered.map((art) => {
            const isPinned = sceneSlateArticleIds.includes(art.id);
            return (
              <div
                key={art.id}
                onClick={() => setSelectedArticle(art)}
                className={`p-2.5 rounded-lg border transition-all cursor-pointer flex items-center justify-between group ${
                  isPinned
                    ? 'bg-amber-500/10 border-amber-500/40 hover:bg-amber-500/15'
                    : 'bg-zinc-900/50 hover:bg-zinc-900 border-zinc-800/80 hover:border-zinc-700'
                }`}
              >
                <div className="flex-1 min-w-0 pr-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-amber-500/90">
                      {art.category}
                    </span>
                    {art.isSecret && (
                      <span className="text-[9px] font-bold text-rose-400">🔒</span>
                    )}
                    {isPinned && (
                      <span className="text-[9px] font-bold text-amber-400 flex items-center gap-0.5 ml-auto mr-1">
                        <Pin className="w-2.5 h-2.5 fill-amber-400" /> Pinned
                      </span>
                    )}
                  </div>
                  <div className="font-heading font-semibold text-xs text-zinc-200 truncate group-hover:text-amber-300 transition-colors">
                    {art.title}
                  </div>
                  <div className="text-[10px] text-zinc-500 truncate mt-0.5">
                    {art.summary}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-amber-400 transition-colors flex-shrink-0" />
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
};
