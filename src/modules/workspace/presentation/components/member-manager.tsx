"use client";

import { Loader2, Mail, MoreHorizontal, Plus, Shield, User, UserMinus } from "lucide-react";
import React, { useState } from "react";

import { useAuth } from "@/modules/auth/presentation/providers/auth-provider";
import { cn } from "@/shared/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/presentation/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/presentation/components/ui/avatar";
import { Badge } from "@/shared/presentation/components/ui/badge";
import { Button } from "@/shared/presentation/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/presentation/components/ui/dropdown-menu";
import { Input } from "@/shared/presentation/components/ui/input";
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
import { useWorkspaceAccess } from "../hooks/use-workspace-access";
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
  const { canManageWorkspace } = useWorkspaceAccess();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRoleFilter, setSelectedRoleFilter] = useState("all");
  const [memberToRemove, setMemberToRemove] = useState<(typeof members)[number] | null>(null);

  const handleOpenAdd = () => {
    setDialogOpen(true);
  };

  const handleUpdateRole = async (memberId: string, roleId: string) => {
    await updateRole({ memberId, roleId });
  };

  const handleRemove = async (id: string) => {
    await removeMember(id);
    setMemberToRemove(null);
  };

  const filteredMembers = members.filter((member) => {
    const searchableValue = `${member.userName ?? ""} ${member.userEmail ?? ""}`.toLowerCase();
    const matchesSearch = searchableValue.includes(searchQuery.trim().toLowerCase());
    const matchesRole = selectedRoleFilter === "all" || member.roleId === selectedRoleFilter;

    return matchesSearch && matchesRole;
  });

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
          disabled={!canManageWorkspace}
          className="bg-primary text-background hover:bg-primary/90 shadow-sm transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0"
        >
          <Plus size={16} className="mr-2" />
          Agregar usuario
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-[1fr_240px]">
        <Input
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Buscar por nombre o correo"
          className="h-11 rounded-xl border-border/10 bg-foreground/5"
        />
        <Select value={selectedRoleFilter} onValueChange={setSelectedRoleFilter}>
          <SelectTrigger className="h-11 rounded-xl border-border/10 bg-foreground/5">
            <SelectValue placeholder="Filtrar por rol" />
          </SelectTrigger>
          <SelectContent className="bg-surface border-border/50 text-foreground">
            <SelectItem value="all">Todos los roles</SelectItem>
            {roles.map((role) => (
              <SelectItem key={role.id} value={role.id}>
                {role.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
            {filteredMembers.map((member) => {
              const isOwner = member.userId === currentWorkspace?.ownerId;
              const isMe = member.userId === currentUser?.id;
              const memberRole = roles.find((role) => role.id === member.roleId);

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
                          {!isOwner && memberRole?.isSuperadmin ? (
                            <Badge
                              variant="outline"
                              className="text-[9px] h-4 uppercase bg-blue-500/10 text-blue-500 border-blue-500/20"
                            >
                              Admin
                            </Badge>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="py-4">
                    <Select
                      value={member.roleId}
                      onValueChange={(val) => handleUpdateRole(member.id, val)}
                      disabled={isOwner || !canManageWorkspace || isMe}
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
                            onClick={() => setMemberToRemove(member)}
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
            {filteredMembers.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={3}
                  className="h-32 text-center text-muted-foreground font-light text-sm italic"
                >
                  No hay miembros que coincidan con la búsqueda actual.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <InviteMemberModal open={dialogOpen} onOpenChange={setDialogOpen} />
      <AlertDialog
        open={!!memberToRemove}
        onOpenChange={(open) => !open && setMemberToRemove(null)}
      >
        <AlertDialogContent className="border-0 bg-surface">
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar miembro</AlertDialogTitle>
            <AlertDialogDescription>
              {memberToRemove
                ? `Se quitará el acceso de ${memberToRemove.userName || memberToRemove.userEmail || "este usuario"} al workspace actual.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 text-white hover:bg-red-500/90"
              onClick={() => (memberToRemove ? void handleRemove(memberToRemove.id) : undefined)}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
