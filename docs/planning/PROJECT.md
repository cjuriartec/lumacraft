# 📋 Plan de Implementación - Plataforma Dinámica de Datos + Documentos + IA

---

## 🎯 Objetivo del Proyecto

Desarrollar una plataforma web modular que permita crear estructuras de datos dinámicas, gestionar permisos granulares, generar documentos inteligentes y utilizar IA para redacción contextual basada en datos estructurados.

---

## 🏗️ Stack Tecnológico Propuesto

### Backend (Supabase BaaS)

- **Plataforma Core**: Supabase (Backend-as-a-Service)
- **Base de datos**: PostgreSQL 15+ (vía Supabase)
- **RLS & Lógica**: Row Level Security (RLS) policies y PostgreSQL Funciones
- **Autenticación**: Supabase Auth (Google OAuth)
- **Almacenamiento**: Supabase Storage
- **IA**: Google Gemini API (Principal) corriendo en Edge Functions (Deno)

### Frontend

- **Framework**: Next.js 14+ (App Router)
- **Comunicación DB**: `@supabase/supabase-js` (SDK) y llamadas directas
- **UI**: React 18+ con TypeScript
- **Componentes**: shadcn/ui + TailwindCSS
- **Formularios**: React Hook Form + Zod
- **Editor visual**: Craft.js o Plate

### DevOps & Automatizaciones

- **CI/CD**: GitHub Actions
- **Hosting Frontend**: Vercel
- **Hosting Backend**: Supabase (Free Tier sin Cold Starts)
- **Colas / Workflows**: Triggers nativos (pg_cron) o Inngest

---

## 📅 Cronograma de Desarrollo

### **FASE 1: Fundación - Data Engine (Semanas 1-4)**

#### Semana 1: Setup inicial

- [ ] Configuración de repositorio Next.js
- [ ] Creación de proyecto en Supabase
- [ ] Vinculación de Supabase CLI local
- [ ] Setup de esquema SQL inicial (migraciones)
- [ ] CI/CD básico (linting, tests) y Vercel

#### Semana 2: Autenticación OAuth (Google)

- [ ] Configurar Provider de Google en Supabase
- [ ] Interfaz de Auth UI con `@supabase/auth-helpers-nextjs`
- [ ] Lógica de triggers PostgreSQL para auto-crear Workspace
- [ ] UI: Botón "Continuar con Google" y dashboard inicial

#### Semana 3: Data Engine - Modelo dinámico

- [ ] Crear entidades: `collections`, `fields`, `records`
- [ ] CRUD API para collections
- [ ] CRUD API para fields con validación de tipos
- [ ] CRUD API para records con validación JSONB
- [ ] Índices GIN en campos JSONB
- [ ] Migraciones y seeders de ejemplo

#### Semana 4: UI del Data Engine

- [ ] Vista de lista de collections
- [ ] Constructor visual de collections (agregar/editar campos)
- [ ] Selector de tipos de datos con configuración
- [ ] Vista de tabla dinámica para records
- [ ] CRUD de records con formulario autogenerado
- [ ] Validaciones frontend según tipo de campo

**Entregable**: Sistema funcional para crear tablas dinámicas y gestionar datos tipo spreadsheet.

---

### **FASE 2: Relaciones y Permisos (Semanas 5-8)**

#### Semana 5: Sistema de relaciones

- [ ] Implementar campo tipo `relation` en configuración
- [ ] Resolver relaciones en queries (JOIN vs JSONB embedded)
- [ ] API para obtener datos relacionados
- [ ] UI: selector de relaciones entre collections
- [ ] Vista de navegación por relaciones (breadcrumbs)

#### Semana 6: Sistema de permisos por colección y RLS

- [ ] Tabla `collection_permissions` implementada
- [ ] Reglas RLS en Supabase (Row Level Security)
- [ ] CRUD de permisos por rol interactivo
- [ ] Prevención de leaks de datos nativa en DB
- [ ] UI de gestión de permisos (matriz rol × colección)

#### Semana 7: Permisos a nivel de registro

- [ ] Implementar `user_record_access` o `user_collection_scope`
- [ ] Filtrado automático en queries según contexto de usuario
- [ ] Lógica de herencia de permisos
- [ ] Tests de seguridad y edge cases

#### Semana 8: Formularios dinámicos por sección

- [ ] Entidades: `forms`, `form_sections`, `form_fields`
- [ ] API para definir formularios personalizados
- [ ] Renderizado condicional de secciones según rol
- [ ] UI drag-and-drop para organizar secciones
- [ ] Preview de formulario en tiempo real

**Entregable**: Sistema con relaciones funcionales y control granular de acceso.

---

### **FASE 3: Template Engine Visual (Semanas 9-13)**

#### Semana 9: Arquitectura del Template Engine

