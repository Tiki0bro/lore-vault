import React, { useState } from 'react';
import { useLoreStore } from '../../store/useLoreStore';
import { aiOrchestrator } from '../../lib/ai/aiOrchestrator';
import { buildVaultContext } from '../../lib/ai/loreContextBuilder';
import { 
  Sparkles, 
  ArrowRight, 
  Feather, 
  Check, 
  RefreshCw, 
  X, 
  Eye, 
  Wand2
} from 'lucide-react';
import { GiQuillInk, GiSparkles } from 'react-icons/gi';

interface TipTapAiMenuProps {
  isOpen: boolean;
  onClose: () => void;
  selectedText: string;
  precedingText: string;
  onInsertContent: (content: string, replaceSelection?: boolean) => void;
}

export const TipTapAiMenu: React.FC<TipTapAiMenuProps> = ({
  isOpen,
  onClose,
  selectedText,
  precedingText,
  onInsertContent,
}) => {
  const { 
    worlds, 
    activeWorldId, 
    articles, 
    isPlayerMode, 
    novelChapters, 
    activeChapterId,
    sceneSlateArticleIds,
    aiSettings,
  } = useLoreStore();

  const activeWorld = worlds.find((w) => w.id === activeWorldId) || worlds[0];
  const activeChapter = novelChapters.find((ch) => ch.id === activeChapterId);

  const [activeMode, setActiveMode] = useState<'continue' | 'expand' | 'polish' | 'custom'>('continue');
  const [customPrompt, setCustomPrompt] = useState('');
  const [polishFocus, setPolishFocus] = useState<'sensory' | 'punchy' | 'dialogue' | 'grimdark'>('sensory');
  const [isLoading, setIsLoading] = useState(false);
  const [generatedResult, setGeneratedResult] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  // Build Scene Slate context
  const context = buildVaultContext(
    activeWorld,
    articles,
    isPlayerMode,
    '',
    sceneSlateArticleIds
  );

  const handleGenerate = async () => {
    setIsLoading(true);
    setErrorMsg(null);

    try {
      let result = '';

      if (activeMode === 'continue') {
        result = await aiOrchestrator.continueProse({
          chapterTitle: activeChapter?.title || 'Untitled Chapter',
          precedingText: selectedText || precedingText || '',
          sceneSlateContext: context.articlesContext,
          customDirection: customPrompt.trim() || undefined,
        });
      } else if (activeMode === 'expand') {
        const beatToExpand = selectedText.trim() || customPrompt.trim();
        if (!beatToExpand) {
          setErrorMsg('Please highlight an outline beat or enter notes in the box below.');
          setIsLoading(false);
          return;
        }
        result = await aiOrchestrator.expandBeat({
          chapterTitle: activeChapter?.title || 'Untitled Chapter',
          outlineBeat: beatToExpand,
          sceneSlateContext: context.articlesContext,
        });
      } else if (activeMode === 'polish') {
        const textToPolish = selectedText.trim() || precedingText.slice(-600).trim();
        if (!textToPolish) {
          setErrorMsg('Please select a sentence or paragraph to polish.');
          setIsLoading(false);
          return;
        }
        result = await aiOrchestrator.polishProse({
          rawText: textToPolish,
          focus: polishFocus,
        });
      } else if (activeMode === 'custom') {
        if (!customPrompt.trim()) {
          setErrorMsg('Please enter a creative instruction.');
          setIsLoading(false);
          return;
        }
        result = await aiOrchestrator.continueProse({
          chapterTitle: activeChapter?.title || 'Untitled Chapter',
          precedingText: selectedText || precedingText || '',
          sceneSlateContext: context.articlesContext,
          customDirection: customPrompt.trim(),
        });
      }

      setGeneratedResult(result);
    } catch (err: any) {
      setErrorMsg(err.message || 'Generation failed. Check AI provider settings.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccept = (replaceSelection = false) => {
    if (!generatedResult) return;
    onInsertContent(generatedResult, replaceSelection);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="h-14 border-b border-zinc-800 bg-zinc-900/80 px-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <GiQuillInk className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-heading font-bold text-sm text-zinc-100 flex items-center gap-2">
                <span>Manuscript AI Co-Pilot</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-amber-400 border border-zinc-700 font-sans">
                  {aiSettings.tonePreset.replace('_', ' ').toUpperCase()}
                </span>
              </h2>
              <p className="text-[10px] text-zinc-400">
                Chapter: <span className="text-zinc-300 font-medium">{activeChapter?.title || 'Active Document'}</span>
                {sceneSlateArticleIds.length > 0 && (
                  <span className="ml-2 text-amber-400 font-semibold">
                    · {sceneSlateArticleIds.length} Scene Lore Entity Pinned
                  </span>
                )}
              </p>
            </div>
          </div>

          <button onClick={onClose} className="p-1 rounded text-zinc-400 hover:text-zinc-200 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Mode Tabs */}
        <div className="grid grid-cols-4 border-b border-zinc-800 bg-zinc-900/40 text-xs">
          <button
            onClick={() => { setActiveMode('continue'); setGeneratedResult(null); }}
            className={`py-2.5 flex items-center justify-center gap-1.5 font-medium border-b-2 transition-colors cursor-pointer ${
              activeMode === 'continue'
                ? 'border-amber-500 text-amber-300 bg-zinc-900'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <ArrowRight className="w-3.5 h-3.5" />
            <span>Continue Prose</span>
          </button>

          <button
            onClick={() => { setActiveMode('expand'); setGeneratedResult(null); }}
            className={`py-2.5 flex items-center justify-center gap-1.5 font-medium border-b-2 transition-colors cursor-pointer ${
              activeMode === 'expand'
                ? 'border-amber-500 text-amber-300 bg-zinc-900'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Feather className="w-3.5 h-3.5 text-blue-400" />
            <span>Expand Beat</span>
          </button>

          <button
            onClick={() => { setActiveMode('polish'); setGeneratedResult(null); }}
            className={`py-2.5 flex items-center justify-center gap-1.5 font-medium border-b-2 transition-colors cursor-pointer ${
              activeMode === 'polish'
                ? 'border-amber-500 text-amber-300 bg-zinc-900'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>Sensory Polish</span>
          </button>

          <button
            onClick={() => { setActiveMode('custom'); setGeneratedResult(null); }}
            className={`py-2.5 flex items-center justify-center gap-1.5 font-medium border-b-2 transition-colors cursor-pointer ${
              activeMode === 'custom'
                ? 'border-amber-500 text-amber-300 bg-zinc-900'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Wand2 className="w-3.5 h-3.5 text-purple-400" />
            <span>Custom Direct</span>
          </button>
        </div>

        {/* Configuration / Input Area */}
        <div className="p-4 border-b border-zinc-800 bg-zinc-950/60 flex flex-col gap-3">
          {activeMode === 'continue' && (
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-zinc-400 block">
                Direction / Sub-Focus (Optional):
              </label>
              <input
                type="text"
                placeholder='e.g. "Focus on cold atmospheric tension", "Introduce sound of an approaching beast"...'
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
              />
            </div>
          )}

          {activeMode === 'expand' && (
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-zinc-400 block">
                Outline Beat to Render:
              </label>
              <textarea
                rows={3}
                placeholder={selectedText ? 'Using highlighted text...' : 'Enter bullet points or beats to expand into full prose...'}
                value={selectedText || customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
              />
            </div>
          )}

          {activeMode === 'polish' && (
            <div className="space-y-2">
              <label className="text-[11px] font-semibold text-zinc-400 block">
                Stylistic Polish Lens:
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: 'sensory', label: 'Sensory Depth', desc: 'Light, scent, sound' },
                  { id: 'punchy', label: 'Tight Pacing', desc: 'Trim adverbs, increase speed' },
                  { id: 'dialogue', label: 'Sharpen Dialogue', desc: 'Cadence & subtext' },
                  { id: 'grimdark', label: 'Grimdark Bleakness', desc: 'Visceral decay & stakes' },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setPolishFocus(item.id as any)}
                    className={`p-2 rounded-lg text-left border transition-all cursor-pointer ${
                      polishFocus === item.id
                        ? 'bg-amber-500/20 border-amber-500/40 text-amber-200'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <div className="font-semibold text-xs">{item.label}</div>
                    <div className="text-[9px] text-zinc-500 truncate mt-0.5">{item.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeMode === 'custom' && (
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-zinc-400 block">
                Author Prompt Directive:
              </label>
              <textarea
                rows={2}
                placeholder='e.g. "Describe the ancient archway and the glyphs glowing in moonlight"...'
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
              />
            </div>
          )}

          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-zinc-500">
              Provider: <span className="text-amber-400 font-mono">{aiSettings.provider.toUpperCase()}</span>
            </span>

            <button
              onClick={handleGenerate}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-500 text-zinc-950 font-semibold text-xs hover:bg-amber-400 transition-colors disabled:opacity-50 cursor-pointer shadow-lg shadow-amber-500/20"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Weaving Prose...</span>
                </>
              ) : (
                <>
                  <GiSparkles className="w-4 h-4" />
                  <span>Generate Passage</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Error Notification */}
        {errorMsg && (
          <div className="p-3 bg-rose-950/40 border-b border-rose-800/60 text-rose-300 text-xs px-5">
            ⚠️ {errorMsg}
          </div>
        )}

        {/* Results Review Area */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {generatedResult ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span className="font-semibold text-amber-400 uppercase tracking-wider text-[10px] flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5" /> Generated Manuscript Preview
                </span>
                <span className="text-[11px] text-zinc-500">
                  {generatedResult.split(/\s+/).filter(Boolean).length} words generated
                </span>
              </div>

              <div className="p-4 rounded-xl bg-zinc-900/90 border border-zinc-800 text-zinc-100 font-serif text-sm leading-relaxed whitespace-pre-wrap shadow-inner selection:bg-amber-500/30">
                {generatedResult}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={handleGenerate}
                  disabled={isLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs text-zinc-300 cursor-pointer transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Reroll</span>
                </button>

                {selectedText && (
                  <button
                    onClick={() => handleAccept(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-xs text-amber-300 font-semibold cursor-pointer transition-colors"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Replace Selection</span>
                  </button>
                )}

                <button
                  onClick={() => handleAccept(false)}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-semibold text-xs cursor-pointer transition-colors shadow-lg shadow-emerald-600/20"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Insert at Cursor</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center p-8 text-zinc-500 space-y-2">
              <GiQuillInk className="w-10 h-10 text-zinc-700" />
              <p className="text-xs">
                Select a generation mode above and click <span className="text-amber-400 font-medium">Generate Passage</span> to co-write with your canonical lore.
              </p>
              <p className="text-[10px] text-zinc-600">
                Tip: Press <kbd className="px-1 py-0.5 rounded bg-zinc-800 border border-zinc-700 font-mono text-[9px] text-zinc-400">Ctrl+J</kbd> anytime while writing to summon this menu instantly.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
