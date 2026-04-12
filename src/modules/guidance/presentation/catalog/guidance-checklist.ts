import type { GuidanceChecklistItemDefinition } from "@/modules/guidance/domain/guidance.types";

export const GUIDANCE_CHECKLIST: GuidanceChecklistItemDefinition[] = [
  {
    id: "navigation",
    title: "Entender workspace y navegación",
    description:
      "Familiarízate con el selector de workspace, el sidebar y el acceso rápido al motor.",
    milestoneId: "navigation_understood",
    guideId: "dashboard-overview",
    articleId: "primeros-pasos",
  },
  {
    id: "ai-setup",
    title: "Configurar la IA del workspace",
    description: "Añade tu provider, guarda la API key del workspace y valida la conexión real.",
    milestoneId: "ai_configured",
    guideId: "ai-settings-overview",
    articleId: "configuracion-ia",
    adminOnly: true,
  },
  {
    id: "first-collection",
    title: "Crear tu primera colección",
    description: "Empieza el modelo de datos con una colección bien nombrada y contextualizada.",
    milestoneId: "collection_created",
    guideId: "collections-overview",
    articleId: "colecciones",
  },
  {
    id: "first-field",
    title: "Definir el primer campo",
    description: "Estructura el esquema para que tus registros y relaciones tengan forma.",
    milestoneId: "field_created",
    guideId: "collection-schema",
    articleId: "campos-y-esquema",
  },
  {
    id: "first-record",
    title: "Crear el primer registro",
    description: "Carga datos reales y prueba filtros, edición rápida y navegación documental.",
    milestoneId: "record_created",
    guideId: "collection-data",
    articleId: "registros-y-filtros",
  },
  {
    id: "first-template",
    title: "Crear la primera plantilla",
    description: "Conecta el motor de datos con el editor visual y las variables dinámicas.",
    milestoneId: "template_created",
    guideId: "collection-templates",
    articleId: "plantillas",
  },
  {
    id: "first-document",
    title: "Abrir o generar el primer documento",
    description: "Verifica el flujo completo desde los datos hasta el documento persistido.",
    milestoneId: "document_opened",
    guideId: "collection-document-entry",
    articleId: "documentos",
  },
];
