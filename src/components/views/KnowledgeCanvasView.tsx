import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  ReactFlow, 
  Background, 
  Controls, 
  MiniMap, 
  Handle, 
  Position,
  useNodesState,
  useEdgesState,
  addEdge,
  MarkerType
} from '@xyflow/react';
import type { Node, Edge, Connection } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useLoreStore } from '../../store/useLoreStore';
import type { Article, MapPin, TerritoryPolygon } from '../../types/lore';
import { 
  GiPerson, 
  GiCastle, 
  GiDragonShield, 
  GiBroadsword, 
  GiPadlock,
  GiCaveEntrance,
  GiObelisk,
  GiBeerStein,
  GiScrollUnfurled
} from 'react-icons/gi';
import { 
  Network, 
  BookOpen, 
  MapPin as MapPinIcon, 
  X, 
  Shield,
  Filter
} from 'lucide-react';

interface EntityNodeData {
  id: string;
  label: string;
  category: string;
  summary: string;
  isSecret: boolean;
  itemType: 'article' | 'territory' | 'pin';
  color?: string;
  rawItem: Article | MapPin | TerritoryPolygon;
}

// Custom Entity Node Component
const EntityNode: React.FC<{ data: EntityNodeData }> = ({ data }) => {
  const getIcon = () => {
    switch (data.category.toLowerCase()) {
      case 'character':
        return <GiPerson className="w-4 h-4 text-emerald-400" />;
      case 'location':
        return <GiCastle className="w-4 h-4 text-amber-400" />;
      case 'faction':
        return <GiDragonShield className="w-4 h-4 text-blue-400" />;
      case 'territory':
        return <Shield className="w-4 h-4 text-amber-500" />;
      case 'dungeon':
        return <GiCaveEntrance className="w-4 h-4 text-purple-400" />;
      case 'settlement':
        return <GiCastle className="w-4 h-4 text-amber-400" />;
      case 'monolith':
        return <GiObelisk className="w-4 h-4 text-cyan-400" />;
      case 'tavern':
        return <GiBeerStein className="w-4 h-4 text-emerald-400" />;
      case 'item':
        return <GiBroadsword className="w-4 h-4 text-purple-400" />;
      default:
        return <GiScrollUnfurled className="w-4 h-4 text-zinc-400" />;
    }
  };

  const getBorderColor = () => {
    if (data.color) return data.color;
    switch (data.category.toLowerCase()) {
      case 'character': return '#10b981';
      case 'location': return '#f59e0b';
      case 'faction': return '#3b82f6';
      case 'territory': return '#d97706';
      case 'dungeon': return '#a855f7';
      default: return '#71717a';
    }
  };

  return (
    <div 
      className="bg-zinc-900/95 border rounded-xl p-3 shadow-2xl w-56 hover:scale-105 hover:shadow-amber-500/10 transition-all duration-150 cursor-pointer select-none text-zinc-100 group backdrop-blur-md"
      style={{ borderColor: `${getBorderColor()}80` }}
    >
      <Handle type="target" position={Position.Top} className="!bg-amber-400 !w-2.5 !h-2.5 !border-zinc-950" />
      <Handle type="target" position={Position.Left} className="!bg-amber-400 !w-2.5 !h-2.5 !border-zinc-950" />
      
      <div className="flex items-center justify-between pb-1.5 border-b border-zinc-800">
        <div className="flex items-center gap-1.5 min-w-0">
          <div 
            className="p-1 rounded bg-zinc-950 border border-zinc-800 flex-shrink-0"
            style={{ color: getBorderColor() }}
          >
            {getIcon()}
          </div>
          <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider truncate">
            {data.category}
          </span>
        </div>
        {data.isSecret && (
          <span title="GM Secret">
            <GiPadlock className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
          </span>
        )}
      </div>

      <div className="mt-2 font-semibold text-xs text-zinc-100 font-heading truncate group-hover:text-amber-300 transition-colors">
        {data.label}
      </div>

      <div className="text-[11px] text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
        {data.summary || 'No summary available.'}
      </div>

      <div className="mt-2 pt-1 border-t border-zinc-800/60 flex items-center justify-between text-[9px] text-zinc-500 uppercase tracking-wider font-mono">
        <span>{data.itemType}</span>
        <span className="text-amber-400/80 group-hover:text-amber-300">Click to Inspect →</span>
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-amber-400 !w-2.5 !h-2.5 !border-zinc-950" />
      <Handle type="source" position={Position.Right} className="!bg-amber-400 !w-2.5 !h-2.5 !border-zinc-950" />
    </div>
  );
};

