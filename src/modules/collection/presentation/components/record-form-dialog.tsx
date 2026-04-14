"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/presentation/components/ui/dialog";

import { Field } from "../../domain/entities/field.entity";
import { DataRecord } from "../../domain/entities/record.entity";
import { RecordEditorForm } from "./record-editor-form";

interface RecordFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fields: Field[];
  record?: DataRecord;
  onSubmit: (
    data: Record<string, unknown>,
  ) => Promise<{ ok: boolean; error?: { message: string } } | void>;
}

export function RecordFormDialog({
  open,
  onOpenChange,
  fields,
  record,
  onSubmit,
}: RecordFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-x-hidden overflow-y-auto border-border bg-surface sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            {record ? "Editar Registro" : "Nuevo Registro"}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted">
            {record
              ? "Modifica los valores de este registro."
              : "Añade una nueva fila de datos a esta colección."}
          </DialogDescription>
        </DialogHeader>

        <RecordEditorForm
          fields={fields}
          record={record}
          onSubmit={async (data) => {
            const result = await onSubmit(data);
            if (result?.ok) {
              onOpenChange(false);
            }
            return result;
          }}
          onCancel={() => onOpenChange(false)}
          layout="dialog"
        />
      </DialogContent>
    </Dialog>
  );
}
