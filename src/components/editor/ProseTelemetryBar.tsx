import React from 'react';
import { 
  GiQuillInk, 
  GiCheckMark, 
  GiEyeTarget, 
  GiConversation,
  GiSparkles
} from 'react-icons/gi';

interface ProseTelemetryBarProps {
  content: string;
  isSaving: boolean;
  isTypewriterMode: boolean;
  onToggleTypewriter: () => void;
  isZenMode: boolean;
  onToggleZen: () => void;
}

export const ProseTelemetryBar: React.FC<ProseTelemetryBarProps> = ({
  content,
  isSaving,
  isTypewriterMode,
  onToggleTypewriter,
  isZenMode,
  onToggleZen,
}) => {
  // Strip HTML tags for clean text analysis
  const text = content.replace(/<[^>]*>?/gm, ' ').trim();
  const words = text ? text.split(/\s+/).filter(Boolean) : [];
  const wordCount = words.length;
  const charCount = text.length;
  const readingTimeMin = Math.max(1, Math.ceil(wordCount / 200));

  // Dialogue ratio: words inside quotes "..."
  const quoteMatches = text.match(/"([^"]*)"/g) || [];
  const dialogueWords = quoteMatches
    .map((q) => q.replace(/"/g, '').split(/\s+/).filter(Boolean).length)
    .reduce((acc, curr) => acc + curr, 0);
  const dialogueRatio = wordCount > 0 ? Math.round((dialogueWords / wordCount) * 100) : 0;

  // Sensory words scanner
  const sensoryKeywords = [
    'whisper', 'shadow', 'gloom', 'crimson', 'radiance', 'echo', 'stench', 'sulfur', 
    'chill', 'frost', 'burning', 'bitter', 'sweet', 'clash', 'silence', 'hiss', 'shimmer',
    'velvet', 'roaring', 'damp', 'reek', 'golden', 'gleam', 'thunder'
  ];
  const sensoryHits = words.filter((w) => sensoryKeywords.includes(w.toLowerCase().replace(/[^a-z]/g, ''))).length;

  return (
    <div className="h-10 border-t border-zinc-800 bg-zinc-950 px-4 flex items-center justify-between text-xs text-zinc-400 font-sans z-10">
      {/* Left: Live Prose Telemetry */}
      <div className="flex items-center gap-4">
        {/* Word / Char count */}
        <div className="flex items-center gap-2">
          <span className="font-semibold text-zinc-200">{wordCount}</span>
          <span className="text-zinc-500">words</span>
          <span className="text-zinc-700">·</span>
          <span>{charCount} chars</span>
          <span className="text-zinc-700">·</span>
          <span className="text-zinc-500">{readingTimeMin} min read</span>
        </div>

        {/* Dialogue Ratio */}
        <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[11px]" title="Dialogue-to-Narration Ratio">
          <GiConversation className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-zinc-400">Dialogue:</span>
          <span className="font-semibold text-zinc-200">{dialogueRatio}%</span>
        </div>

        {/* Sensory Density */}
        <div className="hidden md:flex items-center gap-1.5 px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[11px]" title="Sensory Imagery Keywords">
          <GiSparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-zinc-400">Sensory:</span>
          <span className="font-semibold text-zinc-200">{sensoryHits} tokens</span>
        </div>
      </div>

      {/* Right: Autosave status & Modes */}
      <div className="flex items-center gap-3">
        {/* Autosave status indicator */}
        <div className="flex items-center gap-1.5 text-[11px]">
          {isSaving ? (
            <span className="text-amber-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              Saving...
            </span>
          ) : (
            <span className="text-emerald-400 flex items-center gap-1">
              <GiCheckMark className="w-3 h-3" />
              Saved to Vault
            </span>
          )}
        </div>

        {/* Typewriter Mode Button */}
        <button
          onClick={onToggleTypewriter}
          className={`btn-pill flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
            isTypewriterMode
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900'
          }`}
          title="Typewriter Focus Mode: Keeps cursor vertically centered"
        >
          <GiEyeTarget className="w-3.5 h-3.5" />
          <span className="hidden lg:inline">Typewriter</span>
        </button>

        {/* Zen Mode Button */}
        <button
          onClick={onToggleZen}
          className={`btn-pill flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
            isZenMode
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900'
          }`}
          title="Zen Mode: Collapse binder for distraction-free writing"
        >
          <GiQuillInk className="w-3.5 h-3.5" />
          <span className="hidden lg:inline">Zen Focus</span>
        </button>
      </div>
    </div>
  );
};
