import React, { useState } from 'react';
import { useLoreStore } from '../../store/useLoreStore';
import type { NovelChapter } from '../../types/lore';
import { 
  BookText, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  FileEdit, 
  User, 
  Target,
  ChevronUp,
  ChevronDown,
  Download,
  X,
  FileCode,
  FileText,
  Sliders,
  Sparkles
} from 'lucide-react';

export const ManuscriptBinder: React.FC = () => {
  const { 
    novelChapters, 
    activeChapterId, 
    setActiveChapterId, 
    addChapter, 
    deleteChapter,
    reorderChapters,
    projectTargetWordCount,
    setProjectTargetWordCount,
    articles,
    worlds,
    activeWorldId
  } = useLoreStore();

  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // Goal modal state
  const [tempGoalCount, setTempGoalCount] = useState(projectTargetWordCount);

  // Export modal state
  const [exportScope, setExportScope] = useState<'all' | 'active'>('all');
  const [exportFormat, setExportFormat] = useState<'md' | 'html' | 'txt'>('md');
  const [includeSummaries, setIncludeSummaries] = useState(false);

  const activeWorld = worlds.find(w => w.id === activeWorldId) || worlds[0];

  const totalWords = novelChapters.reduce((acc, ch) => acc + (ch.currentWordCount || 0), 0);
  const targetWords = projectTargetWordCount || 50000;
  const progressPct = Math.min(100, Math.round((totalWords / targetWords) * 100));

  const filteredChapters = filterStatus === 'all' 
    ? novelChapters 
    : novelChapters.filter((ch) => ch.status === filterStatus);

  const handleCreateChapter = () => {
    const nextNum = novelChapters.length + 1;
    const newChap: NovelChapter = {
      id: `chap-${Date.now()}`,
      bookId: 'book-1',
      actId: nextNum <= 3 ? 'act-1' : 'act-2',
      chapterNumber: nextNum,
      title: `Chapter ${nextNum}: Untitled`,
      targetWordCount: 3500,
      currentWordCount: 0,
      status: 'draft',
      summary: 'Brief chapter outline or scene beats...',
      content: `<h2>Chapter ${nextNum}</h2><p>Begin writing scene prose here...</p>`,
    };
    addChapter(newChap);
  };

  const getPovName = (id?: string) => {
    if (!id) return null;
    const art = articles.find((a) => a.id === id);
    return art ? art.title : null;
  };

  const handleSaveGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (tempGoalCount > 0) {
      setProjectTargetWordCount(tempGoalCount);
      setIsGoalModalOpen(false);
    }
  };

  const triggerDownload = (filename: string, content: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const htmlToPlainText = (html: string): string => {
    return html
      .replace(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi, '\n\n$1\n----------------------------------------\n')
      .replace(/<p[^>]*>(.*?)<\/p>/gi, '\n$1\n')
      .replace(/<br\s*[\/]?>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .trim();
  };

  const htmlToMarkdown = (html: string): string => {
    return html
      .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '\n# $1\n\n')
      .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '\n## $1\n\n')
      .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '\n### $1\n\n')
      .replace(/<strong>(.*?)<\/strong>/gi, '**$1**')
      .replace(/<b>(.*?)<\/b>/gi, '**$1**')
      .replace(/<em>(.*?)<\/em>/gi, '*$1*')
      .replace(/<i>(.*?)<\/i>/gi, '*$1*')
      .replace(/<p[^>]*>(.*?)<\/p>/gi, '\n$1\n')
      .replace(/<br\s*[\/]?>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .trim();
  };

  const handleExportManuscript = () => {
    const chaptersToExport = exportScope === 'all'
      ? novelChapters
      : novelChapters.filter(ch => ch.id === activeChapterId);

    const worldTitle = activeWorld ? activeWorld.name : 'LoreVault';
    const cleanWorldName = worldTitle.replace(/[^a-zA-Z0-9_-]/g, '_');
    const dateStr = new Date().toISOString().split('T')[0];

    if (exportFormat === 'md') {
      let md = `# ${worldTitle} - Manuscript\n\n`;
      md += `*Exported on ${dateStr} · Total Word Count: ${totalWords.toLocaleString()} words*\n\n---\n\n`;

      chaptersToExport.forEach((ch) => {
        const pov = getPovName(ch.povCharacterId);
        md += `## ${ch.title}\n\n`;
        if (pov || ch.status) {
          md += `*POV: ${pov || 'Omniscient'} | Status: ${ch.status} | Words: ${ch.currentWordCount || 0}*\n\n`;
        }
        if (includeSummaries && ch.summary) {
          md += `> **Chapter Outline**: ${ch.summary}\n\n`;
        }
        md += `${htmlToMarkdown(ch.content)}\n\n---\n\n`;
      });

      triggerDownload(`${cleanWorldName}_Manuscript_${dateStr}.md`, md, 'text/markdown;charset=utf-8');
    } else if (exportFormat === 'html') {
      let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${worldTitle} - Manuscript</title>
  <style>
    body {
      font-family: 'Georgia', 'Cambria', serif;
      line-height: 1.8;
      max-width: 800px;
      margin: 40px auto;
      padding: 0 24px;
      color: #1a1a1a;
      background: #faf8f5;
    }
    h1 {
      text-align: center;
      font-size: 2.2rem;
      margin-bottom: 0.5rem;
      color: #111;
    }
    .header-meta {
      text-align: center;
      font-style: italic;
      color: #666;
      margin-bottom: 3rem;
      padding-bottom: 1.5rem;
      border-bottom: 2px solid #e5e0d8;
    }
    .chapter {
      margin-bottom: 4rem;
      page-break-after: always;
    }
    .chapter h2 {
      font-size: 1.6rem;
      margin-bottom: 0.5rem;
      color: #222;
      border-bottom: 1px solid #d5cfc5;
      padding-bottom: 0.5rem;
    }
    .chapter-meta {
      font-size: 0.85rem;
      color: #777;
      margin-bottom: 1.5rem;
      font-style: italic;
    }
    .chapter-outline {
      background: #eee8df;
      padding: 12px 16px;
      border-left: 4px solid #b89c72;
      font-size: 0.9rem;
      color: #444;
      margin-bottom: 1.5rem;
      border-radius: 4px;
    }
    p {
      text-indent: 1.5rem;
      margin-bottom: 1rem;
      margin-top: 0;
    }
  </style>
</head>
<body>
  <h1>${worldTitle}</h1>
  <div class="header-meta">Manuscript Export · ${totalWords.toLocaleString()} Words · ${dateStr}</div>
`;

      chaptersToExport.forEach((ch) => {
        const pov = getPovName(ch.povCharacterId);
        html += `  <div class="chapter">\n`;
        html += `    <h2>${ch.title}</h2>\n`;
        html += `    <div class="chapter-meta">POV: ${pov || 'Omniscient'} · Status: ${ch.status} · ${ch.currentWordCount || 0} words</div>\n`;
        if (includeSummaries && ch.summary) {
          html += `    <div class="chapter-outline"><strong>Outline:</strong> ${ch.summary}</div>\n`;
        }
        html += `    ${ch.content}\n`;
        html += `  </div>\n`;
      });

      html += `</body>\n</html>`;
      triggerDownload(`${cleanWorldName}_Manuscript_${dateStr}.html`, html, 'text/html;charset=utf-8');
    } else {
      let txt = `========================================================================\n`;
      txt += `${worldTitle.toUpperCase()} - MANUSCRIPT EXPORT\n`;
      txt += `Date: ${dateStr} | Total Words: ${totalWords.toLocaleString()}\n`;
      txt += `========================================================================\n\n\n`;

      chaptersToExport.forEach((ch) => {
        const pov = getPovName(ch.povCharacterId);
        txt += `\n########################################################################\n`;
        txt += `${ch.title.toUpperCase()}\n`;
        txt += `POV: ${pov || 'Omniscient'} | Status: ${ch.status} | Words: ${ch.currentWordCount || 0}\n`;
        txt += `########################################################################\n\n`;
        if (includeSummaries && ch.summary) {
          txt += `[CHAPTER OUTLINE: ${ch.summary}]\n\n`;
        }
        txt += `${htmlToPlainText(ch.content)}\n\n\n`;
      });

      triggerDownload(`${cleanWorldName}_Manuscript_${dateStr}.txt`, txt, 'text/plain;charset=utf-8');
    }

    setIsExportModalOpen(false);
  };

  return (
    <aside className="w-80 border-r border-zinc-800 bg-zinc-950 flex flex-col z-10 select-none">
      {/* Binder Header & Target Meter */}
      <div className="p-4 border-b border-zinc-800 bg-zinc-900/40">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <BookText className="w-5 h-5 text-amber-400" />
            <h2 className="font-heading font-bold text-sm text-zinc-100">
              Manuscript Binder
            </h2>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsExportModalOpen(true)}
              className="btn-icon p-1.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 border border-zinc-700/80 transition-colors cursor-pointer"
              title="Export Full Manuscript or Chapter"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
            </button>
            <button
              onClick={handleCreateChapter}
              className="btn-tactile flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-semibold hover:bg-amber-500/25 transition-colors cursor-pointer"
              title="Create New Chapter"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Chapter</span>
            </button>
          </div>
        </div>

        {/* Word Count Progress Bar with Goal Configurator */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-xs">
            <button
              onClick={() => {
                setTempGoalCount(projectTargetWordCount);
                setIsGoalModalOpen(true);
              }}
              className="btn-pill text-zinc-400 hover:text-amber-300 flex items-center gap-1 text-[11px] group transition-colors cursor-pointer"
              title="Click to adjust Target Word Count Goal"
            >
              <Target className="w-3 h-3 text-amber-400 group-hover:scale-110 transition-transform" />
              <span>Target Goal</span>
              <Sliders className="w-2.5 h-2.5 opacity-50 group-hover:opacity-100 ml-0.5" />
            </button>
            <span className="font-mono text-zinc-200 text-[11px]">
              <strong className="text-amber-400">{totalWords.toLocaleString()}</strong> / {targetWords.toLocaleString()} w ({progressPct}%)
            </span>
          </div>
          <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-500 rounded-full transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Filter Chips */}
      <div className="px-3 py-2 border-b border-zinc-800/80 flex items-center gap-1 bg-zinc-950">
        {['all', 'draft', 'revision', 'polished'].map((st) => (
          <button
            key={st}
            onClick={() => setFilterStatus(st)}
            className={`btn-pill px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider transition-all cursor-pointer ${
              filterStatus === st
                ? 'bg-zinc-800 text-zinc-100 border border-zinc-700'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {st}
          </button>
        ))}
      </div>

      {/* Chapters Tree List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {filteredChapters.map((ch) => {
          const isSelected = ch.id === activeChapterId;
          const pov = getPovName(ch.povCharacterId);
          const fullIndex = novelChapters.findIndex(c => c.id === ch.id);
          const isFirst = fullIndex === 0;
          const isLast = fullIndex === novelChapters.length - 1;

          return (
            <div
              key={ch.id}
              onClick={() => setActiveChapterId(ch.id)}
              className={`binder-item group p-2.5 rounded-xl border transition-all cursor-pointer relative ${
                isSelected
                  ? 'bg-amber-500/15 border-amber-500/40 text-zinc-100 shadow-sm shadow-amber-500/10'
                  : 'bg-zinc-900/60 hover:bg-zinc-900 border-zinc-800/80 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-[10px] font-bold text-amber-400">
                      Ch.{ch.chapterNumber}
                    </span>
                    <h3 className="font-heading font-semibold text-xs text-zinc-200 truncate">
                      {ch.title.replace(/^Chapter \d+:\s*/, '')}
                    </h3>
                  </div>

                  {/* POV Badge & Word Count */}
                  <div className="flex items-center gap-2 mt-1 text-[11px]">
                    {pov && (
                      <span className="flex items-center gap-1 px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-300 text-[10px]">
                        <User className="w-2.5 h-2.5 text-zinc-400" />
                        <span className="truncate max-w-[80px]">{pov}</span>
                      </span>
                    )}
                    <span className="font-mono text-zinc-500 text-[10px]">
                      {ch.currentWordCount || 0} words
                    </span>
                  </div>
                </div>

                {/* Actions & Reordering */}
                <div className="flex items-center gap-1">
                  {/* Up / Down Reordering Buttons */}
                  <div className="opacity-0 group-hover:opacity-100 flex flex-col items-center mr-1 transition-opacity">
                    <button
                      disabled={isFirst}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!isFirst) reorderChapters(fullIndex, fullIndex - 1);
                      }}
                      className="btn-icon p-0.5 rounded text-zinc-400 hover:text-amber-400 disabled:opacity-20 disabled:hover:text-zinc-400 cursor-pointer"
                      title="Move Chapter Up"
                    >
                      <ChevronUp className="w-3 h-3" />
                    </button>
                    <button
                      disabled={isLast}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!isLast) reorderChapters(fullIndex, fullIndex + 1);
                      }}
                      className="btn-icon p-0.5 rounded text-zinc-400 hover:text-amber-400 disabled:opacity-20 disabled:hover:text-zinc-400 cursor-pointer"
                      title="Move Chapter Down"
                    >
                      <ChevronDown className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Status Indicator */}
                  {ch.status === 'polished' ? (
                    <span title="Polished">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    </span>
                  ) : ch.status === 'revision' ? (
                    <span title="Revision">
                      <Clock className="w-3.5 h-3.5 text-sky-400" />
                    </span>
                  ) : (
                    <span title="Draft">
                      <FileEdit className="w-3.5 h-3.5 text-amber-500/70" />
                    </span>
                  )}

                  {/* Delete Chapter */}
                  {novelChapters.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Delete ${ch.title}?`)) {
                          deleteChapter(ch.id);
                        }
                      }}
                      className="btn-icon opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-rose-950/60 hover:text-rose-400 text-zinc-500 transition-all ml-0.5 cursor-pointer"
                      title="Delete Chapter"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Target Word Count Goal Modal */}
      {isGoalModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-amber-400" />
                <h3 className="font-heading font-bold text-sm text-zinc-100">
                  Project Word Count Goal
                </h3>
              </div>
              <button
                onClick={() => setIsGoalModalOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveGoal} className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">
                  Target Words
                </label>
                <input
                  type="number"
                  min={1000}
                  step={500}
                  required
                  value={tempGoalCount}
                  onChange={(e) => setTempGoalCount(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-200 focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              {/* Presets */}
              <div>
                <span className="block text-[11px] font-semibold text-zinc-500 mb-1.5 uppercase tracking-wider">
                  Quick Presets
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { label: 'Short Story', count: 7500 },
                    { label: 'Novella', count: 25000 },
                    { label: 'NaNoWriMo', count: 50000 },
                    { label: 'Epic Fantasy', count: 100000 },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => setTempGoalCount(preset.count)}
                      className={`px-2 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                        tempGoalCount === preset.count
                          ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                      }`}
                    >
                      {preset.label} ({preset.count.toLocaleString()})
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsGoalModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-xs font-bold text-zinc-950 shadow-md"
                >
                  Save Goal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Export Manuscript Modal */}
      {isExportModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Download className="w-4 h-4 text-amber-400" />
                <h3 className="font-heading font-bold text-sm text-zinc-100">
                  Export Manuscript Studio
                </h3>
              </div>
              <button
                onClick={() => setIsExportModalOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Scope Selection */}
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                  Export Scope
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setExportScope('all')}
                    className={`p-2.5 rounded-xl border text-xs font-semibold text-left transition-all ${
                      exportScope === 'all'
                        ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    <div className="font-bold text-zinc-100">Full Book</div>
                    <div className="text-[11px] opacity-75 mt-0.5">All {novelChapters.length} Chapters ({totalWords.toLocaleString()} w)</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setExportScope('active')}
                    className={`p-2.5 rounded-xl border text-xs font-semibold text-left transition-all ${
                      exportScope === 'active'
                        ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    <div className="font-bold text-zinc-100">Active Chapter</div>
                    <div className="text-[11px] opacity-75 mt-0.5">Current Draft Only</div>
                  </button>
                </div>
              </div>

              {/* Format Selection */}
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                  Export Format
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'md' as const, label: 'Markdown', icon: FileCode, desc: '.md format' },
                    { id: 'html' as const, label: 'Formatted HTML', icon: Sparkles, desc: 'Print ready' },
                    { id: 'txt' as const, label: 'Plain Text', icon: FileText, desc: '.txt raw' },
                  ].map((fmt) => {
                    const Icon = fmt.icon;
                    return (
                      <button
                        key={fmt.id}
                        type="button"
                        onClick={() => setExportFormat(fmt.id)}
                        className={`p-2.5 rounded-xl border flex flex-col items-center text-center transition-all ${
                          exportFormat === fmt.id
                            ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                            : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                        }`}
                      >
                        <Icon className="w-4 h-4 mb-1" />
                        <span className="text-xs font-bold text-zinc-200">{fmt.label}</span>
                        <span className="text-[10px] text-zinc-500">{fmt.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Options */}
              <label className="flex items-center gap-2 p-2.5 bg-zinc-950 rounded-xl border border-zinc-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeSummaries}
                  onChange={(e) => setIncludeSummaries(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-500 bg-zinc-900 border-zinc-700"
                />
                <span className="text-xs text-zinc-300">
                  Include Chapter Outlines / Scene Beats in export
                </span>
              </label>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsExportModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-300"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExportManuscript}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-xs font-bold text-zinc-950 shadow-md"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download File</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};
