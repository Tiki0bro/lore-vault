import React, { useState, useEffect, useRef } from 'react';
import { useLoreStore } from '../../store/useLoreStore';
import type { MapRoute } from '../../types/lore';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Compass, 
  Footprints, 
  Ship, 
  Navigation 
} from 'lucide-react';
import { GiCampfire } from 'react-icons/gi';

interface ExpeditionRouteLayerProps {
  mapId: string;
  width: number;
  height: number;
}

export const ExpeditionRouteLayer: React.FC<ExpeditionRouteLayerProps> = ({
  width,
  height,
}) => {
  const { routes, activeWorldId, isPlayerMode } = useLoreStore();

  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0); // 0.0 to 1.0 along the route
  const [speedMultiplier, setSpeedMultiplier] = useState(1);
  const animationFrameRef = useRef<number | null>(null);

  const worldRoutes = routes.filter((r) => r.worldId === activeWorldId);
  const activeRoute: MapRoute | undefined = worldRoutes.find((r) => !isPlayerMode || !r.isSecret) || worldRoutes[0];

  // SVG coordinates transformation
  const toSvgCoords = (waypoints: Array<{ xPct: number; yPct: number }>) => {
    return waypoints.map((p) => `${(p.xPct / 100) * width},${(p.yPct / 100) * height}`).join(' ');
  };

  // Interpolate party position along route waypoints based on progress [0..1]
  const getInterpolatedPosition = (progressVal: number) => {
    if (!activeRoute || activeRoute.waypoints.length < 2) return null;
    const pts = activeRoute.waypoints;
    const totalSegments = pts.length - 1;
    const scaled = progressVal * totalSegments;
    const segIdx = Math.min(Math.floor(scaled), totalSegments - 1);
    const segProgress = scaled - segIdx;

    const p1 = pts[segIdx];
    const p2 = pts[segIdx + 1];

    const xPct = p1.xPct + (p2.xPct - p1.xPct) * segProgress;
    const yPct = p1.yPct + (p2.yPct - p1.yPct) * segProgress;

    return {
      x: (xPct / 100) * width,
      y: (yPct / 100) * height,
      segIdx,
    };
  };

  const currentPos = getInterpolatedPosition(progress);

  // Animation Loop
  useEffect(() => {
    if (!isPlaying) {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      return;
    }

    let lastTime = performance.now();
    const duration = 12000 / speedMultiplier; // 12 seconds per full journey

    const loop = (time: number) => {
      const delta = time - lastTime;
      lastTime = time;

      setProgress((prev) => {
        const next = prev + delta / duration;
        if (next >= 1.0) {
          setIsPlaying(false);
          return 1.0;
        }
        return next;
      });

      animationFrameRef.current = requestAnimationFrame(loop);
    };

    animationFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isPlaying, speedMultiplier]);

  if (!activeRoute) return null;

  return (
    <>
      {/* SVG Polylines and Waypoints */}
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="absolute inset-0 z-18 w-full h-full pointer-events-none"
      >
        {/* Render Route Polyline */}
        <polyline
          points={toSvgCoords(activeRoute.waypoints)}
          fill="none"
          stroke={activeRoute.color}
          strokeWidth="3.5"
          strokeDasharray="8 5"
          strokeLinecap="round"
          className="opacity-80"
        />

        {/* Render Waypoint Markers */}
        {activeRoute.waypoints.map((wp, idx) => {
          const cx = (wp.xPct / 100) * width;
          const cy = (wp.yPct / 100) * height;

          return (
            <g key={wp.id}>
              <circle
                cx={cx}
                cy={cy}
                r="7"
                fill="#09090b"
                stroke={activeRoute.color}
                strokeWidth="2.5"
              />
              <circle cx={cx} cy={cy} r="2.5" fill="#fef08a" />
              {wp.label && (
                <text
                  x={cx}
                  y={cy - 12}
                  textAnchor="middle"
                  fill="#f4f4f5"
                  fontSize="11"
                  fontWeight="bold"
                  className="font-sans drop-shadow-md select-none"
                >
                  {idx + 1}. {wp.label}
                </text>
              )}
            </g>
          );
        })}

        {/* Render Animated Party Token */}
        {currentPos && (
          <g
            transform={`translate(${currentPos.x - 16}, ${currentPos.y - 16})`}
            className="transition-transform duration-75"
          >
            {/* Pulsing Aura */}
            <circle
              cx="16"
              cy="16"
              r="20"
              fill="rgba(245, 158, 11, 0.25)"
              className="animate-ping"
              style={{ animationDuration: '3s' }}
            />
            {/* Token Badge */}
            <circle
              cx="16"
              cy="16"
              r="16"
              fill="#18181b"
              stroke="#f59e0b"
              strokeWidth="3"
              className="shadow-xl"
            />
            <foreignObject x="6" y="6" width="20" height="20">
              <GiCampfire className="w-5 h-5 text-amber-400" />
            </foreignObject>
          </g>
        )}
      </svg>

      {/* Floating Expedition Telemetry Dock */}
      <div className="absolute bottom-4 left-4 z-30 bg-zinc-900/95 border border-zinc-800 rounded-xl p-3 shadow-2xl backdrop-blur-md flex flex-col gap-2.5 max-w-sm animate-in fade-in duration-150">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-amber-400" />
            <h4 className="font-heading font-bold text-xs text-zinc-100 truncate">
              {activeRoute.name}
            </h4>
          </div>
          <span className="font-mono text-xs font-bold text-amber-400">
            {activeRoute.totalMiles} miles
          </span>
        </div>

        {/* Travel Rate Estimates */}
        <div className="grid grid-cols-3 gap-1.5 text-center text-[10px]">
          <div className="p-1.5 rounded bg-zinc-950 border border-zinc-800 flex flex-col items-center gap-0.5">
            <Footprints className="w-3 h-3 text-zinc-400" />
            <span className="text-zinc-300 font-bold">{activeRoute.travelDaysFoot} days</span>
            <span className="text-zinc-500 text-[9px]">Foot (24 m/d)</span>
          </div>
          <div className="p-1.5 rounded bg-zinc-950 border border-zinc-800 flex flex-col items-center gap-0.5">
            <Navigation className="w-3 h-3 text-zinc-400" />
            <span className="text-zinc-300 font-bold">{activeRoute.travelDaysMount} days</span>
            <span className="text-zinc-500 text-[9px]">Mount (32 m/d)</span>
          </div>
          <div className="p-1.5 rounded bg-zinc-950 border border-zinc-800 flex flex-col items-center gap-0.5">
            <Ship className="w-3 h-3 text-zinc-400" />
            <span className="text-zinc-300 font-bold">{activeRoute.travelDaysSail} days</span>
            <span className="text-zinc-500 text-[9px]">Sail (48 m/d)</span>
          </div>
        </div>

        {/* Expedition March Controls */}
        <div className="flex items-center gap-2 pt-1 border-t border-zinc-800/80">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs transition-colors cursor-pointer shadow-xs"
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isPlaying ? 'Pause March' : progress > 0 && progress < 1 ? 'Resume' : 'March Party'}</span>
          </button>

          <button
            onClick={() => {
              setIsPlaying(false);
              setProgress(0);
            }}
            className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
            title="Reset to Basecamp"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setSpeedMultiplier(speedMultiplier === 1 ? 2 : 1)}
            className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-[10px] font-mono font-bold text-amber-400 cursor-pointer"
            title="Toggle expedition speed"
          >
            {speedMultiplier}x
          </button>
        </div>

        {/* Progress Bar */}
        <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-amber-500 transition-all duration-75"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
      </div>
    </>
  );
};
