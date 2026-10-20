import React, { useState } from 'react';
import { useLoreStore } from '../../store/useLoreStore';
import type { TerritoryPolygon } from '../../types/lore';
import { Shield, Crown, AlertTriangle, X } from 'lucide-react';

interface TerritoryPolygonLayerProps {
  mapId: string;
  width: number;
  height: number;
  isDrawingMode: boolean;
  selectedTerritoryId?: string | null;
  onSelectTerritory?: (terr: TerritoryPolygon) => void;
  onFinishDrawing?: (points: Array<{ xPct: number; yPct: number }>) => void;
  onCancelDrawing?: () => void;
}

export const TerritoryPolygonLayer: React.FC<TerritoryPolygonLayerProps> = ({
  width,
  height,
  isDrawingMode,
  selectedTerritoryId,
  onSelectTerritory,
  onFinishDrawing,
  onCancelDrawing,
}) => {
  const { territories, activeWorldId, isPlayerMode, deleteTerritory } = useLoreStore();

  const [activeHoverTerritory, setActiveHoverTerritory] = useState<TerritoryPolygon | null>(null);
  const [hoverPosition, setHoverPosition] = useState<{ x: number; y: number } | null>(null);
  const [drawingPoints, setDrawingPoints] = useState<Array<{ xPct: number; yPct: number }>>([]);

  const visibleTerritories = territories.filter((t) => t.worldId === activeWorldId && (!isPlayerMode || !t.isSecret));

  // SVG coordinate transformation
  const toSvgCoords = (pts: Array<{ xPct: number; yPct: number }>) => {
    return pts.map((p) => `${(p.xPct / 100) * width},${(p.yPct / 100) * height}`).join(' ');
  };

  // Compute polygon centroid
  const getCentroid = (pts: Array<{ xPct: number; yPct: number }>) => {
    if (!pts.length) return { x: 0, y: 0 };
    const sumX = pts.reduce((acc, p) => acc + (p.xPct / 100) * width, 0);
    const sumY = pts.reduce((acc, p) => acc + (p.yPct / 100) * height, 0);
    return {
      x: sumX / pts.length,
      y: sumY / pts.length,
    };
  };

  // Handle clicking on map while in drawing mode
  const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!isDrawingMode) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const xPct = Math.round(((e.clientX - rect.left) / rect.width) * 1000) / 10;
    const yPct = Math.round(((e.clientY - rect.top) / rect.height) * 1000) / 10;

    setDrawingPoints((prev) => [...prev, { xPct, yPct }]);
  };

  const handleCompleteCurrent = () => {
    if (drawingPoints.length >= 3 && onFinishDrawing) {
      onFinishDrawing(drawingPoints);
      setDrawingPoints([]);
    }
  };

  const handleCancelCurrent = () => {
    setDrawingPoints([]);
    if (onCancelDrawing) onCancelDrawing();
  };

  return (
    <>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        onClick={handleSvgClick}
        className={`absolute inset-0 z-15 w-full h-full ${
          isDrawingMode ? 'cursor-crosshair pointer-events-auto' : 'pointer-events-auto'
        }`}
      >
        {/* Render Established Territories */}
        {visibleTerritories.map((terr) => {
          const pointsString = toSvgCoords(terr.points);
          const centroid = getCentroid(terr.points);
          const isHovered = activeHoverTerritory?.id === terr.id;
          const isSelected = selectedTerritoryId === terr.id;

          return (
            <g key={terr.id}>
              {/* Boundary Polygon */}
              <polygon
                points={pointsString}
                fill={terr.color}
                fillOpacity={isSelected ? terr.fillOpacity + 0.35 : isHovered ? terr.fillOpacity + 0.18 : terr.fillOpacity}
                stroke={isSelected ? '#ffffff' : terr.color}
                strokeWidth={isSelected ? 3.5 : isHovered ? 2.8 : 1.8}
                strokeDasharray={isSelected ? 'none' : '6 3'}
                className="transition-all duration-200 cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  if (!isDrawingMode && onSelectTerritory) {
                    onSelectTerritory(terr);
                  }
                }}
                onMouseEnter={(e) => {
                  setActiveHoverTerritory(terr);
                  setHoverPosition({ x: e.clientX, y: e.clientY });
                }}
                onMouseLeave={() => setActiveHoverTerritory(null)}
              />

              {/* Faction Centroid Crest Shield */}
              <g
                transform={`translate(${centroid.x - 14}, ${centroid.y - 14})`}
                className="cursor-pointer select-none transition-transform hover:scale-125"
                onClick={(e) => {
                  e.stopPropagation();
                  if (!isDrawingMode && onSelectTerritory) {
                    onSelectTerritory(terr);
                  }
                }}
              >
                <circle
                  cx="14"
                  cy="14"
                  r={isSelected ? 16 : 14}
                  fill="#09090b"
                  stroke={isSelected ? '#ffffff' : terr.color}
                  strokeWidth={isSelected ? 3 : 2}
                  className="shadow-xl"
                />
                <Shield
                  x="5"
                  y="5"
                  width="18"
                  height="18"
                  color={isSelected ? '#ffffff' : terr.color}
                  className="animate-in zoom-in-50 duration-150"
                />
              </g>
            </g>
          );
        })}

        {/* Render Active Drawing Line & Vertices */}
        {isDrawingMode && drawingPoints.length > 0 && (
          <g>
            <polyline
              points={toSvgCoords(drawingPoints)}
              fill="none"
              stroke="#f59e0b"
              strokeWidth="2.5"
              strokeDasharray="4 4"
            />
            {drawingPoints.map((pt, idx) => (
              <circle
                key={idx}
                cx={(pt.xPct / 100) * width}
                cy={(pt.yPct / 100) * height}
                r="5"
                fill="#fbbf24"
                stroke="#09090b"
                strokeWidth="2"
              />
            ))}
          </g>
        )}
      </svg>

      {/* Drawing Toolbar Overlay */}
      {isDrawingMode && (
        <div className="absolute top-16 left-4 z-30 bg-zinc-900/95 border border-zinc-800 rounded-xl p-3 shadow-2xl backdrop-blur-md flex items-center gap-2 animate-in fade-in duration-150">
          <span className="text-xs text-zinc-300 font-semibold">
            Vertices: <strong className="text-amber-400 font-mono">{drawingPoints.length}</strong> (min 3)
          </span>
          <button
            onClick={handleCompleteCurrent}
            disabled={drawingPoints.length < 3}
            className="px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:pointer-events-none text-zinc-950 text-xs font-bold transition-all cursor-pointer"
          >
            Finish Boundary
          </button>
          <button
            onClick={handleCancelCurrent}
            className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Hover Information Tooltip Card */}
      {activeHoverTerritory && hoverPosition && !isDrawingMode && (
        <div
          style={{
            position: 'fixed',
            left: `${hoverPosition.x + 16}px`,
            top: `${hoverPosition.y - 40}px`,
          }}
          onClick={() => {
            if (onSelectTerritory) onSelectTerritory(activeHoverTerritory);
          }}
          className="z-40 w-64 bg-zinc-900/95 border border-zinc-800 rounded-xl p-3 shadow-2xl backdrop-blur-md animate-in fade-in duration-100 space-y-1.5 cursor-pointer hover:border-amber-500/50 transition-colors pointer-events-auto"
        >
          <div className="flex items-center justify-between">
            <span
              className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded"
              style={{
                backgroundColor: `${activeHoverTerritory.color}25`,
                color: activeHoverTerritory.color,
              }}
            >
              Territory
            </span>
            <span className="text-[10px] font-mono font-bold text-zinc-400">
              {activeHoverTerritory.controlPct}% Control
            </span>
          </div>

          <h4 className="font-heading font-bold text-sm text-zinc-100 leading-tight">
            {activeHoverTerritory.name}
          </h4>

          <div className="space-y-1 text-[11px] text-zinc-400 pt-1 border-t border-zinc-800">
            <div className="flex items-center gap-1.5 text-zinc-300">
              <Shield className="w-3 h-3 text-amber-400" />
              <span>{activeHoverTerritory.factionName}</span>
            </div>
            {activeHoverTerritory.ruler && (
              <div className="flex items-center gap-1.5 text-zinc-400">
                <Crown className="w-3 h-3 text-amber-400" />
                <span>{activeHoverTerritory.ruler}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 text-zinc-400">
              <AlertTriangle className="w-3 h-3 text-amber-500" />
              <span>Threat Level: <strong className="text-zinc-200">{activeHoverTerritory.threatLevel}</strong></span>
            </div>
          </div>

          {activeHoverTerritory.notes && (
            <p className="text-[10px] text-zinc-500 italic pt-1">
              "{activeHoverTerritory.notes}"
            </p>
          )}

          <div className="pt-1.5 border-t border-zinc-800 flex items-center justify-between text-[10px]">
            <span className="text-amber-400 font-semibold flex items-center gap-1">
              <span>Click to view Lore Cards</span>
              <span>→</span>
            </span>
          </div>

          {!isPlayerMode && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                deleteTerritory(activeHoverTerritory.id);
              }}
              className="w-full text-center text-[10px] text-rose-400 hover:text-rose-300 pt-1 cursor-pointer"
            >
              [Delete Territory]
            </button>
          )}
        </div>
      )}
    </>
  );
};
