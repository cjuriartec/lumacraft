import type { HelpArticleDefinition } from "@/modules/guidance/domain/guidance.types";

export const HELP_ARTICLES: HelpArticleDefinition[] = [
  {
    id: "primeros-pasos",
    title: "Primeros pasos",
    summary:
      "Un recorrido claro desde el login hasta tu primer documento generado con datos reales.",
    category: "Inicio",
    keywords: ["onboarding", "dashboard", "primer documento", "inicio", "workspace"],
    guideIds: ["dashboard-overview"],
    sections: [
      {
        type: "overview",
        content:
          "Lumacraft funciona mejor cuando sigues un orden simple: elegir workspace, dejar lista la configuración base de IA, modelar datos, cargar registros, crear una plantilla y abrir un documento real.",
      },
      {
        type: "step-list",
        title: "Ruta recomendada",
        items: [
          "Confirma el workspace activo desde el selector superior izquierdo.",
          "Configura el provider y valida la API key del workspace si vas a usar IA en previews o documentos.",
          "Crea una colección con nombre público y descripción útil.",
          "Define los campos clave de tu esquema.",
          "Carga al menos un registro real.",
          "Crea una plantilla vinculada a esa colección.",
          "Abre o regenera un documento para validar el flujo completo.",
        ],
      },
      {
        type: "related-guides",
        title: "Recorridos sugeridos",
        guideIds: [
          "dashboard-overview",
          "ai-settings-overview",
          "collections-overview",
          "document-editor-overview",
        ],
      },
    ],
  },
  {
    id: "workspaces-y-navegacion",
    title: "Workspaces y navegación",
    summary: "Cómo cambia el contexto del producto y dónde vive cada dominio dentro de Lumacraft.",
    category: "Inicio",
    keywords: ["workspace", "sidebar", "navegacion", "dashboard", "cuentas"],
    guideIds: ["dashboard-overview"],
    sections: [
      {
        type: "overview",
        content:
          "El workspace activo define datos, permisos, IA y equipo. El sidebar organiza las áreas para que nunca pierdas el contexto mientras trabajas.",
      },
      {
        type: "checklist",
        title: "Qué revisar siempre",
        items: [
          "Workspace correcto antes de crear o editar datos.",
          "Ruta actual en breadcrumbs para confirmar contexto.",
          "Permisos si no ves acciones de edición.",
        ],
      },
      {
        type: "route-cta",
        title: "Ver dashboard",
        href: "/",
        label: "Abrir Inicio",
        description: "Regresa al tablero principal y usa los accesos principales del workspace.",
      },
    ],
  },
  {
    id: "colecciones",
    title: "Colecciones",
    summary: "Cómo modelar contenedores de datos útiles, legibles y listos para crecer.",
    category: "Motor de Datos",
    keywords: ["colecciones", "data engine", "tablas", "metadata"],
    guideIds: ["collections-overview"],
    sections: [
      {
        type: "overview",
        content:
          "Una colección es la unidad base del motor de datos. Debe representar una entidad clara del negocio y tener un nombre técnico estable.",
      },
      {
        type: "step-list",
        title: "Buenas prácticas",
        items: [
          "Usa nombres públicos entendibles por el equipo.",
          "Mantén el nombre técnico simple y duradero.",
          "Describe el propósito para que otros entiendan cuándo reutilizarla.",
        ],
      },
      {
        type: "route-cta",
        title: "Crear colección",
        href: "/collections",
        label: "Ir a Colecciones",
      },
    ],
  },
  {
    id: "campos-y-esquema",
    title: "Campos y esquema",
    summary: "Diseña estructuras de datos sólidas con tipos, validaciones y relaciones pensadas.",
    category: "Motor de Datos",
    keywords: ["campos", "esquema", "schema", "field", "validacion", "tipos"],
    guideIds: ["collection-schema"],
    sections: [
      {
        type: "overview",
        content:
          "El esquema define qué datos acepta la colección y cómo se conectará con el resto del modelo. Piensa primero en el uso documental y relacional.",
      },
      {
        type: "callout",
        tone: "info",
        title: "Campo principal",
        content:
          "Configúralo cuando quieras que otras colecciones muestren una etiqueta útil en lugar de un identificador técnico.",
      },
      {
        type: "route-cta",
        title: "Abrir esquema",
        href: "/collections",
        label: "Ir a una colección",
        description: "Entra al tab Esquema dentro de la colección que quieras modelar.",
      },
    ],
  },
  {
    id: "registros-y-filtros",
    title: "Registros y filtros",
    summary:
      "Carga información real, edítala rápido y usa filtros persistentes para trabajar mejor.",
    category: "Motor de Datos",
    keywords: ["registros", "filtros", "busqueda", "grid", "datos"],
    guideIds: ["collection-data"],
    sections: [
      {
        type: "overview",
        content:
          "La vista de datos es el punto operativo: desde aquí creas registros, editas inline, aplicas filtros y saltas al flujo documental.",
      },
      {
        type: "checklist",
        title: "Flujo recomendado",
        items: [
          "Crear un registro representativo.",
          "Probar búsqueda global.",
          "Configurar al menos un filtro útil.",
          "Abrir el documento desde la fila del registro.",
        ],
      },
      {
        type: "route-cta",
        title: "Entrar al grid",
        href: "/collections",
        label: "Abrir Colecciones",
      },
    ],
  },
  {
    id: "relaciones",
    title: "Relaciones",
    summary: "Entiende el mapa del modelo y cómo se conectan tus colecciones dentro del workspace.",
    category: "Motor de Datos",
    keywords: ["relaciones", "erd", "modelo", "diagram", "schema map"],
    guideIds: ["relations-overview"],
    sections: [
      {
        type: "overview",
        content:
          "La vista de relaciones sirve para verificar estructura, detectar dependencias y revisar cómo navegarán las variables entre colecciones.",
      },
      {
        type: "callout",
        tone: "success",
        title: "Piensa en documentos",
        content:
          "Una buena relación no solo resuelve datos: también facilita previews, variables y documentos más expresivos.",
      },
      {
        type: "route-cta",
        title: "Ver diagrama",
        href: "/relations",
        label: "Abrir Relaciones",
      },
    ],
  },
  {
    id: "plantillas",
    title: "Plantillas",
    summary: "Crea, organiza y enlaza plantillas con la colección correcta desde el principio.",
    category: "Documentos",
    keywords: ["plantillas", "templates", "editor", "coleccion vinculada"],
    guideIds: ["template-list-overview", "collection-templates"],
    sections: [
      {
        type: "overview",
        content:
          "Las plantillas traducen el modelo de datos en documentos operativos. Vincularlas bien desde el inicio evita retrabajo en variables y previews.",
      },
      {
        type: "step-list",
        title: "Antes de abrir el editor",
        items: [
          "Confirma la colección vinculada.",
          "Define un nombre que indique intención documental.",
          "Escribe una descripción breve si el equipo compartirá esta plantilla.",
        ],
      },
      {
        type: "route-cta",
        title: "Abrir catálogo",
        href: "/templates",
        label: "Ir a Plantillas",
      },
    ],
  },
  {
    id: "editor-avanzado-de-plantillas",
    title: "Editor avanzado de plantillas",
    summary:
      "Variables, bloques lógicos y preview realista para construir documentos sofisticados.",
    category: "Documentos",
    keywords: ["editor", "variables", "ai block", "conditional", "list", "switch", "preview"],
    guideIds: ["template-editor-overview"],
    sections: [
      {
        type: "overview",
        content:
          "El editor mezcla composición visual con lógica dinámica. Variables, bloques condicionales y preview trabajan juntos para validar el documento antes de persistirlo.",
      },
      {
        type: "checklist",
        title: "Secuencia sugerida",
        items: [
          "Nombrar la plantilla.",
          "Estructurar encabezados y layout base.",
          "Insertar variables clave.",
          "Añadir lógica solo donde aporte claridad.",
          "Probar preview con un registro real.",
        ],
      },
      {
        type: "related-guides",
        title: "Recorridos útiles",
        guideIds: ["template-editor-overview"],
      },
    ],
  },
  {
    id: "documentos",
    title: "Documentos",
    summary: "Cómo abrir, editar, regenerar y exportar documentos persistidos desde un registro.",
    category: "Documentos",
    keywords: ["documentos", "pdf", "regenerar", "persistido", "record document"],
    guideIds: ["document-editor-overview"],
    sections: [
      {
        type: "overview",
        content:
          "El documento persistido representa el resultado operativo final de una plantilla aplicada a un registro. Puedes editarlo, regenerarlo y exportarlo a PDF.",
      },
      {
        type: "callout",
        tone: "warning",
        title: "Cuándo regenerar",
        content:
          "Regenera cuando cambie la plantilla o cuando necesites recomponer el contenido base. Si solo necesitas retoques menores, edita el documento actual.",
      },
      {
        type: "route-cta",
        title: "Entrar al flujo documental",
        href: "/collections",
        label: "Abrir una colección",
      },
    ],
  },
  {
    id: "configuracion-ia",
    title: "Configuración IA",
    summary: "Proveedor, modelos, timeouts y claves cifradas del workspace.",
    category: "Administración",
    keywords: ["ia", "openai", "anthropic", "gemini", "fallback", "secrets"],
    adminOnly: true,
    guideIds: ["ai-settings-overview"],
    sections: [
      {
        type: "overview",
        content:
          "La configuración de IA vive a nivel workspace. Desde aquí controlas modelo por defecto, comportamiento de preview y credenciales cifradas por proveedor.",
      },
      {
        type: "checklist",
        title: "Validación mínima",
        items: [
          "Elegir proveedor y modelo por defecto.",
          "Revisar timeouts y límites de preview.",
          "Guardar secret cifrado.",
          "Validar conexión real.",
        ],
      },
      {
        type: "route-cta",
        title: "Abrir IA",
        href: "/settings/ai",
        label: "Ir a Configuración IA",
        adminOnly: true,
      },
    ],
  },
  {
    id: "roles-y-miembros",
    title: "Roles y miembros",
    summary: "Diseña roles claros y asigna personas al workspace con el nivel de acceso correcto.",
    category: "Administración",
    keywords: ["roles", "miembros", "team", "workspace", "invite"],
    adminOnly: true,
    guideIds: ["roles-members-overview"],
    sections: [
      {
        type: "overview",
        content:
          "Separa primero responsabilidades en roles y luego invita personas. Esto hace más simple la gobernanza del workspace cuando el equipo crece.",
      },
      {
        type: "callout",
        tone: "info",
        title: "Orden recomendado",
        content:
          "Crea los roles antes de invitar miembros; así cada alta entra ya con un marco claro de permisos.",
      },
      {
        type: "route-cta",
        title: "Gestionar equipo",
        href: "/settings/workspace/users",
        label: "Ir a Usuarios del Workspace",
        adminOnly: true,
      },
    ],
  },
  {
    id: "permisos",
    title: "Permisos",
    summary: "Configura acceso granular por colección y rol con enforcement real vía RLS.",
    category: "Administración",
    keywords: ["permisos", "rls", "seguridad", "colecciones", "roles"],
    adminOnly: true,
    guideIds: ["permissions-overview"],
    sections: [
      {
        type: "overview",
        content:
          "La matriz de permisos permite decidir qué puede hacer cada rol en cada colección. Lumacraft alinea esta vista con enforcement en base de datos.",
      },
      {
        type: "callout",
        tone: "warning",
        title: "Lectura como base",
        content:
          "Si desactivas lectura, creación, actualización y eliminación se limpian para mantener reglas coherentes.",
      },
      {
        type: "route-cta",
        title: "Abrir matriz",
        href: "/settings/workspace/roles",
        label: "Ir a Roles y Permisos",
        adminOnly: true,
      },
    ],
  },
  {
    id: "autorando-guias",
    title: "Autorando nuevas guías",
    summary: "Patrón interno para añadir ayuda a futuras features sin tocar el core del sistema.",
    category: "Sistema de Ayuda",
    keywords: ["guidance", "help center", "anchors", "catalogo", "nuevas features"],
    sections: [
      {
        type: "overview",
        content:
          "Cada nueva feature debe registrar tres piezas: anchors estables en UI, una guía en el catálogo y un artículo en el Help Center.",
      },
      {
        type: "step-list",
        title: "Patrón de autoría",
        items: [
          "Añadir `data-guidance-anchor` a controles estables y visibles.",
          "Registrar una `GuideDefinition` con contexto, ruta y pasos.",
          "Publicar un `HelpArticleDefinition` que explique intención y flujo.",
          "Disparar milestones solo sobre éxitos reales del usuario.",
        ],
      },
      {
        type: "callout",
        tone: "success",
        title: "Regla práctica",
        content:
          "Si una ayuda depende de texto o layout frágil, todavía no está lista. Prefiere anchors semánticos y CTAs vinculados a rutas reales.",
      },
    ],
  },
];
