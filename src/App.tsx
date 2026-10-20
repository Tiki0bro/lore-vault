import React from 'react';
import { useLoreStore } from './store/useLoreStore';
import { Navbar } from './components/layout/Navbar';
import { SearchPalette } from './components/layout/SearchPalette';
import { QuickDiceDock } from './components/dice/QuickDiceDock';
import { AiCompanionDrawer } from './components/ai/AiCompanionDrawer';
import { Dice3DOverlay } from './components/dice/Dice3DOverlay';
import { WorldImporterModal } from './components/modals/WorldImporterModal';
import { NovelStudioView } from './components/novel/NovelStudioView';
import { ManuscriptView } from './components/views/ManuscriptView';
import { AtlasView } from './components/views/AtlasView';
import { KnowledgeCanvasView } from './components/views/KnowledgeCanvasView';
import { BestiaryView } from './components/views/BestiaryView';
import { TimelineView } from './components/views/TimelineView';

export const App: React.FC = () => {
  const { 
    activeWorkspace,
    activeView, 
    isAiDrawerOpen, 
    setAiDrawerOpen,
    is3dDiceOpen,
    set3dDiceOpen,
    isWorldImporterOpen,
    setWorldImporterOpen,
  } = useLoreStore();

  const renderActiveView = () => {
    switch (activeView) {
      case 'manuscript':
        return <ManuscriptView />;
      case 'atlas':
        return <AtlasView />;
      case 'canvas':
        return <KnowledgeCanvasView />;
      case 'bestiary':
        return <BestiaryView />;
      case 'timeline':
        return <TimelineView />;
      default:
        return <ManuscriptView />;
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-zinc-950 text-zinc-100 relative">
      {/* Subtle Atmospheric Ambient Radial Glow */}
      <div 
        className="pointer-events-none fixed inset-0 z-0 opacity-50" 
        style={{ background: 'radial-gradient(ellipse 80% 50% at 50% -10%, var(--theme-ambient-glow, transparent), transparent 75%)' }}
      />

      {/* Top Navigation */}
      <Navbar />

      {/* Main View Area: Dual Workspace (World Codex vs. Novel Studio) */}
      <div className="flex-1 flex overflow-hidden">
        {activeWorkspace === 'novel' ? <NovelStudioView /> : renderActiveView()}
      </div>

      {/* Global Modals & Overlays */}
      <SearchPalette />
      <QuickDiceDock />
      <Dice3DOverlay isOpen={is3dDiceOpen} onClose={() => set3dDiceOpen(false)} />
      <AiCompanionDrawer isOpen={isAiDrawerOpen} onClose={() => setAiDrawerOpen(false)} />
      <WorldImporterModal isOpen={isWorldImporterOpen} onClose={() => setWorldImporterOpen(false)} />
    </div>
  );
};

export default App;
