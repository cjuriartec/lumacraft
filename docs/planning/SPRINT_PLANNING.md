# 🗓️ Sprint Planning y Plan de Lanzamiento (Release Plan)

Este documento proyecta la ejecución de las Historias de Usuario (detalladas en `USER_STORIES.md`) a lo largo de **Sprints de 2 semanas**, asumiendo una velocidad promedio del equipo de **~25 Story Points (SP) por Sprint**.

## 🚀 Iteración 1: MVP Base y Data Engine (Sprints 1-3)

### **Sprint 1: Setup y Autenticación** ✅ _Completado_

_Objetivo: Tener la arquitectura base corriendo e inicio de sesión funcional con Multi-Tenancy._

- **Setup Inicial**: Configuración de Next.js, Supabase Cloud y base de datos (PostgreSQL). ✅
- **US-1.01 (5 SP)**: Autenticación con Google OAuth vía Supabase Auth. ✅
- **US-1.02 (3 SP)**: Creación automática de Workspace (Trigger PostgreSQL). ✅
- **US-2.01 (3 SP)**: CRUD básico de Colecciones (Backend y UI base). ✅
- **Total**: 11 SP + Overhead de Setup y migración a Supabase Cloud.

### **Sprint 2: El Motor de Datos (Data Engine)** ✅ _Completado_

_Objetivo: Los administradores pueden crear tablas completas y los editores ver los grids._

- **US-2.02 (8 SP)**: Añadir campos y validaciones JSONB a las colecciones.
  - Tipos soportados: `TEXT`, `NUMBER`, `BOOLEAN`, `DATE`, `ENUM`.
  - Configuración JSONB por tipo (opciones de enum, min/max, placeholder, etc).
- **US-2.03 (8 SP)**: Generación dinámica e inteligente de formularios con React Hook Form + Zod.
  - Formulario modal para crear/editar registros.
  - Validación en runtime según el schema dinámico de campos.
- **US-2.04 (5 SP)**: Vista de Data Grid (tabla dinámica) con paginación **server-side** y **sort por columna**.
  - Paginación con `range()` de Supabase (default: 25 filas por página).
  - Click en header de columna ordena por ese campo via `data->>'fieldName'`.
- **Total Estimado**: 21 SP.

> **Diferido a sprints posteriores:**
>
> - Inline editing en el grid → Sprint 3.
> - Búsqueda y filtrado avanzado en el grid → Sprint 3.
> - Tipos de campo `RELATION`, `FILE`, `LOCATION` → Sprint 3.

### **Sprint 3: Relaciones, Tipos Avanzados y UX del Grid** ✅ _Completado_

_Objetivo: Conectar entidades, completar los tipos de campo y mejorar la experiencia del Data Grid._

- **US-3.01 (5 SP)**: Configuración de tipos de relación (1:1, 1:N) en la base de datos.
  - Implementar campo tipo `RELATION` en el Field Manager.
- **US-3.02 (5 SP)**: Selector asíncrono para formularios (Lookup de relaciones).
- **US-1.03 (3 SP)**: Selector global de Workspaces en el header.
- **Tipos avanzados (5 SP)**: Implementar campos `FILE` (Supabase Storage) y `LOCATION` (coordenadas).
- **UX Grid (5 SP)**: Inline editing en celdas del Data Grid + barra de búsqueda/filtrado por columna.
- **Total Estimado**: 23 SP.

---

## 🔒 Iteración 2: Seguridad y Editor de Plantillas (Sprints 4-5) ✅ _Completado_

### **Sprint 4: Seguridad Zero-Trust y Contexto IA** ✅ _Completado_

_Objetivo: El sistema debe acoplar los permisos implícitos y resolver relaciones para la IA._

- **US-4.01 (5 SP)**: Gestión de Roles y Miembros del Workspace (Settings). ✅
- **US-4.02 (5 SP)**: Ocultar UI y asegurar accesos (RLS en PostgreSQL) basados en permisos CRUD de colecciones. ✅
- **US-4.03 (5 SP)**: Lógica de override y acceso de lectura implícito en tablas dependientes (RLS). ✅
- **US-3.03 (8 SP)**: Construir el servicio de "Eager Loading" para armar árboles JSON profundos. ✅
- **Total Estimado**: 23 SP.

