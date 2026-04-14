"use client";

import { GripVertical, MoreHorizontal, Plus, Settings2, Trash2 } from "lucide-react";

import { useGuidance } from "@/modules/guidance/presentation/hooks/use-guidance";
import { Result } from "@/shared/domain/result";
import { Badge } from "@/shared/presentation/components/ui/badge";
import { Button } from "@/shared/presentation/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/presentation/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/presentation/components/ui/table";

import { CreateFieldRequest } from "../../application/use-cases/create-field.use-case";
import { UpdateFieldRequest } from "../../application/use-cases/update-field.use-case";
import { Field } from "../../domain/entities/field.entity";
import { useCollections } from "../hooks/use-collections";
import { FieldFormDialog } from "./field-form-dialog";

interface FieldManagerProps {
  collectionId: string;
  fields: Field[];
  loading?: boolean;
  createField: (params: Omit<CreateFieldRequest, "collectionId">) => Promise<Result<Field>>;
  updateField: (params: Omit<UpdateFieldRequest, "collectionId">) => Promise<Result<Field>>;
  deleteField: (id: string) => Promise<Result<void>>;
  reorderFields?: (fieldIds: string[]) => Promise<Result<void>>;
}

export function FieldManager({
  collectionId,
  fields,
  loading,
  createField,
  updateField,
  deleteField,
}: FieldManagerProps) {
  const { collections } = useCollections();
  const { trackMilestone } = useGuidance();
  const relationCollections = collections.filter((collection) => collection.id !== collectionId);

  const handleCreateField = async (params: Omit<CreateFieldRequest, "collectionId">) => {
    const result = await createField(params);
    if (result.ok) {
      void trackMilestone("field_created");
    }
    return result;
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-2">
        <div className="space-y-1">
          <h2 className="text-[14px] font-bold text-foreground flex items-center gap-2 uppercase tracking-wider">
            Esquema de Datos
          </h2>
          <p className="text-sm font-light text-foreground/60 leading-relaxed">
            Define los campos y tipos de datos que estructuran esta colección.
          </p>
        </div>
        <FieldFormDialog onSubmit={handleCreateField} availableCollections={relationCollections}>
          <Button
            data-guidance-anchor="add-field"
            size="sm"
            className="bg-primary text-background hover:bg-primary-hover shadow-sm transition-all hover:-translate-y-0.5 active:translate-y-0"
          >
            <Plus size={16} className="mr-2" />
            Añadir Campo
          </Button>
        </FieldFormDialog>
      </div>

      <div className="bg-surface rounded-xl border border-border/5 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-b border-border/50">
              <TableHead className="w-[50px]"></TableHead>
              <TableHead className="py-4 px-4 text-[11px] font-semibold uppercase tracking-wider text-muted">
                Nombre Visible
              </TableHead>
              <TableHead className="py-4 px-4 text-[11px] font-semibold uppercase tracking-wider text-muted">
                Descripción
              </TableHead>
              <TableHead className="py-4 px-4 text-[11px] font-semibold uppercase tracking-wider text-muted">
                ID (API)
              </TableHead>
              <TableHead className="py-4 px-4 text-[11px] font-semibold uppercase tracking-wider text-muted">
                Tipo
              </TableHead>
              <TableHead className="py-4 px-4 text-[11px] font-semibold uppercase tracking-wider text-muted">
                Validación
              </TableHead>
              <TableHead className="py-4 px-4 text-[11px] font-semibold uppercase tracking-wider text-muted text-right">
                Acciones
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {fields.length === 0 ? (
              <TableRow className="hover:bg-transparent border-0">
                <TableCell colSpan={7} className="h-32 text-center text-muted font-light italic">
                  Aún no has definido campos para esta colección.
                </TableCell>
              </TableRow>
            ) : (
              fields.map((field) => (
                <TableRow
                  key={field.id}
                  className="group border-b border-border/5 hover:bg-surface-hover/30 transition-colors"
                >
                  <TableCell className="py-4 px-4 text-muted/40">
                    <GripVertical size={14} className="cursor-grab" />
                  </TableCell>
                  <TableCell className="py-4 px-4 font-medium text-sm text-foreground">
                    {field.displayName || field.name}
                  </TableCell>
                  <TableCell className="py-4 px-4 text-xs text-foreground/60 max-w-[200px]">
                    <span className="line-clamp-2">
                      {field.description || <span className="italic text-muted/40">—</span>}
                    </span>
                  </TableCell>
                  <TableCell className="py-4 px-4 text-xs font-mono text-foreground/80">
                    {field.name}
                  </TableCell>
                  <TableCell className="py-4 px-4">
                    <Badge
                      variant="secondary"
                      className="font-normal text-[11px] bg-secondary/50 text-secondary-foreground"
                    >
                      {field.fieldType.value}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-4 px-4">
                    <div className="flex gap-1.5">
                      {field.isRequired && (
                        <Badge
                          variant="outline"
                          className="text-[10px] py-0 border-red-500/30 text-red-500 bg-red-500/5"
                        >
                          REQUERIDO
                        </Badge>
                      )}
                      {field.isUnique && (
                        <Badge
                          variant="outline"
                          className="text-[10px] py-0 border-blue-500/30 text-blue-500 bg-blue-500/5"
                        >
                          ÚNICO
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="py-4 px-4 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Acciones para campo ${field.displayName || field.name}`}
                          className="h-8 w-8 text-muted hover:text-foreground transition-all"
                        >
                          <MoreHorizontal size={14} />
                          <span className="sr-only">
                            Acciones para campo {field.displayName || field.name}
                          </span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48 bg-surface border-border/50">
                        <FieldFormDialog
                          field={field}
                          availableCollections={relationCollections}
                          onSubmit={(values) => updateField({ ...values, id: field.id })}
                        >
                          <DropdownMenuItem
                            onSelect={(e) => e.preventDefault()}
                            className="flex items-center gap-2 cursor-pointer"
                          >
                            <Settings2 size={14} className="text-muted" />
                            <span>Configuración</span>
                          </DropdownMenuItem>
                        </FieldFormDialog>
                        <DropdownMenuSeparator className="bg-border/10" />
                        <DropdownMenuItem
                          onClick={() => deleteField(field.id)}
                          className="flex items-center gap-2 cursor-pointer text-red-500 focus:text-red-500 focus:bg-red-500/10"
                        >
                          <Trash2 size={14} />
                          <span>Eliminar Campo</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
