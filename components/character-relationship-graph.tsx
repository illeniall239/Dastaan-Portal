"use client";

import { useCallback, useMemo, useEffect } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
  Position,
  useReactFlow,
  getNodesBounds,
  getViewportForBounds,
  Handle,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { toPng, toSvg } from 'html-to-image';
import type { CharacterRelationship } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

interface CharacterRelationshipGraphProps {
  relationships: CharacterRelationship[];
}

// Color mapping for relationship types
const RELATIONSHIP_COLORS: Record<string, string> = {
  family: '#10b981', // green
  romantic: '#ec4899', // pink
  professional: '#3b82f6', // blue
  friendship: '#f59e0b', // amber
  rivalry: '#ef4444', // red
  mentor_mentee: '#8b5cf6', // purple
  alliance: '#06b6d4', // cyan
  conflict: '#dc2626', // dark red
  other: '#6b7280', // gray
};

// Size mapping for character roles
const ROLE_SIZES: Record<string, { width: number; height: number }> = {
  protagonist: { width: 180, height: 80 },
  antagonist: { width: 160, height: 70 },
  supporting: { width: 140, height: 60 },
  minor: { width: 120, height: 50 },
};

// Custom node component
function CharacterNode({ data }: { data: any }) {
  const roleColors: Record<string, string> = {
    protagonist: 'bg-blue-100 border-blue-500',
    antagonist: 'bg-red-100 border-red-500',
    supporting: 'bg-green-100 border-green-500',
    minor: 'bg-gray-100 border-gray-500',
  };

  return (
    <div className={`px-4 py-3 rounded-lg border-2 ${roleColors[data.role] || 'bg-gray-100 border-gray-500'} shadow-md`}>
      {/* Target handle - for incoming connections */}
      <Handle
        type="target"
        position={Position.Left}
        style={{ background: '#555' }}
      />

      <div className="font-bold text-sm text-center mb-1">{data.label}</div>
      <Badge variant="secondary" className="text-xs">
        {data.role}
      </Badge>

      {/* Source handle - for outgoing connections */}
      <Handle
        type="source"
        position={Position.Right}
        style={{ background: '#555' }}
      />
    </div>
  );
}

const nodeTypes = {
  characterNode: CharacterNode,
};

