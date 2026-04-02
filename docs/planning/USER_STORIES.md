# 📖 Historias de Usuario y Épicas - Lumacraft

Este documento detalla el desglose del proyecto en Épicas y sus respectivas Historias de Usuario (User Stories), siguiendo el modelo ágil. Se incluye una estimación en **Story Points (SP)**.

---

## 🏗️ Épica 1: Fundación y Autenticación OAuth

**Objetivo**: Establecer la base del sistema, el modelo Multi-Tenant y el inicio de sesión.

| ID          | Historia de Usuario                                                                                                           | Criterios de Aceptación (DoD)                                                                      | SP  |
| :---------- | :---------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------- | :-- |
| **US-1.01** | Como usuario nuevo, quiero iniciar sesión usando Google OAuth.                                                                | - Botón "Continuar con Google".<br>- Supabase Auth maneja la sesión.<br>- Retorno de token seguro. | 5   |
| **US-1.02** | Como sistema, quiero que al registrarse un usuario por primera vez se le cree automáticamente un Workspace (Cuenta) personal. | - Trigger en Postgres al insertar en `auth.users`.<br>- Membresía con rol `SUPERADMIN`.            | 3   |
| **US-1.03** | Como usuario con acceso a varios workspaces, quiero un selector de cuenta en la interfaz para cambiar de contexto.            | - Dropdown visible en el header.<br>- Carga de datos aislada por cuenta.                           | 3   |

---

## 🗄️ Épica 2: Data Engine (Tablas Dinámicas)

**Objetivo**: Permitir a los usuarios crear colecciones y gestionar registros.

| ID          | Historia de Usuario                                                                                        | Criterios de Aceptación (DoD)                                                       | SP  |
| :---------- | :--------------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------- | :-- |
| **US-2.01** | Como Administrador, quiero crear, renombrar y eliminar Colecciones.                                        | - CRUD de `collections`.<br>- Lista en UI.                                          | 3   |
| **US-2.02** | Como Administrador, quiero añadir campos de diferentes tipos (Texto, Número, Enum, Fecha) a una colección. | - CRUD de `fields`.<br>- Soporte para configuración JSONB.                          | 8   |
| **US-2.03** | Como Editor, quiero ver un formulario autogenerado basado en los campos de mi colección.                   | - Generación dinámica usando React Hook Form.<br>- Tipos de input acordes al campo. | 8   |
| **US-2.04** | Como Editor, quiero ver el listado de mis registros en una tabla dinámica con paginación.                  | - Carga consultando JSONB `data`.<br>- Índices GIN efectivos.                       | 5   |

---

## 🔗 Épica 3: Motor de Relaciones

**Objetivo**: Construir un grafo de datos permitiendo interconectar colecciones.

| ID          | Historia de Usuario                                                                                | Criterios de Aceptación (DoD)                                          | SP  |
| :---------- | :------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------- | :-- |
| **US-3.01** | Como Administrador, quiero crear campos tipo "Relación" (1:1, 1:N, N:M) para vincular colecciones. | - Selector de colección destino.<br>- Configuración de relación en DB. | 5   |
| **US-3.02** | Como Editor, al llenar un formulario, quiero buscar y seleccionar un registro de otra colección.   | - Input "Select Asíncrono".<br>- Registro en `record_relations`.       | 5   |
| **US-3.03** | Como sistema, quiero implementar Eager Loading recursivo para alimentar el contexto de la IA.      | - Construcción del árbol JSON recursivo.                               | 8   |

---

## 🛡️ Épica 4: Permisos Granulares

**Objetivo**: Asegurar el aislamiento Multi-Tenant y controles CRUD por rol.

| ID          | Historia de Usuario                                                                                                       | Criterios de Aceptación (DoD)                                 | SP  |
| :---------- | :------------------------------------------------------------------------------------------------------------------------ | :------------------------------------------------------------ | :-- |
| **US-4.01** | Como Admin, quiero crear roles personalizados y decidir en qué colecciones pueden Leer, Crear, Actualizar o Eliminar.     | - CRUD de `roles`.<br>- Registro en `collection_permissions`. | 5   |
| **US-4.02** | Como sistema, ocultaré botones y endpoints si el usuario no tiene permisos CRUD en esa colección.                         | - Políticas RLS en Supabase.<br>- Botón oculto en UI.         | 5   |
| **US-4.03** | Como sistema, otorgaré LECTURA implícita en tablas dependientes (Lookup) si el usuario puede crear el registro principal. | - Lógica de override de permisos en RLS/DB.                   | 5   |

---

## 📄 Épica 5: Template Engine Visual

**Objetivo**: Diseñar plantillas de documentos inyectando datos.

| ID          | Historia de Usuario                                                                                              | Criterios de Aceptación (DoD)                                            | SP  |
| :---------- | :--------------------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------- | :-- |
| **US-5.01** | Como Editor, quiero usar un lienzo Drag & Drop para añadir bloques.                                              | - Implementación de editor visual.<br>- Guardado de JSON en `templates`. | 13  |
| **US-5.02** | Como Editor, quiero usar bloques de "Variable" para inyectar datos del registro seleccionado (ej: `{{nombre}}`). | - Selector visual resolviendo el `field`.                                | 5   |
| **US-5.03** | Como Editor, quiero usar bloques "Condicionales" y "Listas" basados en datos.                                    | - Renderizador estructurado.<br>- Soporte a sub-bloques repetibles.      | 8   |
| **US-5.04** | Como usuario, quiero exportar PDF/DOCX a partir del template.                                                    | - Edge Function para generación.<br>- Guardado en Supabase Storage.      | 8   |

---

## 🤖 Épica 6: AI Engine Flexible

**Objetivo**: Integrar redacción automatizada mediante LLMs.

| ID          | Historia de Usuario                                                                       | Criterios de Aceptación (DoD)                                        | SP  |
| :---------- | :---------------------------------------------------------------------------------------- | :------------------------------------------------------------------- | :-- |
| **US-6.01** | Como Arquitecto, quiero un Adapter Pattern para cambiar entre Gemini, OpenAI o Anthropic. | - Edge Function implementada.<br>- Interfase `AIProvider` base.      | 5   |
| **US-6.02** | Como Editor, quiero añadir un "Bloque IA" en mi template con un prompt dinámico.          | - Configurador de bloque AI.<br>- Inyección (Grounding) de contexto. | 8   |
| **US-6.03** | Como Admin, quiero hacer fallback dinámico de modelo si falla uno, desde base de datos.   | - Tabla `ai_config` como origen de verdad.                           | 3   |

---

## ⚡ Épica 7: Automatizaciones

**Objetivo**: Ejecución asíncrona de webhooks/emails.

| ID          | Historia de Usuario                                                      | Criterios de Aceptación (DoD)                             | SP  |
| :---------- | :----------------------------------------------------------------------- | :-------------------------------------------------------- | :-- |
| **US-7.01** | Como Administrador, quiero definir "Triggers" cuando un registro cambia. | - UI Builder.<br>- Tabla `triggers` interactuando con DB. | 8   |
| **US-7.02** | Como sistema, procesaré acciones en background (Webhooks/Inngest).       | - Setup Webhooks + pg_cron.                               | 5   |

---

**Total de Story Points Estimados**: 126 SP.
