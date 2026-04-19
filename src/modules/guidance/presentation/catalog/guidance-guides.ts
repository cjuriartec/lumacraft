import type { GuideDefinition } from "@/modules/guidance/domain/guidance.types";

export const GUIDANCE_GUIDES: GuideDefinition[] = [
  {
    id: "dashboard-overview",
    title: "Recorrido inicial del workspace",
    summary: "Ubica el workspace activo, la navegación y el próximo paso recomendado.",
    pageContextId: "dashboard",
    articleId: "primeros-pasos",
    targetRoute: "/",
    autoStart: "new-users",
    completionMilestone: "navigation_understood",
    featured: true,
    steps: [
      {
        id: "workspace",
        title: "El workspace define el contexto",
        description:
          "Desde aquí cambias de cuenta activa y abres invitaciones de equipo sin salir del flujo actual.",
        anchor: "workspace-switcher",
      },
      {
        id: "navigation",
        title: "El sidebar es tu mapa operativo",
        description:
          "Colecciones, relaciones, configuración y ayuda viven siempre aquí para moverte entre dominios del producto.",
        anchor: "sidebar-nav",
      },
      {
        id: "quick-actions",
        title: "Usa los accesos principales",
        description:
          "Desde Inicio puedes entrar directo a colecciones, registros y plantillas según tu nivel de acceso.",
        anchor: "dashboard-primary-actions",
      },
    ],
  },
  {
    id: "collections-overview",
    title: "Crear y organizar colecciones",
    summary: "Aprende dónde crear colecciones, cómo leer su catálogo y cómo entrar al detalle.",
    pageContextId: "collections",
    articleId: "colecciones",
    targetRoute: "/collections",
    autoStart: "new-users",
    featured: true,
    steps: [
      {
        id: "create",
        title: "Empieza por una colección",
        description:
          "Define nombre público, nombre técnico y descripción. Al crearla, esta guía avanzará sola.",
        anchor: "create-collection",
        advanceOnMilestone: "collection_created",
      },
      {
        id: "grid",
        title: "Desde aquí entras al motor",
        description:
          "Cada tarjeta resume una colección y te lleva a datos, esquema y plantillas en un solo lugar.",
        anchor: "collections-grid",
      },
    ],
  },
  {
    id: "collection-data",
    title: "Operar registros y documentos",
    summary: "Busca, filtra, exporta y crea registros desde la vista principal de datos.",
    pageContextId: "collection-data",
    articleId: "registros-y-filtros",
    targetRoute: "/collections",
    steps: [
      {
        id: "records",
        title: "Añade el primer registro",
        description:
          "La creación de registros desbloquea filtros, edición inline y el flujo documental.",
        anchor: "new-record",
        advanceOnMilestone: "record_created",
      },
      {
        id: "filters",
        title: "Filtra sin perder contexto",
        description:
          "Los filtros se guardan por colección para que cada vista recupere su estado de trabajo.",
        anchor: "records-filters",
      },
      {
        id: "documents",
        title: "Abre el flujo documental",
        description:
          "Desde cada registro puedes abrir un documento persistido usando una plantilla disponible.",
        anchor: "record-document",
      },
    ],
  },
  {
    id: "collection-schema",
    title: "Diseñar el esquema",
    summary: "Define campos, validaciones y el campo principal de representación.",
    pageContextId: "collection-fields",
    articleId: "campos-y-esquema",
    targetRoute: "/collections",
    steps: [
      {
        id: "primary-field",
        title: "El campo principal mejora las relaciones",
        description:
          "Selecciona qué campo representará cada registro cuando otras colecciones lo consuman.",
        anchor: "primary-field-select",
      },
      {
        id: "field-create",
        title: "Añade campos con intención",
        description:
          "Usa tipos, validaciones y configuración contextual. Esta guía avanza al crear un campo.",
        anchor: "add-field",
        advanceOnMilestone: "field_created",
      },
    ],
  },
  {
    id: "collection-templates",
    title: "Conectar datos con plantillas",
    summary:
      "Accede a las plantillas vinculadas a la colección y crea nuevas desde el contexto correcto.",
    pageContextId: "collection-templates",
    articleId: "plantillas",
    targetRoute: "/collections",
    steps: [
      {
        id: "template-create",
        title: "Crea una plantilla vinculada",
        description:
          "Desde aquí naces ya dentro de la colección adecuada y entras directo al editor.",
        anchor: "new-template",
        advanceOnMilestone: "template_created",
      },
      {
        id: "template-table",
        title: "Administra versiones y accesos",
        description:
          "La lista te permite buscar, abrir, editar metadatos o eliminar plantillas del flujo.",
        anchor: "template-list-table",
      },
    ],
  },
  {
    id: "relations-overview",
    title: "Leer el mapa relacional",
    summary: "Visualiza cómo se conectan colecciones y entiende el modelo completo del workspace.",
    pageContextId: "relations",
    articleId: "relaciones",
    targetRoute: "/relations",
    steps: [
      {
        id: "diagram",
        title: "Este diagrama es tu visión sistémica",
        description:
          "Aquí ves las colecciones, sus campos conectivos y el tipo de relación entre ellas.",
        anchor: "relations-diagram",
      },
    ],
  },
  {
    id: "template-list-overview",
    title: "Organizar plantillas",
    summary: "Busca, crea y abre plantillas desde el catálogo general del workspace.",
    pageContextId: "template-list",
    articleId: "plantillas",
    targetRoute: "/templates",
    steps: [
      {
        id: "search",
        title: "Busca por intención, no por memoria",
        description: "Filtra rápido por nombre y detecta en qué colección vive cada plantilla.",
        anchor: "template-search",
      },
      {
        id: "create",
        title: "Crea una plantilla desde el catálogo",
        description:
          "Si aún no tienes ninguna, este es el punto más rápido para iniciar el editor.",
        anchor: "new-template",
        advanceOnMilestone: "template_created",
      },
    ],
  },
  {
    id: "template-editor-overview",
    title: "Dominar el editor de plantillas",
    summary: "Comprende el naming, la barra de herramientas, las variables y la lógica avanzada.",
    pageContextId: "template-editor",
    articleId: "editor-avanzado-de-plantillas",
    targetRoute: "/collections",
    steps: [
      {
        id: "name",
        title: "Nombra la plantilla sin salir del editor",
        description: "El encabezado guarda automáticamente y te mantiene en el flujo documental.",
        anchor: "template-editor-name",
      },
      {
        id: "logic",
        title: "La lógica vive en estos bloques",
        description:
          "Conditional, List, Switch y AI te permiten modelar documentos vivos sobre datos reales.",
        anchor: "template-logic-blocks",
      },
      {
        id: "variables",
        title: "Inserta variables con contexto",
        description:
          "El selector usa la colección activa y el registro del preview para mostrar rutas útiles.",
        anchor: "template-variable-selector",
      },
      {
        id: "preview",
        title: "La vista previa valida antes de publicar",
        description:
          "Refresca la compilación con un registro real para comprobar diseño, lógica y contenido.",
        anchor: "template-preview",
      },
    ],
  },
  {
    id: "document-editor-overview",
    title: "Trabajar documentos persistidos",
    summary: "Edita, descarga PDF y regenera documentos vinculados a registros reales.",
    pageContextId: "document-editor",
    articleId: "documentos",
    targetRoute: "/collections",
    steps: [
      {
        id: "pdf",
        title: "Descarga la salida final",
        description: "Exporta a PDF la versión persistida del documento actual.",
        anchor: "document-download-pdf",
      },
      {
        id: "regenerate",
        title: "Regenerar vuelve a compilar desde la plantilla",
        description:
          "Úsalo cuando cambie la plantilla o quieras volver a sincronizar la versión persistida.",
        anchor: "document-regenerate",
        advanceOnMilestone: "document_opened",
      },
    ],
  },
  {
    id: "collection-document-entry",
    title: "Abrir el primer documento",
    summary:
      "Salta desde el registro hacia el flujo documental cuando ya tienes datos y plantilla.",
    pageContextId: "collection-data",
    articleId: "documentos",
    targetRoute: "/collections",
    steps: [
      {
        id: "open-document",
        title: "Abre el documento desde el registro",
        description:
          "Usa esta acción cuando ya tengas al menos un registro y una plantilla vinculada a la colección.",
        anchor: "record-document",
        advanceOnMilestone: "document_opened",
      },
    ],
  },
  {
    id: "ai-settings-overview",
    title: "Configurar el motor de IA",
    summary: "Define proveedor, modelo, fallback y claves cifradas por workspace.",
    pageContextId: "ai-settings",
    articleId: "configuracion-ia",
    targetRoute: "/settings/ai",
    adminOnly: true,
    featured: true,
    steps: [
      {
        id: "defaults",
        title: "Ajusta proveedor y modelo por defecto",
        description:
          "Estos valores gobiernan la experiencia base del workspace en preview y herramientas de IA.",
        anchor: "ai-provider-default",
      },
      {
        id: "validate",
        title: "Valida las credenciales reales",
        description:
          "La conexión se prueba por proveedor y desbloquea el milestone de configuración.",
        anchor: "ai-secret-validate",
        advanceOnMilestone: "ai_configured",
      },
      {
        id: "fallback",
        title: "Activa fallback si necesitas resiliencia",
        description:
          "Cuando el proveedor principal falle, el workspace puede cambiar automáticamente al respaldo.",
        anchor: "ai-fallback-switch",
      },
    ],
  },
  {
    id: "roles-members-overview",
    title: "Estructura de acceso del equipo",
    summary: "Crea roles, invita miembros y distribuye responsabilidades del workspace.",
    pageContextId: "roles-members",
    articleId: "roles-y-miembros",
    targetRoute: "/settings/workspace/users",
    adminOnly: true,
    steps: [
      {
        id: "roles",
        title: "Primero define roles",
        description: "Los roles establecen el lenguaje operativo antes de asignar personas.",
        anchor: "create-role",
        advanceOnMilestone: "role_created",
      },
      {
        id: "members",
        title: "Luego invita al equipo",
        description: "Cada miembro entra con un rol claro y una superficie de acceso más segura.",
        anchor: "invite-member",
        advanceOnMilestone: "member_invited",
      },
    ],
  },
  {
    id: "permissions-overview",
    title: "Permisos granulares por colección",
    summary: "Reparte lectura, creación, actualización y eliminación por rol y colección.",
    pageContextId: "permissions",
    articleId: "permisos",
    targetRoute: "/settings/workspace/roles",
    adminOnly: true,
    steps: [
      {
        id: "matrix",
        title: "La matriz resume todo el acceso",
        description:
          "Cada fila representa una colección y cada columna una capacidad concreta del rol.",
        anchor: "permissions-matrix",
      },
      {
        id: "switches",
        title: "Los switches se respetan con RLS",
        description:
          "Al cambiar un permiso, la regla queda alineada con el enforcement en base de datos.",
        anchor: "permission-switch",
        advanceOnMilestone: "permission_updated",
      },
    ],
  },
];
