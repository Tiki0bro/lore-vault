import React, { useState, useRef, useEffect } from 'react';
import { useLoreStore } from '../../store/useLoreStore';
import type { ThemeMode } from '../../types/lore';
import { Palette, Check } from 'lucide-react';

interface ThemeOption {
  id: ThemeMode;
  name: string;
  tagline: string;
  dotColor: string;
  bgPreview: string;
}

const THEMES: ThemeOption[] = [
  {
    id: 'ancient-codex',
    name: 'Ancient Codex',
    tagline: 'Molten Gold & Candlelit Obsidian',
    dotColor: '#f59e0b',
    bgPreview: '#0b0907',
  },
  {
    id: 'radiant-arcane',
    name: 'Radiant Arcane',
    tagline: 'Aether Cyan & Astral Glass',
    dotColor: '#00d8f6',
    bgPreview: '#02040a',
  },
  {
    id: 'grimdark-iron',
    name: 'Grimdark Iron',
    tagline: 'Blood Crimson & Volcanic Basalt',
    dotColor: '#e11d48',
    bgPreview: '#080607',
  },
  {
    id: 'scholars-parchment',
    name: "Scholar's Parchment",
    tagline: 'Ivory Vellum & Medieval Ink (Light)',
    dotColor: '#b45309',
    bgPreview: '#faf6ed',
  },
];

export const ThemeSelector: React.FC = () => {
  const { theme, setTheme } = useLoreStore();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const current = THEMES.find((t) => t.id === theme) || THEMES[0];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="btn-tactile group flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-xs font-semibold text-zinc-300 hover:text-zinc-100 transition-colors cursor-pointer"
        title="Change App Theme Mode"
      >
        <span
          className="w-2.5 h-2.5 rounded-full inline-block border border-black/40 shadow-xs"
          style={{ backgroundColor: current.dotColor }}
        />
        <Palette className="w-3.5 h-3.5 text-zinc-400 group-hover:-rotate-12 transition-transform duration-200" />
        <span className="hidden xl:inline text-xs">{current.name}</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 rounded-xl bg-zinc-900 border border-zinc-800 shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-100">
          <div className="px-2 py-1 text-[11px] font-bold text-zinc-400 uppercase tracking-wider border-b border-zinc-800/80 mb-1">
            Theme Aesthetics
          </div>
          <div className="space-y-1">
            {THEMES.map((t) => {
              const isSelected = t.id === theme;
              return (
                <button
                  key={t.id}
                  onClick={() => {
                    setTheme(t.id);
                    setIsOpen(false);
                  }}
                  className={`btn-pill w-full flex items-center justify-between p-2 rounded-lg text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-zinc-800 text-zinc-100 font-bold border border-zinc-700'
                      : 'hover:bg-zinc-800/60 text-zinc-300 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-4 h-4 rounded-full border border-black/40 shadow-xs flex-shrink-0"
                      style={{ backgroundColor: t.dotColor }}
                    />
                    <div>
                      <div className="text-xs font-heading">{t.name}</div>
                      <div className="text-[10px] text-zinc-400 font-sans">{t.tagline}</div>
                    </div>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-amber-400 flex-shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