### **Sprint 5: Template Engine Builder (Beta)** ✅ _Completado_

_Objetivo: Implementar el lienzo de Plate para armar documentos interactivos._

- **US-5.01 (13 SP)**: Lienzo Drag & Drop con serialización de bloques al backend. ✅
- **US-5.02 (5 SP)**: Bloques de Variables inyectando datos directamente del Eager Loading (Sprint 4). ✅
- **UX/Architectural (3 SP)**: Integración de Plantillas en Colecciones y Modo Revisor/Editor. ✅
- **Total Estimado**: 21 SP.

---

## 🤖 Iteración 3: La Capa de IA y Refinamiento (Sprints 6-7)

### **Sprint 6: Lógica Avanzada y Bloque IA** 🔄 _En Progreso_

_Objetivo: Finalizar la generación de documentos e integrar Gemini._

- **US-5.03 (8 SP)**: Lógica de parseo "Condicional" y "Listas" al generar el documento.
- **US-6.01 (5 SP)**: Arquitectura del Adapter Pattern para AI e integración del SDK de Google Gemini.
- **US-6.02 (8 SP)**: UI del "Bloque IA" en el builder, Grounding de datos y streaming.
- **Total Estimado**: 21 SP.

### **Sprint 7: Exportaciones y Control de IA**

_Objetivo: Entregar el valor tangible (PDFs) y estabilizar el sistema de modelos._

- **US-5.04 (8 SP)**: Exportación a PDF/DOCX vía Edge Functions y almacenamiento en Supabase Storage.
- **US-6.03 (3 SP)**: Panel de control de la IA (`ai_config`) para A/B testing y Fallback dinámico.
- **Total Estimado**: 11 SP + QA / Testing End-to-End.

---

## ⚡ Iteración 4: Evolución Post-MVP (Sprints 8-9)

### **Sprint 8: Automatizaciones Asíncronas**

_Objetivo: Implementar el backend de automatizaciones y webhooks._

- **US-7.01 (8 SP)**: UI y lógica base para crear "Triggers" sobre colecciones.
- **US-7.02 (5 SP)**: Implementación de Supabase Webhooks y pg_cron (o Inngest).
- **Total Estimado**: 13 SP.

### **Sprint 9: Relaciones Avanzadas y Consistencia**

_Objetivo: Resolver la ambigüedad en la cardinalidad y habilitar la navegación bidireccional del grafo._

- **US-8.01 (5 SP)**: Soporte para relación `MANY_TO_ONE` (N:1) y selección única obligatoria en UI/Zod.
- **US-8.02 (3 SP)**: Refuerzo de validaciones de cardinalidad en la capa de Dominio (`DataRecord`) y Repositorios.
- **US-8.03 (8 SP)**: Arquitectura de Campo Virtual (tipo `REVERSE_LOOKUP`) para navegación bidireccional.
- **Total Estimado**: 16 SP.

---

## 📈 Resumen del Roadmap

| Fecha Relativa          | Hito                   | Valor Entregado                                                                                    |
| :---------------------- | :--------------------- | :------------------------------------------------------------------------------------------------- |
| **Mes 1 (Sprints 1-2)** | Data Engine Listo      | Plataforma tipo "Airtable" funcional. Puedes crear tablas y guardar datos.                         |
| **Mes 2 (Sprints 3-4)** | Core Completo          | Multi-Tenancy robusto y grafos de relaciones navegables.                                           |
| **Mes 3 (Sprints 5-6)** | Smart Templates        | Editor drag & drop funcional, inyección de variables y primera prueba de IA redactando con Gemini. |
| **Mes 4 (Sprints 7-8)** | Beta Release Candidato | Exportación de PDFs, estabilización de fallbacks de IA y automatización.                           |