- [ ] Diseño de bloques (texto, variable, lista, condicional, IA, decisor)
- [ ] Modelo de datos para templates
- [ ] Parser de bloques a estructura ejecutable
- [ ] Renderer básico (HTML/Markdown)

#### Semana 10: Editor visual de templates

- [ ] Integrar editor tipo Craft.js o Plate
- [ ] Crear componentes para cada tipo de bloque
- [ ] Drag & drop de bloques
- [ ] Panel de propiedades por bloque
- [ ] Selector visual de variables desde collections

#### Semana 11: Bloques avanzados

- [ ] Implementar bloque de lista (iteración sobre relaciones)
- [ ] Implementar bloque condicional (if/else visual)
- [ ] Implementar bloque decisor (tabla switch)
- [ ] Implementar bloque IA (configuración de prompt)
- [ ] Preview en tiempo real del documento

#### Semana 12: Generación de documentos

- [ ] API para compilar template + contexto → documento final
- [ ] Exportación a PDF (Puppeteer o wkhtmltopdf)
- [ ] Sistema de versionado de templates
- [ ] Historial de documentos generados

#### Semana 13: UX y refinamiento

- [ ] Biblioteca de templates predefinidos
- [ ] Duplicar y modificar templates
- [ ] Tests de generación con datos reales
- [ ] Optimización de performance en renderizado

**Entregable**: Editor visual funcional que genera documentos dinámicos.

---

### **FASE 4: Context Engine + AI Engine (Semanas 14-17)**

#### Semana 14: Context Engine

- [ ] Función `resolverContexto(record_id)` recursiva
- [ ] Resolución automática de relaciones N niveles
- [ ] Agregación de datos relacionados en estructura JSON
- [ ] Cache de contextos para performance
- [ ] API endpoint de contexto enriquecido

#### Semana 15: AI Engine - Arquitectura Agnóstica

- [ ] Definir interfaz `AIProvider` (contrato base)
- [ ] Implementar `GeminiProvider` como proveedor principal
- [ ] Implementar sistema de "Model Fallback" y selección dinámica
- [ ] Manejo de tokens y límites por proveedor
- [ ] Logs centralizados de auditoría IA

#### Semana 16: Bloque IA y Factory Pattern

- [ ] `AIProviderFactory` para instanciar proveedores según configuración
- [ ] Configuración de bloques con selector de modelo (Gemini Pro/Flash, etc.)
- [ ] Constructor de prompts con variables y "System Instructions" dinámicas
- [ ] Preview de salida IA con streaming (Server-Sent Events)
- [ ] Soporte para modelos multimodales (Gemini Vision)

#### Semana 17: Optimización y Costos

- [ ] Cache de respuestas (Redis/JSONB) para prompts idénticos
- [ ] Sanitización y validación de esquemas de salida (JSON Mode)
- [ ] Sistema de cuotas de uso por usuario/organización
- [ ] Tests de calidad comparativos entre modelos
- [ ] Fine-tuning de prompts para Gemini-specific logic

**Entregable**: Sistema completo con generación inteligente de contenido.

---

### **FASE 5: Automatizaciones y Workflows (Semanas 18-20)**

#### Semana 18: Sistema de triggers

- [ ] Entidad `triggers` (on create, update, delete)
- [ ] Acciones: enviar email, generar documento, llamar webhook
- [ ] UI para configurar triggers sin código
- [ ] Evaluación de condiciones (if field changes to X → action)

#### Semana 19: Workflows visuales

- [ ] Editor de flujos (tipo node-based con ReactFlow)
- [ ] Nodos: condición, acción, delay, fork/merge
- [ ] Ejecución asíncrona con cola (Bull/BullMQ)
- [ ] Logs de ejecución de workflows

#### Semana 20: Integraciones externas

- [ ] Webhooks salientes
- [ ] API REST pública con rate limiting
- [ ] Documentación OpenAPI/Swagger
- [ ] SDKs básicos (opcional)

**Entregable**: Plataforma con capacidades de automatización.

---

## 🧪 Testing y QA (Transversal)

### Por fase:

- **Unit tests**: Cobertura mínima 70% en lógica de negocio
- **Integration tests**: Endpoints críticos (CRUD, permisos)
- **E2E tests**: Flujos principales con Playwright/Cypress
- **Performance tests**: Queries con datasets grandes (10k+ records)
- **Security tests**: Penetration testing básico en permisos

---

## 📊 Métricas de Éxito

### Técnicas:

- [ ] Tiempo de carga de lista de records < 500ms (1000 registros)
- [ ] Generación de documento < 3s (template complejo)
- [ ] Uptime 99.5%+
- [ ] Test coverage >70%

### Producto:

- [ ] Crear una collection completa en < 5 minutos
- [ ] Generar primer documento en < 10 minutos (usuario nuevo)
- [ ] NPS >40 en beta testers

---

## ⚠️ Riesgos y Mitigaciones

