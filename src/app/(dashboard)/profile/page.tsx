import { ProfileForm } from "@/modules/auth/presentation/components/profile-form";

export const dynamic = "force-dynamic";

export default function ProfilePage() {
  return (
    <div className="mx-auto max-w-5xl space-y-12 px-8 py-10">
      <div className="space-y-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">Cuenta</p>
        <h1 className="text-[2.5rem] font-bold tracking-[-0.02em] text-foreground">Mi Perfil</h1>
        <p className="max-w-2xl text-sm leading-6 text-foreground/70">
          Gestiona tu información personal y cómo te verán otros miembros en el workspace.
        </p>
      </div>

      <div className="pt-4 border-t border-border/5">
        <ProfileForm />
      </div>
    </div>
  );
}
