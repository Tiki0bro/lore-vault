import React, { useEffect } from 'react';
import { useLoreStore } from '../../store/useLoreStore';
import type { ViewMode } from '../../types/lore';
import { ThemeSelector } from './ThemeSelector';
import { 
  GiSpellBook, 
  GiScrollUnfurled, 
  GiCompass, 
  GiSpiderWeb, 
  GiDragonHead, 
  GiHourglass, 
  GiDiceTwentyFacesTwenty, 
  GiPadlock, 
  GiPadlockOpen,
  GiBrain 
} from 'react-icons/gi';
import { Search, ChevronDown, UploadCloud, Feather } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { 
    worlds, 
    activeWorldId, 
    setActiveWorldId, 
    activeWorkspace,
    setActiveWorkspace,
    activeView, 
    setActiveView, 
    isPlayerMode, 
    togglePlayerMode,
    setSearchPaletteOpen,
    toggleDiceDock,
    toggleAiDrawer,
    setWorldImporterOpen,
    diceHistory
  } = useLoreStore();

  const activeWorld = worlds.find((w) => w.id === activeWorldId) || worlds[0];

  const codexNavItems: { view: ViewMode; label: string; icon: React.ReactNode }[] = [
    { view: 'manuscript', label: 'Articles', icon: <GiScrollUnfurled className="w-4 h-4" /> },
    { view: 'atlas', label: 'Atlas', icon: <GiCompass className="w-4 h-4" /> },
    { view: 'canvas', label: 'Knowledge Graph', icon: <GiSpiderWeb className="w-4 h-4" /> },
    { view: 'bestiary', label: 'Bestiary & Rules', icon: <GiDragonHead className="w-4 h-4" /> },
    { view: 'timeline', label: 'Chronos', icon: <GiHourglass className="w-4 h-4" /> },
  ];

  // Hotkeys Ctrl+1 for Codex, Ctrl+2 for Novel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === '1') {
        e.preventDefault();
        setActiveWorkspace('codex');
      } else if ((e.ctrlKey || e.metaKey) && e.key === '2') {
        e.preventDefault();
        setActiveWorkspace('novel');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setActiveWorkspace]);

  return (
    <header className="h-14 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-md sticky top-0 z-40 flex items-center justify-between px-4">
      {/* Left: Brand & World Selector */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-amber-500 font-heading font-bold text-lg tracking-wide">
          <GiSpellBook className="w-6 h-6 text-amber-400" />
          <span className="hidden sm:inline bg-gradient-to-r from-amber-400 via-amber-200 to-amber-500 bg-clip-text text-transparent">
            LoreVault
          </span>
          <span className="text-xs px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-sans font-medium">
            v2.0
          </span>
        </div>

        {/* World Dropdown */}
        <div className="relative group">
          <button className="btn-tactile flex items-center gap-2 px-3 py-1.5 rounded-md bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-xs font-medium text-zinc-300 transition-colors cursor-pointer">
            <span className="truncate max-w-[120px] sm:max-w-[170px] text-zinc-200 font-semibold">
              {activeWorld.name}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-zinc-500 group-hover:rotate-180 transition-transform duration-200" />
          </button>
          
          <div className="hidden group-hover:block absolute left-0 top-full mt-1 w-64 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl shadow-black/50 p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
            <div className="text-[10px] uppercase font-bold text-zinc-500 px-2 py-1 tracking-wider">
              Switch Realm
            </div>
            {worlds.map((w) => (
              <button
                key={w.id}
                onClick={() => setActiveWorldId(w.id)}
                className={`btn-pill w-full text-left px-2 py-1.5 rounded text-xs transition-colors flex flex-col gap-0.5 cursor-pointer ${
                  w.id === activeWorldId 
                    ? 'bg-amber-500/15 text-amber-300 font-medium' 
                    : 'text-zinc-300 hover:bg-zinc-800'
                }`}
              >
                <span className="truncate">{w.name}</span>
                <span className="text-[10px] text-zinc-500">{w.genre}</span>
              </button>
            ))}

            {/* Importer Action */}
            <div className="pt-1.5 mt-1 border-t border-zinc-800">
              <button
                onClick={() => setWorldImporterOpen(true)}
                className="btn-tactile w-full text-left px-2 py-1.5 rounded text-xs font-semibold text-amber-400 hover:bg-amber-500/15 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span>Import World...</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Center: Workspace Switcher & Contextual Tabs */}
      <div className="flex items-center gap-2">
        {/* Workspace Mode Segmented Pill */}
        <div className="flex items-center p-0.5 rounded-lg bg-zinc-900 border border-zinc-800">
          <button
            onClick={() => setActiveWorkspace('codex')}
            className={`btn-pill flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              activeWorkspace === 'codex'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-xs'
                : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
            }`}
            title="World Codex (Ctrl+1) — Encyclopedic lore, Atlas, Bestiary, Graph, Timeline"
          >
            <GiSpellBook className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden md:inline">World Codex</span>
          </button>
          <button
            onClick={() => setActiveWorkspace('novel')}
            className={`btn-pill flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              activeWorkspace === 'novel'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-xs'
                : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
            }`}
            title="Novel Studio (Ctrl+2) — Manuscript Binder, Chapter Drafting, Prose Telemetry"
          >
            <Feather className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden md:inline">Novel Studio</span>
          </button>
        </div>

        {/* World Codex Views (Only visible in Codex workspace) */}
        {activeWorkspace === 'codex' && (
          <nav className="hidden lg:flex items-center gap-1 bg-zinc-900/80 p-0.5 rounded-lg border border-zinc-800/80">
            {codexNavItems.map((item) => {
              const isActive = activeView === item.view;
              return (
                <button
                  key={item.view}
                  onClick={() => setActiveView(item.view)}
                  className={`btn-pill flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                    isActive
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-xs'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 border border-transparent'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        )}
      </div>

      {/* Right: Theme, DM Mode Toggle, Search, World AI, Dice */}
      <div className="flex items-center gap-2">
        {/* Multi-Theme Selector */}
        <ThemeSelector />

        {/* Search Palette (Ctrl+K) */}
        <button
          onClick={() => setSearchPaletteOpen(true)}
          className="btn-tactile flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-xs text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
          title="Search Vault (Ctrl + K)"
        >
          <Search className="w-3.5 h-3.5 text-zinc-400" />
          <span className="hidden xl:inline text-xs">Search...</span>
          <kbd className="hidden sm:inline px-1 py-0.2 rounded bg-zinc-800 text-[10px] text-zinc-400 border border-zinc-700">
            Ctrl+K
          </kbd>
        </button>

        {/* DM Mode Toggle (Player Mode Filter) */}
        <button
          onClick={togglePlayerMode}
          className={`btn-tactile flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold border transition-all cursor-pointer ${
            isPlayerMode
              ? 'bg-emerald-950/40 border-emerald-600/40 text-emerald-400 hover:bg-emerald-950/60'
              : 'bg-rose-950/40 border-rose-600/40 text-rose-300 hover:bg-rose-950/60'
          }`}
          title={isPlayerMode ? 'Player Mode (Secrets Redacted)' : 'GM Mode (Viewing All Secrets)'}
        >
          {isPlayerMode ? (
            <>
              <GiPadlockOpen className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">Player View</span>
            </>
          ) : (
            <>
              <GiPadlock className="w-4 h-4 text-rose-400" />
              <span className="hidden sm:inline">GM Mode</span>
            </>
          )}
        </button>

        {/* World AI Companion Drawer Button */}
        <button
          onClick={toggleAiDrawer}
          className="btn-tactile flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-300 hover:bg-amber-500/25 transition-all font-medium text-xs cursor-pointer"
          title="Open Worldbuilding AI Companion & Socratic Auditor"
        >
          <GiBrain className="w-4 h-4 text-amber-400" />
          <span className="hidden sm:inline">World AI</span>
        </button>

        {/* Quick Dice Launcher Button */}
        <button
          onClick={toggleDiceDock}
          className="btn-tactile group flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:border-zinc-700 transition-all font-medium text-xs relative cursor-pointer"
          title="Toggle Quick Dice Roller"
        >
          <GiDiceTwentyFacesTwenty className="w-4 h-4 text-amber-400 group-hover:rotate-12 transition-transform duration-200" />
          <span className="hidden sm:inline">Dice</span>
          {diceHistory.length > 0 && (
            <span className="w-2 h-2 rounded-full bg-amber-400 absolute top-1 right-1" />
          )}
        </button>
      </div>
    </header>
  );
};