| Riesgo                                    | Probabilidad | Impacto | Mitigación                                                 |
| ----------------------------------------- | ------------ | ------- | ---------------------------------------------------------- |
| Complejidad de permisos mal diseñada      | Alta         | Crítico | Prototipo temprano + tests exhaustivos                     |
| Performance con JSONB en datasets grandes | Media        | Alto    | Índices GIN, particionamiento, cache                       |
| UX confusa en editor visual               | Media        | Alto    | User testing iterativo desde fase 3                        |
| Costos de API de IA elevados              | Media        | Medio   | Rate limiting, caching de respuestas, opciones self-hosted |
| Scope creep en features                   | Alta         | Medio   | Roadmap estricto, MVP primero                              |

---

## 🎓 Recursos y Equipo Sugerido

### Equipo ideal:

- **1 Backend Developer** (NestJS, PostgreSQL)
- **1 Frontend Developer** (React, Next.js)
- **1 Full-stack Developer** (integración + features transversales)
- **1 UI/UX Designer** (part-time, fases 1-3)
- **1 Product Owner** (definición de casos de uso)

### Recursos externos:

- Documentación de NestJS, Next.js, PostgreSQL JSONB
- Tutoriales de Craft.js / Plate para editores visuales
- Guías de seguridad para sistemas multitenancy
- Best practices de prompt engineering

---

## 🚀 Go-Live y Post-Lanzamiento

### Pre-lanzamiento (Semana 21):

- [ ] Auditoría de seguridad completa
- [ ] Load testing con datasets realistas
- [ ] Documentación de usuario final
- [ ] Videos tutoriales básicos
- [ ] Plan de soporte y escalamiento

### Lanzamiento Beta (Semana 22):

- [ ] 10-20 usuarios beta seleccionados
- [ ] Métricas de uso en tiempo real (Mixpanel/Amplitude)
- [ ] Canal de feedback dedicado (Discord/Slack)
- [ ] Hotfixes en <24h para bugs críticos

### Post-lanzamiento:

- [ ] Iteraciones semanales basadas en feedback
- [ ] Roadmap público de features
- [ ] Escalamiento horizontal si >1000 usuarios

---

## 💡 Mejoras Futuras (Post-MVP)

- **Colaboración en tiempo real** (WebSockets, OT/CRDT)
- **Versionado de datos** (auditoría completa)
- **Dashboards personalizables** (charts dinámicos)
- **Mobile app** (React Native)
- **Marketplace de templates y collections**
- **IA multimodal** (análisis de imágenes, voz)
- **Integración con herramientas externas** (Zapier, Make)

---

## 📞 Próximos Pasos Inmediatos

1. **Validar stack tecnológico** con prueba de concepto (2 días)
2. **Crear repositorio y estructura base** (1 día)
3. **Definir casos de uso específicos** con stakeholders (2 días)
4. **Kickoff de Fase 1** con el equipo

---

### 1. Sistema Unificado de Roles y Permisos

En lugar de roles fijos, el sistema utiliza un modelo de **Roles Dinámicos** por cuenta. Un rol es simplemente un nombre (Admin, Editor, Auditor) al que se le asignan permisos granulares.

- **SUPERADMIN (Especial)**: Es el único rol protegido. Tiene acceso total (Hardcoded Bypass) y no puede ser eliminado. Es el dueño de la cuenta.
- **ADMIN/EDITOR/VIEWER/OTROS**: Son roles creados en la tabla `roles`. Sus permisos se definen en la matriz de colecciones.
- **Permisos CRUD**: Cada rol define si puede **Leer, Crear, Actualizar o Eliminar** en cada colección.
- **Formularios Inteligentes**: Si un rol no tiene permiso `can_create` en una tabla vinculada, el formulario de creación no mostrará el botón de "Añadir nuevo [Relación]".

---

## 📐 Arquitectura de Base de Datos (Strict Typing & Configurable)

Para garantizar la integridad y el tipado estricto (Backend ↔ DB), definiremos los tipos base:

```sql
-- Tipos Enumerados Esenciales
CREATE TYPE field_type_enum AS ENUM ('TEXT', 'NUMBER', 'BOOLEAN', 'DATE', 'ENUM', 'RELATION', 'FILE', 'LOCATION');
CREATE TYPE relation_type_enum AS ENUM ('ONE_TO_ONE', 'ONE_TO_MANY', 'MANY_TO_MANY');
CREATE TYPE trigger_event_enum AS ENUM ('ON_CREATE', 'ON_UPDATE', 'ON_DELETE');
CREATE TYPE trigger_status_enum AS ENUM ('SUCCESS', 'FAILED', 'PENDING');
CREATE TYPE doc_format_enum AS ENUM ('PDF', 'HTML');
CREATE TYPE ai_provider_enum AS ENUM ('GEMINI', 'OPENAI', 'ANTHROPIC');
CREATE TYPE on_delete_enum AS ENUM ('CASCADE', 'SET_NULL', 'RESTRICT');
CREATE TYPE permission_action_enum AS ENUM ('CREATE', 'READ', 'UPDATE', 'DELETE', 'MANAGE');
```

