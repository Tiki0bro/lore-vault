import React, { useState, useRef } from 'react';
import { useLoreStore } from '../../store/useLoreStore';
import { UniversalWorldImporter } from '../../lib/storage/importers/universalImporter';
import type { ImportPreviewResult } from '../../lib/storage/importers/types';
import { 
  UploadCloud, 
  FileCheck, 
  AlertCircle, 
  X, 
  Layers, 
  MapPin as PinIcon, 
  ShieldAlert, 
  BookOpen, 
  Sparkles 
} from 'lucide-react';

interface WorldImporterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WorldImporterModal: React.FC<WorldImporterModalProps> = ({ isOpen, onClose }) => {
  const { importWorldData, activeWorldId } = useLoreStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState<ImportPreviewResult | null>(null);
  const [importMode, setImportMode] = useState<'new' | 'clean' | 'merge'>('new');
  const [worldNameInput, setWorldNameInput] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleProcessFile = (file: File) => {
    setErrorMessage(null);
    const reader = new FileReader();

    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (!content) {
        setErrorMessage('Empty file content.');
        return;
      }

      const res = UniversalWorldImporter.parse(content, file.name);
      if (!res.isValid) {
        setErrorMessage(res.error || 'Failed to parse file format.');
        setPreview(null);
        return;
      }

      setPreview(res);
      setWorldNameInput(res.world.name);
    };

    reader.onerror = () => {
      setErrorMessage('Could not read the uploaded file.');
    };

    reader.readAsText(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleProcessFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleProcessFile(e.dataTransfer.files[0]);
    }
  };

  const handleConfirmImport = () => {
    if (!preview) return;

    const isClean = importMode === 'clean';
    const isMerge = importMode === 'merge';

    const targetWorldId = isMerge ? activeWorldId : (preview.world.id || `world-${Date.now()}`);

    const finalWorld = {
      ...preview.world,
      id: targetWorldId,
      name: worldNameInput.trim() || preview.world.name,
    };

    // Remap entity worldIds
    const finalArticles = preview.articles.map((a) => ({
      ...a,
      worldId: finalWorld.id,
    }));
    const finalPins = preview.mapPins.map((p) => ({
      ...p,
      worldId: finalWorld.id,
    }));
    const finalStatblocks = preview.statblocks.map((s) => ({
      ...s,
      worldId: finalWorld.id,
    }));

    importWorldData({
      world: finalWorld,
      articles: finalArticles,
      mapPins: finalPins,
      statblocks: finalStatblocks,
      chapters: preview.chapters,
      cleanSlate: isClean,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/15 border border-amber-500/30">
              <UploadCloud className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="font-heading font-bold text-base text-zinc-100">
                Universal World Importer
              </h2>
              <p className="text-xs text-zinc-400">
                Restore V2 Backups, migrate legacy LoreVault repositories, or import Markdown archives
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Dropzone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
              isDragging
                ? 'border-amber-400 bg-amber-500/10 scale-[0.99]'
                : 'border-zinc-700 hover:border-zinc-500 bg-zinc-950/40 hover:bg-zinc-950/60'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,.md,.txt"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="flex flex-col items-center gap-2">
              <div className="p-3 rounded-full bg-zinc-800 border border-zinc-700 text-amber-400">
                <UploadCloud className="w-7 h-7" />
              </div>
              <div className="text-sm font-semibold text-zinc-200">
                Click to browse or drag and drop files here
              </div>
              <p className="text-xs text-zinc-400 max-w-md">
                Supports <strong className="text-amber-400">LoreVault V2 JSON backups</strong>,{' '}
                <strong className="text-amber-400">Legacy Master JSON</strong>, and{' '}
                <strong className="text-amber-400">Obsidian / WorldAnvil Markdown</strong> files
              </p>
            </div>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-950/50 border border-rose-800/80 text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Pre-Flight Preview Card */}
          {preview && preview.isValid && (
            <div className="p-4 rounded-xl bg-zinc-950 border border-amber-500/30 space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileCheck className="w-5 h-5 text-emerald-400" />
                  <span className="font-heading font-bold text-sm text-zinc-100">
                    Pre-Flight Inspection
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {preview.sourceType.replace('_', ' ')}
                </span>
              </div>

              {/* World Name Config */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Target World Name
                </label>
                <input
                  type="text"
                  value={worldNameInput}
                  onChange={(e) => setWorldNameInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-100 text-sm focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* Entity Count Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                <div className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-amber-400" />
                  <div>
                    <div className="text-sm font-bold text-zinc-100">
                      {preview.articles.length}
                    </div>
                    <div className="text-[10px] text-zinc-400">Articles</div>
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center gap-2">
                  <PinIcon className="w-4 h-4 text-amber-400" />
                  <div>
                    <div className="text-sm font-bold text-zinc-100">
                      {preview.mapPins.length}
                    </div>
                    <div className="text-[10px] text-zinc-400">Map Pins</div>
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-400" />
                  <div>
                    <div className="text-sm font-bold text-zinc-100">
                      {preview.statblocks.length}
                    </div>
                    <div className="text-[10px] text-zinc-400">Bestiary</div>
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-amber-400" />
                  <div>
                    <div className="text-sm font-bold text-zinc-100">
                      {preview.chapters.length}
                    </div>
                    <div className="text-[10px] text-zinc-400">Chapters</div>
                  </div>
                </div>
              </div>

              {/* Import Strategy */}
              <div className="pt-2 border-t border-zinc-800/80">
                <div className="text-xs font-semibold text-zinc-300 mb-2">Import Strategy</div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setImportMode('new')}
                    className={`p-2.5 rounded-lg text-xs font-semibold border text-left transition-all ${
                      importMode === 'new'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm ring-1 ring-amber-500/30'
                        : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200 hover:border-zinc-700'
                    }`}
                  >
                    <div className="font-bold text-zinc-200 flex items-center gap-1.5">
                      <span>✨ New Realm</span>
                    </div>
                    <div className="text-[10px] text-zinc-400 mt-1">
                      Adds as an isolated realm alongside existing worlds
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setImportMode('clean')}
                    className={`p-2.5 rounded-lg text-xs font-semibold border text-left transition-all ${
                      importMode === 'clean'
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 shadow-sm ring-1 ring-rose-500/30'
                        : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200 hover:border-zinc-700'
                    }`}
                  >
                    <div className="font-bold text-rose-300 flex items-center gap-1.5">
                      <span>🧹 Clean Slate</span>
                    </div>
                    <div className="text-[10px] text-zinc-400 mt-1">
                      Wipes sample/mixed lore; Dalari becomes your vault
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setImportMode('merge')}
                    className={`p-2.5 rounded-lg text-xs font-semibold border text-left transition-all ${
                      importMode === 'merge'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm ring-1 ring-amber-500/30'
                        : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200 hover:border-zinc-700'
                    }`}
                  >
                    <div className="font-bold text-zinc-200 flex items-center gap-1.5">
                      <span>🔀 Merge In</span>
                    </div>
                    <div className="text-[10px] text-zinc-400 mt-1">
                      Merges articles directly into active realm
                    </div>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-zinc-800 bg-zinc-950 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirmImport}
            disabled={!preview || !preview.isValid}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:pointer-events-none text-zinc-950 text-xs font-bold transition-all shadow-md shadow-amber-500/20"
          >
            <Sparkles className="w-4 h-4" />
            <span>Confirm & Import Realm</span>
          </button>
        </div>
      </div>
    </div>
  );
};
