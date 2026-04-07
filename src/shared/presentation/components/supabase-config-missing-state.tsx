type SupabaseConfigMissingStateProps = {
  missingEnvVars?: string[];
};

export default function SupabaseConfigMissingState({
  missingEnvVars = [],
}: SupabaseConfigMissingStateProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 py-12 text-foreground">
      <div className="w-full max-w-2xl rounded-3xl border border-border/60 bg-surface p-8 shadow-sm">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">
          Configuracion requerida
        </p>
        <h1 className="mt-3 text-[2.5rem] font-bold tracking-[-0.02em] text-foreground">
          Faltan variables publicas de Supabase
        </h1>
        <p className="mt-3 text-sm leading-6 text-foreground/70">
          La app no puede iniciar sesion ni cargar datos hasta que exista configuracion valida de
          Supabase en el entorno actual.
        </p>
        <div className="mt-6 rounded-2xl border border-border/50 bg-background/70 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-foreground/60">
            Variables faltantes
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {missingEnvVars.map((envVar) => (
              <code
                key={envVar}
                className="rounded-full border border-border/60 bg-surface px-3 py-1 text-xs text-foreground"
              >
                {envVar}
              </code>
            ))}
          </div>
        </div>
        <div className="mt-6 rounded-2xl border border-border/50 bg-background/70 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-foreground/60">
            Referencia
          </p>
          <p className="mt-3 text-sm leading-6 text-foreground/70">
            Usa los valores de tu proyecto en <code>.env.local</code>. Puedes tomar como base{" "}
            <code>.env.example</code> y, si trabajas en local, tambien puedes generar variables con{" "}
            <code>npm run supabase:local</code>.
          </p>
        </div>
      </div>
    </div>
  );
}
