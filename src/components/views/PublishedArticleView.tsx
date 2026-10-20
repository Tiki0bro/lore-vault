import React, { useState } from 'react';
import type { Article, World } from '../../types/lore';
import { useLoreStore } from '../../store/useLoreStore';
import { 
  Copy, 
  Check, 
  BookOpen, 
  Feather, 
  Tag, 
  ShieldAlert, 
  User, 
  MapPin, 
  Shield, 
  Sword, 
  Clock, 
  BookMarked,
  Printer,
  Maximize2,
  X,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';

interface PublishedArticleViewProps {
  article: Article;
  world: World;
  onEdit: () => void;
  isPlayerMode: boolean;
  isBinderCollapsed?: boolean;
  onToggleBinder?: () => void;
}

interface ParsedFact {
  label: string;
  value: string;
}

export const PublishedArticleView: React.FC<PublishedArticleViewProps> = ({
  article,
  world,
  onEdit,
  isPlayerMode,
  isBinderCollapsed = false,
  onToggleBinder,
}) => {
  const { articles, setSelectedArticleId } = useLoreStore();
  const [copiedLink, setCopiedLink] = useState(false);
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);
  const [coverSize, setCoverSize] = useState<'compact' | 'normal' | 'large' | 'hidden'>('normal');

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Character': return <User className="w-4 h-4 text-emerald-400" />;
      case 'Location': return <MapPin className="w-4 h-4 text-amber-400" />;
      case 'Faction': return <Shield className="w-4 h-4 text-blue-400" />;
      case 'Item': return <Sword className="w-4 h-4 text-purple-400" />;
      case 'Event': return <Clock className="w-4 h-4 text-rose-400" />;
      default: return <BookMarked className="w-4 h-4 text-amber-400" />;
    }
  };

  // Extract quick facts from prose for the World Anvil sidebar
  const parseQuickFacts = (contentHtml: string): ParsedFact[] => {
    const facts: ParsedFact[] = [];
    const textContent = contentHtml.replace(/<[^>]*>?/gm, '\n');
    const lines = textContent.split('\n').map(l => l.trim()).filter(Boolean);

    for (const line of lines) {
      // Matches "Age: 62", "Race: Human", "Height: 182cm", "He has X"
      if (line.includes(':') && line.length < 80) {
        const [label, ...valParts] = line.split(':');
        const val = valParts.join(':').trim();
        if (label && val && label.length < 25) {
          facts.push({ label: label.trim(), value: val });
        }
      } else if (line.match(/^(He|She|They) is (a|an) (.+)$/i)) {
        const m = line.match(/^(He|She|They) is (a|an) (.+)$/i);
        if (m) facts.push({ label: 'Identity', value: m[3] });
      } else if (line.match(/^(He|She|They) has (.+)$/i)) {
        const m = line.match(/^(He|She|They) has (.+)$/i);
        if (m) facts.push({ label: 'Feature', value: m[2] });
      } else if (line.match(/^(He|She|They) stands (.+)$/i)) {
        const m = line.match(/^(He|She|They) stands (.+)$/i);
        if (m) facts.push({ label: 'Stature', value: m[2] });
      }
    }
    return facts.slice(0, 8);
  };

  const quickFacts = parseQuickFacts(article.content);

  // Extract first image in prose to highlight as avatar if no dedicated cover
  const extractFeaturedProseImage = (html: string): string | null => {
    const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
    return match ? match[1] : null;
  };

  const featuredImage = article.coverImageUrl || extractFeaturedProseImage(article.content);

  // Process HTML for code block copy buttons, secret filtering, and interactive @mentions
  const processRenderedHtml = (rawHtml: string) => {
    let processed = rawHtml;

    // Filter GM Secrets if in Player Mode
    if (isPlayerMode) {
      processed = processed.replace(/<div class="secret-block[\s\S]*?<\/div>/gi, '');
    }

    // Convert World Anvil @[Article Name](...) or @[Article Name] syntax into clickable codex links
    processed = processed.replace(
      /@\[([^\]]+)\](?:\([^)]+\))?/g,
      (_match, name) =>
        `<span class="wa-mention-link inline-flex items-center gap-1 cursor-pointer text-amber-400 hover:text-amber-200 underline decoration-amber-500/60 bg-amber-500/10 hover:bg-amber-500/20 px-1.5 py-0.5 rounded text-xs font-semibold tracking-wide transition-colors" data-mention="${name}" title="Jump to codex article: ${name}">📖 ${name}</span>`
    );

    return processed;
  };

  const handleCopyShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="flex-1 flex flex-col overflow-y-auto overflow-x-auto bg-zinc-950 text-zinc-100 scrollbar-thin">
      {/* Top Breadcrumb & Publication Control Bar */}
      <div className="px-6 py-3 border-b border-zinc-800 bg-zinc-900/60 backdrop-blur-md flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-2 text-xs">
          {onToggleBinder && (
            <button
              onClick={onToggleBinder}
              className="p-1 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-amber-300 transition-colors mr-1 cursor-pointer"
              title={isBinderCollapsed ? "Open Codex Binder" : "Collapse Codex Binder"}
            >
              {isBinderCollapsed ? <PanelLeftOpen className="w-3.5 h-3.5 text-amber-400" /> : <PanelLeftClose className="w-3.5 h-3.5" />}
            </button>
          )}
          <span className="text-zinc-500 font-semibold">{world.name}</span>
          <span className="text-zinc-700">/</span>
          <span className="flex items-center gap-1 text-amber-400 font-medium">
            {getCategoryIcon(article.category)}
            <span>{article.category}</span>
          </span>
          <span className="text-zinc-700">/</span>
          <span className="text-zinc-300 font-bold truncate max-w-xs">{article.title}</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Banner Visibility / Size Dropdown Pill if cover exists */}
          {article.coverImageUrl && (
            <div className="flex items-center p-0.5 rounded-lg bg-zinc-900 border border-zinc-800 text-[10px]">
              <button
                onClick={() => setCoverSize('compact')}
                className={`px-2 py-0.5 rounded font-semibold cursor-pointer ${
                  coverSize === 'compact' ? 'bg-amber-500/20 text-amber-300' : 'text-zinc-400 hover:text-zinc-200'
                }`}
                title="Compact Cover Banner"
              >
                Compact
              </button>
              <button
                onClick={() => setCoverSize('normal')}
                className={`px-2 py-0.5 rounded font-semibold cursor-pointer ${
                  coverSize === 'normal' ? 'bg-amber-500/20 text-amber-300' : 'text-zinc-400 hover:text-zinc-200'
                }`}
                title="Standard Cover Banner"
              >
                Normal
              </button>
              <button
                onClick={() => setCoverSize('large')}
                className={`px-2 py-0.5 rounded font-semibold cursor-pointer ${
                  coverSize === 'large' ? 'bg-amber-500/20 text-amber-300' : 'text-zinc-400 hover:text-zinc-200'
                }`}
                title="Hero Large Banner"
              >
                Large
              </button>
              <button
                onClick={() => setCoverSize(coverSize === 'hidden' ? 'normal' : 'hidden')}
                className={`px-2 py-0.5 rounded font-semibold cursor-pointer ${
                  coverSize === 'hidden' ? 'bg-amber-500/20 text-amber-300' : 'text-zinc-400 hover:text-zinc-200'
                }`}
                title="Toggle Cover Banner"
              >
                {coverSize === 'hidden' ? 'Show Cover' : 'Hide'}
              </button>
            </div>
          )}

          {/* Print Article */}
          <button
            onClick={() => window.print()}
            className="btn-pill p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-200 text-xs transition-colors cursor-pointer"
            title="Print or Export to PDF"
          >
            <Printer className="w-3.5 h-3.5" />
          </button>

          {/* Share Article Link */}
          <button
            onClick={handleCopyShare}
            className="btn-pill flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-amber-300 text-xs transition-colors cursor-pointer"
            title="Copy share link"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{copiedLink ? 'Copied' : 'Share'}</span>
          </button>

          {/* Switch to Edit Mode */}
          <button
            onClick={onEdit}
            className="btn-tactile flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Feather className="w-3.5 h-3.5 text-amber-400" />
            <span>Edit Article</span>
          </button>
        </div>
      </div>

      {/* Hero Header Banner (World Anvil Style) with Adjustable Scale */}
      {article.coverImageUrl && coverSize !== 'hidden' && (
        <div 
          className={`relative w-full overflow-hidden border-b border-zinc-800 bg-zinc-950 group transition-all duration-300 ${
            coverSize === 'compact' ? 'h-28 sm:h-36' :
            coverSize === 'large' ? 'h-80 sm:h-96' : 'h-48 sm:h-60'
          }`}
        >
          <img
            src={article.coverImageUrl}
            alt={article.title}
            className="w-full h-full object-cover object-center group-hover:scale-102 transition-transform duration-700"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/60 to-transparent" />
          
          <div className="absolute bottom-4 left-6 right-6 flex items-end justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 border border-amber-500/40 text-amber-300 flex items-center gap-1">
                  {getCategoryIcon(article.category)}
                  <span>{article.category}</span>
                </span>
                {article.isSecret && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-950/80 border border-rose-700 text-rose-300 flex items-center gap-1">
                    <ShieldAlert className="w-3 h-3" /> GM Secret
                  </span>
                )}
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-heading font-extrabold text-amber-100 tracking-wide drop-shadow-md">
                {article.title}
              </h1>
            </div>
            
            {article.coverImagePrompt && (
              <span className="hidden lg:inline text-[10px] text-zinc-400/80 font-mono italic max-w-sm truncate bg-black/60 px-2.5 py-1 rounded-md border border-zinc-800">
                Artwork: {article.coverImagePrompt}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Main Published Article Grid */}
      <div className="max-w-6xl w-full mx-auto p-6 sm:p-10 flex flex-col lg:flex-row gap-8">
        
        {/* Main Prose Column */}
        <div className="flex-1 min-w-0">
          {!article.coverImageUrl && (
            <div className="mb-8 pb-6 border-b border-zinc-800">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500/15 border border-amber-500/30 text-amber-300 flex items-center gap-1.5">
                  {getCategoryIcon(article.category)}
                  <span>{article.category}</span>
                </span>
                {article.isSecret && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-rose-950/80 border border-rose-700 text-rose-300 flex items-center gap-1">
                    <ShieldAlert className="w-3.5 h-3.5" /> GM Secret
                  </span>
                )}
              </div>
              <h1 className="text-3xl sm:text-5xl font-heading font-extrabold text-amber-100 tracking-wide">
                {article.title}
              </h1>
              {article.summary && (
                <p className="text-zinc-400 font-serif italic text-base mt-2 leading-relaxed">
                  "{article.summary}"
                </p>
              )}
            </div>
          )}

          {/* Decorative Divider */}
          <div className="flex items-center gap-3 my-6 opacity-60">
            <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-amber-500/40 to-transparent" />
            <BookOpen className="w-4 h-4 text-amber-400" />
            <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-amber-500/40 to-transparent" />
          </div>

          {/* Published Prose Content with Enhanced Formatting */}
          <div 
            className="prose prose-invert max-w-none published-prose text-zinc-200 text-base leading-relaxed"
            dangerouslySetInnerHTML={{ __html: processRenderedHtml(article.content) }}
            onClick={(e) => {
              const target = e.target as HTMLElement;
              
              // Handle image lightbox preview
              if (target.tagName === 'IMG') {
                const src = (target as HTMLImageElement).src;
                if (src) setLightboxImg(src);
                return;
              }

              // Handle @[Mention] quick navigation
              const mentionEl = target.closest('.wa-mention-link') as HTMLElement | null;
              if (mentionEl) {
                const mentionText = mentionEl.getAttribute('data-mention');
                if (mentionText) {
                  const cleaned = mentionText.trim().toLowerCase();
                  const matched = articles.find((a) => {
                    const t = a.title.trim().toLowerCase();
                    return t === cleaned || t.includes(cleaned) || cleaned.includes(t);
                  });
                  if (matched) {
                    setSelectedArticleId(matched.id);
                  }
                }
              }
            }}
          />

          {/* Tag Pills Footer */}
          {article.tags && article.tags.length > 0 && (
            <div className="mt-12 pt-6 border-t border-zinc-800/80 flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-zinc-500 flex items-center gap-1 mr-1">
                <Tag className="w-3 h-3 text-amber-400" />
                <span>INDEX TAGS:</span>
              </span>
              {article.tags.map((t, idx) => (
                <span 
                  key={idx}
                  className="px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 font-mono"
                >
                  #{t}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* World Anvil Style Sidebar Infobox (Quick Facts & Portrait) */}
        <aside className="w-full lg:w-80 flex-shrink-0 flex flex-col gap-5">
          <div className="rounded-2xl border border-amber-500/30 bg-zinc-900/70 shadow-2xl p-5 relative overflow-hidden backdrop-blur-md">
            {/* Top Gilded Trim */}
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-amber-600 via-amber-400 to-amber-600" />

            <div className="text-center pb-4 border-b border-zinc-800">
              <span className="text-[10px] uppercase font-bold tracking-widest text-amber-400 block mb-1">
                Codex Dossier
              </span>
              <h3 className="font-heading font-bold text-lg text-zinc-100">
                {article.title}
              </h3>
              <span className="text-xs text-zinc-400 font-serif italic">
                {article.category} of {world.name}
              </span>
            </div>

            {/* Featured Portrait Avatar in Sidebar */}
            {featuredImage && (
              <div className="my-4 rounded-xl overflow-hidden border-2 border-amber-500/40 shadow-xl bg-black/60 relative group cursor-pointer"
                onClick={() => setLightboxImg(featuredImage)}
              >
                <img
                  src={featuredImage}
                  alt={article.title}
                  className="w-full h-56 object-cover object-top group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Maximize2 className="w-5 h-5 text-amber-300 drop-shadow" />
                </div>
              </div>
            )}

            {/* Quick Facts List */}
            {quickFacts.length > 0 ? (
              <div className="space-y-2.5 my-3">
                <div className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 pb-1 border-b border-zinc-800/80">
                  Quick Facts
                </div>
                {quickFacts.map((fact, idx) => (
                  <div key={idx} className="flex items-start justify-between gap-3 text-xs">
                    <span className="text-zinc-400 font-semibold">{fact.label}:</span>
                    <span className="text-zinc-200 text-right font-medium">{fact.value}</span>
                  </div>
                ))}
              </div>
            ) : null}

            {/* Metadata Footer in Sidebar */}
            <div className="mt-4 pt-3 border-t border-zinc-800/80 text-[11px] text-zinc-500 flex flex-col gap-1.5 font-mono">
              <div className="flex items-center justify-between">
                <span>World:</span>
                <span className="text-zinc-300 font-semibold">{world.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Updated:</span>
                <span>{new Date(article.updatedAt).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Status:</span>
                <span className={article.isSecret ? "text-rose-400 font-semibold" : "text-emerald-400 font-semibold"}>
                  {article.isSecret ? "GM Classified" : "Published"}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Edit CTA Card */}
          <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40 text-center flex flex-col items-center gap-2">
            <Feather className="w-4 h-4 text-amber-400" />
            <div className="text-xs text-zinc-400">
              Want to adjust the layout, float an image, or revise prose?
            </div>
            <button
              onClick={onEdit}
              className="w-full py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-amber-300 font-semibold text-xs border border-zinc-700 transition-colors cursor-pointer"
            >
              Open Editor
            </button>
          </div>
        </aside>
      </div>

      {/* Lightbox Modal */}
      {lightboxImg && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setLightboxImg(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center">
            <button
              onClick={() => setLightboxImg(null)}
              className="absolute -top-10 right-0 p-1.5 text-zinc-400 hover:text-white rounded-lg bg-zinc-900/80 border border-zinc-700"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={lightboxImg}
              alt="Enlarged Artwork"
              className="max-h-[85vh] w-auto max-w-full rounded-2xl border border-zinc-800 shadow-2xl object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
};
