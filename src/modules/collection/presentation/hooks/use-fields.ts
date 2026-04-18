import { useCallback, useEffect, useMemo, useState } from "react";

import { useSupabase } from "@/shared/presentation/providers/supabase-provider";

import { CollectionUseCaseFactory } from "../../application/collection-use-case.factory";
import { CreateFieldRequest } from "../../application/use-cases/create-field.use-case";
import { UpdateFieldRequest } from "../../application/use-cases/update-field.use-case";
import { Field } from "../../domain/entities/field.entity";

export function reorderFieldsLocally(fields: Field[], fieldIds: string[]) {
  const fieldMap = new Map(fields.map((field) => [field.id, field]));

  return fieldIds
    .map((id, index) => {
      const field = fieldMap.get(id);
      if (!field) return null;

      const nextField = Field.create({
        ...field.toJSON(),
        fieldType: field.fieldType,
        config: field.config,
        sortOrder: index,
      });

      return nextField.ok ? nextField.value : field;
    })
    .filter((field): field is Field => field !== null);
}

export function useFields(collectionId: string) {
  const { supabase } = useSupabase();
  const [fields, setFields] = useState<Field[]>([]);
  const [loading, setLoading] = useState(true);

  const factory = useMemo(() => CollectionUseCaseFactory.create(supabase), [supabase]);
  const listUseCase = useMemo(() => factory.listFields(), [factory]);
  const createUseCase = useMemo(() => factory.createField(), [factory]);
  const updateUseCase = useMemo(() => factory.updateField(), [factory]);
  const deleteUseCase = useMemo(() => factory.deleteField(), [factory]);
  const reorderUseCase = useMemo(() => factory.reorderFields(), [factory]);

  const fetchFields = useCallback(async () => {
    if (!collectionId) {
      setFields([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const res = await listUseCase.execute(collectionId);
    if (res.ok) {
      setFields(res.value);
    }
    setLoading(false);
  }, [collectionId, listUseCase]);

  useEffect(() => {
    const initFetch = async () => {
      await fetchFields();
    };
    initFetch();
  }, [fetchFields]);

  const createField = async (params: Omit<CreateFieldRequest, "collectionId">) => {
    const res = await createUseCase.execute({ ...params, collectionId });
    if (res.ok) {
      await fetchFields();
    }
    return res;
  };

  const updateField = async (params: Omit<UpdateFieldRequest, "collectionId">) => {
    const res = await updateUseCase.execute({ ...params, collectionId });
    if (res.ok) {
      await fetchFields();
    }
    return res;
  };

  const deleteField = async (id: string) => {
    const res = await deleteUseCase.execute(id);
    if (res.ok) {
      await fetchFields();
    }
    return res;
  };

  const reorderFields = async (fieldIds: string[]) => {
    const res = await reorderUseCase.execute(collectionId, fieldIds);
    if (res.ok) {
      setFields((currentFields) => reorderFieldsLocally(currentFields, fieldIds));
    }
    return res;
  };

  return {
    fields,
    loading,
    createField,
    updateField,
    deleteField,
    reorderFields,
    refresh: fetchFields,
  };
}
