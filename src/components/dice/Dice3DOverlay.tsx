import React, { useEffect, useRef, useState } from 'react';
import { Dice3dPhysicsEngine } from '../../lib/dice/dice3dEngine';
import { useLoreStore } from '../../store/useLoreStore';
import { 
  GiDiceTwentyFacesTwenty, 
  GiDiceSixFacesSix, 
  GiSparkles, 
  GiHazardSign 
} from 'react-icons/gi';
import { X } from 'lucide-react';

interface Dice3DOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  pendingRoll?: { sides: number; count: number; label?: string } | null;
}

export const Dice3DOverlay: React.FC<Dice3DOverlayProps> = ({
  isOpen,
  onClose,
  pendingRoll,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Dice3dPhysicsEngine | null>(null);
  const { addDiceRoll, isPlayerMode } = useLoreStore();

  const [settledResult, setSettledResult] = useState<{
    total: number;
    expression: string;
    isCrit: boolean;
    isFumble: boolean;
  } | null>(null);

  // Initialize Three.js engine on mount / open
  useEffect(() => {
    if (!isOpen || !canvasRef.current) return;

    const engine = new Dice3dPhysicsEngine(canvasRef.current);
    engineRef.current = engine;

    const handleResize = () => {
      if (canvasRef.current && engineRef.current) {
        engineRef.current.handleResize(window.innerWidth, window.innerHeight);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('keydown', handleKeyDown);

    // If there's an incoming pending roll, trigger it immediately
    if (pendingRoll) {
      throwDice(pendingRoll.sides, pendingRoll.count, pendingRoll.label);
    } else {
      // Default throw a d20 on open
      throwDice(20, 1, '1d20');
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown);
      engine.destroy();
      engineRef.current = null;
    };
  }, [isOpen]);

  // Throw 3D physical dice with cryptographic results
  const throwDice = (sides: number, count = 1, customLabel?: string) => {
    if (!engineRef.current) return;
    setSettledResult(null);

    const requests: Array<{ sides: number; targetValue: number }> = [];
    const rolls: number[] = [];

    for (let i = 0; i < count; i++) {
      const arr = new Uint32Array(1);
      window.crypto.getRandomValues(arr);
      const val = (arr[0] % sides) + 1;
      rolls.push(val);
      requests.push({ sides, targetValue: val });
    }

    const total = rolls.reduce((a, b) => a + b, 0);
    const isCrit = sides === 20 && count === 1 && total === 20;
    const isFumble = sides === 20 && count === 1 && total === 1;

    engineRef.current.roll(requests, () => {
      const expression = customLabel || `${count}d${sides}`;
      setSettledResult({ total, expression, isCrit, isFumble });

      // Save to store
      addDiceRoll({
        id: `roll-3d-${Date.now()}`,
        expression: `${expression} [3D]`,
        total,
        rolls,
        isCriticalHit: isCrit,
        isFumble,
        isSecret: !isPlayerMode,
        timestamp: new Date().toLocaleTimeString(),
      });
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-between p-6 animate-in fade-in duration-150">
      {/* Top Header & Controls */}
      <div className="w-full max-w-4xl flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-amber-500/20 border border-amber-500/40">
            <GiDiceTwentyFacesTwenty className="w-6 h-6 text-amber-400 animate-spin" style={{ animationDuration: '10s' }} />
          </div>
          <div>
            <h2 className="font-heading font-bold text-lg text-amber-200">
              3D Physical Dice Arena
            </h2>
            <p className="text-xs text-zinc-400">
              Interactive Newtonian physics & cryptographic entropy
            </p>
          </div>
        </div>

        {/* Quick Throw Bar */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => throwDice(20, 1, '1d20')}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold hover:bg-amber-500/30 transition-colors"
          >
            <GiDiceTwentyFacesTwenty className="w-4 h-4" /> 1d20
          </button>
          <button
            onClick={() => throwDice(20, 2, '2d20 (ADV)')}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-950/60 text-emerald-300 border border-emerald-800 text-xs font-bold hover:bg-emerald-950 transition-colors"
          >
            2d20 ADV
          </button>
          <button
            onClick={() => throwDice(6, 4, '4d6')}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-zinc-900 text-zinc-200 border border-zinc-700 text-xs font-bold hover:bg-zinc-800 transition-colors"
          >
            <GiDiceSixFacesSix className="w-4 h-4" /> 4d6
          </button>
          <button
            onClick={() => throwDice(8, 2, '2d8')}
            className="px-3 py-1.5 rounded-lg bg-zinc-900 text-zinc-200 border border-zinc-700 text-xs font-bold hover:bg-zinc-800 transition-colors"
          >
            2d8
          </button>
          <button
            onClick={onClose}
            aria-label="Close 3D Arena"
            className="p-2 rounded-lg bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800 ml-2 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 3D WebGL Canvas Viewport */}
      <canvas 
        ref={canvasRef} 
        className="w-full h-full absolute inset-0 cursor-pointer"
        onClick={() => throwDice(20, 1, '1d20')}
        title="Click arena floor to throw dice!"
      />

      {/* Settle Hero Banner */}
      {settledResult && (
        <div className={`z-10 px-8 py-4 rounded-2xl border shadow-2xl backdrop-blur-md text-center animate-in zoom-in-95 duration-200 ${
          settledResult.isCrit
            ? 'bg-amber-500/20 border-amber-400/80 text-amber-200 ring-4 ring-amber-400/30'
            : settledResult.isFumble
            ? 'bg-rose-950/60 border-rose-600 text-rose-200 ring-4 ring-rose-600/30'
            : 'bg-zinc-950/85 border-zinc-700 text-zinc-100'
        }`}>
          <div className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-400 mb-1">
            {settledResult.expression} Result
          </div>
          <div className="text-5xl font-black font-heading tracking-tight flex items-center justify-center gap-3">
            {settledResult.isCrit && <GiSparkles className="w-8 h-8 text-amber-400 animate-spin" />}
            {settledResult.isFumble && <GiHazardSign className="w-8 h-8 text-rose-500 animate-bounce" />}
            <span>{settledResult.total}</span>
          </div>
          <div className="text-xs font-bold uppercase tracking-widest mt-1">
            {settledResult.isCrit
              ? '✨ NATURAL 20 CRITICAL SUCCESS!'
              : settledResult.isFumble
              ? '💀 NATURAL 1 FUMBLE FAILURE!'
              : 'Dice Settled'}
          </div>
        </div>
      )}

      {/* Bottom Hint */}
      <div className="z-10 text-xs font-mono text-zinc-500 bg-zinc-950/80 px-3 py-1.5 rounded-full border border-zinc-800">
        Click anywhere on the tray to re-throw · Press ESC or Close to return
      </div>
    </div>
  );
};
