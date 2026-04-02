"use client";

import { Loader2 } from "lucide-react";
import React, { useState } from "react";

import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/presentation/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/presentation/components/ui/dialog";
import { Input } from "@/shared/presentation/components/ui/input";
import { Label } from "@/shared/presentation/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/presentation/components/ui/select";

import { useMembers } from "../hooks/use-members";
import { useRoles } from "../hooks/use-roles";
import { useWorkspace } from "../providers/workspace-provider";

const inputFieldClass = cn(
  "h-11 rounded-xl border-border/10 bg-foreground/5 text-foreground text-sm shadow-none transition-colors px-4",
  "placeholder:font-light focus-visible:border-primary/30 focus-visible:ring-2 focus-visible:ring-primary/10",
);

interface InviteMemberModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InviteMemberModal({ open, onOpenChange }: InviteMemberModalProps) {
  const { currentWorkspace } = useWorkspace();
  const { addMemberByEmail } = useMembers(currentWorkspace?.id);
  const { roles } = useRoles(currentWorkspace?.id);

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formData, setFormData] = useState({ email: "", roleId: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.roleId) return;
    setSubmitting(true);
    setFormError(null);
    const result = await addMemberByEmail({
      email: formData.email.trim(),
      roleId: formData.roleId,
    });
    setSubmitting(false);
    if (!result) return;
    if (result.ok) {
      // Clear form on success
      setFormData({ email: "", roleId: "" });
      onOpenChange(false);
    } else {
      setFormError(result.error.message);
    }
  };

  // Clear form when closing intentionally
  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setFormData({ email: "", roleId: "" });
      setFormError(null);
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex flex-col gap-0 overflow-hidden p-0 sm:max-w-[480px] rounded-2xl border-none bg-surface shadow-[0_32px_64px_rgba(0,0,0,0.6)]">
        <DialogHeader className="shrink-0 px-8 pt-8 pb-4 text-left">
          <DialogTitle className="text-xl font-bold tracking-[-0.01em] text-foreground">
            Añadir Miembro
          </DialogTitle>
          <DialogDescription className="font-light text-sm text-foreground/70">
            Ingresa el correo electrónico del usuario que deseas invitar a colaborar.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col">
          <div className="px-8 py-4 space-y-6">
            <div className="space-y-2">
              <Label
                htmlFor="email"
                className="text-[11px] font-semibold uppercase tracking-[0.12em] text-foreground/70 ml-1"
              >
                Correo Electrónico
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => {
                  setFormData({ ...formData, email: e.target.value });
                  setFormError(null);
                }}
                placeholder="usuario@ejemplo.com"
                required
                className={inputFieldClass}
              />
              {formError && (
                <p className="text-[12px] text-red-500/90 font-medium ml-1 flex items-center gap-1.5">
                  <span className="inline-block h-1 w-1 rounded-full bg-red-500"></span>
                  {formError}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-foreground/70 ml-1">
                Asignar Rol
              </Label>
              <Select
                value={formData.roleId}
                onValueChange={(val) => setFormData({ ...formData, roleId: val })}
                required
              >
                <SelectTrigger className={inputFieldClass}>
                  <SelectValue placeholder="Selecciona un rol" />
                </SelectTrigger>
                <SelectContent className="bg-surface border-border/50 text-foreground">
                  {roles.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="shrink-0 px-8 py-6 bg-transparent">
            <DialogFooter className="flex-col gap-3 sm:flex-row sm:justify-end sm:gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => handleOpenChange(false)}
                disabled={submitting}
                className="rounded-xl font-semibold text-foreground/60 hover:bg-foreground/5 hover:text-foreground"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={submitting || !formData.roleId || !formData.email.trim()}
                className="w-full bg-primary font-semibold text-primary-foreground rounded-xl shadow-sm transition-all hover:bg-primary/90 hover:-translate-y-0.5 active:translate-y-0 sm:w-auto sm:min-w-[140px]"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Añadir Miembro"}
              </Button>
            </DialogFooter>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