### 2. Flujo de Acceso y Multi-Tenancy

- **Auto-Creación**: Al iniciar sesión por primera vez vía Google OAuth, el sistema crea automáticamente una "Cuenta Personal" para el usuario y lo asigna como `SUPERADMIN`.
- **Invitaciones**: Un usuario puede ser invitado a otras cuentas con diferentes roles. (Ej: Superadmin en su cuenta personal y Editor en la cuenta de su Empresa).
- **Selector de Contexto**: En la UI, el usuario tendrá un selector de cuenta para cambiar de workspace sin cerrar sesión. Toda la data filtrará por `account_id`.

### 3. Roles Personalizados y Permisos Granulares

Además de los roles globales, el **ADMIN/SUPERADMIN** puede crear roles específicos (ej: "Auditor", "Operador de Planta"):

- **Matriz de Permisos CRUD**: Se define permiso de Crear, Leer, Actualizar y Eliminar por cada colección de forma independiente.
- **Formularios Dinámicos**: El sistema solo genera campos y botones para las colecciones y acciones permitidas para el rol del usuario.
- **Resolución de Dependencias (Herencia Implícita)**: Si un usuario tiene permiso para crear en `Colección A`, y ésta tiene una relación con `Colección B`, el sistema otorga automáticamente permiso de **LECTURA (Lookups)** en `Colección B` para que el usuario pueda seleccionar los registros vinculados, incluso si no tiene permiso READ general sobre la colección B.

---

## 📐 Arquitectura de Base de Datos (Strict Typing & Enums)

Para garantizar la integridad y el tipado estricto (Backend ↔ DB), definiremos tipos ENUM nativos de PostgreSQL:

```sql
-- Tipos Enumerados Natales
CREATE TYPE field_type_enum AS ENUM ('TEXT', 'NUMBER', 'BOOLEAN', 'DATE', 'ENUM', 'RELATION', 'FILE', 'LOCATION');
CREATE TYPE relation_type_enum AS ENUM ('ONE_TO_ONE', 'ONE_TO_MANY', 'MANY_TO_MANY');
CREATE TYPE trigger_event_enum AS ENUM ('ON_CREATE', 'ON_UPDATE', 'ON_DELETE');
CREATE TYPE trigger_status_enum AS ENUM ('SUCCESS', 'FAILED', 'PENDING');
CREATE TYPE doc_format_enum AS ENUM ('PDF', 'DOCX', 'HTML');
CREATE TYPE ai_provider_enum AS ENUM ('GEMINI', 'OPENAI', 'ANTHROPIC');
CREATE TYPE on_delete_enum AS ENUM ('CASCADE', 'SET_NULL', 'RESTRICT');
CREATE TYPE permission_action_enum AS ENUM ('CREATE', 'READ', 'UPDATE', 'DELETE', 'MANAGE');
```

### Sistema Fijo (Core)

```sql
-- Usuarios y autenticación (OAuth Only)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    google_id VARCHAR(255) UNIQUE, -- ID único de Google
    full_name VARCHAR(255),
    avatar_url TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Cuentas (Workspaces/Tenants)
CREATE TABLE accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    owner_id UUID REFERENCES users(id), -- Referencia al Superadmin original
    settings JSONB, -- Configuración de la cuenta (marca blanca, logo, etc.)
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Roles por Cuenta (Unified System)
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_superadmin BOOLEAN DEFAULT false, -- Flag para el dueño (acceso total)
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(account_id, name)
);

-- Membresía en cuentas (Asigna un Rol del Workspace al Usuario)
CREATE TABLE account_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID REFERENCES roles(id) ON DELETE SET NULL,
    joined_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(account_id, user_id)
);

-- Permisos CRUD Granulares por Rol y Colección
CREATE TABLE collection_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    collection_id UUID REFERENCES collections(id) ON DELETE CASCADE,
    can_read BOOLEAN DEFAULT false,
    can_create BOOLEAN DEFAULT false,
    can_update BOOLEAN DEFAULT false,
    can_delete BOOLEAN DEFAULT false,
    UNIQUE(role_id, collection_id)
);
```

### Sistema Dinámico

```sql
-- Colecciones (tablas dinámicas)
CREATE TABLE collections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    display_name VARCHAR(255),
    description TEXT,
    icon VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Campos (columnas dinámicas)
CREATE TABLE fields (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    collection_id UUID REFERENCES collections(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    display_name VARCHAR(255),
    type field_type_enum NOT NULL,
    config JSONB, -- Configuración específica por tipo
    is_required BOOLEAN DEFAULT false,
    is_unique BOOLEAN DEFAULT false,
    order_index INTEGER,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(collection_id, name)
);

-- Registros (filas dinámicas)
CREATE TABLE records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    collection_id UUID REFERENCES collections(id) ON DELETE CASCADE,
    data JSONB NOT NULL,
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Índice GIN para búsquedas eficientes en JSONB
CREATE INDEX idx_records_data ON records USING GIN (data);
CREATE INDEX idx_records_collection ON records(collection_id);
```

