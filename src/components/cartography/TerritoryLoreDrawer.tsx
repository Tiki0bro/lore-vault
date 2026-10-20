import React, { useState, useMemo } from 'react';
import { useLoreStore } from '../../store/useLoreStore';
import type { TerritoryPolygon, MapPin, Article, Statblock, DiceRollResult } from '../../types/lore';
import {
  X,
  Shield,
  Crown,
  BookOpen,
  Sword,
  MapPin as MapPinIcon,
  Dices,
  PenTool,
  Edit3,
  Check,
  ExternalLink
} from 'lucide-react';
import {
  GiCastle,
  GiCaveEntrance,
  GiObelisk,
  GiBeerStein,
  GiDragonHead,
  GiPadlock,
  GiScrollUnfurled
} from 'react-icons/gi';

interface TerritoryLoreDrawerProps {
  territory: TerritoryPolygon | null;
  onClose: () => void;
}

// Point-in-polygon raycasting algorithm for normalized % coordinates
function isPointInsidePolygon(
  pt: { xPct: number; yPct: number },
  poly: Array<{ xPct: number; yPct: number }>
): boolean {
  if (!poly || poly.length < 3) return false;
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].xPct;
    const yi = poly[i].yPct;
    const xj = poly[j].xPct;
    const yj = poly[j].yPct;
    const intersect =
      yi > pt.yPct !== yj > pt.yPct &&
      pt.xPct < ((xj - xi) * (pt.yPct - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export const TerritoryLoreDrawer: React.FC<TerritoryLoreDrawerProps> = ({
  territory,
  onClose,
}) => {
  const {
    articles,
    mapPins,
    statblocks,
    isPlayerMode,
    setSelectedArticleId,
    setActiveView,
    setActiveWorkspace,
    addDiceRoll,
    set3dDiceOpen,
    updateTerritory,
    addChapter,
    novelChapters
  } = useLoreStore();

  const [activeTab, setActiveTab] = useState<'lore' | 'ruler' | 'landmarks' | 'encounters'>('lore');
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editFaction, setEditFaction] = useState('');
  const [editRuler, setEditRuler] = useState('');
  const [editControl, setEditControl] = useState(50);
  const [editThreat, setEditThreat] = useState<'Low' | 'Medium' | 'High' | 'Forbidden'>('Medium');
  const [editNotes, setEditNotes] = useState('');

  // Regional encounter roll result
  const [encounterResult, setEncounterResult] = useState<{
    roll: number;
    title: string;
    description: string;
    threat: string;
  } | null>(null);

  // Initialize edit fields when territory changes
  React.useEffect(() => {
    if (territory) {
      setEditName(territory.name);
      setEditFaction(territory.factionName);
      setEditRuler(territory.ruler || '');
      setEditControl(territory.controlPct);
      setEditThreat(territory.threatLevel);
      setEditNotes(territory.notes || '');
      setEncounterResult(null);
      setIsEditing(false);
    }
  }, [territory]);

  // Find linked articles
  const linkedArticle: Article | undefined = useMemo(() => {
    if (!territory) return undefined;
    if (territory.articleId) {
      const found = articles.find((a) => a.id === territory.articleId);
      if (found) return found;
    }
    // Fallback: search by title
    return articles.find(
      (a) =>
        a.title.toLowerCase().includes(territory.factionName.toLowerCase()) ||
        a.title.toLowerCase().includes(territory.name.toLowerCase())
    );
  }, [territory, articles]);

  // Find ruler article
  const rulerArticle: Article | undefined = useMemo(() => {
    if (!territory || !territory.ruler) return undefined;
    if (territory.rulerArticleId) {
      const found = articles.find((a) => a.id === territory.rulerArticleId);
      if (found) return found;
    }
    return articles.find(
      (a) =>
        a.category === 'Character' &&
        a.title.toLowerCase().includes(territory.ruler!.toLowerCase())
    );
  }, [territory, articles]);

  // Find enclosed or associated landmarks (map pins)
  const enclosedPins: MapPin[] = useMemo(() => {
    if (!territory) return [];
    return mapPins
      .filter((pin) => !isPlayerMode || !pin.isSecret)
      .filter((pin) => {
        // Geometrical enclosure
        const isEnclosed = isPointInsidePolygon(pin, territory.points);
        // Explicit article linking
        const isLinkedByArticle =
          Boolean(territory.articleId && pin.articleId === territory.articleId) ||
          Boolean(territory.associatedArticleIds?.includes(pin.articleId || ''));
        return isEnclosed || isLinkedByArticle;
      });
  }, [territory, mapPins, isPlayerMode]);

  // Find regional monsters / statblocks
  const regionalStatblocks: Statblock[] = useMemo(() => {
    if (!territory) return [];
    return statblocks
      .filter((sb) => !isPlayerMode || !sb.isSecret)
      .filter((sb) => {
        if (territory.articleId && sb.articleId === territory.articleId) return true;
        if (sb.name.toLowerCase().includes(territory.factionName.toLowerCase())) return true;
        if (territory.threatLevel === 'High' && sb.cr && Number(sb.cr) >= 3) return true;
        if (territory.threatLevel === 'Forbidden' && sb.cr && Number(sb.cr) >= 5) return true;
        return false;
      });
  }, [territory, statblocks, isPlayerMode]);

  if (!territory) return null;

  // Actions
  const handleOpenInCodex = (articleId?: string) => {
    if (!articleId) return;
    setSelectedArticleId(articleId);
    setActiveView('manuscript');
    onClose();
  };

  const handleDraftSceneInTerritory = () => {
    const defaultTitle = `Scene: Confrontation in ${territory.name}`;
    const chapterNumber = novelChapters.length + 1;
    addChapter({
      id: `chap-${Date.now()}`,
      actId: 'act-1',
      bookId: 'book-1',
      chapterNumber,
      title: defaultTitle,
      targetWordCount: 2000,
      currentWordCount: 0,
      status: 'draft',
      summary: `Set within the borders of ${territory.name}, controlled by ${territory.factionName}.`,
      content: `<h2>${defaultTitle}</h2><p>The wind carries the scent of ozone and ancient stone across <strong>${territory.name}</strong>. Here under the watchful gaze of ${territory.ruler || territory.factionName}, secrets stir in the twilight shadows...</p>`,
    });
    setActiveWorkspace('novel');
    onClose();
  };

  const handleRollAttack = (statblock: Statblock, actionName: string, formula: string = '1d20') => {
    const diceMatch = formula.match(/(\d+)?d(\d+)([\+\-]\d+)?/i);
    const count = diceMatch && diceMatch[1] ? parseInt(diceMatch[1], 10) : 1;
    const sides = diceMatch && diceMatch[2] ? parseInt(diceMatch[2], 10) : 20;
    const mod = diceMatch && diceMatch[3] ? parseInt(diceMatch[3], 10) : 0;

    const rolls: number[] = [];
    for (let i = 0; i < count; i++) {
      rolls.push(Math.floor(Math.random() * sides) + 1);
    }
    const sum = rolls.reduce((a, b) => a + b, 0);
    const total = sum + mod;
    const isCrit = count === 1 && sides === 20 && rolls[0] === 20;
    const isFumble = count === 1 && sides === 20 && rolls[0] === 1;

    const rollResult: DiceRollResult = {
      id: `roll-${Date.now()}`,
      expression: `${statblock.name}: ${actionName} (${formula})`,
      total,
      rolls,
      isCriticalHit: isCrit,
      isFumble,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    };

    addDiceRoll(rollResult);
    set3dDiceOpen(true);
  };

  const handleRollEncounter = () => {
    const roll = Math.floor(Math.random() * 20) + 1;
    let title = '';
    let description = '';

    if (territory.threatLevel === 'Forbidden') {
      if (roll <= 5) {
        title = 'The Perpetual Silence';
        description = 'An eerie supernatural calm settles over the valley. All magic detection triggers intense ringing.';
      } else if (roll <= 14) {
        title = 'Order Sentinel Ambush';
        description = 'Two veiled monks from the Order emerge from stone alcoves demanding submission.';
      } else {
        title = 'Awakening of the Astral Devourer';
        description = 'The obsidian campanile vibrates with cosmic energy. A Harbinger approaches!';
      }
    } else if (territory.threatLevel === 'High') {
      if (roll <= 6) {
        title = 'Sunstone Patrol Detachment';
        description = 'A squad of 4 Silver Dawn inquisitors halts the party for celestial corruption screening.';
      } else if (roll <= 15) {
        title = 'Rogue Spell-Weaver Hermit';
        description = 'A fugitive celestial scholar offers forbidden astral lore in exchange for safe passage.';
      } else {
        title = 'Inquisitor Vanguard Retribution';
        description = 'A heavily armed vanguard led by an officer initiates an aggressive interrogation.';
      }
    } else {
      if (roll <= 8) {
        title = 'Wandering Pilgrim Caravan';
        description = 'Nomadic merchants traveling between trade towns offer supplies and regional rumors.';
      } else if (roll <= 16) {
        title = 'Restless Mire Spirits';
        description = 'Will-o-wisps flicker above ancient submerged monoliths, beckoning into dangerous bogs.';
      } else {
        title = 'Starfall Monolith Discovery';
        description = 'The party uncovers a glowing crater containing pristine radiant celestial shards.';
      }
    }

    const enc = {
      roll,
      title,
      description,
      threat: territory.threatLevel,
    };
    setEncounterResult(enc);

    // Also register dice roll in store history
    addDiceRoll({
      id: `enc-${Date.now()}`,
      expression: `Encounter d20 in ${territory.name}`,
      total: roll,
      rolls: [roll],
      isCriticalHit: roll === 20,
      isFumble: roll === 1,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    });
  };

  const handleSaveEdits = (e: React.FormEvent) => {
    e.preventDefault();
    updateTerritory(territory.id, {
      name: editName.trim() || territory.name,
      factionName: editFaction.trim() || territory.factionName,
      ruler: editRuler.trim(),
      controlPct: editControl,
      threatLevel: editThreat,
      notes: editNotes.trim(),
    });
    setIsEditing(false);
  };

  const getPinIcon = (cat: string) => {
    switch (cat.toLowerCase()) {
      case 'settlement':
        return <GiCastle className="w-3.5 h-3.5 text-amber-400" />;
      case 'dungeon':
        return <GiCaveEntrance className="w-3.5 h-3.5 text-purple-400" />;
      case 'monolith':
        return <GiObelisk className="w-3.5 h-3.5 text-cyan-400" />;
      case 'tavern':
        return <GiBeerStein className="w-3.5 h-3.5 text-emerald-400" />;
      default:
        return <GiDragonHead className="w-3.5 h-3.5 text-rose-400" />;
    }
  };

  const getThreatBadge = (level: string) => {
    switch (level) {
      case 'Forbidden':
        return 'bg-purple-950/80 text-purple-300 border-purple-800';
      case 'High':
        return 'bg-rose-950/80 text-rose-300 border-rose-800';
      case 'Medium':
        return 'bg-amber-950/80 text-amber-300 border-amber-800';
      default:
        return 'bg-emerald-950/80 text-emerald-300 border-emerald-800';
    }
  };

  return (
    <div className="absolute top-0 right-0 bottom-0 z-40 w-full sm:w-[450px] bg-zinc-950/95 border-l border-zinc-800 shadow-2xl backdrop-blur-md flex flex-col animate-in slide-in-from-right duration-250 select-text">
      {/* Top Territory Sovereign Banner Strip */}
      <div
        className="h-2 w-full flex-shrink-0"
        style={{ backgroundColor: territory.color }}
      />

      {/* Drawer Header */}
      <div className="p-4 border-b border-zinc-800/80 flex items-start justify-between gap-3 bg-zinc-900/60 flex-shrink-0">
        <div className="flex items-start gap-3 min-w-0">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border shadow-md"
            style={{
              backgroundColor: `${territory.color}20`,
              borderColor: territory.color,
            }}
          >
            <Shield className="w-5 h-5" style={{ color: territory.color }} />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${getThreatBadge(
                  territory.threatLevel
                )}`}
              >
                {territory.threatLevel} Threat
              </span>
              <span className="text-[10px] font-mono text-zinc-400">
                {territory.controlPct}% Faction Hold
              </span>
              {territory.isSecret && (
                <span className="text-[10px] font-bold text-rose-400 bg-rose-950/60 border border-rose-800/60 px-1.5 py-0.5 rounded flex items-center gap-1">
                  <GiPadlock className="w-2.5 h-2.5" /> GM Secret
                </span>
              )}
            </div>

            <h3 className="font-heading font-bold text-lg text-zinc-100 tracking-wide truncate mt-1">
              {territory.name}
            </h3>

            <p className="text-xs text-zinc-400 flex items-center gap-1.5 truncate">
              <span className="text-amber-400 font-medium">{territory.factionName}</span>
              {territory.ruler && (
                <>
                  <span className="text-zinc-600">·</span>
                  <span className="text-zinc-300 flex items-center gap-1">
                    <Crown className="w-3 h-3 text-amber-500" />
                    {territory.ruler}
                  </span>
                </>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
            title="Edit Territory Intel"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
            title="Close Territory Intel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Control Gauge Bar */}
      <div className="px-4 py-2 bg-zinc-900/30 border-b border-zinc-800/60 flex items-center justify-between gap-4 text-xs">
        <span className="text-[11px] text-zinc-400">Territorial Sovereignty:</span>
        <div className="flex-1 max-w-[200px] h-2 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${territory.controlPct}%`,
              backgroundColor: territory.color,
            }}
          />
        </div>
        <span className="font-mono text-zinc-300 font-bold text-[11px]">
          {territory.controlPct}%
        </span>
      </div>

      {/* Navigation Tab Bar */}
      <div className="flex border-b border-zinc-800 bg-zinc-950 px-2 flex-shrink-0">
        <button
          onClick={() => setActiveTab('lore')}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'lore'
              ? 'border-amber-400 text-amber-300'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Codex Lore</span>
        </button>

        <button
          onClick={() => setActiveTab('ruler')}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'ruler'
              ? 'border-amber-400 text-amber-300'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Crown className="w-3.5 h-3.5" />
          <span>Ruler & Bestiary</span>
        </button>

        <button
          onClick={() => setActiveTab('landmarks')}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'landmarks'
              ? 'border-amber-400 text-amber-300'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <MapPinIcon className="w-3.5 h-3.5" />
          <span>Landmarks ({enclosedPins.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('encounters')}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'encounters'
              ? 'border-amber-400 text-amber-300'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Dices className="w-3.5 h-3.5" />
          <span>Encounters</span>
        </button>
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Quick Edit Panel Form */}
        {isEditing && (
          <form
            onSubmit={handleSaveEdits}
            className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl space-y-3 mb-2 animate-in fade-in"
          >
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <span className="font-heading font-bold text-xs text-amber-400">
                Edit Territory Intel
              </span>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="text-zinc-500 hover:text-zinc-300 text-xs"
              >
                Cancel
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="text-zinc-400 block mb-0.5">Territory Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-2 py-1 bg-zinc-950 border border-zinc-800 rounded text-zinc-200 text-xs"
                />
              </div>
              <div>
                <label className="text-zinc-400 block mb-0.5">Ruling Faction</label>
                <input
                  type="text"
                  value={editFaction}
                  onChange={(e) => setEditFaction(e.target.value)}
                  className="w-full px-2 py-1 bg-zinc-950 border border-zinc-800 rounded text-zinc-200 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="text-zinc-400 block mb-0.5">Ruler / Commander</label>
                <input
                  type="text"
                  value={editRuler}
                  onChange={(e) => setEditRuler(e.target.value)}
                  className="w-full px-2 py-1 bg-zinc-950 border border-zinc-800 rounded text-zinc-200 text-xs"
                />
              </div>
              <div>
                <label className="text-zinc-400 block mb-0.5">Threat Level</label>
                <select
                  value={editThreat}
                  onChange={(e) => setEditThreat(e.target.value as any)}
                  className="w-full px-2 py-1 bg-zinc-950 border border-zinc-800 rounded text-zinc-200 text-xs"
                >
                  <option value="Low">Low Threat</option>
                  <option value="Medium">Medium Threat</option>
                  <option value="High">High Threat</option>
                  <option value="Forbidden">Forbidden</option>
                </select>
              </div>
            </div>

            <div className="text-xs">
              <label className="text-zinc-400 block mb-0.5">Faction Control: {editControl}%</label>
              <input
                type="range"
                min="0"
                max="100"
                value={editControl}
                onChange={(e) => setEditControl(Number(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>

            <div className="text-xs">
              <label className="text-zinc-400 block mb-0.5">Tactical Notes</label>
              <textarea
                rows={2}
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                className="w-full px-2 py-1 bg-zinc-950 border border-zinc-800 rounded text-zinc-200 text-xs"
              />
            </div>

            <button
              type="submit"
              className="w-full py-1.5 rounded bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Check className="w-3.5 h-3.5" /> Save Changes
            </button>
          </form>
        )}

        {/* TAB 1: CODEX LORE */}
        {activeTab === 'lore' && (
          <div className="space-y-4">
            {/* Connected Codex Article Card */}
            {linkedArticle ? (
              <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 shadow-md space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider bg-amber-950/60 border border-amber-800/60 px-2 py-0.5 rounded">
                    Codex Article ({linkedArticle.category})
                  </span>
                  <span className="text-[10px] text-zinc-500 font-mono">
                    Updated {new Date(linkedArticle.updatedAt).toLocaleDateString()}
                  </span>
                </div>

                <div>
                  <h4 className="font-heading font-bold text-sm text-zinc-100 flex items-center gap-1.5">
                    <GiScrollUnfurled className="w-4 h-4 text-amber-400" />
                    {linkedArticle.title}
                  </h4>
                  <p className="text-xs text-zinc-300 mt-1 line-clamp-3">
                    {linkedArticle.summary || linkedArticle.content.replace(/<[^>]+>/g, ' ').slice(0, 160)}
                  </p>
                </div>

                {linkedArticle.tags && linkedArticle.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {linkedArticle.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-[10px] text-zinc-400 bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-800"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between">
                  <button
                    onClick={() => handleOpenInCodex(linkedArticle.id)}
                    className="flex items-center gap-1.5 text-xs font-bold text-amber-400 hover:text-amber-300 cursor-pointer group"
                  >
                    <span>Read Full Article in Codex</span>
                    <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-zinc-900/40 border border-dashed border-zinc-800 rounded-xl p-4 text-center space-y-2">
                <BookOpen className="w-6 h-6 text-zinc-600 mx-auto" />
                <p className="text-xs text-zinc-400">
                  No dedicated Codex article linked to this territory yet.
                </p>
                <button
                  onClick={() => {
                    setActiveView('manuscript');
                    onClose();
                  }}
                  className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Create Article in Codex
                </button>
              </div>
            )}

            {/* Tactical Notes & Lore Summary */}
            {territory.notes && (
              <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-xl p-3.5 space-y-1.5">
                <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">
                  Cartographer's Tactical Log:
                </span>
                <p className="text-xs text-zinc-300 italic leading-relaxed">
                  "{territory.notes}"
                </p>
              </div>
            )}

            {/* Action Card: Novel Studio Writer Integration */}
            <div className="bg-gradient-to-br from-amber-950/20 to-zinc-900 border border-amber-900/30 rounded-xl p-4 space-y-2.5">
              <div className="flex items-center gap-2">
                <PenTool className="w-4 h-4 text-amber-400" />
                <h4 className="font-heading font-bold text-xs text-zinc-100">
                  Novel Studio Integration
                </h4>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Set a scene within the borders of {territory.name}. Automatically spawns a chapter draft with this territory's atmosphere and lore.
              </p>
              <button
                onClick={handleDraftSceneInTerritory}
                className="w-full py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-md transition-all"
              >
                <span>✍️ Draft Scene in this Territory</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: RULER & BESTIARY */}
        {activeTab === 'ruler' && (
          <div className="space-y-4">
            {/* Ruler Card */}
            {territory.ruler ? (
              <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 shadow-md space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider bg-amber-950/60 border border-amber-800/60 px-2 py-0.5 rounded flex items-center gap-1">
                    <Crown className="w-3 h-3 text-amber-400" /> Sovereign Ruler
                  </span>
                  {rulerArticle && (
                    <button
                      onClick={() => handleOpenInCodex(rulerArticle.id)}
                      className="text-[11px] text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>Codex Bio</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  )}
                </div>

                <div>
                  <h4 className="font-heading font-bold text-sm text-zinc-100">
                    {territory.ruler}
                  </h4>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Commands the military dominion of {territory.factionName}
                  </p>
                </div>

                {rulerArticle?.summary && (
                  <p className="text-xs text-zinc-300 italic bg-zinc-950/60 p-2.5 rounded-lg border border-zinc-800">
                    "{rulerArticle.summary}"
                  </p>
                )}
              </div>
            ) : (
              <div className="bg-zinc-900/40 border border-dashed border-zinc-800 rounded-xl p-3 text-center text-xs text-zinc-500">
                No formal sovereign recorded for this region.
              </div>
            )}

            {/* Regional Bestiary Statblocks */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                  Regional Bestiary & NPCs:
                </span>
                <span className="text-[10px] font-mono text-zinc-500">
                  {regionalStatblocks.length} Found
                </span>
              </div>

              {regionalStatblocks.length > 0 ? (
                regionalStatblocks.map((sb) => (
                  <div
                    key={sb.id}
                    className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-3 space-y-2 shadow-xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <GiDragonHead className="w-4 h-4 text-rose-400" />
                        <span className="font-heading font-bold text-xs text-zinc-100">
                          {sb.name}
                        </span>
                      </div>
                      <span className="text-[10px] font-bold text-zinc-400 font-mono bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-800">
                        CR {sb.cr} · AC {sb.ac} · HP {sb.hp}
                      </span>
                    </div>

                    <div className="space-y-1.5 pt-1 border-t border-zinc-800/80">
                      {sb.actions?.map((act) => (
                        <div
                          key={act.id}
                          className="flex items-center justify-between bg-zinc-950/60 px-2.5 py-1.5 rounded-lg border border-zinc-800/60 text-xs"
                        >
                          <div className="min-w-0 pr-2">
                            <span className="font-semibold text-zinc-200 block truncate">
                              {act.name}
                            </span>
                            <span className="text-[10px] text-zinc-400 font-mono">
                              {act.formula}
                            </span>
                          </div>
                          <button
                            onClick={() => handleRollAttack(sb, act.name, act.formula || '1d20')}
                            className="px-2 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-[11px] font-bold border border-amber-500/30 flex items-center gap-1 cursor-pointer transition-colors flex-shrink-0"
                          >
                            <Sword className="w-3 h-3" />
                            <span>Roll</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="bg-zinc-900/40 border border-dashed border-zinc-800 rounded-xl p-3 text-center text-xs text-zinc-500">
                  No regional monsters matching this territory's threat index.
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: LANDMARKS & MAP PINS */}
        {activeTab === 'landmarks' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                Enclosed Landmarks:
              </span>
              <span className="text-[10px] font-mono text-zinc-500">
                {enclosedPins.length} Located
              </span>
            </div>

            {enclosedPins.length > 0 ? (
              enclosedPins.map((pin) => (
                <div
                  key={pin.id}
                  className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-3 flex items-center justify-between gap-3 shadow-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="p-2 rounded-lg bg-zinc-950 border border-zinc-800">
                      {getPinIcon(pin.category)}
                    </div>
                    <div className="min-w-0">
                      <h5 className="font-heading font-bold text-xs text-zinc-200 truncate">
                        {pin.label}
                      </h5>
                      <div className="flex items-center gap-1.5 text-[10px] text-zinc-400">
                        <span className="font-medium text-amber-400">{pin.category}</span>
                        <span>·</span>
                        <span className="font-mono">({pin.xPct}%, {pin.yPct}%)</span>
                        {pin.isSecret && (
                          <>
                            <span>·</span>
                            <span className="text-rose-400 flex items-center gap-0.5">
                              <GiPadlock className="w-2.5 h-2.5" /> Secret
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {pin.articleId && (
                    <button
                      onClick={() => handleOpenInCodex(pin.articleId!)}
                      className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] font-semibold border border-zinc-700 flex items-center gap-1 cursor-pointer flex-shrink-0"
                    >
                      <BookOpen className="w-3 h-3 text-amber-400" />
                      <span>Codex</span>
                    </button>
                  )}
                </div>
              ))
            ) : (
              <div className="bg-zinc-900/40 border border-dashed border-zinc-800 rounded-xl p-6 text-center space-y-2">
                <MapPinIcon className="w-6 h-6 text-zinc-600 mx-auto" />
                <p className="text-xs text-zinc-400">
                  No landmarks or outposts placed inside this territory boundary yet.
                </p>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: ENCOUNTER ROLLER */}
        {activeTab === 'encounters' && (
          <div className="space-y-4">
            <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Dices className="w-4 h-4 text-amber-400" />
                  <h4 className="font-heading font-bold text-xs text-zinc-100">
                    Random Encounter Table (d20)
                  </h4>
                </div>
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${getThreatBadge(
                    territory.threatLevel
                  )}`}
                >
                  {territory.threatLevel}
                </span>
              </div>

              <p className="text-xs text-zinc-400 leading-relaxed">
                Roll on the calibrated regional encounter table weighted for {territory.factionName} territory and {territory.threatLevel} threat rating.
              </p>

              <button
                onClick={handleRollEncounter}
                className="w-full py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 rounded-lg text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all"
              >
                <Dices className="w-4 h-4" />
                <span>Roll Regional Encounter (d20)</span>
              </button>
            </div>

            {/* Encounter Result Box */}
            {encounterResult && (
              <div className="bg-gradient-to-br from-amber-950/30 to-zinc-900 border border-amber-800/50 rounded-xl p-4 space-y-2 animate-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between border-b border-amber-900/40 pb-2">
                  <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">
                    Encounter Generated
                  </span>
                  <span className="text-xs font-mono font-bold text-zinc-300 bg-zinc-950 px-2 py-0.5 rounded border border-amber-500/30">
                    d20 Roll: <strong className="text-amber-400">{encounterResult.roll}</strong>
                  </span>
                </div>

                <h5 className="font-heading font-bold text-sm text-zinc-100">
                  {encounterResult.title}
                </h5>

                <p className="text-xs text-zinc-300 leading-relaxed bg-zinc-950/60 p-3 rounded-lg border border-zinc-800">
                  {encounterResult.description}
                </p>

                <div className="pt-2 flex justify-end">
                  <button
                    onClick={() => {
                      set3dDiceOpen(true);
                    }}
                    className="text-[11px] text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <span>Inspect in 3D Arena / Dice Dock</span> →
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Drawer Footer Status */}
      <div className="p-3 border-t border-zinc-800 bg-zinc-900/80 flex items-center justify-between text-[11px] text-zinc-500 flex-shrink-0">
        <span className="font-mono">ID: {territory.id}</span>
        <span>{territory.points.length} Boundary Vertices</span>
      </div>
    </div>
  );
};
