"use client";

import "@xyflow/react/dist/style.css";

import {
  Background,
  Controls,
  Edge,
  MarkerType,
  MiniMap,
  Node,
  ReactFlow,
  useEdgesState,
  useNodesState,
} from "@xyflow/react";
import { Loader2, Plus, Share2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect } from "react";

import { Button } from "@/shared/presentation/components/ui/button";

import { CollectionNode } from "../components/diagram/collection-node";
import { useWorkspaceSchema } from "../hooks/use-workspace-schema";

const nodeTypes = {
  collection: CollectionNode,
};

export default function ERDiagramPage() {
  const { collections, fields, loading } = useWorkspaceSchema();
  const { theme } = useTheme();
  const router = useRouter();
  const isDark = theme === "dark";

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  // Translation map for relationship types
  const getRelationLabel = (type: string) => {
    switch (type) {
      case "ONE_TO_ONE":
        return "Vínculo único (1:1)";
      case "ONE_TO_MANY":
        return "Relación uno a muchos";
      case "MANY_TO_ONE":
        return "Pertenece a (N:1)";
      case "MANY_TO_MANY":
        return "Vínculo múltiple (N:N)";
      default:
        return type.toLowerCase().replace(/_/g, " ");
    }
  };

  // Initialize nodes and edges when data is loaded
  useEffect(() => {
    if (loading || collections.length === 0) return;

    const initialNodes: Node[] = [];
    const initialEdges: Edge[] = [];

    // 1. Create Nodes
    collections.forEach((collection, index) => {
      const col = index % 3;
      const row = Math.floor(index / 3);

      initialNodes.push({
        id: collection.id,
        type: "collection",
        position: { x: col * 350, y: row * 400 },
        data: {
          collection,
          fields: fields.filter((f) => f.collectionId === collection.id),
        },
      });
    });

    // 2. Create Edges
    fields.forEach((field) => {
      const config = field.config?.value as {
        targetCollectionId?: string;
        relationType?: string;
      };

      // Use CSS variable for the label to stay theme-consistent without effect re-runs
      const labelStyle = {
        fontSize: 10,
        fontWeight: 600,
        fill: "var(--muted-foreground)",
      };

      if (field.fieldType.toString() === "RELATION" && config?.targetCollectionId) {
        initialEdges.push({
          id: `edge-${field.id}`,
          source: field.collectionId,
          target: config.targetCollectionId,
          sourceHandle: field.id,
          label: getRelationLabel(config.relationType || ""),
          labelStyle,
          animated: true,
          style: { stroke: "var(--primary)", strokeWidth: 1, opacity: 0.4 },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: "var(--primary)",
          },
        });
      }

      if (field.fieldType.toString() === "REVERSE_LOOKUP" && config?.targetCollectionId) {
        initialEdges.push({
          id: `edge-${field.id}`,
          source: field.collectionId,
          target: config.targetCollectionId,
          sourceHandle: field.id,
          label: "Búsqueda inversa",
          labelStyle,
          style: { stroke: "var(--primary)", strokeWidth: 1, strokeDasharray: "5,5", opacity: 0.4 },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: "var(--primary)",
          },
        });
      }
    });

    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [loading, collections, fields, setNodes, setEdges]);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-20 animate-in fade-in duration-500 bg-background text-foreground">
        <Loader2 className="w-8 h-8 animate-spin text-primary/40 mb-4" />
        <p className="text-sm font-medium text-foreground/40">Cargando esquema del motor...</p>
      </div>
    );
  }

  if (collections.length === 0) {
    return (
      <div className="flex-1 h-full flex flex-col items-center justify-center p-8 bg-background animate-in fade-in duration-1000">
        <div className="max-w-2xl w-full text-center">
          {/* Tag descriptor */}
          <div className="text-[11px] font-bold uppercase tracking-[0.15em] text-primary mb-6">
            Esquema de Datos
          </div>

          {/* Icon */}
          <div className="w-12 h-12 flex items-center justify-center text-foreground/20 mx-auto mb-8 transition-transform hover:scale-110 duration-500">
            <Share2 size={40} strokeWidth={1.5} />
          </div>

          {/* Title - Noir style */}
          <h2 className="text-[2.5rem] leading-[1.1] font-bold text-foreground mb-6 tracking-[-0.02em]">
            Aún no has creado <br /> relaciones en el motor
          </h2>

          {/* Description */}
          <p className="text-[15px] font-medium text-foreground/40 mb-10 leading-relaxed max-w-md mx-auto">
            Las relaciones permiten conectar datos entre colecciones para construir estructuras
            complejas. Empieza por definir tu primera colección.
          </p>

          {/* Actions */}
          <div className="flex flex-col items-center gap-4">
            <Button
              onClick={() => router.push("/collections")}
              variant="default"
              size="lg"
              className="px-10 h-12 rounded-full font-bold transition-all active:scale-[0.98] hover:-translate-y-0.5"
            >
              <Plus size={16} className="mr-2" />
              Crear Colección
            </Button>
            <p className="text-[10px] font-bold uppercase tracking-widest text-foreground/20">
              Versión v0.1.4
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background text-foreground overflow-hidden animate-in fade-in duration-700">
      {/* Header Block */}
      <div className="px-8 py-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            <Share2 size={18} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground uppercase">
              Relaciones del Modelo
            </h1>
            <p className="text-[12px] text-foreground/50 font-medium">
              Vista interactiva del esquema de colecciones y sus conexiones.
            </p>
          </div>
        </div>
      </div>

      {/* Diagram Area */}
      <div className="flex-1 relative bg-background">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          fitView
          colorMode={theme === "system" ? "system" : isDark ? "dark" : "light"}
        >
          <Background color="var(--border)" gap={20} size={1} />
          <Controls className="bg-surface! border-border/50! shadow-xl!" />
          <MiniMap
            className="bg-surface! border-border/50! shadow-xl!"
            nodeColor="var(--primary)"
            maskColor={isDark ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.5)"}
          />
        </ReactFlow>
      </div>
    </div>
  );
}