### Formularios Dinámicos

```sql
-- Definición de formularios
CREATE TABLE forms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    collection_id UUID REFERENCES collections(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Secciones de formularios
CREATE TABLE form_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_id UUID REFERENCES forms(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    order_index INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Campos en secciones
CREATE TABLE form_fields (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    section_id UUID REFERENCES form_sections(id) ON DELETE CASCADE,
    field_id UUID REFERENCES fields(id) ON DELETE CASCADE,
    order_index INTEGER,
    is_visible BOOLEAN DEFAULT true,
    is_editable BOOLEAN DEFAULT true,
    PRIMARY KEY (section_id, field_id)
);
```

### Permisos Dinámicos

```sql
-- Acceso contextual por usuario y registro
CREATE TABLE user_record_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    record_id UUID REFERENCES records(id) ON DELETE CASCADE,
    can_read BOOLEAN DEFAULT false,
    can_update BOOLEAN DEFAULT false,
    can_delete BOOLEAN DEFAULT false,
    granted_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, record_id)
);

-- Filtros de acceso por colección
CREATE TABLE user_collection_scope (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    collection_id UUID REFERENCES collections(id) ON DELETE CASCADE,
    filter JSONB, -- Filtros dinámicos tipo: {"status": "approved", "region": "Lima"}
    created_at TIMESTAMP DEFAULT NOW()
);
```

### Templates y Documentos

```sql
-- Templates de documentos
CREATE TABLE templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    collection_id UUID REFERENCES collections(id),
    blocks JSONB NOT NULL, -- Estructura de bloques del template
    version INTEGER DEFAULT 1,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Documentos generados
CREATE TABLE generated_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID REFERENCES templates(id),
    record_id UUID REFERENCES records(id),
    file_url TEXT,
    format doc_format_enum NOT NULL,
    context JSONB, -- Contexto usado para generar
    generated_by UUID REFERENCES users(id),
    generated_at TIMESTAMP DEFAULT NOW()
);
```

### Automatizaciones

```sql
-- Triggers automáticos
CREATE TABLE triggers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    collection_id UUID REFERENCES collections(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    event_type trigger_event_enum NOT NULL,
    conditions JSONB, -- Condiciones para ejecutar
    actions JSONB, -- Acciones a realizar
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Logs de ejecución
CREATE TABLE trigger_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trigger_id UUID REFERENCES triggers(id) ON DELETE CASCADE,
    record_id UUID REFERENCES records(id),
    status trigger_status_enum NOT NULL,
    error_message TEXT,
    executed_at TIMESTAMP DEFAULT NOW()
);

-- CONFIGURACIONES Y AI STEERING
-- Configuración de proveedores y modelos de IA
CREATE TABLE ai_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_name ai_provider_enum NOT NULL,
    model_name VARCHAR(100) NOT NULL, -- 'gemini-1.5-pro', 'gpt-4o', etc.
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    api_config JSONB, -- Configuración específica (base_url, timeout, org_id)
    capabilities JSONB, -- { "vision": true, "streaming": true, "max_tokens": 128000 }
    priority INTEGER DEFAULT 0, -- Orden para fallback automático
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(provider_name, model_name)
);

-- Configuraciones globales del sistema
CREATE TABLE system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(255) UNIQUE NOT NULL, -- 'primary_ai_model_id', 'maintenance_mode', etc.
    value JSONB NOT NULL,
    description TEXT,
    category VARCHAR(100), -- 'AI', 'Security', 'Appearance'
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Relaciones entre registros (Motor de Grafos)
CREATE TABLE record_relations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_record_id UUID REFERENCES records(id) ON DELETE CASCADE,
    target_record_id UUID REFERENCES records(id) ON DELETE CASCADE,
    field_id UUID REFERENCES fields(id) ON DELETE CASCADE,
    metadata JSONB, -- Datos adicionales de la relación (ej. rol, fecha de inicio)
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(source_record_id, target_record_id, field_id)
);

CREATE INDEX idx_rel_source ON record_relations(source_record_id);
CREATE INDEX idx_rel_target ON record_relations(target_record_id);
CREATE INDEX idx_rel_field ON record_relations(field_id);
```

---

## 🔗 Detalle del Motor de Relaciones Dinámicas

El sistema no solo almacena datos planos, sino que construye un grafo de información conectada. Las relaciones se definen a nivel de metadatos (`fields`) pero se ejecutan mediante punteros físicos en la tabla `record_relations`.

### 1. Tipos de Relaciones Soportadas

