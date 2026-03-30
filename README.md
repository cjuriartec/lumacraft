# 💎 Lumacraft

[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-BaaS-3ECF8E?style=flat-square&logo=supabase)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.0-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Architecture](https://img.shields.io/badge/Architecture-Hexagonal-blue?style=flat-square)](https://en.wikipedia.org/wiki/Hexagonal_architecture_(software))

**Lumacraft** es una plataforma modular de gestión de datos dinámicos potenciada por IA, diseñada para escalar mediante una arquitectura multitenant robusta y un motor de generación de documentos inteligente.

---

## 🚀 Propósito del Proyecto

El objetivo de Lumacraft es proporcionar una infraestructura flexible que permita a las organizaciones:
1.  **Crear estructuras de datos dinámicas** sin necesidad de despliegues constantes (Data Engine).
2.  **Gestionar permisos granulares** (RBAC) con aislamiento estricto entre cuentas (Multi-tenancy).
3.  **Generar documentos inteligentes** basados en contextos enriquecidos por el motor de datos.
4.  **Integrar IA (Gemini)** para redacción contextual y automatización de flujos de trabajo.

---

## 🏛️ Arquitectura: Screaming + Hexagonal

Este proyecto implementa **Screaming Architecture** (las carpetas gritan el dominio del negocio) y **Hexagonal Architecture** (Puertos y Adaptadores) para garantizar que la lógica de negocio esté desacoplada de los detalles técnicos.

### Estructura de Folders (`src/`)
-   `modules/`: Dominios de negocio (Contextos Delimitados).
    -   `auth/`: Gestión de sesiones y autenticación.
    -   `workspace/`: Multi-tenancy y administración de cuentas.
    -   `collection/`: Motor dinámico de datos (Colecciones, Campos, Registros).
-   `shared/`: Infraestructura compartida, clases base y UI común.
    -   `domain/`: Patrón Result, Entidades base, Errores de dominio.
    -   `infrastructure/`: Clientes Supabase, Repositorios base, Inyección de Dependencias.
    -   `presentation/`: Componentes UI compartidos, layouts y proveedores.
-   `app/`: Capa de entrega (Next.js App Router).

---

## 🛠️ Stack Tecnológico

| Capa | Tecnología |
| :--- | :--- |
| **Frontend** | Next.js 15 (App Router), React 19, Tailwind CSS 4 |
| **Backend (BaaS)** | Supabase (PostgreSQL, Auth, Storage, Edge Functions) |
| **IA** | Google Gemini API (AI Engine) |
| **Validación** | Zod (Runtime typing) |
| **Testing** | Vitest, Testing Library, Playwright (E2E) |
| **Componentes** | Radix UI, Lucide Icons, shadcn/ui |

---

## ✨ Características Principales

-   **Data Engine**: Creación de colecciones personalizadas con campos dinámicos (Texto, Números, Relaciones, Archivos) usando PostgreSQL JSONB con índices GIN.
-   **Multi-tenant RBAC**: Aislamiento estricto de datos por `account_id` y roles configurables con permisos CRUD independientes por colección.
-   **AI Engine**: Integración agnóstica de proveedores (actualmente Gemini Pro/Flash) para tareas de redacción y análisis basadas en contexto real.
-   **Template Engine**: Editor visual de plantillas con bloques lógicos (condicionales, bucles, IA) para generación masiva de PDF/DOCX.

---

## 🏁 Empezando

### Requisitos Previos
-   Node.js 20+
-   Instancia de Supabase (Local o Cloud)

### Instalación
1.  Clonar el repositorio:
    ```bash
    git clone https://github.com/usuario/lumacraft.git
    cd lumacraft
    ```
2.  Instalar dependencias:
    ```bash
    npm install
    ```
3.  Configurar variables de entorno (`.env.local`):
    ```env
    NEXT_PUBLIC_SUPABASE_URL=tu_url
    NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key
    SUPABASE_SERVICE_ROLE_KEY=tu_service_key
    ```
4.  Ejecutar el servidor de desarrollo:
    ```bash
    npm run dev
    ```

---

## 🧪 Comandos Útiles

-   `npm run test:unit`: Ejecuta tests unitarios del dominio y casos de uso.
-   `npm run test:integration`: Ejecuta tests de integración contra adaptadores.
-   `npm run test:coverage`: Genera informe de cobertura de código.
-   `npm run lint`: Ejecuta el linter de ESLint.

---

## 🗺️ Roadmap de Implementación

- [x] **Fase 1**: Fundación - Data Engine (Setup, Auth Google, CRUD dinámico).
- [ ] **Fase 2**: Relaciones y Permisos (Sistema de grafos, RLS granular).
- [ ] **Fase 3**: Template Engine Visual (Editor drag-and-drop, exportación PDF).
- [ ] **Fase 4**: Context Engine + AI Engine (Integración Gemini contextual).
- [ ] **Fase 5**: Automatizaciones y Workflows (Triggers on-create/update).

---

## 📄 Licencia

Este proyecto está bajo la Licencia MIT - mira el archivo [LICENSE](LICENSE) para detalles.

