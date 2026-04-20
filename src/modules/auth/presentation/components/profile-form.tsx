"use client";

import { Camera, CheckCircle2, Loader2 } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/shared/presentation/components/ui/avatar";
import { Button } from "@/shared/presentation/components/ui/button";
import { Input } from "@/shared/presentation/components/ui/input";
import { Label } from "@/shared/presentation/components/ui/label";
import { useUploadFile } from "@/shared/presentation/hooks/use-upload-file";

import { useUpdateProfile } from "../hooks/use-update-profile";
import { useAuth } from "../providers/auth-provider";

export function ProfileForm() {
  const { user } = useAuth();
  const { updateProfile } = useUpdateProfile();
  const { uploadFile } = useUploadFile();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState(user?.fullName || "");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user?.avatarUrl || null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!user) return null;

  const initials = fullName
    ? fullName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : user.email.value[0].toUpperCase();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const objectUrl = URL.createObjectURL(file);
      setAvatarPreview(objectUrl);
      setSuccess(false);

      // Clean up the object URL when component unmounts or file changes
      return () => URL.revokeObjectURL(objectUrl);
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);

    try {
      let currentAvatarUrl = user.avatarUrl;

      // 1. Upload avatar if selected
      if (avatarFile) {
        const uploadResult = await uploadFile(avatarFile, "avatars", user.id);
        if (!uploadResult.ok) {
          toast.error("Error al subir imagen", {
            description: uploadResult.error.message,
          });
          setLoading(false);
          return;
        }
        currentAvatarUrl = uploadResult.value.url;
      }

      // 2. Update profile
      const result = await updateProfile({
        fullName,
        avatarUrl: currentAvatarUrl,
      });

      if (result.ok) {
        setSuccess(true);
        setAvatarFile(null);
        toast.success("Perfil actualizado", {
          description: "Tus cambios se han guardado correctamente.",
        });
      } else {
        toast.error("Error", {
          description: result.error.message,
        });
      }
    } catch {
      toast.error("Error", {
        description: "Ocurrió un error inesperado.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl space-y-12">
      <div className="flex flex-col md:flex-row md:items-center gap-8 p-1">
        <div className="relative group cursor-pointer" onClick={handleAvatarClick}>
          <Avatar className="h-24 w-24 border-2 border-border/50 shadow-sm ring-offset-background transition-all group-hover:ring-4 ring-primary/10 overflow-hidden">
            <AvatarImage src={avatarPreview || undefined} alt={fullName} className="object-cover" />
            <AvatarFallback className="text-2xl font-bold bg-surface text-muted">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
            <Camera className="text-white w-8 h-8" />
          </div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
            aria-label="Seleccionar avatar"
          />
        </div>

        <div className="flex flex-col space-y-1">
          <h2 className="text-xl font-bold tracking-tight text-foreground">Tu Foto de Perfil</h2>
          <p className="text-sm text-muted/70 max-w-sm">
            Haz clic en el avatar para subir una nueva foto. Esta imagen será visible para todos los
            miembros del workspace.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="grid gap-6">
          <div className="grid gap-2.5">
            <Label
              htmlFor="email"
              className="text-[11px] font-bold uppercase tracking-[0.12em] text-foreground/40"
            >
              Email
            </Label>
            <Input
              id="email"
              value={user.email.value}
              disabled
              className="bg-surface/50 border-border/30 text-muted opacity-80 font-medium h-11"
            />
            <p className="text-[11px] text-muted/50 mt-1">
              El email no puede ser modificado por seguridad.
            </p>
          </div>

          <div className="grid gap-2.5">
            <Label
              htmlFor="fullName"
              className="text-[11px] font-bold uppercase tracking-[0.12em] text-foreground/40"
            >
              Nombre Completo
            </Label>
            <Input
              id="fullName"
              placeholder="Ej. Juan Pérez"
              value={fullName}
              onChange={(e) => {
                setFullName(e.target.value);
                setSuccess(false);
              }}
              className="bg-surface border-border/50 focus:border-primary/50 transition-all h-11 font-medium text-foreground"
            />
          </div>
        </div>

        <div className="pt-2 flex items-center gap-4">
          <Button
            type="submit"
            disabled={loading || (user.fullName === fullName && !avatarFile)}
            className="px-8 h-11 rounded-xl font-bold shadow-lg shadow-primary/10 transition-all active:scale-[0.98]"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              "Guardar Cambios"
            )}
          </Button>

          {success && !loading && (
            <div className="flex items-center gap-2 text-primary animate-in fade-in slide-in-from-left-2">
              <CheckCircle2 size={16} />
              <span className="text-sm font-bold">Cambios guardados</span>
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