| Tipo                      | Comportamiento                                                               | Casos de Uso                                     | Comportamiento en UI                                |
| :------------------------ | :--------------------------------------------------------------------------- | :----------------------------------------------- | :-------------------------------------------------- |
| **1:1** (Uno a Uno)       | Un registro solo puede estar vinculado a otro registro único.                | Perfiles extendidos, datos sensibles segregados. | Selector de búsqueda simple o Formulario embebido.  |
| **1:N** (Uno a Muchos)    | Un registro "Padre" puede tener múltiples registros "Hijos" vinculados.      | Proyectos ↔ Tareas, Clientes ↔ Facturas.         | Sub-tablas (Sub-grids) o lista de tags de relación. |
| **N:M** (Muchos a Muchos) | Relación bidireccional donde múltiples registros de ambos lados se conectan. | Proyectos ↔ Especialistas, Cursos ↔ Estudiantes. | Multi-select con buscador o tablero de vinculación. |

### 2. Resolución y Performance

- **Virtual Joins**: Aunque los datos están en JSONB, las relaciones usan UUIDs reales en `record_relations`. Esto permite hacer JOINs tradicionales de PostgreSQL para máxima velocidad.
- **Lazy vs Eager Loading**:
  - En las tablas de vista general se usa **Lazy Loading** (solo se trae el ID y el nombre del registro vinculado).
  - En la generación de documentos se usa **Eager Loading** recursivo (hasta 3-5 niveles de profundidad) para nutrir a la IA con contexto completo.

### 3. Configuración Técnica del Campo

Las relaciones se configuran dinámicamente en el objeto `config` del campo:

```json
{
  "type": "relation",
  "config": {
    "targetCollectionId": "uuid-coleccion-destino",
    "relationType": "ONE_TO_MANY",
    "displayField": "id_interno", -- Campo que verá el usuario para identificar el registro
    "allowMultiple": true,
    "bidirectional": true,
    "inverseFieldName": "vínculo_inverso",
    "onDelete": "CASCADE"
  }
}
```

---

## 🛡️ Estrategia de Tipado Estricto (End-to-End)

El uso de **Enums nativos en la base de datos** es solo el primer nivel. Para lograr un tipado infalible:

1.  **Doble Validación**:
    - **PostgreSQL**: Rechaza cualquier valor que no esté en el `CREATE TYPE`.
    - **Prisma/TypeORM**: Genera automáticamente los tipos de TypeScript basados en el esquema de la base de datos.
    - **Zod (Frontend/Backend)**: Valida los esquemas de entrada en el momento que se reciben los datos de un formulario.

2.  **Sincronización Automática**: Cualquier cambio en una opción de un Enum en la BD lanzará errores de compilación en el código, obligándonos a actualizar la lógica de negocio y UI de forma segura.

---

## 🔧 Ejemplos de Configuración de Campos

### Campo tipo Texto

```json
{
  "type": "text",
  "maxLength": 500,
  "minLength": 10,
  "placeholder": "Ingrese descripción",
  "multiline": true
}
```

### Campo tipo Número

```json
{
  "type": "number",
  "min": 0,
  "max": 1000000,
  "decimals": 2,
  "prefix": "$",
  "suffix": "USD"
}
```

### Campo tipo Enum

```json
{
  "type": "enum",
  "options": [
    { "value": "approved", "label": "Aprobado", "color": "#22c55e" },
    { "value": "pending", "label": "Pendiente", "color": "#f59e0b" },
    { "value": "rejected", "label": "Rechazado", "color": "#ef4444" }
  ],
  "allowMultiple": false
}
```

### Campo tipo Relación (Complejo)

```json
{
  "type": "relation",
  "config": {
    "targetCollectionId": "uuid-de-coleccion-relacionada",
    "displayField": "nombre_proyecto",
    "relationType": "many_to_many",
    "allowMultiple": true,
    "bidirectional": true,
    "inverseLabel": "Participantes del Proyecto",
    "cascadeDelete": false
  }
}
```

### Campo tipo Ubicación

```json
{
  "type": "location",
  "enableMap": true,
  "enableAddress": true,
  "defaultZoom": 15,
  "allowedCountries": ["PE"]
}
```

### Campo tipo Archivo

```json
{
  "type": "file",
  "allowedTypes": ["image/jpeg", "image/png", "application/pdf"],
  "maxSize": 5242880,
  "maxFiles": 5,
  "enableThumbnails": true
}
```

---

## 🎨 Ejemplo de Template con Bloques

