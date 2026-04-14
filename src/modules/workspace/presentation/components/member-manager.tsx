"use client";

import { Loader2, Mail, MoreHorizontal, Plus, Shield, User, UserMinus } from "lucide-react";
import React, { useState } from "react";

import { useAuth } from "@/modules/auth/presentation/providers/auth-provider";
import { cn } from "@/shared/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/presentation/components/ui/avatar";
import { Badge } from "@/shared/presentation/components/ui/badge";
import { Button } from "@/shared/presentation/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/presentation/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/presentation/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/presentation/components/ui/table";

import { useMembers } from "../hooks/use-members";
import { useRoles } from "../hooks/use-roles";
import { useWorkspace } from "../providers/workspace-provider";
import { InviteMemberModal } from "./invite-member-modal";

export function MemberManager() {
  const { user: currentUser } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const {
    members,
    loading: loadingMembers,
    updateRole,
    removeMember,
  } = useMembers(currentWorkspace?.id);
  const { roles, loading: loadingRoles } = useRoles(currentWorkspace?.id);

  const [dialogOpen, setDialogOpen] = useState(false);

  // Compute whether the current user is an admin or owner of this workspace
  const currentUserMember = members.find((m) => m.userId === currentUser?.id);
  const currentUserIsAdmin =
    currentWorkspace?.ownerId === currentUser?.id ||
    roles.find((r) => r.id === currentUserMember?.roleId)?.isSuperadmin === true;

  const handleOpenAdd = () => {
    setDialogOpen(true);
  };

  const handleUpdateRole = async (memberId: string, roleId: string) => {
    await updateRole({ memberId, roleId });
  };

  const handleRemove = async (id: string) => {
    if (confirm("¿Estás seguro de eliminar a este miembro del workspace?")) {
      await removeMember(id);
    }
  };

  if (loadingMembers || loadingRoles) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="px-2">
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            Miembros del Workspace
          </h2>
          <p className="text-sm text-muted-foreground font-light">
            Gestiona quién tiene acceso a este espacio de trabajo y sus permisos.
          </p>
        </div>
        <Button
          data-guidance-anchor="invite-member"
          onClick={handleOpenAdd}
          size="sm"
          disabled={!currentUserIsAdmin}
          className="bg-primary text-background hover:bg-primary/90 shadow-sm transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0"
        >
          <Plus size={16} className="mr-2" />
          Añadir Miembro
        </Button>
      </div>

      <div className="rounded-2xl bg-surface border border-border/5 overflow-hidden shadow-xs">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-b border-border/10 bg-surface-hover/30">
              <TableHead className="text-[11px] font-semibold uppercase tracking-[0.12em] py-4 px-6 text-foreground/70">
                Usuario (ID)
              </TableHead>
              <TableHead className="text-[11px] font-semibold uppercase tracking-[0.12em] py-4 text-foreground/70">
                Rol Asignado
              </TableHead>
              <TableHead className="text-[11px] font-semibold uppercase tracking-[0.12em] py-4 text-right px-6 text-foreground/70">
                Acciones
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((member) => {
              const isOwner = member.userId === currentWorkspace?.ownerId;
              const isMe = member.userId === currentUser?.id;

              return (
                <TableRow
                  key={member.id}
                  className="group hover:bg-surface-hover/30 transition-colors border-b border-border/5 last:border-0"
                >
                  <TableCell className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8 rounded-full border border-border/10">
                        {member.userAvatarUrl && (
                          <AvatarImage
                            src={member.userAvatarUrl}
                            alt={member.userName || "Usuario"}
                          />
                        )}
                        <AvatarFallback className="bg-primary/10 text-primary text-[10px]">
                          {member.userName ? (
                            member.userName.substring(0, 2).toUpperCase()
                          ) : isMe ? (
                            <User size={12} />
                          ) : (
                            <Mail size={12} />
                          )}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-foreground truncate max-w-[150px]">
                          {member.userName || "Usuario Invitado"}
                        </span>
                        <span className="text-[11px] font-light text-muted-foreground truncate max-w-[150px]">
                          {member.userEmail || member.userId}
                        </span>
                        <div className="flex gap-1 mt-1">
                          {isMe && (
                            <Badge
                              variant="outline"
                              className="text-[9px] h-4 uppercase bg-primary/10 text-primary border-primary/20"
                            >
                              Tú
                            </Badge>
                          )}
                          {isOwner && (
                            <Badge
                              variant="outline"
                              className="text-[9px] h-4 uppercase bg-amber-500/10 text-amber-500 border-amber-500/20"
                            >
                              Propietario
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="py-4">
                    <Select
                      value={member.roleId}
                      onValueChange={(val) => handleUpdateRole(member.id, val)}
                      disabled={isOwner || !currentUserIsAdmin || isMe}
                    >
                      <SelectTrigger
                        className={cn(
                          "h-9 bg-transparent border-none shadow-none text-xs font-medium hover:bg-foreground/5 transition-colors w-auto gap-2 px-2",
                          isOwner && "opacity-50 cursor-not-allowed hover:bg-transparent",
                        )}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-surface border-border/50 text-foreground">
                        {roles.map((role) => (
                          <SelectItem key={role.id} value={role.id} className="text-xs">
                            {role.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="py-4 text-right px-6">
                    {!isOwner ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Acciones para miembro ${member.userName || member.userEmail}`}
                            className="h-8 w-8 text-muted hover:text-foreground transition-all"
                          >
                            <MoreHorizontal size={14} />
                            <span className="sr-only">
                              Acciones para miembro {member.userName || member.userEmail}
                            </span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className="w-48 bg-surface border-border/50"
                        >
                          <DropdownMenuItem
                            onClick={() => handleRemove(member.id)}
                            className="flex items-center gap-2 cursor-pointer text-red-500 focus:text-red-500 focus:bg-red-500/10"
                          >
                            <UserMinus size={14} />
                            <span>Eliminar Miembro</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : (
                      <div className="h-8 w-8 flex items-center justify-center ml-auto text-muted-foreground/30">
                        <Shield size={14} />
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
            {members.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={3}
                  className="h-32 text-center text-muted-foreground font-light text-sm italic"
                >
                  No hay otros miembros en este workspace todavía.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <InviteMemberModal open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
