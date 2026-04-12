"use client";

import { ChevronDown, Database, Plus } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState } from "react";

import { useWorkspaceSchema } from "@/modules/collection/presentation/hooks/use-workspace-schema";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/presentation/components/ui/popover";

export function SidebarCollections({
  isCollapsed,
  setSidebarOpen,
}: {
  isCollapsed: boolean;
  setSidebarOpen: (o: boolean) => void;
}) {
  const { collections, loading } = useWorkspaceSchema();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const pathname = usePathname();
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const isActive = pathname.startsWith("/collections");

  const NavIcon = <Database size={18} strokeWidth={1.5} />;

  const handleLinkClick = () => {
    setSidebarOpen(false);
    setIsPopoverOpen(false);
  };

  const handleMouseEnter = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    setIsPopoverOpen(true);
  };

  const handleMouseLeave = () => {
    closeTimeoutRef.current = setTimeout(() => {
      setIsPopoverOpen(false);
    }, 200);
  };

  if (isCollapsed) {
    return (
      <div onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
        <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
          <PopoverTrigger asChild>
            <Link
              href="/collections"
              onClick={handleLinkClick}
              className={`w-full cursor-pointer flex items-center justify-center p-2 rounded-lg transition-all duration-150 ${
                isActive
                  ? "text-primary bg-primary/10"
                  : "text-foreground/70 hover:text-foreground hover:bg-surface"
              }`}
            >
              {NavIcon}
            </Link>
          </PopoverTrigger>

          <PopoverContent
            side="right"
            sideOffset={12}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            className="w-64 p-2 bg-surface/90 backdrop-blur-xl border-border/20 shadow-[0_20px_40px_-12px_rgba(0,0,0,0.5)] rounded-2xl overflow-x-hidden"
          >
            <div className="flex items-center px-3 py-2 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-foreground/30">
                Colecciones
              </span>
            </div>
            <div className="space-y-0.5 max-h-[300px] overflow-y-auto scrollbar-hide">
              {collections.length === 0 && !loading && (
                <p className="px-3 py-4 text-[12px] text-foreground/30 italic text-center">
                  No hay colecciones
                </p>
              )}
              {collections.map((col) => (
                <Link
                  key={col.id}
                  href={`/collections/${col.id}`}
                  onClick={handleLinkClick}
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] transition-all duration-200 group/item ${
                    pathname === `/collections/${col.id}`
                      ? "bg-primary/10 text-primary font-semibold"
                      : "text-foreground/70 hover:bg-white/5 hover:text-foreground"
                  }`}
                >
                  <div
                    className={`w-1.5 h-1.5 rounded-full transition-colors ${
                      pathname === `/collections/${col.id}`
                        ? "bg-primary"
                        : "bg-foreground/10 group-hover/item:bg-primary/40"
                    }`}
                  />
                  <span className="truncate">{col.displayName || col.name}</span>
                </Link>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13.5px] font-medium transition-all duration-150 ${
          isActive
            ? "text-primary bg-primary/10"
            : "text-foreground/70 hover:text-foreground hover:bg-surface"
        }`}
      >
        <span className={isActive ? "text-primary" : "text-inherit opacity-70"}>{NavIcon}</span>
        <span className="flex-1 text-left">Colecciones</span>
        <ChevronDown
          size={14}
          className={`transition-transform duration-200 ${isExpanded ? "rotate-180" : "opacity-30"}`}
        />
      </button>

      {isExpanded && (
        <div className="ml-4 pl-3 border-l border-border/10 space-y-0.5 py-1">
          {collections.map((col) => (
            <Link
              key={col.id}
              href={`/collections/${col.id}`}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] transition-all ${
                pathname === `/collections/${col.id}`
                  ? "text-primary font-semibold"
                  : "text-foreground/50 hover:text-foreground hover:bg-surface/50"
              }`}
            >
              <span className="truncate">{col.displayName || col.name}</span>
            </Link>
          ))}
          <Link
            href="/collections"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] text-primary/60 hover:text-primary transition-colors"
          >
            <Plus size={12} />
            <span>Nueva Colección</span>
          </Link>
        </div>
      )}
    </div>
  );
}