```json
{
  "templateId": "uuid-template",
  "name": "Informe de Proyecto",
  "blocks": [
    {
      "id": "block-1",
      "type": "text",
      "content": "# Informe de Proyecto"
    },
    {
      "id": "block-2",
      "type": "variable",
      "fieldPath": "proyecto.nombre",
      "format": "uppercase"
    },
    {
      "id": "block-3",
      "type": "conditional",
      "condition": {
        "field": "proyecto.estado",
        "operator": "equals",
        "value": "aprobado"
      },
      "ifTrue": {
        "type": "text",
        "content": "✅ El proyecto ha sido aprobado."
      },
      "ifFalse": {
        "type": "text",
        "content": "⏳ El proyecto está pendiente de aprobación."
      }
    },
    {
      "id": "block-4",
      "type": "list",
      "sourceRelation": "proyecto.fotos",
      "itemTemplate": [
        {
          "type": "variable",
          "fieldPath": "descripcion"
        },
        {
          "type": "variable",
          "fieldPath": "fecha",
          "format": "date"
        }
      ]
    },
    {
      "id": "block-5",
      "type": "ai",
      "prompt": "Redacta un resumen ejecutivo profesional del proyecto {{proyecto.nombre}} que tiene estado {{proyecto.estado}} y un impacto {{proyecto.impacto}}. Máximo 200 palabras.",
      "provider": "gemini",
      "model": "gemini-1.5-pro",
      "config": {
        "temperature": 0.7,
        "maxOutputTokens": 1000,
        "topP": 0.95
      }
    },
    {
      "id": "block-6",
      "type": "switch",
      "field": "proyecto.impacto",
      "cases": [
        {
          "value": "alto",
          "template": [
            { "type": "text", "content": "🔴 Este proyecto requiere atención prioritaria." }
          ]
        },
        {
          "value": "medio",
          "template": [
            { "type": "text", "content": "🟡 Este proyecto requiere seguimiento regular." }
          ]
        },
        {
          "value": "bajo",
          "template": [{ "type": "text", "content": "🟢 Este proyecto está bajo control." }]
        }
      ],
      "default": [{ "type": "text", "content": "⚪ Impacto no definido." }]
    }
  ]
}
```

---

## 🔐 Ejemplo de Resolución de Permisos

```typescript
// Pseudocódigo de verificación de permisos
async function canUserAccessRecord(
  userId: string,
  accountId: string,
  recordId: string,
  action: "read" | "create" | "update" | "delete",
): Promise<boolean> {
  // 1. Obtener la membresía y el rol del usuario en la cuenta actual
  const membership = await getAccountMember(userId, accountId);
  if (!membership) return false;

  const role = await getRoleById(membership.role_id);

  // Si es el Superadmin de la cuenta, tiene bypass total
  if (role.is_superadmin) return true;

  // 2. Obtener la colección del registro
  const record = await getRecord(recordId);
  const collectionId = record.collection_id;

  // 3. Verificar permisos de colección para el rol del usuario
  const collectionPerm = await getCollectionPermission(role.id, collectionId);

  let hasCollectionPerm = false;
  if (collectionPerm) {
    switch (action) {
      case "read":
        hasCollectionPerm = collectionPerm.can_read;
        break;
      case "create":
        hasCollectionPerm = collectionPerm.can_create;
        break;
      case "update":
        hasCollectionPerm = collectionPerm.can_update;
        break;
      case "delete":
        hasCollectionPerm = collectionPerm.can_delete;
        break;
    }
  }

  if (!hasCollectionPerm) return false;

  // 4. Verificar permisos específicos de registro (override)
  const recordAccess = await getUserRecordAccess(userId, recordId);

  if (recordAccess) {
    switch (action) {
      case "read":
        return recordAccess.can_read;
      case "update":
        return recordAccess.can_update;
      case "delete":
        return recordAccess.can_delete;
    }
  }

  // 5. Verificar scope de colección (Data Filtering)
  const scope = await getUserCollectionScope(userId, collectionId);

  if (scope && scope.filter) {
    return matchesFilter(record.data, scope.filter);
  }

  return true;
}
```

---

## 🧠 Arquitectura del AI Engine (Estrategia Multi-Modelo)

Para garantizar que el sistema no dependa de un solo proveedor de IA y pueda adaptarse a futuros avances (como nuevos modelos de Gemini, GPT o Claude), se implementará un **Patrón Adapter**.

### 1. Sistema de Abstracción (AI Factory)

El core del sistema no interactúa directamente con ninguna API externa. En su lugar, utiliza una interfaz única:

- **`AIProvider` (Interface)**: Define métodos como `chat()`, `generateText()`, `generateJSON()` y `tokenize()`.
- **Adapters Individuales**:
  - `GeminiAdapter`: Implementación usando `@google/generative-ai`.
  - `OpenAIAdapter`: Implementación usando `openai` SDK.
  - `AnthropicAdapter`: Implementación usando `@anthropic-ai/sdk`.

### 2. Flujo de Decisión Dinámico

Cada bloque de IA en un template puede configurarse de tres formas:

