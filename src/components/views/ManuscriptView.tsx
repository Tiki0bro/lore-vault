import React, { useState, useEffect, useRef } from 'react';
import { useLoreStore } from '../../store/useLoreStore';
import { TipTapEditor } from '../editor/TipTapEditor';
import { ProseTelemetryBar } from '../editor/ProseTelemetryBar';
import { CodexBinder } from '../codex/CodexBinder';
import type { ArticleCategory, Article } from '../../types/lore';
import { 
  GiScrollUnfurled,
  GiPadlock,
  GiTrashCan,
  GiSparkles
} from 'react-icons/gi';
import { 
  Sparkles, 
  Image as ImageIcon, 
  Trash2, 
  RefreshCw, 
  Plus, 
  X, 
  Maximize2, 
  Eye, 
  Edit3,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';
import { ImageStudioModal } from '../modals/ImageStudioModal';
import { PublishedArticleView } from './PublishedArticleView';
import { ImageLayoutToolbar, type ImageAlignment, type ImageSize } from '../editor/ImageLayoutToolbar';
import { aiOrchestrator } from '../../lib/ai/aiOrchestrator';
import { buildVaultContext } from '../../lib/ai/loreContextBuilder';
import { ImageGenerator } from '../../lib/ai/imageGenerator';

export const ManuscriptView: React.FC = () => {
  const { 
    articles, 
    worlds,
    activeWorldId, 
    isPlayerMode, 
    selectedArticleId,
    setSelectedArticleId,
    updateArticle, 
    createArticle, 
    deleteArticle 
  } = useLoreStore();
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishedView, setIsPublishedView] = useState(true);
  const [isTypewriterMode, setIsTypewriterMode] = useState(false);
  const [isZenMode, setIsZenMode] = useState(false);
  const [isBinderCollapsed, setIsBinderCollapsed] = useState(false);
  const [coverSize, setCoverSize] = useState<'compact' | 'normal' | 'large' | 'hidden'>('normal');
  const [isCoverStudioOpen, setIsCoverStudioOpen] = useState(false);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<{ url: string; caption?: string } | null>(null);
  const [isFleshingOut, setIsFleshingOut] = useState(false);
  const [imageLayoutModal, setImageLayoutModal] = useState<{
    isOpen: boolean;
    url: string;
    caption?: string;
  }>({ isOpen: false, url: '' });
  const saveTimeoutRef = useRef<number | null>(null);

  const activeWorld = worlds.find((w) => w.id === activeWorldId) || worlds[0];

  const worldArticles = articles.filter((a) => a.worldId === activeWorldId);
  const visibleArticles = isPlayerMode ? worldArticles.filter((a) => !a.isSecret) : worldArticles;
  const currentArticle = visibleArticles.find((a) => a.id === selectedArticleId) || visibleArticles[0];

  useEffect(() => {
    if ((!selectedArticleId || !visibleArticles.some((a) => a.id === selectedArticleId)) && visibleArticles.length > 0) {
      setSelectedArticleId(visibleArticles[0].id);
    }
  }, [visibleArticles, selectedArticleId, setSelectedArticleId]);

  // Handle Debounced Content Autosaving
  const handleContentChange = (newHtml: string) => {
    if (!currentArticle) return;
    setIsSaving(true);

    if (saveTimeoutRef.current) {
      window.clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = window.setTimeout(() => {
      // Auto-extract first paragraph for summary if summary is empty
      const text = newHtml.replace(/<[^>]*>?/gm, ' ').trim();
      const firstSentence = text.split('.')[0] + '.';

      updateArticle(currentArticle.id, {
        content: newHtml,
        summary: currentArticle.summary || firstSentence.slice(0, 150),
      });
      setIsSaving(false);
    }, 500);
  };

  // Handle Title and Category updates
  const handleTitleChange = (newTitle: string) => {
    if (!currentArticle) return;
    updateArticle(currentArticle.id, { title: newTitle });
  };

  const handleCategoryChange = (newCat: ArticleCategory) => {
    if (!currentArticle) return;
    updateArticle(currentArticle.id, { category: newCat });
  };

  const handleToggleSecret = () => {
    if (!currentArticle) return;
    updateArticle(currentArticle.id, { isSecret: !currentArticle.isSecret });
  };

  const handleSetCover = (url: string, prompt?: string) => {
    if (!currentArticle) return;
    updateArticle(currentArticle.id, { coverImageUrl: url, coverImagePrompt: prompt });
  };

  const handleRemoveCover = () => {
    if (!currentArticle) return;
    updateArticle(currentArticle.id, { coverImageUrl: undefined, coverImagePrompt: undefined });
  };

  const handleInsertImageIntoManuscript = (
    imageUrl: string, 
    caption?: string,
    alignment: ImageAlignment = 'center',
    size: ImageSize = 'md'
  ) => {
    if (!currentArticle) return;
    const alignClass = 
      alignment === 'left' ? 'article-img-float-left' :
      alignment === 'right' ? 'article-img-float-right' :
      alignment === 'banner' ? 'article-img-banner' : 'article-img-center';
    
    const sizeClass = 
      size === 'sm' ? 'article-img-sm' :
      size === 'lg' ? 'article-img-lg' :
      size === 'full' ? 'article-img-full' : 'article-img-md';

    const figureHtml = `<figure class="my-6 ${alignClass} ${sizeClass} article-img-portrait-frame"><img src="${imageUrl}" alt="${caption || currentArticle.title}" class="rounded-xl border border-amber-500/30 shadow-xl mx-auto" />${
      caption ? `<figcaption class="text-xs text-zinc-400 font-serif italic mt-2">${caption}</figcaption>` : ''
    }</figure>`;
    
    updateArticle(currentArticle.id, {
      content: currentArticle.content + figureHtml,
    });
  };

  const handleApplyCustomLayout = (alignment: ImageAlignment, size: ImageSize, caption?: string) => {
    if (!currentArticle || !imageLayoutModal.url) return;
    handleInsertImageIntoManuscript(imageLayoutModal.url, caption, alignment, size);
  };

  const handleRemoveImageFromProse = () => {
    if (!currentArticle || !imageLayoutModal.url) return;
    // Remove occurrences of the image from content
    const regex = new RegExp(`<figure[^>]*>.*?${imageLayoutModal.url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}.*?<\\/figure>`, 'gis');
    const updated = currentArticle.content.replace(regex, '');
    updateArticle(currentArticle.id, { content: updated });
  };

  const handleFleshOutWithAi = async () => {
    if (!currentArticle) return;
    setIsFleshingOut(true);
    try {
      const activeWorld = worlds.find((w) => w.id === activeWorldId) || worlds[0];
      const context = buildVaultContext(activeWorld, articles, isPlayerMode);
      const generated = await aiOrchestrator.fleshOutArticleStub({
        title: currentArticle.title,
        category: currentArticle.category,
        summary: currentArticle.summary,
        worldName: activeWorld.name,
        worldGenre: activeWorld.genre,
        existingArticlesContext: context.articlesContext,
      });

      const formatted = generated.startsWith('<p>') || generated.startsWith('<h')
        ? generated
        : `<p>${generated.replace(/\n\n+/g, '</p><p>').replace(/\n/g, '<br/>')}</p>`;

      updateArticle(currentArticle.id, {
        content: formatted,
      });
    } catch (err: any) {
      alert(`AI Lore generation error: ${err.message}`);
    } finally {
      setIsFleshingOut(false);
    }
  };

  // Create New Article
  const handleCreateNew = () => {
    const newArt: Article = {
      id: `art-${Date.now()}`,
      worldId: activeWorldId,
      title: 'Untitled Lore Entry',
      category: 'Lore',
      summary: 'New lore document waiting to be penned.',
      content: '<h2>Chapter I</h2><p>Begin writing the history and legend here...</p>',
      tags: ['Draft'],
      isSecret: false,
      updatedAt: new Date().toISOString(),
    };
    createArticle(newArt);
    setSelectedArticleId(newArt.id);
  };

  const handleDeleteCurrent = () => {
    if (!currentArticle) return;
    if (confirm(`Are you sure you want to delete "${currentArticle.title}"?`)) {
      deleteArticle(currentArticle.id);
    }
  };

  return (
    <div className="flex-1 flex overflow-hidden relative">
      {/* Left Sidebar: Codex Binder (Collapsible in Zen Mode or via Binder Toggle) */}
      {!isZenMode && !isBinderCollapsed && (
        <CodexBinder onArticleSelect={(id) => setSelectedArticleId(id)} />
      )}

      {/* Main Manuscript Studio Surface */}
      <main className="flex-1 flex flex-col bg-zinc-900/40 overflow-hidden min-w-0">
        {currentArticle ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Optional Article Cover Art Banner (Adjustable Size & Hide) */}
            {currentArticle.coverImageUrl && coverSize !== 'hidden' && (
              <div 
                className={`relative w-full overflow-hidden border-b border-zinc-800 bg-zinc-950 flex-shrink-0 group transition-all duration-300 ${
                  coverSize === 'compact' ? 'h-24 sm:h-28' :
                  coverSize === 'large' ? 'h-72 sm:h-96' : 'h-40 sm:h-52'
                }`}
              >
                <img
                  src={currentArticle.coverImageUrl}
                  alt={currentArticle.title}
                  className="w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-105"
                  onError={(e) => {
                    const fallback = ImageGenerator.generateProceduralFallbackSvg(
                      currentArticle.title,
                      'grimdark',
                      1280,
                      540
                    );
                    e.currentTarget.src = fallback;
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent pointer-events-none" />
                
                {/* Floating Cover Action Controls: Size Options & Actions */}
                <div className="absolute top-3 right-3 flex items-center gap-1.5 opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 backdrop-blur-md px-2 py-1 rounded-xl border border-zinc-700/60 text-xs shadow-lg">
                  {/* Banner Height Adjuster */}
                  <div className="flex items-center gap-1 pr-1.5 border-r border-zinc-700">
                    <button
                      onClick={() => setCoverSize('compact')}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-semibold transition-colors cursor-pointer ${
                        coverSize === 'compact' ? 'bg-amber-500/20 text-amber-300' : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                      title="Compact Banner (Small)"
                    >
                      Compact
                    </button>
                    <button
                      onClick={() => setCoverSize('normal')}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-semibold transition-colors cursor-pointer ${
                        coverSize === 'normal' ? 'bg-amber-500/20 text-amber-300' : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                      title="Standard Banner (Medium)"
                    >
                      Normal
                    </button>
                    <button
                      onClick={() => setCoverSize('large')}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-semibold transition-colors cursor-pointer ${
                        coverSize === 'large' ? 'bg-amber-500/20 text-amber-300' : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                      title="Hero Banner (Large)"
                    >
                      Large
                    </button>
                    <button
                      onClick={() => setCoverSize('hidden')}
                      className="px-1.5 py-0.5 rounded text-[10px] text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
                      title="Collapse Cover Art"
                    >
                      Collapse
                    </button>
                  </div>

                  <button
                    onClick={() => setIsCoverStudioOpen(true)}
                    className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-zinc-300 hover:text-amber-300 hover:bg-zinc-800/80 transition-colors cursor-pointer"
                    title="Change or Regenerate Cover Art"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Change</span>
                  </button>
                  <div className="w-[1px] h-3.5 bg-zinc-700" />
                  <button
                    onClick={handleRemoveCover}
                    className="p-1 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-zinc-800/80 transition-colors cursor-pointer"
                    title="Remove Cover Image"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {currentArticle.coverImagePrompt && (
                  <div className="absolute bottom-2 left-6 text-[10px] text-zinc-400/80 font-mono italic max-w-lg truncate drop-shadow">
                    Prompt: {currentArticle.coverImagePrompt}
                  </div>
                )}
              </div>
            )}

            {/* Top Article Metadata Bar */}
            <div className="p-6 pb-2 border-b border-zinc-800 bg-zinc-950 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {/* Left Sidebar (Codex Binder) Collapse/Expand Toggle */}
                  <button
                    onClick={() => setIsBinderCollapsed(!isBinderCollapsed)}
                    className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-amber-300 hover:bg-zinc-800 transition-colors cursor-pointer"
                    title={isBinderCollapsed ? "Open Codex Binder (Show Left Sidebar)" : "Collapse Codex Binder (Full Width View)"}
                  >
                    {isBinderCollapsed ? (
                      <PanelLeftOpen className="w-4 h-4 text-amber-400" />
                    ) : (
                      <PanelLeftClose className="w-4 h-4" />
                    )}
                  </button>

                  {/* Category Selector Dropdown */}
                  <select
                    value={currentArticle.category}
                    onChange={(e) => handleCategoryChange(e.target.value as ArticleCategory)}
                    className="bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs px-2.5 py-1 rounded font-semibold focus:outline-none focus:border-amber-500 cursor-pointer"
                  >
                    <option value="Character">Character</option>
                    <option value="Location">Location</option>
                    <option value="Faction">Faction</option>
                    <option value="Item">Item</option>
                    <option value="Event">Event</option>
                    <option value="Lore">General Lore</option>
                  </select>

                  {/* Secret Toggle */}
                  <button
                    onClick={handleToggleSecret}
                    className={`flex items-center gap-1 text-xs px-2 py-1 rounded border transition-colors cursor-pointer ${
                      currentArticle.isSecret
                        ? 'bg-rose-950/60 border-rose-700 text-rose-300'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <GiPadlock className="w-3.5 h-3.5" />
                    <span>{currentArticle.isSecret ? 'GM Secret' : 'Public'}</span>
                  </button>

                  {/* If cover exists but is hidden, show restore banner button */}
                  {currentArticle.coverImageUrl && coverSize === 'hidden' && (
                    <button
                      onClick={() => setCoverSize('normal')}
                      className="btn-pill flex items-center gap-1.5 text-xs px-2.5 py-1 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30 hover:bg-amber-500/20 font-medium transition-colors cursor-pointer"
                      title="Expand / Unhide Article Cover Art Banner"
                    >
                      <ImageIcon className="w-3 h-3 text-amber-400" />
                      <span>Show Cover</span>
                    </button>
                  )}

                  {/* Add Cover Art Pill (if none exists) */}
                  {!currentArticle.coverImageUrl && (
                    <button
                      onClick={() => setIsCoverStudioOpen(true)}
                      className="btn-pill flex items-center gap-1.5 text-xs px-2.5 py-1 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30 hover:bg-amber-500/20 font-medium transition-colors cursor-pointer"
                      title="Add or Generate Cover Art for this article"
                    >
                      <Sparkles className="w-3 h-3 text-amber-400" />
                      <ImageIcon className="w-3 h-3" />
                      <span>+ Cover Art</span>
                    </button>
                  )}

                  {/* Gallery Toggle Pill */}
                  {currentArticle.images && currentArticle.images.length > 0 && (
                    <button
                      onClick={() => setIsGalleryOpen(!isGalleryOpen)}
                      className={`btn-pill flex items-center gap-1.5 text-xs px-2.5 py-1 rounded border font-medium transition-colors cursor-pointer ${
                        isGalleryOpen
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-xs'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                      }`}
                      title="Toggle Article Media Gallery"
                    >
                      <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
                      <span>Art Gallery ({currentArticle.images.length})</span>
                    </button>
                  )}

                  {/* Flesh Out Stub with AI Button */}
                  <button
                    onClick={handleFleshOutWithAi}
                    disabled={isFleshingOut}
                    className="btn-pill flex items-center gap-1.5 text-xs px-2.5 py-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 font-semibold transition-colors cursor-pointer shadow-sm shadow-amber-500/10 disabled:opacity-50"
                    title="Flesh out this lore entry using canonical vault context & WorldAnvil structure"
                  >
                    {isFleshingOut ? (
                      <>
                        <RefreshCw className="w-3 h-3 animate-spin text-amber-400" />
                        <span>Fleshing Out...</span>
                      </>
                    ) : (
                      <>
                        <GiSparkles className="w-3.5 h-3.5 text-amber-400" />
                        <span>✨ Flesh Out with AI</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Right: Published View Switcher & Delete */}
                <div className="flex items-center gap-2">
                  {/* Edit / Published View Toggle Pill */}
                  <div className="flex items-center p-0.5 rounded-lg bg-zinc-900 border border-zinc-800">
                    <button
                      onClick={() => setIsPublishedView(false)}
                      className={`btn-pill flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                        !isPublishedView
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-xs'
                          : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
                      }`}
                      title="Edit Mode (Ctrl+E)"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => setIsPublishedView(true)}
                      className={`btn-pill flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                        isPublishedView
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-xs'
                          : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
                      }`}
                      title="Published Reader View (World Anvil Style)"
                    >
                      <Eye className="w-3.5 h-3.5 text-amber-400" />
                      <span>Published View</span>
                    </button>
                  </div>

                  {/* Delete button */}
                  <button
                    onClick={handleDeleteCurrent}
                    className="p-1.5 rounded text-zinc-500 hover:text-rose-400 hover:bg-zinc-900 transition-colors cursor-pointer"
                    title="Delete article"
                  >
                    <GiTrashCan className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Editable Document Title Input */}
              <input
                type="text"
                value={currentArticle.title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Article Title..."
                className="text-2xl sm:text-3xl font-heading font-bold bg-transparent text-amber-100 placeholder-zinc-600 focus:outline-none border-b border-transparent focus:border-amber-500/50 pb-1"
              />
            </div>

            {/* Collapsible Article Artwork Strip */}
            {isGalleryOpen && currentArticle.images && currentArticle.images.length > 0 && (
              <div className="px-6 py-2.5 border-b border-zinc-800 bg-zinc-950/60 backdrop-blur-xs flex flex-col gap-1.5 flex-shrink-0 animate-in slide-in-from-top-1 duration-150">
                <div className="flex items-center justify-between">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                    <ImageIcon className="w-3 h-3 text-amber-400" />
                    <span>Artwork & Illustrations ({currentArticle.images.length})</span>
                  </div>
                  <button
                    onClick={() => setIsCoverStudioOpen(true)}
                    className="text-[10px] text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Image</span>
                  </button>
                </div>

                <div className="flex items-center gap-2.5 overflow-x-auto pb-1 scrollbar-thin">
                  {currentArticle.images.map((img) => {
                    const isCover = currentArticle.coverImageUrl === img.url;
                    return (
                      <div
                        key={img.id}
                        className={`group/card relative flex-shrink-0 w-28 rounded-lg overflow-hidden border transition-all ${
                          isCover
                            ? 'border-amber-500/80 ring-1 ring-amber-500/50 shadow-sm'
                            : 'border-zinc-800/90 hover:border-zinc-600 bg-zinc-900/90'
                        }`}
                      >
                        <div
                          className="w-28 h-20 overflow-hidden bg-black/60 relative cursor-pointer"
                          onClick={() => setLightboxImage({ url: img.url, caption: img.caption })}
                          title="Click to view full size"
                        >
                          <img
                            src={img.url}
                            alt={img.caption || currentArticle.title}
                            className="w-full h-full object-cover group-hover/card:scale-105 transition-transform duration-300"
                          />
                          {isCover && (
                            <span className="absolute top-1 left-1 px-1 py-0.2 rounded text-[8px] font-bold uppercase tracking-wider bg-amber-500 text-zinc-950 shadow-xs">
                              Cover
                            </span>
                          )}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/card:opacity-100 transition-opacity flex items-center justify-center gap-1">
                            <Maximize2 className="w-4 h-4 text-white drop-shadow" />
                          </div>
                        </div>

                        <div className="p-1 px-1.5 bg-zinc-900 text-left">
                          <p className="text-[9px] text-zinc-300 truncate font-medium" title={img.caption}>
                            {img.caption || 'Illustration'}
                          </p>
                          <div className="flex items-center justify-between gap-1 mt-0.5 pt-0.5 border-t border-zinc-800">
                            {!isCover ? (
                              <button
                                onClick={() => handleSetCover(img.url, img.prompt)}
                                className="text-[8px] text-zinc-400 hover:text-amber-300 cursor-pointer font-medium"
                                title="Set as article cover banner"
                              >
                                Set Cover
                              </button>
                            ) : (
                              <span className="text-[8px] text-amber-400 font-semibold">Active</span>
                            )}
                            <button
                              onClick={() => setImageLayoutModal({ isOpen: true, url: img.url, caption: img.caption })}
                              className="text-[8px] text-zinc-400 hover:text-amber-300 cursor-pointer font-medium ml-auto"
                              title="Insert with custom layout (Left, Right, Center, Scale)"
                            >
                              + Insert
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Main Article Body: Published View vs Live TipTap Editor */}
            {isPublishedView ? (
              <PublishedArticleView
                article={currentArticle}
                world={activeWorld}
                onEdit={() => setIsPublishedView(false)}
                isPlayerMode={isPlayerMode}
                isBinderCollapsed={isBinderCollapsed}
                onToggleBinder={() => setIsBinderCollapsed(!isBinderCollapsed)}
              />
            ) : (
              <>
                {/* Live TipTap Rich-Text Editor */}
                <div className="flex-1 flex flex-col overflow-hidden bg-zinc-900/60">
                  <TipTapEditor
                    content={currentArticle.content}
                    onChange={handleContentChange}
                    isTypewriterMode={isTypewriterMode}
                    article={currentArticle}
                    world={activeWorld}
                    onSetCover={handleSetCover}
                  />
                </div>

                {/* Bottom Prose Telemetry & Mode Bar */}
                <ProseTelemetryBar
                  content={currentArticle.content}
                  isSaving={isSaving}
                  isTypewriterMode={isTypewriterMode}
                  onToggleTypewriter={() => setIsTypewriterMode(!isTypewriterMode)}
                  isZenMode={isZenMode}
                  onToggleZen={() => setIsZenMode(!isZenMode)}
                />
              </>
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-zinc-500">
            <GiScrollUnfurled className="w-12 h-12 text-zinc-700 mb-3" />
            <h3 className="font-heading text-lg font-bold text-zinc-400">
              No Document Selected
            </h3>
            <p className="text-xs text-zinc-500 mt-1 max-w-sm">
              Select an article from the Codex Binder or create a new entry to begin writing.
            </p>
            <button
              onClick={handleCreateNew}
              className="mt-4 px-4 py-2 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-semibold hover:bg-amber-500/25 transition-colors"
            >
              + Create First Entry
            </button>
          </div>
        )}
      </main>

      {/* Image Layout Toolbar Modal */}
      <ImageLayoutToolbar
        isOpen={imageLayoutModal.isOpen}
        onClose={() => setImageLayoutModal({ isOpen: false, url: '' })}
        onApplyLayout={handleApplyCustomLayout}
        onRemoveImage={handleRemoveImageFromProse}
        imageUrl={imageLayoutModal.url}
        initialCaption={imageLayoutModal.caption}
      />

      {/* Cover Art Studio Modal */}
      {currentArticle && (
        <ImageStudioModal
          isOpen={isCoverStudioOpen}
          onClose={() => setIsCoverStudioOpen(false)}
          article={currentArticle}
          world={activeWorld}
          onSetCover={handleSetCover}
          initialTarget="cover"
        />
      )}

      {/* Lightbox Fullscreen Artwork Modal */}
      {lightboxImage && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="relative max-w-4xl w-full max-h-[90vh] flex flex-col bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
              <div>
                <h3 className="font-heading font-bold text-sm text-zinc-200">
                  {lightboxImage.caption || currentArticle?.title}
                </h3>
                <p className="text-[11px] text-zinc-400 font-mono truncate max-w-md">
                  {lightboxImage.url}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    handleSetCover(lightboxImage.url);
                    setLightboxImage(null);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-semibold hover:bg-amber-500/30 transition-colors cursor-pointer"
                >
                  Set as Cover
                </button>
                <button
                  onClick={() => {
                    handleInsertImageIntoManuscript(lightboxImage.url, lightboxImage.caption);
                    setLightboxImage(null);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold transition-colors cursor-pointer"
                >
                  + Insert in Text
                </button>
                <button
                  onClick={() => setLightboxImage(null)}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-black/40 min-h-[300px]">
              <img
                src={lightboxImage.url}
                alt={lightboxImage.caption || currentArticle?.title}
                className="max-h-[70vh] w-auto max-w-full rounded-xl object-contain shadow-2xl"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
