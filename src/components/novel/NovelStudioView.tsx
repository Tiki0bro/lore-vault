import React, { useState } from 'react';
import { useLoreStore } from '../../store/useLoreStore';
import { ManuscriptBinder } from './ManuscriptBinder';
import { WorldLoreCompanion } from './WorldLoreCompanion';
import { TipTapEditor } from '../editor/TipTapEditor';
import { ProseTelemetryBar } from '../editor/ProseTelemetryBar';
import { BookMarked, Save, Check } from 'lucide-react';

export const NovelStudioView: React.FC = () => {
  const { 
    novelChapters, 
    activeChapterId, 
    updateChapter 
  } = useLoreStore();

  const [isCompanionOpen, setCompanionOpen] = useState(false);
  const [isSavedRecently, setIsSavedRecently] = useState(false);
  const [isTypewriterMode, setTypewriterMode] = useState(false);
  const [isZenMode, setZenMode] = useState(false);

  const currentChapter = novelChapters.find((ch) => ch.id === activeChapterId) || novelChapters[0];

  const handleContentChange = (newContent: string) => {
    if (!currentChapter) return;
    const plainText = newContent.replace(/<[^>]+>/g, ' ').trim();
    const wordCount = plainText ? plainText.split(/\s+/).filter(Boolean).length : 0;

    updateChapter(currentChapter.id, {
      content: newContent,
      currentWordCount: wordCount,
    });

    setIsSavedRecently(true);
    setTimeout(() => setIsSavedRecently(false), 1200);
  };

  const handleTitleChange = (newTitle: string) => {
    if (!currentChapter) return;
    updateChapter(currentChapter.id, { title: newTitle });
  };

  const handleStatusChange = (status: 'draft' | 'revision' | 'polished') => {
    if (!currentChapter) return;
    updateChapter(currentChapter.id, { status });
  };

  return (
    <div className="flex-1 flex overflow-hidden w-full h-full bg-zinc-950">
      {/* Left: Manuscript Chapter Binder (hidden in Zen Mode) */}
      {!isZenMode && <ManuscriptBinder />}

      {/* Center: Main Writing Desk */}
      <main className="flex-1 flex flex-col overflow-hidden bg-zinc-950 relative">
        {/* Chapter Toolbar */}
        <div className="h-12 border-b border-zinc-800 bg-zinc-900/60 flex items-center justify-between px-6 flex-shrink-0">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <input
              type="text"
              value={currentChapter ? currentChapter.title : 'Untitled Chapter'}
              onChange={(e) => handleTitleChange(e.target.value)}
              className="font-heading font-bold text-sm text-zinc-100 bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-amber-500/50 rounded px-1.5 py-0.5 max-w-md truncate"
            />

            {/* Status Selector */}
            {currentChapter && (
              <select
                value={currentChapter.status}
                onChange={(e) => handleStatusChange(e.target.value as any)}
                className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-300 focus:outline-none focus:border-amber-400"
              >
                <option value="draft">Draft</option>
                <option value="revision">Revision</option>
                <option value="polished">Polished</option>
              </select>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Save indicator */}
            <div className="flex items-center gap-1 text-[11px] text-zinc-500 font-mono">
              {isSavedRecently ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-400">Saved</span>
                </>
              ) : (
                <>
                  <Save className="w-3 h-3 text-zinc-600" />
                  <span>Autosaving</span>
                </>
              )}
            </div>

            {/* World Lore Reference Button */}
            <button
              onClick={() => setCompanionOpen(!isCompanionOpen)}
              className={`btn-tactile flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                isCompanionOpen
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm'
                  : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:border-zinc-700'
              }`}
              title="Toggle World Lore Reference Companion"
            >
              <BookMarked className="w-3.5 h-3.5 text-amber-400" />
              <span>World Lore</span>
            </button>
          </div>
        </div>

        {/* TipTap Rich Manuscript Editor Viewport */}
        <div className="flex-1 overflow-y-auto px-6 py-8 flex justify-center">
          <div className="w-full max-w-3xl">
            {currentChapter ? (
              <TipTapEditor
                content={currentChapter.content}
                onChange={handleContentChange}
                isTypewriterMode={isTypewriterMode}
              />
            ) : (
              <div className="text-center text-zinc-500 mt-24">
                Select or create a chapter in the binder to begin drafting.
              </div>
            )}
          </div>
        </div>

        {/* Bottom Prose Telemetry Bar */}
        <ProseTelemetryBar
          content={currentChapter ? currentChapter.content : ''}
          isSaving={!isSavedRecently}
          isTypewriterMode={isTypewriterMode}
          onToggleTypewriter={() => setTypewriterMode(!isTypewriterMode)}
          isZenMode={isZenMode}
          onToggleZen={() => setZenMode(!isZenMode)}
        />
      </main>

      {/* Right: Dockable World Lore Reference Drawer */}
      <WorldLoreCompanion
        isOpen={isCompanionOpen}
        onClose={() => setCompanionOpen(false)}
      />
    </div>
  );
};
