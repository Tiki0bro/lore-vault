import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useLoreStore } from '../../store/useLoreStore';
import { 
  Eye, 
  EyeOff, 
  Eraser, 
  Brush, 
  Save, 
  Check, 
  Layers 
} from 'lucide-react';

interface FogOfWarLayerProps {
  mapId: string;
  width: number;
  height: number;
  isEditMode: boolean;
  onToggleEditMode: () => void;
}

export const FogOfWarLayer: React.FC<FogOfWarLayerProps> = ({
  mapId,
  width,
  height,
  isEditMode,
  onToggleEditMode,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);

  const { 
    isPlayerMode, 
    fogBrushMode, 
    setFogBrushMode, 
    fogBrushSize, 
    setFogBrushSize,
    saveFogData,
    getFogData 
  } = useLoreStore();

  const [isSavedRecently, setIsSavedRecently] = useState(false);

  // Initialize or restore fog canvas
  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const savedData = getFogData(mapId);
    if (savedData) {
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
      };
      img.src = savedData;
    } else {
      // Default: Fill 85% of map with fog, revealing center starting area
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = '#050505';
      ctx.fillRect(0, 0, width, height);

      // Cut out starting area in center
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.arc(width * 0.35, height * 0.38, 120, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
    }
  }, [mapId, width, height, getFogData]);

  useEffect(() => {
    initCanvas();
  }, [initCanvas]);

  // Paint onto fog canvas
  const paintAt = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = (clientX - rect.left) * (canvas.width / rect.width);
    const y = (clientY - rect.top) * (canvas.height / rect.height);

    ctx.save();
    if (fogBrushMode === 'reveal') {
      // Cut transparent hole
      ctx.globalCompositeOperation = 'destination-out';
      const grad = ctx.createRadialGradient(x, y, fogBrushSize * 0.4, x, y, fogBrushSize);
      grad.addColorStop(0, 'rgba(0,0,0,1)');
      grad.addColorStop(1, 'rgba(0,0,0,0.8)');
      ctx.fillStyle = grad;
    } else {
      // Conceal with solid fog
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = '#050505';
    }

    ctx.beginPath();
    ctx.arc(x, y, fogBrushSize, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isEditMode) return;
    isDrawingRef.current = true;
    paintAt(e.clientX, e.clientY);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawingRef.current || !isEditMode) return;
    paintAt(e.clientX, e.clientY);
  };

  const handleMouseUp = () => {
    if (isDrawingRef.current) {
      isDrawingRef.current = false;
      handleSave();
    }
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    saveFogData(mapId, dataUrl);
    setIsSavedRecently(true);
    setTimeout(() => setIsSavedRecently(false), 1200);
  };

  const handleFillAll = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, width, height);
    handleSave();
  };

  const handleClearAll = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);
    handleSave();
  };

  // GM Mode = 40% translucent opacity with subtle golden grid; Player Mode = 100% solid opacity
  const layerOpacity = isPlayerMode ? 1.0 : 0.45;

  return (
    <>
      {/* Canvas Viewport */}
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ opacity: layerOpacity }}
        className={`absolute inset-0 z-20 pointer-events-auto transition-opacity duration-300 ${
          isEditMode ? 'cursor-crosshair' : 'pointer-events-none'
        }`}
      />

      {/* Floating Fog Control Dock */}
      {isEditMode && (
        <div className="absolute top-16 right-4 z-30 bg-zinc-900/95 border border-zinc-800 rounded-xl p-3 shadow-2xl backdrop-blur-md flex flex-col gap-3 w-64 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
            <div className="flex items-center gap-1.5 text-xs font-heading font-bold text-amber-200">
              <Layers className="w-4 h-4 text-amber-400" />
              <span>Fog of War Brush</span>
            </div>
            <button
              onClick={onToggleEditMode}
              className="text-[10px] text-zinc-400 hover:text-zinc-200 uppercase font-bold cursor-pointer"
            >
              Done
            </button>
          </div>

          {/* Mode Switcher: Reveal vs Conceal */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-zinc-950 rounded-lg border border-zinc-800">
            <button
              onClick={() => setFogBrushMode('reveal')}
              className={`flex items-center justify-center gap-1.5 py-1.5 rounded text-xs font-semibold transition-all cursor-pointer ${
                fogBrushMode === 'reveal'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Eraser className="w-3.5 h-3.5 text-amber-400" />
              <span>Reveal</span>
            </button>
            <button
              onClick={() => setFogBrushMode('conceal')}
              className={`flex items-center justify-center gap-1.5 py-1.5 rounded text-xs font-semibold transition-all cursor-pointer ${
                fogBrushMode === 'conceal'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Brush className="w-3.5 h-3.5 text-zinc-300" />
              <span>Conceal</span>
            </button>
          </div>

          {/* Brush Size Slider */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px] text-zinc-400 font-medium">
              <span>Brush Radius</span>
              <span className="font-mono text-zinc-200">{fogBrushSize}px</span>
            </div>
            <input
              type="range"
              min="15"
              max="90"
              value={fogBrushSize}
              onChange={(e) => setFogBrushSize(Number(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer"
            />
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-1.5 pt-1 border-t border-zinc-800/80">
            <button
              onClick={handleFillAll}
              className="flex-1 py-1 px-2 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] font-semibold transition-colors cursor-pointer"
              title="Cover entire map in fog"
            >
              Cover All
            </button>
            <button
              onClick={handleClearAll}
              className="flex-1 py-1 px-2 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] font-semibold transition-colors cursor-pointer"
              title="Clear all fog"
            >
              Clear All
            </button>
            <button
              onClick={handleSave}
              className="p-1.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300 hover:bg-amber-500/25 transition-colors cursor-pointer"
              title="Save fog snapshot"
            >
              {isSavedRecently ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Save className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Mode Opacity Pill */}
          <div className="text-[10px] text-zinc-500 text-center flex items-center justify-center gap-1">
            {isPlayerMode ? (
              <>
                <EyeOff className="w-3 h-3 text-rose-400" />
                <span>Player View (100% Solid Fog)</span>
              </>
            ) : (
              <>
                <Eye className="w-3 h-3 text-emerald-400" />
                <span>GM View (45% Translucent Veil)</span>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};