export function CharacterRelationshipGraph({ relationships }: CharacterRelationshipGraphProps) {
  const { getNodes } = useReactFlow();


  // Image dimensions for export
  const imageWidth = 1920;
  const imageHeight = 1080;

  const downloadImage = (dataUrl: string, filename: string) => {
    const a = document.createElement('a');
    a.setAttribute('download', filename);
    a.setAttribute('href', dataUrl);
    a.click();
  };

  const onDownloadPng = useCallback(() => {
    const nodesBounds = getNodesBounds(getNodes());
    const viewport = getViewportForBounds(
      nodesBounds,
      imageWidth,
      imageHeight,
      0.5,
      2,
      0.2 // padding
    );

    const viewportElement = document.querySelector('.react-flow__viewport') as HTMLElement;

    if (!viewportElement) return;

    toPng(viewportElement, {
      backgroundColor: '#ffffff',
      width: imageWidth,
      height: imageHeight,
      style: {
        width: `${imageWidth}px`,
        height: `${imageHeight}px`,
        transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
      },
    }).then((dataUrl) => {
      downloadImage(dataUrl, 'character-relationships.png');
    }).catch((error) => {
      console.error('Error exporting PNG:', error);
    });
  }, [getNodes, imageWidth, imageHeight]);

  const onDownloadSvg = useCallback(() => {
    const nodesBounds = getNodesBounds(getNodes());
    const viewport = getViewportForBounds(
      nodesBounds,
      imageWidth,
      imageHeight,
      0.5,
      2,
      0.2
    );

    const viewportElement = document.querySelector('.react-flow__viewport') as HTMLElement;

    if (!viewportElement) return;

    toSvg(viewportElement, {
      backgroundColor: '#ffffff',
      width: imageWidth,
      height: imageHeight,
      style: {
        width: `${imageWidth}px`,
        height: `${imageHeight}px`,
        transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
      },
    }).then((dataUrl) => {
      downloadImage(dataUrl, 'character-relationships.svg');
    }).catch((error) => {
      console.error('Error exporting SVG:', error);
    });
  }, [getNodes, imageWidth, imageHeight]);

  // Extract unique characters from relationships
  const characters = useMemo(() => {
    const charMap = new Map<string, { name: string; role: string }>();

    relationships.forEach((rel) => {
      if (!charMap.has(rel.character_a_name)) {
        charMap.set(rel.character_a_name, {
          name: rel.character_a_name,
          role: rel.character_a_role,
        });
      }
      if (!charMap.has(rel.character_b_name)) {
        charMap.set(rel.character_b_name, {
          name: rel.character_b_name,
          role: rel.character_b_role,
        });
      }
    });

    const result = Array.from(charMap.values());
    return result;
  }, [relationships]);

  // Create nodes with circular layout
  const initialNodes: Node[] = useMemo(() => {
    const centerX = 400;
    const centerY = 300;
    const radius = Math.min(200 + characters.length * 15, 350);

    const nodes = characters.map((char, index) => {
      const angle = (2 * Math.PI * index) / characters.length;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      const size = ROLE_SIZES[char.role] || ROLE_SIZES.minor;

      return {
        id: char.name,
        type: 'characterNode',
        position: { x, y },
        data: {
          label: char.name,
          role: char.role,
        },
        style: {
          width: size.width,
          height: size.height,
        },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      };
    });

    return nodes;
  }, [characters]);

  // Create edges from relationships
  const initialEdges: Edge[] = useMemo(() => {
    const edges = relationships.map((rel, index) => {
      const color = RELATIONSHIP_COLORS[rel.relationship_type] || RELATIONSHIP_COLORS.other;
      const strokeWidth = rel.emotional_weight === 'high' ? 3 : rel.emotional_weight === 'medium' ? 2 : 1;
      const isDashed = !rel.drives_plot;

      const edge = {
        id: `edge-${index}`,
        source: rel.character_a_name,
        target: rel.character_b_name,
        type: 'smoothstep',
        animated: rel.drives_plot,
        style: {
          stroke: color,
          strokeWidth,
          strokeDasharray: isDashed ? '5,5' : undefined,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color,
          width: 20,
          height: 20,
        },
        label: rel.relationship_type.replace('_', '-'),
        labelStyle: {
          fill: color,
          fontWeight: 600,
          fontSize: 11,
        },
        labelBgStyle: {
          fill: 'white',
          fillOpacity: 0.8,
        },
        data: {
          description: rel.relationship_description,
          initialState: rel.initial_state,
          finalState: rel.final_state,
          turningPoints: rel.key_turning_points,
          emotionalWeight: rel.emotional_weight,
          drivesPlot: rel.drives_plot,
        },
      };

      return edge;
    });

    return edges;
  }, [relationships]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Sync nodes and edges when relationships change
  useEffect(() => {
    setNodes(initialNodes);
  }, [initialNodes, setNodes]);

  useEffect(() => {
    setEdges(initialEdges);
  }, [initialEdges, setEdges]);


  if (relationships.length === 0) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
        <p className="text-muted-foreground">No character relationships to visualize</p>
      </div>
    );
  }

  return (
    <div className="w-full h-[500px] border rounded-lg bg-white relative">
      {/* Export Controls */}
      <div className="absolute top-4 right-4 z-10 flex gap-2">
        <Button
          onClick={onDownloadPng}
          variant="outline"
          size="sm"
          className="bg-white shadow-md"
        >
          <Download className="w-4 h-4 mr-2" />
          PNG
        </Button>
        <Button
          onClick={onDownloadSvg}
          variant="outline"
          size="sm"
          className="bg-white shadow-md"
        >
          <Download className="w-4 h-4 mr-2" />
          SVG
        </Button>
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        attributionPosition="bottom-left"
      >
        <Background />
        <Controls />
        <MiniMap
          nodeStrokeWidth={3}
          zoomable
          pannable
          className="bg-gray-50"
        />
      </ReactFlow>
    </div>
  );
}