export const KnowledgeCanvasView: React.FC = () => {
  const { 
    articles, 
    mapPins, 
    territories, 
    isPlayerMode,
    setSelectedArticleId,
    setActiveView 
  } = useLoreStore();

  const nodeTypes = useMemo(() => ({ entity: EntityNode }), []);

  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [selectedEntity, setSelectedEntity] = useState<EntityNodeData | null>(null);

  // Filter items by DM secret mode
  const visibleArticles = useMemo(() => {
    return isPlayerMode ? articles.filter((a) => !a.isSecret) : articles;
  }, [articles, isPlayerMode]);

  const visibleTerritories = useMemo(() => {
    return isPlayerMode ? territories.filter((t) => !t.isSecret) : territories;
  }, [territories, isPlayerMode]);

  const visiblePins = useMemo(() => {
    return isPlayerMode ? mapPins.filter((p) => !p.isSecret) : mapPins;
  }, [mapPins, isPlayerMode]);

  // Compute graph nodes from store
  const generatedNodes = useMemo<Node[]>(() => {
    const rawEntities: Array<{
      id: string;
      label: string;
      category: string;
      summary: string;
      isSecret: boolean;
      itemType: 'article' | 'territory' | 'pin';
      color?: string;
      rawItem: Article | MapPin | TerritoryPolygon;
    }> = [];

    // 1. Articles
    visibleArticles.forEach((art) => {
      rawEntities.push({
        id: `node-${art.id}`,
        label: art.title,
        category: art.category,
        summary: art.summary || art.content.replace(/<[^>]+>/g, ' ').slice(0, 100),
        isSecret: art.isSecret,
        itemType: 'article',
        rawItem: art,
      });
    });

    // 2. Territories
    visibleTerritories.forEach((terr) => {
      rawEntities.push({
        id: `node-${terr.id}`,
        label: terr.name,
        category: 'Territory',
        summary: `${terr.factionName} · ${terr.controlPct}% control · ${terr.threatLevel} threat`,
        isSecret: terr.isSecret,
        itemType: 'territory',
        color: terr.color,
        rawItem: terr,
      });
    });

    // 3. Map Pins
    visiblePins.forEach((pin) => {
      rawEntities.push({
        id: `node-${pin.id}`,
        label: pin.label,
        category: pin.category,
        summary: `Landmark at (${pin.xPct}%, ${pin.yPct}%)`,
        isSecret: pin.isSecret,
        itemType: 'pin',
        color: pin.color,
        rawItem: pin,
      });
    });

    // Filter by selected category chip
    const filtered = rawEntities.filter((e) => {
      if (categoryFilter === 'all') return true;
      return e.category.toLowerCase() === categoryFilter.toLowerCase();
    });

    // Organized Grid Matrix layout by default for readability when entity count is high
    const count = filtered.length;
    const cols = Math.ceil(Math.sqrt(count * 1.5));
    const nodeWidth = 320;
    const nodeHeight = 220;

    return filtered.map((e, idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const x = 80 + col * nodeWidth;
      const y = 60 + row * nodeHeight;

      return {
        id: e.id,
        type: 'entity',
        position: { x, y },
        data: e,
      };
    });
  }, [visibleArticles, visibleTerritories, visiblePins, categoryFilter]);

  // Compute graph edges based on connections
  const generatedEdges = useMemo<Edge[]>(() => {
    const edges: Edge[] = [];
    const entityIds = new Set(generatedNodes.map((n) => n.id));

    // 1. Territory to Article & Ruler links
    visibleTerritories.forEach((terr) => {
      const terrNodeId = `node-${terr.id}`;
      if (!entityIds.has(terrNodeId)) return;

      if (terr.articleId && entityIds.has(`node-${terr.articleId}`)) {
        edges.push({
          id: `edge-${terr.id}-${terr.articleId}`,
          source: terrNodeId,
          target: `node-${terr.articleId}`,
          label: 'Dominion Codex',
          animated: true,
          style: { stroke: '#f59e0b', strokeWidth: 2 },
          labelStyle: { fill: '#f59e0b', fontSize: 10, fontWeight: 700 },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#f59e0b' },
        });
      }

      if (terr.rulerArticleId && entityIds.has(`node-${terr.rulerArticleId}`)) {
        edges.push({
          id: `edge-${terr.id}-ruler-${terr.rulerArticleId}`,
          source: terrNodeId,
          target: `node-${terr.rulerArticleId}`,
          label: 'Ruled By',
          style: { stroke: '#fbbf24', strokeDasharray: '4 4', strokeWidth: 1.8 },
          labelStyle: { fill: '#fbbf24', fontSize: 10, fontWeight: 600 },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#fbbf24' },
        });
      }

      terr.associatedArticleIds?.forEach((assocId) => {
        const targetNodeId = `node-${assocId}`;
        if (assocId !== terr.articleId && entityIds.has(targetNodeId)) {
          edges.push({
            id: `edge-${terr.id}-assoc-${assocId}`,
            source: terrNodeId,
            target: targetNodeId,
            label: 'Associated',
            style: { stroke: '#71717a', strokeWidth: 1.2 },
            labelStyle: { fill: '#a1a1aa', fontSize: 9 },
          });
        }
      });
    });

    // 2. Map Pin to Article links
    visiblePins.forEach((pin) => {
      const pinNodeId = `node-${pin.id}`;
      if (!entityIds.has(pinNodeId)) return;

      if (pin.articleId && entityIds.has(`node-${pin.articleId}`)) {
        edges.push({
          id: `edge-${pin.id}-${pin.articleId}`,
          source: pinNodeId,
          target: `node-${pin.articleId}`,
          label: 'Codex Site',
          style: { stroke: '#a855f7', strokeWidth: 1.8 },
          labelStyle: { fill: '#c084fc', fontSize: 10, fontWeight: 600 },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#a855f7' },
        });
      }
    });

    // 3. Prose @mentions or Title occurrences in Articles
    visibleArticles.forEach((art) => {
      const sourceNodeId = `node-${art.id}`;
      if (!entityIds.has(sourceNodeId)) return;

      visibleArticles.forEach((otherArt) => {
        if (art.id === otherArt.id) return;
        const targetNodeId = `node-${otherArt.id}`;
        if (!entityIds.has(targetNodeId)) return;

        // Check if article content references the other article title
        if (art.content.includes(otherArt.title) || (art.summary && art.summary.includes(otherArt.title))) {
          const edgeId = `edge-mention-${art.id}-${otherArt.id}`;
          if (!edges.some((e) => e.id === edgeId || e.id === `edge-mention-${otherArt.id}-${art.id}`)) {
            edges.push({
              id: edgeId,
              source: sourceNodeId,
              target: targetNodeId,
              label: 'References',
              style: { stroke: '#38bdf8', strokeWidth: 1.5, strokeDasharray: '3 3' },
              labelStyle: { fill: '#38bdf8', fontSize: 9, fontWeight: 600 },
              markerEnd: { type: MarkerType.ArrowClosed, color: '#38bdf8' },
            });
          }
        }
      });
    });

    return edges;
  }, [visibleTerritories, visiblePins, visibleArticles, generatedNodes]);

  const [nodes, setNodes, onNodesChange] = useNodesState(generatedNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(generatedEdges);

  // Sync state when generated nodes or edges update
  useEffect(() => {
    setNodes(generatedNodes);
  }, [generatedNodes, setNodes]);

  useEffect(() => {
    setEdges(generatedEdges);
  }, [generatedEdges, setEdges]);

  // Handle custom user connection
  const onConnect = useCallback(
    (params: Connection) =>
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            animated: true,
            style: { stroke: '#f59e0b', strokeWidth: 2 },
            label: 'Connected',
            labelStyle: { fill: '#f59e0b', fontSize: 10, fontWeight: 600 },
            markerEnd: { type: MarkerType.ArrowClosed, color: '#f59e0b' },
          },
          eds
        )
      ),
    [setEdges]
  );

  // Node Click: open inspection drawer
  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedEntity(node.data as unknown as EntityNodeData);
  }, []);

  // Preset Layout Algorithms
  const applyLayout = (type: 'circle' | 'tiered' | 'grid') => {
    setNodes((currentNodes) => {
      const count = currentNodes.length;
      if (count === 0) return currentNodes;

      if (type === 'circle') {
        const centerX = 450;
        const centerY = 320;
        const radius = Math.max(260, count * 35);
        return currentNodes.map((node, i) => {
          const angle = (2 * Math.PI * i) / count;
          return {
            ...node,
            position: {
              x: Math.round(centerX + radius * Math.cos(angle)),
              y: Math.round(centerY + radius * Math.sin(angle)),
            },
          };
        });
      }

      if (type === 'tiered') {
        // Group by category: Factions/Territories -> Characters -> Locations/Pins
        const tiers: Record<string, Node[]> = {
          top: [],
          middle: [],
          bottom: [],
        };
        currentNodes.forEach((node) => {
          const cat = (node.data as unknown as EntityNodeData).category.toLowerCase();
          if (cat === 'faction' || cat === 'territory') tiers.top.push(node);
          else if (cat === 'character') tiers.middle.push(node);
          else tiers.bottom.push(node);
        });

        const updated: Node[] = [];
        const spacingX = 260;

        tiers.top.forEach((n, i) => {
          const startX = 200 - ((tiers.top.length - 1) * spacingX) / 2;
          updated.push({ ...n, position: { x: startX + i * spacingX, y: 80 } });
        });
        tiers.middle.forEach((n, i) => {
          const startX = 200 - ((tiers.middle.length - 1) * spacingX) / 2;
          updated.push({ ...n, position: { x: startX + i * spacingX, y: 300 } });
        });
        tiers.bottom.forEach((n, i) => {
          const startX = 200 - ((tiers.bottom.length - 1) * spacingX) / 2;
          updated.push({ ...n, position: { x: startX + i * spacingX, y: 520 } });
        });
        return updated;
      }

      // Grid Layout
      const cols = Math.ceil(Math.sqrt(count));
      return currentNodes.map((node, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        return {
          ...node,
          position: {
            x: 100 + col * 280,
            y: 80 + row * 220,
          },
        };
      });
    });
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative bg-zinc-950 select-none">
      {/* Canvas Top Bar */}
      <div className="h-13 border-b border-zinc-800 bg-zinc-900/90 backdrop-blur px-4 flex items-center justify-between gap-3 z-10 flex-shrink-0">
        {/* Left: Title & Stat */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Network className="w-4 h-4 text-amber-400" />
            <span className="font-heading font-bold text-sm text-zinc-100">
              Spatial Knowledge Canvas
            </span>
          </div>
          <span className="text-[11px] px-2 py-0.5 rounded bg-zinc-950 border border-zinc-800 font-mono text-zinc-400">
            {nodes.length} Entities · {edges.length} Edges
          </span>
        </div>

        {/* Center: Category Filter Chips */}
        <div className="hidden md:flex items-center gap-1 bg-zinc-950 p-1 rounded-lg border border-zinc-800 text-xs">
          <Filter className="w-3.5 h-3.5 text-zinc-500 mx-1" />
          {['all', 'character', 'location', 'faction', 'territory'].map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`btn-pill px-2 py-0.5 rounded capitalize text-[11px] font-semibold transition-all cursor-pointer ${
                categoryFilter === cat
                  ? 'bg-amber-500/20 text-amber-300 shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Right: Layout Presets */}
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-lg border border-zinc-800 text-xs">
            <span className="text-[10px] uppercase font-bold text-zinc-500 px-1">Layout:</span>
            <button
              onClick={() => applyLayout('circle')}
              className="btn-pill px-2 py-0.5 rounded text-[11px] font-semibold text-zinc-300 hover:bg-zinc-800 hover:text-amber-300 transition-colors cursor-pointer"
              title="Circular Radial Web"
            >
              🌐 Radial
            </button>
            <button
              onClick={() => applyLayout('tiered')}
              className="btn-pill px-2 py-0.5 rounded text-[11px] font-semibold text-zinc-300 hover:bg-zinc-800 hover:text-amber-300 transition-colors cursor-pointer"
              title="Hierarchical Tiered Layout"
            >
              🌳 Tiered
            </button>
            <button
              onClick={() => applyLayout('grid')}
              className="btn-pill px-2 py-0.5 rounded text-[11px] font-semibold text-zinc-300 hover:bg-zinc-800 hover:text-amber-300 transition-colors cursor-pointer"
              title="Organized Matrix Grid"
            >
              🗂️ Grid
            </button>
          </div>
        </div>
      </div>

      {/* React Flow Viewport */}
      <div className="flex-1 w-full h-full relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          fitView
          className="bg-zinc-950"
        >
          <Background color="var(--color-zinc-800)" gap={22} size={1.2} />
          <Controls className="!bg-zinc-900 !border-zinc-800 !fill-zinc-300 [&>button]:!border-zinc-800 [&>button]:hover:!bg-zinc-800" />
          <MiniMap 
            nodeColor={(node) => {
              const d = node.data as unknown as EntityNodeData;
              if (d?.color) return d.color;
              if (d?.category === 'Character') return '#10b981';
              if (d?.category === 'Location') return '#f59e0b';
              if (d?.category === 'Faction') return '#3b82f6';
              return '#71717a';
            }}
            maskColor="rgba(9, 9, 11, 0.85)"
            className="!bg-zinc-900 !border-zinc-800 !rounded-xl overflow-hidden shadow-2xl" 
          />
        </ReactFlow>

        {/* Selected Entity Preview Drawer */}
        {selectedEntity && (
          <div className="absolute top-4 right-4 z-40 w-80 bg-zinc-900/95 border border-zinc-800 rounded-2xl p-4 shadow-2xl backdrop-blur-md animate-in slide-in-from-right duration-150 flex flex-col gap-3 select-text">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <span
                  className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border"
                  style={{
                    backgroundColor: `${selectedEntity.color || '#f59e0b'}20`,
                    borderColor: `${selectedEntity.color || '#f59e0b'}50`,
                    color: selectedEntity.color || '#f59e0b',
                  }}
                >
                  {selectedEntity.category}
                </span>
                {selectedEntity.isSecret && (
                  <span className="text-[10px] font-bold text-rose-400 bg-rose-950/60 border border-rose-800/60 px-1.5 py-0.5 rounded flex items-center gap-1">
                    <GiPadlock className="w-2.5 h-2.5" /> Secret
                  </span>
                )}
              </div>
              <button
                onClick={() => setSelectedEntity(null)}
                className="text-zinc-500 hover:text-zinc-300 cursor-pointer p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <h4 className="font-heading font-bold text-base text-zinc-100">
                {selectedEntity.label}
              </h4>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                {selectedEntity.summary}
              </p>
            </div>

            <div className="pt-2 border-t border-zinc-800 flex flex-col gap-2">
              {selectedEntity.itemType === 'article' && (
                <button
                  onClick={() => {
                    const art = selectedEntity.rawItem as Article;
                    setSelectedArticleId(art.id);
                    setActiveView('manuscript');
                  }}
                  className="w-full py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Open Codex Manuscript</span>
                </button>
              )}

              {(selectedEntity.itemType === 'pin' || selectedEntity.itemType === 'territory') && (
                <button
                  onClick={() => {
                    setActiveView('atlas');
                  }}
                  className="w-full py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                >
                  <MapPinIcon className="w-3.5 h-3.5" />
                  <span>Locate on World Atlas</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