1.  **Modelo Fijo**: Forzar el uso de `gemini-1.5-pro` para tareas que requieren razonamiento complejo.
2.  **Modelo por Costo/Velocidad**: Usar `gemini-1.5-flash` para borradores rápidos o tareas repetitivas.
3.  **Auto-Routing**: El sistema elige el modelo basado en la carga de tokens o disponibilidad de la API (Fallback).

### 3. Estandarización de Prompts y Contexto

A diferencia de un chat convencional, aquí el prompt se construye inyectando el grafo de datos resuelto por el `Context Engine`. El sistema asegura que:

- Los prompts sean agnósticos (evitando jerga específica de un modelo).
- Se use **Grounding** (anclaje): "Responde únicamente basándote en estos datos de la colección [X]".
- Se solicite **Structured Output**: Forzar respuestas en formato JSON coherente con los campos de la plataforma.

### 4. Control de Versiones y Fallback

Al tener los modelos en una tabla (`ai_config`), el sistema puede:

- **A/B Testing**: Configurar que el 10% de los documentos usen un modelo experimental.
- **Panic Switch**: Si un proveedor cae (ej. Google tiene un outage), un admin cambia el `is_active` en la tabla y todo el sistema hace fallback a OpenAI instantáneamente.
- **Costo Dinámico**: El sistema puede elegir modelos "Flash" o "Haiku" para usuarios gratuitos y modelos "Pro" para usuarios premium basándose en esta tabla.

---

## 🔒 Seguridad y Traspaso de Propiedad

1.  **Protección de Superadmin**: El sistema impide mediante un trigger de base de datos que el registro del `Superadmin` de una cuenta sea eliminado o degradado de rol por cualquier otro usuario (incluyendo otros Admins).
2.  **Traspaso de Propiedad (Ownership Transfer)**:
    - El Superadmin actual debe iniciar el proceso eligiendo a un nuevo Superadmin de la lista de miembros.
    - Se requiere una confirmación de seguridad (re-autenticación OAuth).
    - Una vez completado, el Superadmin original se convierte en `ADMIN` y pierde la capacidad de eliminar la cuenta.

---

## 📊 Diagrama de Flujo - Generación de Documento

```
Usuario selecciona Template
         ↓
Selecciona Registro (record_id)
         ↓
Context Engine: resolverContexto(record_id)
         ↓
Obtiene datos del registro + relaciones recursivas
         ↓
Template Engine: parsear bloques
         ↓
Para cada bloque:
  - Texto → insertar directamente
  - Variable → resolver fieldPath en contexto
  - Condicional → evaluar condición y elegir rama
  - Lista → iterar sobre relación y aplicar itemTemplate
  - AI → construir prompt + llamar API → insertar respuesta
  - Switch → evaluar campo y seleccionar case
         ↓
Compilar documento completo (HTML/Markdown)
         ↓
Exportar a formato solicitado (PDF/DOCX)
         ↓
Guardar en generated_documents
         ↓
Devolver URL de descarga al usuario
```

---

## 🚦 Definición de Done (DoD)

### Para cada Feature:

- [ ] Código implementado siguiendo convenciones del proyecto
- [ ] Tests unitarios escritos y pasando (coverage >70%)
- [ ] Tests de integración para endpoints críticos
- [ ] Documentación técnica actualizada (README, JSDoc)
- [ ] Code review aprobado por al menos 1 desarrollador
- [ ] Sin deuda técnica crítica introducida
- [ ] Probado manualmente en entorno de desarrollo
- [ ] Migraciones de BD ejecutadas y versionadas
- [ ] Variables de entorno documentadas

### Para cada Fase:

- [ ] Todas las features de la fase completadas (DoD cumplido)
- [ ] Tests E2E del flujo completo de la fase
- [ ] Documentación de usuario para features de la fase
- [ ] Demo funcional presentada al equipo/stakeholders
- [ ] Performance validado según métricas definidas
- [ ] Desplegado en ambiente de staging
- [ ] Plan de rollback documentado

---

## 📚 Glosario de Términos

- **Collection**: Tabla dinámica creada por el usuario (equivalente a una tabla en BD tradicional)
- **Field**: Campo/columna de una collection
- **Record**: Registro/fila en una collection
- **Template**: Plantilla de documento con bloques configurables
- **Block**: Unidad mínima en un template (texto, variable, condicional, etc.)
- **Context**: Conjunto de datos enriquecidos disponibles para generar un documento
- **Scope**: Filtro que limita qué registros puede ver un usuario
- **Trigger**: Automatización que se ejecuta ante un evento
- **Workflow**: Flujo de trabajo visual con múltiples pasos

---

**Fecha de inicio estimada**: [A definir]  
**Duración total MVP (Fases 1-4)**: ~17 semanas (4.25 meses)  
**Fecha estimada de beta**: [Inicio + 22 semanas]

---

_Versión 1.0 - Este plan es iterativo y debe ajustarse según aprendizajes de cada fase._

**Preparado por**: Equipo de Producto  
**Última actualización**: 29 de Marzo, 2026
