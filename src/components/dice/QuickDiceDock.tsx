import React, { useState } from 'react';
import { useLoreStore } from '../../store/useLoreStore';
import type { DiceRollResult } from '../../types/lore';
import { 
  GiDiceTwentyFacesTwenty, 
  GiDiceSixFacesSix, 
  GiSparkles, 
  GiHazardSign, 
  GiPadlock 
} from 'react-icons/gi';
import { X, History, Trash2 } from 'lucide-react';

export const QuickDiceDock: React.FC = () => {
  const { 
    isDiceDockOpen, 
    setDiceDockOpen, 
    set3dDiceOpen,
    diceHistory, 
    addDiceRoll, 
    clearDiceHistory, 
    isPlayerMode 
  } = useLoreStore();

  const [rollMode, setRollMode] = useState<'normal' | 'adv' | 'dis'>('normal');
  const [customFormula, setCustomFormula] = useState('');
  const [latestRoll, setLatestRoll] = useState<DiceRollResult | null>(null);

  // Cryptographically secure integer generator [1, max]
  const cryptoRoll = (max: number): number => {
    const array = new Uint32Array(1);
    window.crypto.getRandomValues(array);
    return (array[0] % max) + 1;
  };

  // Execute die roll
  const rollDie = (sides: number) => {
    let rolls: number[] = [];
    let total = 0;
    let isCriticalHit = false;
    let isFumble = false;

    if (sides === 20 && rollMode !== 'normal') {
      const r1 = cryptoRoll(20);
      const r2 = cryptoRoll(20);
      rolls = [r1, r2];
      total = rollMode === 'adv' ? Math.max(r1, r2) : Math.min(r1, r2);
    } else {
      const r = cryptoRoll(sides);
      rolls = [r];
      total = r;
    }

    if (sides === 20) {
      if (total === 20) isCriticalHit = true;
      if (total === 1) isFumble = true;
    }

    const rollObj: DiceRollResult = {
      id: `roll-${Date.now()}`,
      expression: sides === 20 && rollMode !== 'normal' 
        ? `1d20 (${rollMode.toUpperCase()})` 
        : `1d${sides}`,
      total,
      rolls,
      isCriticalHit,
      isFumble,
      isSecret: !isPlayerMode, // GM secret if in GM mode
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    };

    setLatestRoll(rollObj);
    addDiceRoll(rollObj);
  };

  // Roll custom formula like 2d6+4
  const rollCustomFormula = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customFormula.trim()) return;

    const regex = /^(\d+)?d(\d+)([+-]\d+)?$/i;
    const match = customFormula.trim().match(regex);

    if (!match) {
      alert('Please enter a valid dice notation (e.g. 2d6, 1d20+5, 4d8-2)');
      return;
    }

    const count = parseInt(match[1] || '1', 10);
    const sides = parseInt(match[2], 10);
    const modifier = match[3] ? parseInt(match[3], 10) : 0;

    const rolls: number[] = [];
    for (let i = 0; i < count; i++) {
      rolls.push(cryptoRoll(sides));
    }

    const subTotal = rolls.reduce((acc, val) => acc + val, 0);
    const total = subTotal + modifier;

    const rollObj: DiceRollResult = {
      id: `roll-${Date.now()}`,
      expression: customFormula.trim(),
      total,
      rolls,
      isSecret: !isPlayerMode,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    };

    setLatestRoll(rollObj);
    addDiceRoll(rollObj);
    setCustomFormula('');
  };

  if (!isDiceDockOpen) return null;

  return (
    <aside className="fixed bottom-4 right-4 z-40 w-80 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl shadow-black p-4 flex flex-col gap-3 animate-in slide-in-from-bottom-6 duration-200">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
        <div className="flex items-center gap-2">
          <GiDiceTwentyFacesTwenty className="w-5 h-5 text-amber-400" />
          <span className="font-heading font-semibold text-sm text-zinc-100">
            Virtual Dice Dock
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => set3dDiceOpen(true)}
            className="btn-tactile px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[11px] font-bold hover:bg-amber-500/25 transition-colors flex items-center gap-1 cursor-pointer"
            title="Launch 3D Physical Dice Arena"
          >
            <span>3D Arena</span>
          </button>
          <button 
            onClick={() => setDiceDockOpen(false)}
            className="btn-icon text-zinc-500 hover:text-zinc-300 p-1 rounded hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Latest Roll Hero Display */}
      {latestRoll && (
        <div className={`p-3 rounded-lg border text-center transition-all ${
          latestRoll.isCriticalHit 
            ? 'bg-amber-500/20 border-amber-500/50 text-amber-200 ring-2 ring-amber-400/30' 
            : latestRoll.isFumble
            ? 'bg-rose-950/40 border-rose-600/50 text-rose-200 ring-2 ring-rose-500/30 animate-pulse'
            : 'bg-zinc-950 border-zinc-800 text-zinc-100'
        }`}>
          <div className="text-[11px] font-mono text-zinc-400 flex items-center justify-center gap-1.5">
            <span>{latestRoll.expression}</span>
            {latestRoll.rolls.length > 1 && (
              <span>[{latestRoll.rolls.join(', ')}]</span>
            )}
            {latestRoll.isSecret && (
              <span className="text-[10px] text-rose-400 flex items-center gap-0.5">
                <GiPadlock className="w-3 h-3" /> Secret
              </span>
            )}
          </div>
          
          <div className="text-3xl font-extrabold font-heading my-1 flex items-center justify-center gap-2">
            {latestRoll.isCriticalHit && <GiSparkles className="w-5 h-5 text-amber-400 animate-spin" />}
            {latestRoll.isFumble && <GiHazardSign className="w-5 h-5 text-rose-500 animate-bounce" />}
            <span>{latestRoll.total}</span>
          </div>

          <div className="text-[11px] font-semibold tracking-wider uppercase">
            {latestRoll.isCriticalHit ? '✨ NATURAL 20 CRITICAL!' : latestRoll.isFumble ? '💀 NATURAL 1 FUMBLE!' : 'Roll Complete'}
          </div>
        </div>
      )}

      {/* Advantage / Disadvantage Selector */}
      <div className="grid grid-cols-3 gap-1 bg-zinc-950 p-1 rounded-lg border border-zinc-800 text-xs">
        <button
          onClick={() => setRollMode('normal')}
          className={`btn-pill py-1 rounded font-medium transition-colors cursor-pointer ${
            rollMode === 'normal' ? 'bg-zinc-800 text-zinc-200' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          Normal
        </button>
        <button
          onClick={() => setRollMode('adv')}
          className={`btn-pill py-1 rounded font-medium transition-colors cursor-pointer ${
            rollMode === 'adv' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          ADV (kh1)
        </button>
        <button
          onClick={() => setRollMode('dis')}
          className={`btn-pill py-1 rounded font-medium transition-colors cursor-pointer ${
            rollMode === 'dis' ? 'bg-rose-950 text-rose-300 border border-rose-800' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          DIS (kl1)
        </button>
      </div>

      {/* 1-Click Dice Buttons */}
      <div className="grid grid-cols-4 gap-1.5">
        {[4, 6, 8, 10, 12, 20, 100].map((sides) => (
          <button
            key={sides}
            onClick={() => rollDie(sides)}
            className={`btn-tactile py-2 px-1 rounded-md text-xs font-bold font-mono border transition-all cursor-pointer flex flex-col items-center gap-0.5 ${
              sides === 20
                ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 hover:bg-amber-500/25 col-span-2'
                : 'bg-zinc-800/80 border-zinc-700/60 text-zinc-200 hover:bg-zinc-700'
            }`}
          >
            {sides === 6 ? <GiDiceSixFacesSix className="w-3.5 h-3.5" /> : null}
            <span>d{sides}</span>
          </button>
        ))}
      </div>

      {/* Custom Formula Input */}
      <form onSubmit={rollCustomFormula} className="flex gap-1.5">
        <input
          type="text"
          value={customFormula}
          onChange={(e) => setCustomFormula(e.target.value)}
          placeholder="e.g. 2d6+4"
          className="flex-1 bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1 text-xs text-zinc-200 font-mono placeholder-zinc-600 focus:outline-none focus:border-amber-500"
        />
        <button
          type="submit"
          className="btn-tactile px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded text-xs font-semibold hover:bg-amber-500/30 transition-colors cursor-pointer"
        >
          Roll
        </button>
      </form>

      {/* Roll History Accordion / Log */}
      {diceHistory.length > 0 && (
        <div className="border-t border-zinc-800/80 pt-2 flex flex-col gap-1 max-h-32 overflow-y-auto">
          <div className="flex items-center justify-between text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
            <span className="flex items-center gap-1">
              <History className="w-3 h-3" /> Recent Rolls
            </span>
            <button onClick={clearDiceHistory} className="btn-icon hover:text-rose-400 cursor-pointer">
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
          {diceHistory.slice(0, 5).map((roll) => (
            <div key={roll.id} className="flex items-center justify-between text-xs py-0.5 px-1 rounded bg-zinc-950/60 text-zinc-400 font-mono">
              <span>{roll.expression}</span>
              <span className="font-bold text-zinc-200">{roll.total}</span>
            </div>
          ))}
        </div>
      )}
    </aside>
  );
};
