"use client";

import { Check, ChevronDown, Layers, Plus, Settings2, UserPlus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { cn } from "@/shared/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/presentation/components/ui/dropdown-menu";

import { useWorkspace } from "../providers/workspace-provider";
import { CreateWorkspaceDialog } from "./create-workspace-dialog";
import { InviteMemberModal } from "./invite-member-modal";

export function WorkspaceSwitcher({ showName = true }: { showName?: boolean }) {
  const { workspaces, currentWorkspace, setCurrentWorkspace, loading } = useWorkspace();
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const router = useRouter();

  if (loading || workspaces.length === 0) {
    return (
      <div className="h-10 w-full animate-pulse bg-foreground/5 rounded-lg border border-border/5" />
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "w-full flex items-center cursor-pointer group hover:bg-surface-hover/20 rounded-xl transition-all duration-300 border border-transparent hover:border-border/10",
            showName ? "justify-between px-2.5 py-2" : "justify-center p-2",
          )}
        >
          <div
            className={cn("flex items-center gap-3 overflow-hidden", !showName && "justify-center")}
          >
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-primary shrink-0 shadow-lg shadow-primary/10">
              <Layers size={16} className="text-white" />
            </div>
            {showName && (
              <div className="flex flex-col items-start min-w-0 leading-tight">
                <span className="text-[12px] font-bold uppercase text-foreground/90">
                  Lumacraft
                </span>
                <span className="text-[11px] text-muted-foreground font-medium truncate w-full group-hover:text-foreground/70 transition-colors text-start">
                  {currentWorkspace?.name || "Seleccionar..."}
                </span>
              </div>
            )}
          </div>
          {showName && (
            <ChevronDown
              size={14}
              className="text-muted/40 group-hover:text-muted transition-colors shrink-0 ml-2"
            />
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-[220px] bg-surface border-border/40 p-1.5 shadow-2xl rounded-xl animate-in fade-in slide-in-from-top-2 duration-300"
        align="start"
        sideOffset={10}
      >
        <div className="px-3 py-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted opacity-60">
            Cambiar Workspace
          </p>
        </div>

        {workspaces.map((workspace) => {
          const isActive = workspace.id === currentWorkspace?.id;
          return (
            <DropdownMenuItem
              key={workspace.id}
              className={cn(
                "flex items-center justify-between px-3 py-2.5 cursor-pointer text-sm rounded-lg transition-all mb-0.5 last:mb-0",
                isActive
                  ? "text-primary bg-primary/5 font-bold"
                  : "text-muted-foreground hover:text-foreground hover:bg-surface-hover/30",
              )}
              onClick={() => setCurrentWorkspace(workspace)}
            >
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div
                  className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    isActive ? "bg-primary" : "bg-muted-foreground/20",
                  )}
                />
                <span className="truncate">{workspace.name}</span>
              </div>
              {isActive && <Check size={14} className="shrink-0 animate-in zoom-in-50" />}
            </DropdownMenuItem>
          );
        })}

        <DropdownMenuSeparator className="mt-1.5 bg-border/10" />
        <DropdownMenuItem
          className="flex items-center gap-2.5 px-3 py-2.5 cursor-pointer rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-surface-hover/30"
          onSelect={(e) => {
            e.preventDefault();
            setCreateDialogOpen(true);
          }}
        >
          <Plus size={14} className="text-muted" />
          Crear workspace
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link
            href="/settings/workspace/general"
            className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-xs font-medium text-muted-foreground hover:bg-surface-hover/30 hover:text-foreground"
          >
            <Settings2 size={14} className="text-muted" />
            Administrar workspace
          </Link>
        </DropdownMenuItem>

        <div className="mt-1.5 pt-1.5 border-t border-border/10">
          <DropdownMenuItem
            className="flex items-center gap-2.5 px-3 py-2.5 cursor-pointer rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-surface-hover/30"
            onSelect={(e) => {
              e.preventDefault(); // prevent closing dropdown instantly
              setInviteModalOpen(true);
            }}
          >
            <UserPlus size={14} className="text-muted" />
            Agregar usuario
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
      <CreateWorkspaceDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onCreated={() => {
          setCreateDialogOpen(false);
          router.push("/settings/workspace/general");
        }}
      >
        <button type="button" className="hidden" aria-hidden="true" />
      </CreateWorkspaceDialog>
      <InviteMemberModal open={inviteModalOpen} onOpenChange={setInviteModalOpen} />
    </DropdownMenu>
  );
}
