import React, { useState } from 'react';
import { useLoreStore } from '../../store/useLoreStore';
import type { Statblock } from '../../types/lore';
import { 
  GiDragonHead, 
  GiShield, 
  GiHeartPlus, 
  GiDiceTwentyFacesTwenty,
  GiPadlock,
  GiMonsterGrasp,
  GiTrashCan
} from 'react-icons/gi';
import { Download, Plus } from 'lucide-react';

export const BestiaryView: React.FC = () => {
  const { 
    statblocks, 
    articles,
    activeWorldId, 
    isPlayerMode, 
    addDiceRoll, 
    setDiceDockOpen, 
    set3dDiceOpen,
    addStatblock, 
    deleteStatblock 
  } = useLoreStore();

  const [selectedStatblockId, setSelectedStatblockId] = useState<string>(statblocks[0]?.id || '');

  const visibleStatblocks = isPlayerMode ? statblocks.filter((sb) => !sb.isSecret) : statblocks;
  const currentStatblock = visibleStatblocks.find((sb) => sb.id === selectedStatblockId) || visibleStatblocks[0];

  const getAbilityMod = (score: number) => {
    const mod = Math.floor((score - 10) / 2);
    return mod >= 0 ? `+${mod}` : `${mod}`;
  };

  const handleRollAction = (actionName: string, attackBonus: number, formula?: string) => {
    const array = new Uint32Array(1);
    window.crypto.getRandomValues(array);
    const d20 = (array[0] % 20) + 1;
    const total = d20 + attackBonus;

    addDiceRoll({
      id: `roll-${Date.now()}`,
      expression: `${actionName} (${formula || `1d20+${attackBonus}`})`,
      total,
      rolls: [d20],
      isCriticalHit: d20 === 20,
      isFumble: d20 === 1,
      isSecret: currentStatblock?.isSecret || false,
      timestamp: new Date().toLocaleTimeString(),
    });

    setDiceDockOpen(true);
  };

  const handleExportFoundry = () => {
    if (!currentStatblock) return;

    const foundryActor = {
      name: currentStatblock.name,
      type: "npc",
      system: {
        attributes: {
          hp: { value: currentStatblock.hp, max: currentStatblock.hp },
          ac: { value: currentStatblock.ac },
          speed: { value: currentStatblock.speed }
        },
        details: { 
          cr: currentStatblock.cr, 
          alignment: currentStatblock.alignment 
        },
        abilities: {
          str: { value: currentStatblock.abilities.str, mod: Math.floor((currentStatblock.abilities.str - 10) / 2) },
          dex: { value: currentStatblock.abilities.dex, mod: Math.floor((currentStatblock.abilities.dex - 10) / 2) },
          con: { value: currentStatblock.abilities.con, mod: Math.floor((currentStatblock.abilities.con - 10) / 2) },
          int: { value: currentStatblock.abilities.int, mod: Math.floor((currentStatblock.abilities.int - 10) / 2) },
          wis: { value: currentStatblock.abilities.wis, mod: Math.floor((currentStatblock.abilities.wis - 10) / 2) },
          cha: { value: currentStatblock.abilities.cha, mod: Math.floor((currentStatblock.abilities.cha - 10) / 2) }
        }
      },
      items: currentStatblock.actions.map((act) => ({
        name: act.name,
        type: 'weapon',
        system: { description: { value: act.desc } }
      }))
    };

    const blob = new Blob([JSON.stringify(foundryActor, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentStatblock.name.toLowerCase().replace(/\s+/g, '-')}-foundry.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCreateNewCreature = () => {
    const newSb: Statblock = {
      id: `stat-${Date.now()}`,
      worldId: activeWorldId,
      system: 'dnd5e',
      name: 'Shadow Wraith',
      size: 'Medium',
      creatureType: 'Undead',
      alignment: 'Chaotic Evil',
      cr: '5',
      ac: 15,
      acType: 'incorporeal armor',
      hp: 75,
      hpFormula: '10d8 + 30',
      speed: 'fly 50 ft. (hover)',
      abilities: { str: 6, dex: 18, con: 16, int: 12, wis: 14, cha: 16 },
      actions: [
        {
          id: 'act-sw-1',
          name: 'Life Drain',
          desc: 'Melee Weapon Attack: +7 to hit, reach 5 ft., one creature. Hit: 21 (4d8 + 3) necrotic damage.',
          attackBonus: 7,
          formula: '1d20+7',
        },
      ],
      isSecret: false,
    };
    addStatblock(newSb);
    setSelectedStatblockId(newSb.id);
  };

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Left Sidebar: Bestiary Roster */}
      <aside className="w-72 border-r border-zinc-800 bg-zinc-950 flex flex-col z-10">
        <div className="p-3 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GiMonsterGrasp className="w-5 h-5 text-amber-400" />
            <span className="font-heading font-semibold text-sm text-zinc-200">
              Bestiary Roster
            </span>
          </div>
          <button
            onClick={handleCreateNewCreature}
            className="btn-tactile flex items-center gap-1 px-2 py-1 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold hover:bg-amber-500/20 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New</span>
          </button>
        </div>

        {/* Monster Card List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {visibleStatblocks.map((sb) => {
            const isSelected = sb.id === currentStatblock?.id;
            return (
              <button
                key={sb.id}
                onClick={() => setSelectedStatblockId(sb.id)}
                className={`binder-item w-full text-left p-2.5 rounded-lg transition-all flex items-start gap-2.5 cursor-pointer ${
                  isSelected
                    ? 'bg-amber-500/15 border border-amber-500/30 text-zinc-100 shadow-sm'
                    : 'hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-transparent'
                }`}
              >
                {(() => {
                  const linkedArt = articles.find((a) => a.id === sb.articleId || a.title.toLowerCase() === sb.name.toLowerCase());
                  const thumb = (sb as any).imageUrl || linkedArt?.coverImageUrl;
                  if (thumb) {
                    return (
                      <div className="mt-0.5 w-7 h-7 rounded overflow-hidden bg-zinc-900 border border-amber-500/30 flex-shrink-0">
                        <img src={thumb} alt={sb.name} className="w-full h-full object-cover" />
                      </div>
                    );
                  }
                  return (
                    <div className="mt-0.5 p-1 rounded bg-zinc-900 border border-zinc-800 flex-shrink-0">
                      <GiDragonHead className="w-4 h-4 text-amber-400" />
                    </div>
                  );
                })()}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-xs truncate">
                      {sb.name}
                    </span>
                    <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-500/10 px-1 rounded">
                      CR {sb.cr}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <span className="text-[10px] text-zinc-500 truncate">
                      {sb.size} {sb.creatureType}
                    </span>
                    {sb.isSecret && (
                      <GiPadlock className="w-3 h-3 text-rose-400" title="GM Secret" />
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      {/* Main Center Statblock Surface */}
      <main className="flex-1 overflow-y-auto bg-zinc-900/40 p-6 flex justify-center items-start">
        {currentStatblock ? (
          <div className="w-full max-w-2xl bg-[#fdfbf7] dark:bg-zinc-900 border-2 border-amber-800/60 dark:border-amber-700/50 rounded-xl p-6 shadow-2xl text-zinc-900 dark:text-zinc-100 flex flex-col gap-4 font-serif relative">
            {/* Creature Artwork Banner */}
            {(() => {
              const linkedArt = articles.find((a) => a.id === currentStatblock.articleId || a.title.toLowerCase() === currentStatblock.name.toLowerCase());
              const banner = (currentStatblock as any).imageUrl || linkedArt?.coverImageUrl;
              if (!banner) return null;
              return (
                <div className="relative w-full h-44 rounded-lg overflow-hidden border border-amber-900/40 dark:border-amber-700/40 bg-zinc-950 flex-shrink-0 shadow-md">
                  <img src={banner} alt={currentStatblock.name} className="w-full h-full object-cover object-center" />
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/90 via-transparent to-transparent pointer-events-none" />
                </div>
              );
            })()}

            {/* Top Header */}
            <div className="border-b-2 border-amber-900/60 pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold font-heading text-amber-900 dark:text-amber-400">
                    {currentStatblock.name}
                  </h1>
                  {currentStatblock.isSecret && (
                    <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-rose-950 border border-rose-800 text-rose-300 font-sans font-bold">
                      <GiPadlock className="w-3 h-3" /> GM Secret
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleExportFoundry}
                    className="btn-tactile flex items-center gap-1.5 px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-xs font-sans transition-colors cursor-pointer"
                    title="Export Foundry VTT Actor JSON"
                  >
                    <Download className="w-4 h-4 text-amber-400" />
                    <span>Foundry VTT</span>
                  </button>

                  <button
                    onClick={() => {
                      if (confirm(`Delete statblock for ${currentStatblock.name}?`)) {
                        deleteStatblock(currentStatblock.id);
                      }
                    }}
                    className="btn-icon p-1 rounded text-zinc-500 hover:text-rose-400 cursor-pointer"
                    title="Delete Statblock"
                  >
                    <GiTrashCan className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="text-xs italic text-zinc-600 dark:text-zinc-400 font-sans mt-0.5">
                {currentStatblock.size} {currentStatblock.creatureType}, {currentStatblock.alignment} · D&D 5e Standard
              </div>
            </div>

            {/* Vitals Bar */}
            <div className="grid grid-cols-3 gap-2 text-xs font-sans border-b border-amber-900/40 pb-3">
              <div className="flex items-center gap-2">
                <GiShield className="w-5 h-5 text-amber-600" />
                <div>
                  <div className="font-bold">Armor Class</div>
                  <div className="text-zinc-600 dark:text-zinc-400">{currentStatblock.ac} ({currentStatblock.acType})</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <GiHeartPlus className="w-5 h-5 text-rose-600" />
                <div>
                  <div className="font-bold">Hit Points</div>
                  <div className="text-zinc-600 dark:text-zinc-400">{currentStatblock.hp} ({currentStatblock.hpFormula})</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <GiDragonHead className="w-5 h-5 text-blue-600" />
                <div>
                  <div className="font-bold">Speed</div>
                  <div className="text-zinc-600 dark:text-zinc-400">{currentStatblock.speed}</div>
                </div>
              </div>
            </div>

            {/* Ability Scores */}
            <div className="grid grid-cols-6 gap-1 bg-amber-950/10 dark:bg-zinc-950 p-2 rounded-lg border border-amber-900/30 text-center font-sans">
              {[
                { name: 'STR', score: currentStatblock.abilities.str },
                { name: 'DEX', score: currentStatblock.abilities.dex },
                { name: 'CON', score: currentStatblock.abilities.con },
                { name: 'INT', score: currentStatblock.abilities.int },
                { name: 'WIS', score: currentStatblock.abilities.wis },
                { name: 'CHA', score: currentStatblock.abilities.cha },
              ].map((stat) => (
                <div key={stat.name} className="flex flex-col">
                  <span className="text-[10px] font-bold text-zinc-500">{stat.name}</span>
                  <span className="text-sm font-bold">{stat.score}</span>
                  <span className="text-xs text-amber-600 dark:text-amber-400 font-semibold">
                    {getAbilityMod(stat.score)}
                  </span>
                </div>
              ))}
            </div>

            {/* Challenge Rating Bar */}
            <div className="text-xs font-sans flex items-center justify-between border-b border-amber-900/30 pb-2">
              <span className="font-semibold text-zinc-600 dark:text-zinc-400">
                Challenge Rating: <strong className="text-amber-500">{currentStatblock.cr}</strong>
              </span>
              <span className="text-zinc-500 font-mono">Proficiency Bonus: +{Math.max(2, Math.floor((parseInt(currentStatblock.cr) || 1) / 4) + 2)}</span>
            </div>

            {/* Actions & Interactive Attack Triggers */}
            <div className="flex flex-col gap-2 font-sans text-xs">
              <div className="font-bold text-sm uppercase tracking-wider text-amber-900 dark:text-amber-400 border-b border-amber-900/30 pb-1">
                Actions
              </div>
              
              {currentStatblock.actions.map((act) => (
                <div key={act.id} className="flex items-center justify-between p-2.5 rounded bg-zinc-950/40 border border-zinc-800">
                  <div className="flex-1 pr-2">
                    <span className="font-bold font-serif text-sm">{act.name}.</span>{' '}
                    <span className="text-zinc-400">{act.desc}</span>
                  </div>
                  {act.attackBonus !== undefined && act.attackBonus > 0 && (
                    <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                      <button
                        onClick={() => handleRollAction(act.name, act.attackBonus || 0, act.formula)}
                        className="btn-tactile flex items-center gap-1.5 px-3 py-1.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-semibold text-xs transition-colors cursor-pointer"
                      >
                        <GiDiceTwentyFacesTwenty className="w-3.5 h-3.5" />
                        <span>Roll +{act.attackBonus}</span>
                      </button>
                      <button
                        onClick={() => set3dDiceOpen(true)}
                        title="Throw in 3D Physical Arena"
                        className="btn-tactile flex items-center gap-1 px-2.5 py-1.5 rounded bg-zinc-900 hover:bg-zinc-800 text-amber-400 border border-zinc-700 font-semibold text-xs transition-colors cursor-pointer"
                      >
                        <GiDiceTwentyFacesTwenty className="w-3.5 h-3.5" />
                        <span>3D</span>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center text-zinc-500 mt-20">
            No statblocks visible. Toggle off Player Mode or add a new creature.
          </div>
        )}
      </main>
    </div>
  );
};
