export type CollectionAction = "read" | "create" | "update" | "delete";

export function filterAccessibleCollections<T extends { id: string }>(
  collections: T[],
  canAccessAll: boolean,
  can: (collectionId: string, action: CollectionAction) => boolean,
): T[] {
  if (canAccessAll) {
    return collections;
  }

  return collections.filter((collection) => can(collection.id, "read"));
}

export function buildCollectionIdSet<T extends { id: string }>(collections: T[]): Set<string> {
  return new Set(collections.map((collection) => collection.id));
}

export function filterTemplatesByAccessibleCollections<T extends { collectionId?: string | null }>(
  templates: T[],
  accessibleCollectionIds: Set<string>,
): T[] {
  return templates.filter(
    (template) =>
      typeof template.collectionId === "string" &&
      accessibleCollectionIds.has(template.collectionId),
  );
}
