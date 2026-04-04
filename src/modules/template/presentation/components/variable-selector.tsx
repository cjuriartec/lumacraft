"use client";

import {
  Braces,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Database,
  Hash,
  Search,
  Type,
} from "lucide-react";
import * as React from "react";

import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/presentation/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/presentation/components/ui/popover";
import { ScrollArea } from "@/shared/presentation/components/ui/scroll-area";

import { useVariableFields, VariableNode } from "../hooks/use-variable-fields";

interface VariableSelectorProps {
  collectionId?: string | null;
  onSelect: (node: VariableNode) => void;
  trigger?: React.ReactNode;
  disabled?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const filterNodes = (nodes: VariableNode[], query: string): VariableNode[] => {
  return nodes.reduce((acc: VariableNode[], node) => {
    const matches =
      node.displayName.toLowerCase().includes(query.toLowerCase()) ||
      node.path.toLowerCase().includes(query.toLowerCase());

    const filteredChildren = node.children ? filterNodes(node.children, query) : [];

    if (matches || filteredChildren.length > 0) {
      acc.push({
        ...node,
        children: filteredChildren.length > 0 ? filteredChildren : undefined,
      });
    }
    return acc;
  }, []);
};

export function VariableSelector({
  collectionId,
  onSelect,
  trigger,
  disabled,
  open: controlledOpen,
  onOpenChange,
}: VariableSelectorProps) {
  const { nodes, loading } = useVariableFields(collectionId);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [internalOpen, setInternalOpen] = React.useState(false);

  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = React.useCallback(
    (value: boolean) => {
      onOpenChange?.(value);
      setInternalOpen(value);
    },
    [onOpenChange],
  );

  const isDisabled = disabled || !collectionId;
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const listContainerRef = React.useRef<HTMLDivElement>(null);

  const filteredNodes = React.useMemo(() => {
    if (!searchTerm) return nodes;
    return filterNodes(nodes, searchTerm);
  }, [nodes, searchTerm]);

  const getVisibleItems = React.useCallback(() => {
    if (!listContainerRef.current) return [];

    return Array.from(
      listContainerRef.current.querySelectorAll<HTMLButtonElement>("[data-variable-item='true']"),
    );
  }, []);

  React.useEffect(() => {
    if (!open || isDisabled) return;

    const frameId = window.requestAnimationFrame(() => {
      searchInputRef.current?.focus();
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [open, isDisabled]);

  const handleSearchKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;

      event.preventDefault();
      const items = getVisibleItems();
      if (!items.length) return;

      if (event.key === "ArrowDown") {
        items[0]?.focus();
        return;
      }

      items[items.length - 1]?.focus();
    },
    [getVisibleItems],
  );

  const handleListKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      const items = getVisibleItems();
      if (!items.length) return;

      const activeElement = document.activeElement;
      const currentIndex = items.findIndex((item) => item === activeElement);

      if (event.key === "ArrowDown") {
        event.preventDefault();
        const nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % items.length;
        items[nextIndex]?.focus();
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        const prevIndex =
          currentIndex < 0 ? items.length - 1 : (currentIndex - 1 + items.length) % items.length;
        items[prevIndex]?.focus();
        return;
      }

      if (event.key === "Home") {
        event.preventDefault();
        items[0]?.focus();
        return;
      }

      if (event.key === "End") {
        event.preventDefault();
        items[items.length - 1]?.focus();
        return;
      }

      if (event.key === "Enter" && currentIndex >= 0) {
        event.preventDefault();
        items[currentIndex]?.click();
      }
    },
    [getVisibleItems],
  );

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        if (isDisabled) return;
        setOpen(nextOpen);
      }}
    >
      <PopoverTrigger asChild>
        {trigger || (
          <Button
            variant="ghost"
            size="sm"
            disabled={isDisabled}
            title={isDisabled ? "Vincula una colección para insertar variables" : undefined}
            className={cn(
              "h-8 gap-1.5 px-2 text-muted-foreground transition-all duration-300 hover:bg-foreground/5 hover:text-foreground",
              open && "bg-foreground/5 text-foreground",
            )}
          >
            <Braces size={14} className="text-primary/70" />
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent
        className="w-80 overflow-hidden border-none bg-surface/95 p-0 shadow-xl backdrop-blur-md"
        align="start"
      >
        <div className="flex items-center px-4 py-3 gap-1">
          <Search className="mr-2 h-4 w-4 shrink-0 text-muted/50" />
          <input
            ref={searchInputRef}
            className="flex px-2 h-8 w-full rounded-md bg-transparent text-sm outline-none placeholder:text-muted/40 disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="Buscar campos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleSearchKeyDown}
          />
        </div>
        <ScrollArea className="h-72">
          {loading ? (
            <div className="flex h-20 items-center justify-center text-sm text-muted">
              Cargando campos...
            </div>
          ) : filteredNodes.length === 0 ? (
            <div className="flex h-20 items-center justify-center text-sm text-muted">
              No se encontraron campos
            </div>
          ) : (
            <div ref={listContainerRef} className="p-1" onKeyDown={handleListKeyDown}>
              <NodeList
                nodes={filteredNodes}
                onSelect={(node) => {
                  onSelect(node);
                  setOpen(false);
                }}
              />
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

function NodeList({
  nodes,
  onSelect,
  level = 0,
}: {
  nodes: VariableNode[];
  onSelect: (node: VariableNode) => void;
  level?: number;
}) {
  return (
    <div className="space-y-0.5">
      {nodes.map((node) => (
        <NodeItem key={node.path} node={node} onSelect={onSelect} level={level} />
      ))}
    </div>
  );
}

function NodeItem({
  node,
  onSelect,
  level,
}: {
  node: VariableNode;
  onSelect: (node: VariableNode) => void;
  level: number;
}) {
  const [expanded, setExpanded] = React.useState(level < 1); // Expand first level by default
  const hasChildren = node.children && node.children.length > 0;

  const getIcon = (type: string) => {
    switch (type) {
      case "TEXT":
        return <Type size={14} />;
      case "NUMBER":
        return <Hash size={14} />;
      case "DATE":
        return <Calendar size={14} />;
      case "BOOLEAN":
        return <CheckCircle2 size={14} />;
      case "RELATION":
        return <Database size={14} />;
      default:
        return <Type size={14} />;
    }
  };

  return (
    <div>
      <button
        data-variable-item="true"
        onClick={() => {
          if (node.fieldType !== "RELATION") {
            onSelect(node);
          } else {
            setExpanded(!expanded);
          }
        }}
        className={cn(
          "group flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-surface-hover/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40",
          node.fieldType === "RELATION" ? "text-foreground/70" : "text-foreground",
        )}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
      >
        {hasChildren && (
          <ChevronRight
            size={14}
            className={cn("shrink-0 transition-transform text-muted", expanded && "rotate-90")}
          />
        )}
        {!hasChildren && <div className="w-3.5 shrink-0" />}
        <span className="text-primary/60 shrink-0">{getIcon(node.fieldType)}</span>
        <span className="truncate flex-1">{node.displayName}</span>
        {node.fieldType !== "RELATION" && (
          <span className="text-[10px] text-muted opacity-0 group-hover:opacity-100 transition-opacity">
            Insertar
          </span>
        )}
      </button>
      {hasChildren && expanded && (
        <NodeList nodes={node.children!} onSelect={onSelect} level={level + 1} />
      )}
    </div>
  );
}
