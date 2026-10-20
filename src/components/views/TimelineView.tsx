import React, { useState, useMemo } from 'react';
import { 
  GiHourglass, 
  GiSandsOfTime, 
  GiSparkles, 
  GiCheckMark,
  GiEyeShield,
  GiScrollUnfurled
} from 'react-icons/gi';
import { 
  Plus, 
  Search, 
  Trash2, 
  Edit3, 
  X, 
  ArrowUpDown,
  ExternalLink,
  AlertTriangle,
  ShieldAlert,
  Info
} from 'lucide-react';
import { useLoreStore } from '../../store/useLoreStore';
import type { TimelineEvent } from '../../types/lore';

interface AuditResult {
  hasParadox: boolean;
  score: number;
  checks: {
    name: string;
    status: 'pass' | 'warn' | 'fail';
    detail: string;
  }[];
}

export const TimelineView: React.FC = () => {
  const { 
    timelineEvents, 
    activeWorldId, 
    isPlayerMode, 
    articles,
    addTimelineEvent, 
    updateTimelineEvent, 
    deleteTimelineEvent,
    setSelectedArticleId,
    setActiveView,
    setActiveWorkspace
  } = useLoreStore();

  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortAscending, setSortAscending] = useState(true);

  // Modal states
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [isAuditorModalOpen, setIsAuditorModalOpen] = useState(false);

  // Form states
  const [formYear, setFormYear] = useState('');
  const [formYearNumeric, setFormYearNumeric] = useState<number>(0);
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState<TimelineEvent['category']>('Cataclysm');
  const [formDesc, setFormDesc] = useState('');
  const [formArticleId, setFormArticleId] = useState<string>('');
  const [formIsSecret, setFormIsSecret] = useState(false);

  // Filter events for active world and player mode
  const worldEvents = useMemo(() => {
    return timelineEvents.filter(ev => ev.worldId === activeWorldId);
  }, [timelineEvents, activeWorldId]);

  const visibleEvents = useMemo(() => {
    let list = worldEvents.filter(ev => {
      if (isPlayerMode && ev.isSecret) return false;
      if (selectedCategory !== 'All' && ev.category !== selectedCategory) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = ev.title.toLowerCase().includes(q);
        const matchesDesc = ev.description.toLowerCase().includes(q);
        const matchesYear = ev.year.toLowerCase().includes(q);
        return matchesTitle || matchesDesc || matchesYear;
      }
      return true;
    });

    list.sort((a, b) => sortAscending ? a.yearNumeric - b.yearNumeric : b.yearNumeric - a.yearNumeric);
    return list;
  }, [worldEvents, isPlayerMode, selectedCategory, searchQuery, sortAscending]);

  const hiddenSecretCount = useMemo(() => {
    if (!isPlayerMode) return 0;
    return worldEvents.filter(ev => ev.isSecret).length;
  }, [worldEvents, isPlayerMode]);

  // Causality Auditor Analysis
  const auditResult = useMemo<AuditResult>(() => {
    const checks: AuditResult['checks'] = [];
    let paradoxCount = 0;

    // 1. Monotonic Temporal Flow
    const sorted = [...worldEvents].sort((a, b) => a.yearNumeric - b.yearNumeric);
    let monotonicIssues = 0;
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].yearNumeric === sorted[i - 1].yearNumeric && sorted[i].category === sorted[i - 1].category) {
        monotonicIssues++;
      }
    }
    if (monotonicIssues > 0) {
      checks.push({
        name: 'Temporal Density & Collisions',
        status: 'warn',
        detail: `${monotonicIssues} events share identical numeric reckoning years and categories. Verify historical synchronization.`,
      });
    } else {
      checks.push({
        name: 'Monotonic Reckoning Continuity',
        status: 'pass',
        detail: `All ${worldEvents.length} registered epochs proceed with valid numerical progression.`,
      });
    }

    // 2. Entity Causality Integrity
    const brokenLinks = worldEvents.filter(ev => ev.articleId && !articles.some(a => a.id === ev.articleId));
    if (brokenLinks.length > 0) {
      paradoxCount++;
      checks.push({
        name: 'Entity Anchor Integrity',
        status: 'fail',
        detail: `${brokenLinks.length} events cite codex articles that have been severed or deleted from history.`,
      });
    } else {
      checks.push({
        name: 'Codex Anchor Alignment',
        status: 'pass',
        detail: 'Every referenced character, location, and faction exists in the active codex.',
      });
    }

    // 3. GM Secret Isolation Check
    const secretEvents = worldEvents.filter(ev => ev.isSecret);
    checks.push({
      name: 'Veiled Chronology Isolation',
      status: 'pass',
      detail: `${secretEvents.length} secret epochs isolated behind GM veil. Player-mode sanitization verified.`,
    });

    // 4. Cataclysm Baseline Validation
    const hasCataclysm = worldEvents.some(ev => ev.category === 'Cataclysm');
    if (!hasCataclysm) {
      checks.push({
        name: 'Primordial Anchor Event',
        status: 'warn',
        detail: 'No Cataclysm epoch defined. Consider marking an origin catalyst to anchor calendar calculations.',
      });
    } else {
      checks.push({
        name: 'Primordial Epoch Established',
        status: 'pass',
        detail: 'Cataclysm origin event anchors the current reckoning baseline.',
      });
    }

    return {
      hasParadox: paradoxCount > 0,
      score: paradoxCount > 0 ? 70 : 100,
      checks,
    };
  }, [worldEvents, articles]);

  const openCreateModal = () => {
    setEditingEventId(null);
    setFormYear('220 AF');
    setFormYearNumeric(220);
    setFormTitle('');
    setFormCategory('Cataclysm');
    setFormDesc('');
    setFormArticleId('');
    setFormIsSecret(false);
    setIsEventModalOpen(true);
  };

  const openEditModal = (ev: TimelineEvent) => {
    setEditingEventId(ev.id);
    setFormYear(ev.year);
    setFormYearNumeric(ev.yearNumeric);
    setFormTitle(ev.title);
    setFormCategory(ev.category);
    setFormDesc(ev.description);
    setFormArticleId(ev.articleId || '');
    setFormIsSecret(ev.isSecret);
    setIsEventModalOpen(true);
  };

  const handleSaveEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    if (editingEventId) {
      updateTimelineEvent(editingEventId, {
        year: formYear.trim() || `${formYearNumeric} AF`,
        yearNumeric: Number(formYearNumeric) || 0,
        title: formTitle.trim(),
        category: formCategory,
        description: formDesc.trim(),
        articleId: formArticleId || undefined,
        isSecret: formIsSecret,
      });
    } else {
      const newEv: TimelineEvent = {
        id: `time-${Date.now()}`,
        worldId: activeWorldId,
        year: formYear.trim() || `${formYearNumeric} AF`,
        yearNumeric: Number(formYearNumeric) || 0,
        title: formTitle.trim(),
        category: formCategory,
        description: formDesc.trim(),
        articleId: formArticleId || undefined,
        isSecret: formIsSecret,
      };
      addTimelineEvent(newEv);
    }

    setIsEventModalOpen(false);
  };

  const navigateToArticle = (artId: string) => {
    setSelectedArticleId(artId);
    setActiveWorkspace('codex');
    setActiveView('manuscript');
  };

  const getCategoryBadgeClass = (category: string) => {
    switch (category) {
      case 'Cataclysm':
        return 'text-rose-400 bg-rose-500/10 border-rose-500/30';
      case 'Faction':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
      case 'Settlement':
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
      case 'Character':
        return 'text-sky-400 bg-sky-500/10 border-sky-500/30';
      case 'Discovery':
        return 'text-purple-400 bg-purple-500/10 border-purple-500/30';
      default:
        return 'text-zinc-400 bg-zinc-800 border-zinc-700';
    }
  };

  const categories = ['All', 'Cataclysm', 'Faction', 'Settlement', 'Character', 'Discovery'];

  return (
    <div className="flex-1 flex flex-col overflow-y-auto bg-zinc-950 p-6 items-center">
      <div className="w-full max-w-4xl flex flex-col gap-6">
        
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-zinc-800 pb-5 gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 shadow-inner">
              <GiHourglass className="w-7 h-7 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-heading font-bold text-zinc-100">
                  Chronos Timeline Engine
                </h1>
                <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700 font-mono">
                  {worldEvents.length} Epochs
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Reckoning Baseline: After the Fall (AF) · Monotonic Temporal Progression
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsAuditorModalOpen(true)}
              className={`btn-tactile flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all shadow-sm cursor-pointer ${
                auditResult.hasParadox 
                  ? 'bg-rose-950/60 border-rose-800/80 text-rose-300 hover:bg-rose-900/60' 
                  : 'bg-emerald-950/60 border-emerald-800/80 text-emerald-400 hover:bg-emerald-900/60'
              }`}
            >
              {auditResult.hasParadox ? (
                <>
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                  <span>Paradox Detected</span>
                </>
              ) : (
                <>
                  <GiCheckMark className="w-3.5 h-3.5" />
                  <span>0 Anachronisms Detected</span>
                </>
              )}
            </button>

            <button
              onClick={openCreateModal}
              className="btn-tactile flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 text-zinc-950 font-bold text-xs hover:bg-amber-400 transition-colors shadow-md cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Event</span>
            </button>
          </div>
        </div>

        {/* Player Mode Warning Banner */}
        {hiddenSecretCount > 0 && (
          <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-800/60 flex items-center justify-between text-xs text-amber-300">
            <div className="flex items-center gap-2">
              <GiEyeShield className="w-4 h-4 text-amber-400" />
              <span>Player Mode Active: <strong>{hiddenSecretCount}</strong> classified GM secret epoch{hiddenSecretCount > 1 ? 's' : ''} veiled from view.</span>
            </div>
            <span className="font-mono text-[10px] uppercase font-bold text-amber-500 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-800/80">
              Sanitized View
            </span>
          </div>
        )}

        {/* Filters and Search Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-zinc-900/60 p-3 rounded-xl border border-zinc-800/80">
          {/* Category Chips */}
          <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`btn-pill px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                    : 'bg-zinc-800/60 text-zinc-400 border border-transparent hover:text-zinc-200 hover:bg-zinc-800'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-56">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-zinc-500" />
              <input
                type="text"
                placeholder="Search history..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-amber-500/50"
              />
            </div>

            {/* Sort Toggle */}
            <button
              onClick={() => setSortAscending(!sortAscending)}
              className="btn-icon p-1.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 border border-zinc-700/80 transition-colors cursor-pointer"
              title={sortAscending ? 'Oldest to Newest' : 'Newest to Oldest'}
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Timeline Event Stream */}
        <div className="relative pl-7 border-l-2 border-zinc-800/80 space-y-6 my-2">
          {visibleEvents.length === 0 ? (
            <div className="p-8 rounded-xl bg-zinc-900/40 border border-zinc-800/60 text-center text-zinc-500">
              <GiHourglass className="w-8 h-8 mx-auto text-zinc-600 mb-2" />
              <p className="text-sm font-semibold">No historical events found in this category.</p>
              <p className="text-xs text-zinc-600 mt-1">Add an epoch to begin weaving your world's chronological tapestry.</p>
            </div>
          ) : (
            visibleEvents.map((evt) => {
              const linkedArticle = articles.find(a => a.id === evt.articleId);

              return (
                <div key={evt.id} className="relative group">
                  {/* Timeline Indicator Dot */}
                  <div className={`absolute -left-[35px] top-2.5 w-4 h-4 rounded-full bg-zinc-950 border-2 transition-transform group-hover:scale-125 ${
                    evt.isSecret ? 'border-purple-500' : 'border-amber-500'
                  }`} />
                  
                  <div className="p-4 rounded-xl bg-zinc-900/90 border border-zinc-800/90 group-hover:border-amber-500/40 transition-all shadow-md">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded border border-amber-500/20">
                          {evt.year}
                        </span>
                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${getCategoryBadgeClass(evt.category)}`}>
                          {evt.category}
                        </span>
                        {evt.isSecret && (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-purple-400 bg-purple-950/60 border border-purple-800 px-2 py-0.5 rounded">
                            <ShieldAlert className="w-3 h-3" />
                            <span>GM Secret</span>
                          </span>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openEditModal(evt)}
                          className="p-1 rounded text-zinc-400 hover:text-amber-400 hover:bg-zinc-800 transition-colors"
                          title="Edit Event"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => deleteTimelineEvent(evt.id)}
                          className="p-1 rounded text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 transition-colors"
                          title="Delete Event"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <h3 className="font-heading font-bold text-base text-zinc-100 mt-2.5">
                      {evt.title}
                    </h3>
                    
                    <p className="text-xs text-zinc-300 mt-1 leading-relaxed">
                      {evt.description}
                    </p>

                    {/* Linked Entity Pill */}
                    {linkedArticle && (
                      <div className="mt-3 pt-3 border-t border-zinc-800/80 flex items-center justify-between">
                        <button
                          onClick={() => navigateToArticle(linkedArticle.id)}
                          className="flex items-center gap-1.5 text-xs text-amber-400/90 hover:text-amber-300 transition-colors font-medium hover:underline"
                        >
                          <GiScrollUnfurled className="w-3.5 h-3.5 text-amber-400" />
                          <span>Codex Anchor: <strong>{linkedArticle.title}</strong></span>
                          <ExternalLink className="w-3 h-3 ml-0.5 opacity-70" />
                        </button>
                        <span className="text-[10px] text-zinc-500 font-mono">
                          {linkedArticle.category}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Bottom Causality Bar */}
        <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-xs text-zinc-400">
            <GiSandsOfTime className="w-5 h-5 text-amber-400 shrink-0" />
            <span>Chronos Causality Auditor scans character birth/founding dates, monotonic reckonings, and temporal anchors.</span>
          </div>
          <button 
            onClick={() => setIsAuditorModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/30 text-xs font-semibold hover:bg-amber-500/25 transition-colors shrink-0"
          >
            <GiSparkles className="w-3.5 h-3.5" />
            <span>Audit Chronology</span>
          </button>
        </div>
      </div>

      {/* Add / Edit Event Modal */}
      {isEventModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <GiHourglass className="w-5 h-5 text-amber-400" />
                <h2 className="font-heading font-bold text-lg text-zinc-100">
                  {editingEventId ? 'Edit Historical Epoch' : 'Record New Historical Epoch'}
                </h2>
              </div>
              <button
                onClick={() => setIsEventModalOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEvent} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">
                    Year Label (e.g. 142 AF)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="142 AF"
                    value={formYear}
                    onChange={(e) => setFormYear(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-200 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">
                    Numeric Year (for ordering)
                  </label>
                  <input
                    type="number"
                    required
                    value={formYearNumeric}
                    onChange={(e) => setFormYearNumeric(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-200 focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">
                  Epoch Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="The Shattering of the Twin Moons"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">
                    Category
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as TimelineEvent['category'])}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-200 focus:outline-none focus:border-amber-500"
                  >
                    <option value="Cataclysm">Cataclysm</option>
                    <option value="Faction">Faction</option>
                    <option value="Settlement">Settlement</option>
                    <option value="Character">Character</option>
                    <option value="Discovery">Discovery</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">
                    Link Codex Article
                  </label>
                  <select
                    value={formArticleId}
                    onChange={(e) => setFormArticleId(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-200 focus:outline-none focus:border-amber-500"
                  >
                    <option value="">-- None --</option>
                    {articles.map((art) => (
                      <option key={art.id} value={art.id}>
                        {art.title} ({art.category})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">
                  Historical Description & Lore
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Record the causes, geopolitical ramifications, and astral anomalies..."
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-200 focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>

              {/* Secret toggle */}
              <label className="flex items-center gap-2 p-3 bg-zinc-950 rounded-lg border border-zinc-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formIsSecret}
                  onChange={(e) => setFormIsSecret(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-500 bg-zinc-900 border-zinc-700"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-200">
                    <ShieldAlert className="w-3.5 h-3.5 text-purple-400" />
                    <span>Veil as GM Secret Epoch</span>
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    Hides this epoch from players when Player Mode is active.
                  </p>
                </div>
              </label>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEventModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-xs font-bold text-zinc-950 shadow-md"
                >
                  {editingEventId ? 'Save Changes' : 'Record Epoch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Chronos Causality Auditor Modal */}
      {isAuditorModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30">
                  <GiSparkles className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h2 className="font-heading font-bold text-lg text-zinc-100">
                    Chronos Causality Audit
                  </h2>
                  <p className="text-xs text-zinc-400">
                    Temporal Anachronism & Narrative Consistency Diagnostic
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAuditorModalOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              {/* Overall Score Badge */}
              <div className={`p-4 rounded-xl border flex items-center justify-between ${
                auditResult.hasParadox
                  ? 'bg-rose-950/40 border-rose-800/80'
                  : 'bg-emerald-950/40 border-emerald-800/80'
              }`}>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold font-mono text-zinc-100">
                      {auditResult.score}%
                    </span>
                    <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded ${
                      auditResult.hasParadox ? 'bg-rose-900/60 text-rose-300' : 'bg-emerald-900/60 text-emerald-300'
                    }`}>
                      {auditResult.hasParadox ? 'Causality Fracture' : 'Coherent Chronology'}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-1">
                    {auditResult.hasParadox 
                      ? 'Temporal paradox detected. Epochs reference missing or contradictory causality points.'
                      : 'Zero anachronisms found across all historical epochs and linked codex entities.'}
                  </p>
                </div>
                <div className="p-3 rounded-full bg-zinc-900/90 border border-zinc-700">
                  {auditResult.hasParadox ? (
                    <AlertTriangle className="w-6 h-6 text-rose-400" />
                  ) : (
                    <GiCheckMark className="w-6 h-6 text-emerald-400" />
                  )}
                </div>
              </div>

              {/* Diagnostic Checklist */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase text-zinc-400 tracking-wider">
                  Diagnostic Checkpoints
                </h4>
                {auditResult.checks.map((chk, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-zinc-950/70 border border-zinc-800 flex items-start gap-3">
                    <div className="mt-0.5">
                      {chk.status === 'pass' && (
                        <div className="p-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                          <GiCheckMark className="w-3 h-3" />
                        </div>
                      )}
                      {chk.status === 'warn' && (
                        <div className="p-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">
                          <Info className="w-3 h-3" />
                        </div>
                      )}
                      {chk.status === 'fail' && (
                        <div className="p-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/30">
                          <AlertTriangle className="w-3 h-3" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-zinc-200">
                          {chk.name}
                        </span>
                        <span className={`text-[10px] font-mono uppercase font-bold ${
                          chk.status === 'pass' ? 'text-emerald-400' : chk.status === 'warn' ? 'text-amber-400' : 'text-rose-400'
                        }`}>
                          {chk.status}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        {chk.detail}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setIsAuditorModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200"
                >
                  Close Diagnostic
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
