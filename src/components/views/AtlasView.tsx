import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useLoreStore } from '../../store/useLoreStore';
import { PerlinCartographyEngine } from '../../lib/cartography/perlinGenerator';
import { FogOfWarLayer } from '../cartography/FogOfWarLayer';
import { TerritoryPolygonLayer } from '../cartography/TerritoryPolygonLayer';
import { ExpeditionRouteLayer } from '../cartography/ExpeditionRouteLayer';
import { TerritoryLoreDrawer } from '../cartography/TerritoryLoreDrawer';
import type { MapPin, TerritoryPolygon } from '../../types/lore';
import { resolveAssetUrl } from '../../lib/storage/vaultStorage';
import { 
  GiCastle, 
  GiCaveEntrance, 
  GiObelisk, 
  GiBeerStein, 
  GiDragonHead,
  GiFootsteps,
  GiHorseHead,
  GiSail,
  GiPadlock
} from 'react-icons/gi';
import { 
  Plus, 
  Compass, 
  X, 
  Trash2, 
  Shield, 
  Dices,
  Eraser
} from 'lucide-react';

export const AtlasView: React.FC = () => {
  const { 
    mapPins, 
    articles,
    setSelectedArticleId,
    setActiveView,
    activeWorldId, 
    isPlayerMode, 
    addMapPin, 
    deleteMapPin,
    isFogLayerEnabled,
    toggleFogLayer,
    isTerritoryLayerEnabled,
    toggleTerritoryLayer,
    isRouteLayerEnabled,
    toggleRouteLayer,
    addTerritory,
    territories
  } = useLoreStore();

  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [travelMode, setTravelMode] = useState<'foot' | 'horse' | 'sail'>('foot');
  const [mapSeed, setMapSeed] = useState<number>(42069);
  const [mapStyle, setMapStyle] = useState<'dalari' | 'dalari_clouds' | 'procedural'>('dalari');
  const [mapImageSrc, setMapImageSrc] = useState<string>('/images/dalari/world/Dalari_Splitting_The_World.png');
  const [isDropPinActive, setIsDropPinActive] = useState<boolean>(false);
  const [selectedPin, setSelectedPin] = useState<MapPin | null>(null);
  const [selectedTerritory, setSelectedTerritory] = useState<TerritoryPolygon | null>(null);

  const activeSelectedTerritory = useMemo(() => {
    if (!selectedTerritory) return null;
    return territories.find((t) => t.id === selectedTerritory.id) || selectedTerritory;
  }, [selectedTerritory, territories]);

  // Cartography Layer Sub-Modes
  const [isEditingFog, setIsEditingFog] = useState<boolean>(false);
  const [isDrawingTerritory, setIsDrawingTerritory] = useState<boolean>(false);
  const [pendingTerritoryPoints, setPendingTerritoryPoints] = useState<Array<{ xPct: number; yPct: number }> | null>(null);
  const [newTerritoryName, setNewTerritoryName] = useState<string>('');
  const [newTerritoryFaction, setNewTerritoryFaction] = useState<string>('');
  const [newTerritoryColor, setNewTerritoryColor] = useState<string>('#f59e0b');

  // New Pin Modal State
  const [pendingPinCoords, setPendingPinCoords] = useState<{ xPct: number; yPct: number } | null>(null);
  const [newPinLabel, setNewPinLabel] = useState<string>('');
  const [newPinCategory, setNewPinCategory] = useState<MapPin['category']>('Settlement');
  const [newPinSecret, setNewPinSecret] = useState<boolean>(false);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const MAP_WIDTH = 900;
  const MAP_HEIGHT = 560;

  // Update map background when mapStyle or seed changes
  useEffect(() => {
    if (mapStyle === 'dalari') {
      setMapImageSrc(resolveAssetUrl('/images/dalari/world/Dalari_Splitting_The_World.png'));
    } else if (mapStyle === 'dalari_clouds') {
      setMapImageSrc(resolveAssetUrl('/images/dalari/world/Dalari_Standing_In_The_Clouds.png'));
    } else {
      const engine = new PerlinCartographyEngine(mapSeed);
      const dataUrl = engine.generateMapDataUrl({
        seed: mapSeed,
        width: MAP_WIDTH,
        height: MAP_HEIGHT,
        theme: 'vintage',
        preset: 'continental',
      });
      setMapImageSrc(dataUrl);
    }
  }, [mapStyle, mapSeed]);

  // Filter pins based on category and DM player mode
  const visiblePins = useMemo(() => {
    return mapPins
      .filter((pin) => !isPlayerMode || !pin.isSecret)
      .filter((pin) => {
        if (selectedFilter === 'all') return true;
        return pin.category.toLowerCase() === selectedFilter.toLowerCase();
      });
  }, [mapPins, isPlayerMode, selectedFilter]);

  // Handle map click to drop pin
  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDropPinActive || !mapContainerRef.current) return;

    const rect = mapContainerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const xPct = Math.round((clickX / rect.width) * 1000) / 10;
    const yPct = Math.round((clickY / rect.height) * 1000) / 10;

    setPendingPinCoords({ xPct, yPct });
    setNewPinLabel('');
    setIsDropPinActive(false);
  };

  const handleConfirmAddPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingPinCoords || !newPinLabel.trim()) return;

    const newPin: MapPin = {
      id: `pin-${Date.now()}`,
      mapId: 'map-default',
      worldId: activeWorldId,
      label: newPinLabel.trim(),
      xPct: pendingPinCoords.xPct,
      yPct: pendingPinCoords.yPct,
      category: newPinCategory,
      icon: newPinCategory === 'Settlement' ? 'castle' : newPinCategory === 'Dungeon' ? 'cave' : 'obelisk',
      color: newPinCategory === 'Settlement' ? '#f59e0b' : newPinCategory === 'Dungeon' ? '#a855f7' : '#06b6d4',
      isSecret: newPinSecret,
    };

    addMapPin(newPin);
    setPendingPinCoords(null);
  };

  const handleSaveDrawnTerritory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingTerritoryPoints || !newTerritoryName.trim()) return;

    const newTerr: TerritoryPolygon = {
      id: `terr-${Date.now()}`,
      mapId: 'map-default',
      worldId: activeWorldId,
      name: newTerritoryName.trim(),
      factionName: newTerritoryFaction.trim() || 'Independent',
      color: newTerritoryColor,
      fillOpacity: 0.25,
      points: pendingTerritoryPoints,
      controlPct: 70,
      threatLevel: 'Medium',
      isSecret: false,
    };

    addTerritory(newTerr);
    setPendingTerritoryPoints(null);
    setIsDrawingTerritory(false);
  };

  const getPinIcon = (cat: string) => {
    switch (cat.toLowerCase()) {
      case 'settlement':
        return <GiCastle className="w-4 h-4 text-amber-400" />;
      case 'dungeon':
        return <GiCaveEntrance className="w-4 h-4 text-purple-400" />;
      case 'monolith':
        return <GiObelisk className="w-4 h-4 text-cyan-400" />;
      case 'tavern':
        return <GiBeerStein className="w-4 h-4 text-emerald-400" />;
      default:
        return <GiDragonHead className="w-4 h-4 text-rose-400" />;
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-950 overflow-hidden select-none relative">
      {/* Top Map Toolbar */}
      <div className="h-14 border-b border-zinc-800 bg-zinc-900/60 px-4 flex items-center justify-between gap-4 flex-shrink-0 z-20">
        {/* Left: Action Tools */}
        <div className="flex items-center gap-2">
          {/* Drop Pin Action */}
          <button
            onClick={() => {
              setIsDropPinActive(!isDropPinActive);
              setIsDrawingTerritory(false);
              setIsEditingFog(false);
            }}
            className={`btn-tactile flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
              isDropPinActive 
                ? 'bg-amber-500 text-zinc-950 border-amber-400 shadow-md shadow-amber-500/20' 
                : 'bg-zinc-800 text-zinc-200 border-zinc-700 hover:bg-zinc-700'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{isDropPinActive ? 'Click Map to Place' : 'Drop Pin'}</span>
          </button>

          {/* Draw Territory Action */}
          <button
            onClick={() => {
              setIsDrawingTerritory(!isDrawingTerritory);
              setIsDropPinActive(false);
              setIsEditingFog(false);
            }}
            className={`btn-tactile flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
              isDrawingTerritory
                ? 'bg-amber-500 text-zinc-950 border-amber-400 shadow-md shadow-amber-500/20' 
                : 'bg-zinc-800 text-zinc-200 border-zinc-700 hover:bg-zinc-700'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>{isDrawingTerritory ? 'Drawing Borders...' : 'Draw Territory'}</span>
          </button>

          {/* Fog of War Brush Tool */}
          <button
            onClick={() => {
              setIsEditingFog(!isEditingFog);
              setIsDropPinActive(false);
              setIsDrawingTerritory(false);
            }}
            className={`btn-tactile flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
              isEditingFog
                ? 'bg-amber-500 text-zinc-950 border-amber-400 shadow-md shadow-amber-500/20' 
                : 'bg-zinc-800 text-zinc-200 border-zinc-700 hover:bg-zinc-700'
            }`}
          >
            <Eraser className="w-3.5 h-3.5" />
            <span>{isEditingFog ? 'Fog Brush Active' : 'Edit Fog'}</span>
          </button>

          {/* Map Surface Selector */}
          <div className="flex items-center p-0.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs">
            <button
              onClick={() => setMapStyle('dalari')}
              className={`px-2 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                mapStyle === 'dalari' ? 'bg-amber-500/20 text-amber-300' : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Dalari Splitting The World Canon Map"
            >
              Splitting The World
            </button>
            <button
              onClick={() => setMapStyle('dalari_clouds')}
              className={`px-2 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                mapStyle === 'dalari_clouds' ? 'bg-amber-500/20 text-amber-300' : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Dalari In The Clouds Canon Map"
            >
              In The Clouds
            </button>
            <button
              onClick={() => setMapStyle('procedural')}
              className={`px-2 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                mapStyle === 'procedural' ? 'bg-amber-500/20 text-amber-300' : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Procedural Perlin Island Map"
            >
              Procedural
            </button>
          </div>

          {/* Reroll Procedural Seed (shown when procedural) */}
          {mapStyle === 'procedural' && (
            <button
              onClick={() => setMapSeed(Math.floor(Math.random() * 100000))}
              className="btn-tactile flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
              title="Generate new procedural landmass"
            >
              <Dices className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Reroll Island</span>
            </button>
          )}
        </div>

        {/* Center: Layer Visibility Toggles */}
        <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-lg border border-zinc-800 text-xs">
          <span className="text-[10px] font-bold text-zinc-500 uppercase px-1.5">Layers:</span>
          <button
            onClick={toggleTerritoryLayer}
            className={`btn-pill px-2 py-0.5 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
              isTerritoryLayerEnabled ? 'bg-amber-500/20 text-amber-300' : 'text-zinc-500'
            }`}
          >
            🚩 Borders
          </button>
          <button
            onClick={toggleRouteLayer}
            className={`btn-pill px-2 py-0.5 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
              isRouteLayerEnabled ? 'bg-amber-500/20 text-amber-300' : 'text-zinc-500'
            }`}
          >
            🧭 Routes
          </button>
          <button
            onClick={toggleFogLayer}
            className={`btn-pill px-2 py-0.5 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
              isFogLayerEnabled ? 'bg-amber-500/20 text-amber-300' : 'text-zinc-500'
            }`}
          >
            🌫️ Fog
          </button>
        </div>

        {/* Right: Pin Category Filter Chips */}
        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center gap-1 bg-zinc-950 p-1 rounded-lg border border-zinc-800 text-xs">
            {['all', 'settlement', 'dungeon', 'monolith'].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedFilter(cat)}
                className={`btn-pill px-2 py-0.5 rounded capitalize transition-all cursor-pointer ${
                  selectedFilter === cat
                    ? 'bg-amber-500/20 text-amber-300 font-semibold'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Travel Pace */}
          <div className="hidden lg:flex bg-zinc-950 p-0.5 rounded border border-zinc-800 text-xs">
            <button 
              onClick={() => setTravelMode('foot')}
              className={`btn-pill px-2 py-0.5 rounded flex items-center gap-1 cursor-pointer ${travelMode === 'foot' ? 'bg-amber-500/20 text-amber-300 font-semibold' : 'text-zinc-500'}`}
            >
              <GiFootsteps className="w-3.5 h-3.5" /> Foot
            </button>
            <button 
              onClick={() => setTravelMode('horse')}
              className={`btn-pill px-2 py-0.5 rounded flex items-center gap-1 cursor-pointer ${travelMode === 'horse' ? 'bg-amber-500/20 text-amber-300 font-semibold' : 'text-zinc-500'}`}
            >
              <GiHorseHead className="w-3.5 h-3.5" /> Mount
            </button>
            <button 
              onClick={() => setTravelMode('sail')}
              className={`btn-pill px-2 py-0.5 rounded flex items-center gap-1 cursor-pointer ${travelMode === 'sail' ? 'bg-amber-500/20 text-amber-300 font-semibold' : 'text-zinc-500'}`}
            >
              <GiSail className="w-3.5 h-3.5" /> Sail
            </button>
          </div>
        </div>
      </div>

      {/* Main Map Viewport Surface */}
      <div className="flex-1 overflow-auto bg-zinc-950 flex items-center justify-center p-6 relative">
        <div 
          ref={mapContainerRef}
          onClick={handleMapClick}
          className={`relative max-w-4xl w-full aspect-[9/5.6] rounded-2xl border-2 border-amber-900/40 bg-zinc-900 shadow-2xl overflow-hidden transition-all ${
            isDropPinActive ? 'cursor-crosshair ring-2 ring-amber-500' : 'cursor-default'
          }`}
          style={{
            backgroundImage: `url(${mapImageSrc})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          {/* Overlay vignette */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/30 pointer-events-none" />

          {/* LAYER 1: Geopolitical Territory Boundaries */}
          {isTerritoryLayerEnabled && (
            <TerritoryPolygonLayer
              mapId="map-default"
              width={MAP_WIDTH}
              height={MAP_HEIGHT}
              isDrawingMode={isDrawingTerritory}
              selectedTerritoryId={selectedTerritory?.id}
              onSelectTerritory={(terr) => {
                setSelectedTerritory(terr);
                setSelectedPin(null);
              }}
              onFinishDrawing={(points) => {
                setPendingTerritoryPoints(points);
                setNewTerritoryName('');
                setNewTerritoryFaction('');
              }}
              onCancelDrawing={() => setIsDrawingTerritory(false)}
            />
          )}

          {/* LAYER 2: Expedition Travel Routes */}
          {isRouteLayerEnabled && (
            <ExpeditionRouteLayer
              mapId="map-default"
              width={MAP_WIDTH}
              height={MAP_HEIGHT}
            />
          )}

          {/* LAYER 3: Map Pins at (xPct, yPct) */}
          {visiblePins.map((pin) => (
            <div
              key={pin.id}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedPin(pin);
              }}
              className="absolute -translate-x-1/2 -translate-y-1/2 group cursor-pointer z-19"
              style={{ left: `${pin.xPct}%`, top: `${pin.yPct}%` }}
            >
              <div className="relative">
                <div className="p-1.5 rounded-full bg-zinc-950/90 border-2 border-amber-500/80 shadow-lg group-hover:scale-125 transition-transform">
                  {getPinIcon(pin.category)}
                </div>
                {pin.isSecret && (
                  <GiPadlock className="w-2.5 h-2.5 text-rose-500 absolute -top-1 -right-1" />
                )}
              </div>

              <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1 px-2 py-0.5 rounded bg-zinc-950/90 border border-zinc-800 text-[10px] font-bold text-zinc-200 whitespace-nowrap opacity-80 group-hover:opacity-100 shadow-md">
                {pin.label}
              </div>
            </div>
          ))}

          {/* LAYER 4: Tactical Fog-of-War Layer */}
          {isFogLayerEnabled && (
            <FogOfWarLayer
              mapId="map-default"
              width={MAP_WIDTH}
              height={MAP_HEIGHT}
              isEditMode={isEditingFog}
              onToggleEditMode={() => setIsEditingFog(!isEditingFog)}
            />
          )}

          {/* Compass & Scale Calibration Badge */}
          <div className="absolute bottom-3 right-3 text-[11px] font-mono text-zinc-400 bg-zinc-950/90 border border-zinc-800 px-2.5 py-1 rounded backdrop-blur pointer-events-none flex items-center gap-2 z-25">
            <Compass className="w-3.5 h-3.5 text-amber-400" />
            <span>100px = 50 miles · {visiblePins.length} Pins</span>
          </div>
        </div>

        {/* Pin Inspection Modal Drawer */}
        {selectedPin && (
          <div className="absolute bottom-6 left-6 z-35 w-72 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl p-4 flex flex-col gap-2.5 animate-in slide-in-from-bottom-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <div className="flex items-center gap-2">
                {getPinIcon(selectedPin.category)}
                <span className="font-heading font-bold text-xs text-zinc-100">
                  {selectedPin.label}
                </span>
              </div>
              <button onClick={() => setSelectedPin(null)} className="text-zinc-500 hover:text-zinc-300 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-zinc-400">
                <span>Category:</span>
                <span className="text-zinc-200 font-medium">{selectedPin.category}</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Coordinates:</span>
                <span className="text-zinc-300 font-mono">({selectedPin.xPct}%, {selectedPin.yPct}%)</span>
              </div>
              {selectedPin.isSecret && (
                <div className="px-2 py-1 rounded bg-rose-950/50 border border-rose-800/80 text-rose-300 text-[10px] font-semibold flex items-center gap-1.5">
                  <GiPadlock className="w-3 h-3" />
                  <span>DM Secret Location</span>
                </div>
              )}

              {/* Linked Article Card with Cover Thumbnail */}
              {(() => {
                const linkedArticle = articles.find(
                  (a) => a.id === selectedPin.articleId || a.title.toLowerCase() === selectedPin.label.toLowerCase()
                );
                if (!linkedArticle) return null;
                return (
                  <div className="p-2 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center gap-2.5 mt-1">
                    {linkedArticle.coverImageUrl && (
                      <div className="w-10 h-10 rounded-md overflow-hidden bg-black/40 flex-shrink-0 border border-amber-500/30">
                        <img src={linkedArticle.coverImageUrl} alt={linkedArticle.title} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-bold text-zinc-200 truncate">{linkedArticle.title}</div>
                      <div className="text-[10px] text-zinc-400 capitalize">{linkedArticle.category}</div>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedArticleId(linkedArticle.id);
                        setActiveView('manuscript');
                      }}
                      className="px-2 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[10px] font-bold transition-colors cursor-pointer flex-shrink-0"
                      title="Read article in manuscript studio"
                    >
                      Read →
                    </button>
                  </div>
                );
              })()}
            </div>

            <div className="pt-2 border-t border-zinc-800 flex justify-between items-center">
              <button
                onClick={() => {
                  deleteMapPin(selectedPin.id);
                  setSelectedPin(null);
                }}
                className="flex items-center gap-1 text-[11px] text-rose-400 hover:text-rose-300 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove Pin</span>
              </button>
            </div>
          </div>
        )}

        {/* Drop Pin Creation Modal */}
        {pendingPinCoords && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl p-5 flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div className="flex items-center gap-2">
                  <Plus className="w-4 h-4 text-amber-400" />
                  <h3 className="font-heading font-bold text-sm text-zinc-100">New Map Landmark</h3>
                </div>
                <button onClick={() => setPendingPinCoords(null)} className="text-zinc-400 hover:text-zinc-200 cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleConfirmAddPin} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">Landmark Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Whispering Bog"
                    value={newPinLabel}
                    onChange={(e) => setNewPinLabel(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-100 focus:outline-none focus:border-amber-400"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">Category</label>
                  <select
                    value={newPinCategory}
                    onChange={(e) => setNewPinCategory(e.target.value as any)}
                    className="w-full px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-100 focus:outline-none focus:border-amber-400"
                  >
                    <option value="Settlement">Settlement (Castle / Village)</option>
                    <option value="Dungeon">Dungeon (Crypt / Cavern)</option>
                    <option value="Monolith">Monolith (Rune Shrine)</option>
                    <option value="Tavern">Tavern (Waystation)</option>
                    <option value="Danger">Danger (Lair / Hazard)</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="secretPinCheck"
                    checked={newPinSecret}
                    onChange={(e) => setNewPinSecret(e.target.checked)}
                    className="rounded bg-zinc-950 border-zinc-800 text-amber-500 focus:ring-0 cursor-pointer"
                  />
                  <label htmlFor="secretPinCheck" className="text-xs text-zinc-300 cursor-pointer">
                    DM Secret (Hide from Player View)
                  </label>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setPendingPinCoords(null)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-zinc-400 hover:text-zinc-200 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-400 text-zinc-950 transition-colors cursor-pointer shadow-xs"
                  >
                    Save Pin
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Territory Creation Modal (upon finishing boundary drawing) */}
        {pendingTerritoryPoints && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl p-5 flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-amber-400" />
                  <h3 className="font-heading font-bold text-sm text-zinc-100">Establish Territory</h3>
                </div>
                <button onClick={() => setPendingTerritoryPoints(null)} className="text-zinc-400 hover:text-zinc-200 cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveDrawnTerritory} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">Territory / Province Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ironpeak Marches"
                    value={newTerritoryName}
                    onChange={(e) => setNewTerritoryName(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-100 focus:outline-none focus:border-amber-400"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">Ruling Faction</label>
                  <input
                    type="text"
                    placeholder="e.g. Ironfang Clan"
                    value={newTerritoryFaction}
                    onChange={(e) => setNewTerritoryFaction(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-100 focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">Border Color</label>
                  <div className="flex items-center gap-2">
                    {['#f59e0b', '#10b981', '#8b5cf6', '#e11d48', '#06b6d4'].map((col) => (
                      <button
                        key={col}
                        type="button"
                        onClick={() => setNewTerritoryColor(col)}
                        style={{ backgroundColor: col }}
                        className={`w-6 h-6 rounded-full cursor-pointer transition-transform ${
                          newTerritoryColor === col ? 'scale-125 ring-2 ring-white' : 'opacity-70'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setPendingTerritoryPoints(null)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-zinc-400 hover:text-zinc-200 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-400 text-zinc-950 transition-colors cursor-pointer shadow-xs"
                  >
                    Save Territory
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* Territory Lore Cards Drawer */}
      <TerritoryLoreDrawer
        territory={activeSelectedTerritory}
        onClose={() => setSelectedTerritory(null)}
      />
    </div>
  );
};
