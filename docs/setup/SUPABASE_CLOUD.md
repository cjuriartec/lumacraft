# 🔧 Guía de Configuración: Supabase Cloud

Esta guía te ayudará a conectar tu proyecto Lumacraft con un proyecto de Supabase en la nube.

---

## 📋 Requisitos Previos

- Node.js 20+
- Cuenta en [supabase.com](https://supabase.com)
- Supabase CLI instalado (`npm install -g supabase` o usar `npx supabase`)

---

## 1. Crear un Proyecto en Supabase Cloud

1. Ve a [supabase.com/dashboard](https://supabase.com/dashboard)
2. Click en **"New Project"**
3. Completa los campos:
   - **Organization**: Selecciona o crea una organización
   - **Project name**: `lumacraft`
   - **Database Password**: Genera una contraseña segura (**guárdala**, la necesitarás)
   - **Region**: Selecciona la más cercana a tus usuarios
4. Click en **"Create new project"** y espera ~2 minutos

---

## 2. Obtener las API Keys

Una vez creado el proyecto:

1. Ve a **Settings** → **API** en el sidebar del dashboard
2. Copia los siguientes valores:

| Campo en Dashboard | Variable en `.env.local` |
|---|---|
| **Project URL** | `NEXT_PUBLIC_SUPABASE_URL` |
| **Publishable key** (anon) | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` |

3. Pega los valores en tu archivo `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://abc123xyz.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIs...
```

> **Nota**: La **Publishable key** (antes llamada `anon key`) es segura para usar en el cliente.
> La **Secret key** (antes `service_role`) **nunca** debe exponerse en el frontend.

---

## 3. Login con Supabase CLI

El CLI de Supabase te permite ejecutar migraciones, generar tipos y gestionar tu proyecto desde la terminal.

### 3.1 Iniciar sesión

```bash
npx supabase login
```

Esto abrirá tu navegador para autenticarte. Una vez autorizado, el token se guarda localmente.

### 3.2 Verificar la sesión

```bash
npx supabase projects list
```

Deberías ver tu proyecto `lumacraft` en la lista.

---

## 4. Vincular el Proyecto Cloud

Desde la raíz del proyecto, ejecuta:

```bash
npx supabase link
```

El CLI te pedirá:
1. **Seleccionar el proyecto** de la lista (elige `lumacraft`)
2. **Database password**: Ingresa la contraseña que definiste al crear el proyecto

### Verificar el enlace

```bash
npx supabase db remote commit
```

Esto descargará el esquema actual de tu base de datos remota.

---

## 5. Aplicar Migraciones al Proyecto Cloud

Las migraciones SQL están en `supabase/migrations/`. Para aplicarlas a tu proyecto en la nube:

```bash
npx supabase db push
```

Esto ejecutará todas las migraciones pendientes:
- `20240330000001_initial_schema.sql` — Tablas base (accounts, roles, members, collections)
- `20240330000002_workspace_trigger.sql` — Trigger de creación automática de workspace
- `20240330000003_rls_policies.sql` — Políticas de seguridad (RLS)

### Verificar las migraciones aplicadas

```bash
npx supabase migration list
```

---

## 6. Configurar Google OAuth

Para que el login con Google funcione:

1. Ve al [Dashboard de Supabase](https://supabase.com/dashboard) → tu proyecto
2. Navega a **Authentication** → **Providers**
3. Habilita **Google**
4. Necesitarás crear credenciales OAuth en [Google Cloud Console](https://console.cloud.google.com/apis/credentials):
   - Tipo: **Web Application**
   - Redirect URI: `https://TU-PROYECTO.supabase.co/auth/v1/callback`
5. Copia el **Client ID** y **Client Secret** de Google en el formulario de Supabase
6. Guarda los cambios

---

## 7. Verificar la Conexión

Inicia el servidor de desarrollo:

```bash
npm run dev
```

Abre [http://localhost:3000/login](http://localhost:3000/login). Si ves la página de login sin errores en consola, la conexión está funcionando.

---

## 📁 Estructura de Archivos Relevantes

```
lumacraft/
├── .env.local                    # Tus keys (NO se sube a git)
├── .env.example                  # Template para otros devs
├── supabase/
│   ├── config.toml               # Configuración del CLI
│   └── migrations/               # SQL de esquema y RLS
│       ├── 20240330000001_initial_schema.sql
│       ├── 20240330000002_workspace_trigger.sql
│       └── 20240330000003_rls_policies.sql
└── src/shared/infrastructure/supabase/
    ├── client.ts                 # Cliente para el browser
    ├── server.ts                 # Cliente para Server Components
    └── middleware.ts             # Cliente para el middleware de Next.js
```

---

## 🛑 Troubleshooting

| Problema | Solución |
|---|---|
| `Invalid API key` | Verifica que el valor de `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` en `.env.local` sea correcto |
| `supabase link` falla | Asegúrate de haber ejecutado `npx supabase login` primero |
| `db push` dice "no migrations" | Verifica que estés en la raíz del proyecto y que exista `supabase/migrations/` |
| Google OAuth no redirige | Comprueba que el Redirect URI en Google Cloud Console coincida exactamente con tu URL de Supabase |
| Error CORS en el browser | Agrega `http://localhost:3000` en **Authentication → URL Configuration → Redirect URLs** en el dashboard |

---

## ⚡ Comandos Rápidos

```bash
# Login al CLI
npx supabase login

# Vincular proyecto
npx supabase link

# Aplicar migraciones
npx supabase db push

# Ver estado de migraciones
npx supabase migration list

# Generar tipos TypeScript desde el esquema
npx supabase gen types typescript --linked > src/shared/infrastructure/supabase/database.types.ts
```
