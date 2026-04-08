# 💎 Lumacraft

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-BaaS-3ECF8E?style=flat-square&logo=supabase)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.0-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Architecture](https://img.shields.io/badge/Architecture-Hexagonal-blue?style=flat-square)](<https://en.wikipedia.org/wiki/Hexagonal_architecture_(software)>)

**Lumacraft** es una plataforma modular de gestión de datos dinámicos potenciada por IA, diseñada para escalar mediante una arquitectura multitenant robusta y un motor de generación de documentos inteligente.

---

## 🚀 Propósito del Proyecto

El objetivo de Lumacraft es proporcionar una infraestructura flexible que permita a las organizaciones:

1.  **Crear estructuras de datos dinámicas** sin necesidad de despliegues constantes (Data Engine).
2.  **Gestionar permisos granulares** (RBAC) con aislamiento estricto entre cuentas (Multi-tenancy).
3.  **Generar documentos inteligentes** basados en contextos enriquecidos por el motor de datos.
4.  **Integrar IA (Gemini)** para redacción contextual y automatización de flujos de trabajo.

---

## 🏛️ Arquitectura: Screaming + Hexagonal (Domain-Driven)

Este proyecto implementa **Screaming Architecture** (las carpetas gritan el dominio del negocio) y **Hexagonal Architecture** (Puertos y Adaptadores) con un enfoque en **Domain-Driven Design (DDD)**.

### Principios de Diseño

1.  **Valid by Construction**: Las entidades de dominio (`Collection`, `Field`, `Role`) solo pueden instanciarse a través de fábricas estáticas (`Entity.create()`) que validan invariantes usando **Value Objects**.
2.  **Value Objects (VOs)**: Los tipos primitivos están envueltos en objetos con lógica de validación propia (e.g., `Identifier` para slugs, `DisplayName` para etiquetas).
3.  **Result Pattern**: No se utilizan excepciones para errores de negocio esperados. Todas las operaciones devuelven un objeto `Result<T, E>`.
4.  **Agnosticismo de Infraestructura**: La lógica de negocio (`domain` y `application`) no conoce nada sobre Supabase, Next.js o librerías externas.

### Estructura de Folders (`src/`)

- `modules/`: Dominios de negocio (Contextos Delimitados).
  - `domain/`: Entidades, Value Objects y Puertos (Interfaces de Repositorio).
  - `application/`: Casos de uso (Orquestación de lógica).
  - `infrastructure/`: Adaptadores (Supabase, APIs externas).
  - `presentation/`: UI enfocada al módulo (React components, hooks).
- `shared/`: Infraestructura compartida y base del sistema de tipos.
- `app/`: Capa de entrega (Next.js App Router).

---

## 🛠️ Stack Tecnológico

| Capa               | Tecnología                                         |
| :----------------- | :------------------------------------------------- |
| **Frontend**       | Next.js 16 (App Router), React 19, Tailwind CSS 4  |
| **Backend (BaaS)** | Supabase (PostgreSQL, Auth, Storage, RLS Granular) |
| **IA Engine**      | Google Gemini (Contextual Generation)              |
| **PDF Export**     | @react-pdf/renderer (High-Fidelity Document Rendering) |
| **Editor**         | Plate.js (Highly Extensible WYSIWYG)               |
| **Validación**     | Domain VOs (Internal), Zod (API/Form Boundaries)   |
| **Testing**        | Vitest (Unit/Integration), Playwright (E2E)        |
| **Componentes**    | Radix UI, Lucide Icons, Noir Minimalist Custom CSS |

---

## ✨ Características Principales

- **Data Engine Hardened**: Motor de datos con validación estricta de esquemas a nivel de dominio y base de datos (PostgreSQL).
- **Smart Template Editor**: Editor visual avanzado basado en Plate.js con soporte para bloques lógicos, tablas dinámicas y redimensionamiento inteligente.
- **High-Fidelity PDF Export**: Exportación de templates a PDF con fidelidad visual total — headings, listas, tablas, imágenes, colores, fuentes y alineación — usando `@react-pdf/renderer` directamente en el proceso de Next.js.
- **AI-Powered Context**: Integración profunda con Gemini para generación de contenido basada en el contexto de los datos de la colección.
- **Relaciones Avanzadas Engine**: Soporte robusto para relaciones 1:1, 1:N y N:M con integridad referencial y resolución eficiente de datos.
- **Zero-Trust Authz**: Sistema de permisos granulares basado en roles persistidos en DB y forzados mediante RLS.
- **Noir Aesthetics**: Interfaz premium minimalista con soporte nativo para Light/Dark mode y animaciones fluidas.

---

## 🏁 Empezando

### Requisitos Previos

- Node.js 20+
- Instancia de Supabase (Local o Cloud)

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
3.  **Configurar el entorno local**:
    Lumacraft incluye un script automatizado para levantar Supabase y configurar las variables de entorno necesarias:
    ```bash
    npm run supabase:local
    ```
    *Este script levantará los contenedores de Docker, aplicará las migraciones y generará las variables para tu `.env.local`.*

    Las variables requeridas son:

    | Variable | Descripción | Requerida para |
    | --- | --- | --- |
    | `NEXT_PUBLIC_SUPABASE_URL` | URL pública del proyecto Supabase | Todo |
    | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Clave anónima (segura para el cliente) | Auth, DB queries |
    | `SUPABASE_SECRET_KEY` | Service role key — bypasea RLS | **PDF Export**, admin ops |
    | `AI_SETTINGS_MASTER_KEY` | Clave de cifrado para secrets de IA | AI Engine |

    > **Importante**: `SUPABASE_SECRET_KEY` es obligatoria para que la exportación de PDF funcione. Sin ella, el servidor no puede subir archivos al bucket `exports` de Storage (bloqueado por RLS).

4.  **Ejecutar el servidor de desarrollo**:
    ```bash
    npm run dev
    ```

---

## 🧪 Comandos Útiles

- `npm run dev`: Inicia el servidor de desarrollo.
- `npm run supabase:local`: Configura y levanta el entorno de Supabase localmente.
- `npm run test`: Ejecuta todos los tests críticos (Unit, Component, Integration).
- `npm run test:e2e`: Ejecuta los tests de extremo a extremo con Playwright.
- `npm run test:coverage`: Genera informe de cobertura completa.
- `npm run lint:fix`: Ejecuta y corrige problemas de estilo y calidad de código.

---

## 🗺️ Roadmap de Implementación

- [x] **Fase 1**: Fundación - Data Engine (Setup, Auth Google, CRUD dinámico).
- [x] **Fase 2**: Relaciones y Permisos (Sistema de relaciones complex, RLS granular).
- [x] **Fase 3**: Template Engine Visual (Editor Plate.js, bloques dinámicos).
- [x] **Fase 4**: Context Engine + AI Engine + PDF Export (Integración Gemini contextual, exportación de alta fidelidad con `@react-pdf/renderer`).
- [ ] **Fase 5**: Automatizaciones y Workflows (Triggers on-create/update).

---

## 📄 Licencia

Este proyecto está bajo la Licencia MIT - mira el archivo [LICENSE](LICENSE) para detalles.
