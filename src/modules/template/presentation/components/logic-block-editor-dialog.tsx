"use client";

import { Braces, BrainCircuit, GitBranch, ListTree, Plus, Split, Trash2 } from "lucide-react";
import * as React from "react";

import {
  type TemplateConditionOperator,
  type TemplatePrimitive,
} from "@/modules/template/domain/types/template-logic-blocks";
import { Button } from "@/shared/presentation/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/presentation/components/ui/dialog";
import { Input } from "@/shared/presentation/components/ui/input";
import { Label } from "@/shared/presentation/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/presentation/components/ui/select";
import { Textarea } from "@/shared/presentation/components/ui/textarea";

import {
  aiDraftSchema,
  conditionalDraftSchema,
  listDraftSchema,
  switchDraftSchema,
} from "../lib/logic-block-drafts";
import {
  flattenCatalog,
  getFieldSemantics,
  getNodeByPath,
  isIterableRelation,
} from "../lib/template-field-semantics";
import { TemplateVariableCatalogNode } from "../types/template-variable-catalog";
import { DynamicValueInput } from "./dynamic-value-input";
import {
  DEFAULT_TEMPLATE_AI_PROMPT,
  TEMPLATE_AI_TYPE,
  TEMPLATE_CONDITIONAL_TYPE,
  TEMPLATE_LIST_TYPE,
  TEMPLATE_SWITCH_TYPE,
  type TemplateAIElementNode,
  type TemplateConditionalElementNode,
  type TemplateListElementNode,
  type TemplateSwitchCaseElement,
  type TemplateSwitchElementNode,
} from "./template-logic-blocks";
import { VariableSelector } from "./variable-selector";

type BlockNode =
  | TemplateConditionalElementNode
  | TemplateListElementNode
  | TemplateSwitchElementNode
  | TemplateAIElementNode;

interface LogicBlockEditorDialogProps<T extends BlockNode> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  element: T;
  onSave: (updatedElement: Partial<T>) => void;
  catalogNodes: TemplateVariableCatalogNode[];
  catalogLoading?: boolean;
  catalogError?: string | null;
}

function insertTemplateVariable(
  textareaId: string,
  currentText: string,
  token: string,
  onChange: (nextValue: string) => void,
) {
  const textarea = document.getElementById(textareaId) as HTMLTextAreaElement | null;
  if (!textarea) {
    onChange(`${currentText}${token}`);
    return;
  }

  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const nextValue = `${currentText.slice(0, start)}${token}${currentText.slice(end)}`;
  onChange(nextValue);

  setTimeout(() => {
    textarea.focus();
    const nextCursor = start + token.length;
    textarea.setSelectionRange(nextCursor, nextCursor);
  }, 0);
}

function normalizeListToken(path: string, sourcePath: string, alias: string): string {
  const prefix = `${sourcePath}.`;
  const relativePath = path.startsWith(prefix) ? path.slice(prefix.length) : path;
  const finalPath = relativePath.length > 0 ? `${alias}.${relativePath}` : alias;
  return `{{${finalPath}}}`;
}

function validateDialogData(type: BlockNode["type"], value: Partial<BlockNode>) {
  switch (type) {
    case TEMPLATE_CONDITIONAL_TYPE:
      return conditionalDraftSchema.safeParse(value);
    case TEMPLATE_LIST_TYPE:
      return listDraftSchema.safeParse(value);
    case TEMPLATE_SWITCH_TYPE:
      return switchDraftSchema.safeParse(value);
    case TEMPLATE_AI_TYPE:
      return aiDraftSchema.safeParse(value);
    default:
      return null;
  }
}

export function LogicBlockEditorDialog<T extends BlockNode>({
  open,
  onOpenChange,
  element,
  onSave,
  catalogNodes,
  catalogLoading = false,
  catalogError = null,
}: LogicBlockEditorDialogProps<T>) {
  const [formData, setFormData] = React.useState<Partial<T>>({});
  const [validationError, setValidationError] = React.useState<string | null>(null);

  const flattenedCatalog = React.useMemo(() => flattenCatalog(catalogNodes), [catalogNodes]);

  React.useEffect(() => {
    if (!open) return;

    setValidationError(null);
    if (element.type === TEMPLATE_AI_TYPE) {
      const aiElement = element as TemplateAIElementNode;
      setFormData({
        ...aiElement,
        promptTemplate:
          aiElement.promptTemplate?.trim().length > 0
            ? aiElement.promptTemplate
            : DEFAULT_TEMPLATE_AI_PROMPT,
      } as Partial<T>);
      return;
    }

    setFormData({ ...element });
  }, [open, element]);

  const updateField = React.useCallback((updates: Partial<T>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
    setValidationError(null);
  }, []);

  const selectedPath = React.useMemo(() => {
    if (element.type === TEMPLATE_LIST_TYPE) {
      return (formData as Partial<TemplateListElementNode>).sourcePath ?? "";
    }

    return (
      (formData as Partial<TemplateConditionalElementNode | TemplateSwitchElementNode>).fieldPath ??
      ""
    );
  }, [element.type, formData]);

  const selectedNode = React.useMemo(
    () => getNodeByPath(catalogNodes, selectedPath),
    [catalogNodes, selectedPath],
  );

  const conditionalOptions = flattenedCatalog;
  const switchOptions = flattenedCatalog.filter(
    (node) => getFieldSemantics(node.fieldType).switchComparable,
  );
  const listOptions = flattenedCatalog.filter(
    (node) => node.fieldType === "RELATION" && isIterableRelation(node.cardinality),
  );

  const catalogEmpty = !catalogLoading && !catalogError && flattenedCatalog.length === 0;

  const handleSave = (event: React.FormEvent) => {
    event.preventDefault();

    const validationResult = validateDialogData(element.type, formData as Partial<BlockNode>);
    if (!validationResult || !validationResult.success) {
      const message =
        validationResult && !validationResult.success
          ? validationResult.error.issues.map((issue) => issue.message).join(" ")
          : "No se pudo validar la configuración del bloque.";
      setValidationError(message);
      return;
    }

    onSave(validationResult.data as Partial<T>);
    onOpenChange(false);
  };

  const renderConditionalFields = () => {
    const data = formData as Partial<TemplateConditionalElementNode>;
    const currentNode = selectedNode;
    const operators = currentNode
      ? getFieldSemantics(currentNode.fieldType).operators
      : (["equals", "not_equals"] as TemplateConditionOperator[]);

    const update = (updates: Partial<TemplateConditionalElementNode>) =>
      updateField(updates as Partial<T>);

    return (
      <div className="grid gap-4 py-4">
        <div className="grid gap-2">
          <Label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground ml-1">
            Campo a evaluar
          </Label>
          <Select
            value={data.fieldPath ?? ""}
            onValueChange={(nextPath) => {
              const node = getNodeByPath(catalogNodes, nextPath);
              const nextOperators = node
                ? getFieldSemantics(node.fieldType).operators
                : (["equals"] as TemplateConditionOperator[]);
              update({
                fieldPath: nextPath,
                operator: nextOperators[0],
                value: undefined,
              });
            }}
          >
            <SelectTrigger className="bg-surface border-border/40 rounded-xl">
              <SelectValue placeholder="Seleccionar campo..." />
            </SelectTrigger>
            <SelectContent>
              {conditionalOptions.map((node) => (
                <SelectItem key={node.path} value={node.path}>
                  {node.displayName} ({node.fieldType})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground ml-1">
              Operador
            </Label>
            <Select
              value={data.operator ?? operators[0]}
              onValueChange={(nextValue) => {
                update({
                  operator: nextValue as TemplateConditionalElementNode["operator"],
                  value:
                    nextValue === "is_empty" || nextValue === "not_empty"
                      ? undefined
                      : (data.value as TemplatePrimitive | undefined),
                });
              }}
            >
              <SelectTrigger className="bg-surface border-border/40 rounded-xl">
                <SelectValue placeholder="Operador" />
              </SelectTrigger>
              <SelectContent>
                {operators.map((operator) => (
                  <SelectItem key={operator} value={operator}>
                    {operator.replace("_", " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground ml-1">
              Valor
            </Label>
            <DynamicValueInput
              node={currentNode}
              operator={data.operator}
              value={data.value as TemplatePrimitive | undefined}
              onChange={(nextValue) => update({ value: nextValue })}
            />
          </div>
        </div>

        <div className="grid gap-2">
          <div className="flex items-center justify-between ml-1">
            <Label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              Template (Si es verdadero)
            </Label>
            <VariableSelector
              nodes={catalogNodes}
              loading={catalogLoading}
              onSelect={(node) =>
                insertTemplateVariable(
                  "conditionalThenTemplate",
                  data.thenTemplate ?? "",
                  `{{${node.path}}}`,
                  (nextValue) => update({ thenTemplate: nextValue }),
                )
              }
              trigger={
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 gap-1.5 text-[10px] font-bold uppercase tracking-wider text-primary hover:text-primary/80"
                >
                  <Braces size={12} />
                  Insertar Variable
                </Button>
              }
            />
          </div>
          <Textarea
            id="conditionalThenTemplate"
            value={data.thenTemplate ?? ""}
            onChange={(event) => update({ thenTemplate: event.target.value })}
            placeholder="Contenido a mostrar..."
            className="min-h-[100px] bg-surface border-border/40 rounded-xl resize-none"
          />
        </div>

        <div className="grid gap-2">
          <div className="flex items-center justify-between ml-1">
            <Label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              Template (Si es falso - Opcional)
            </Label>
            <VariableSelector
              nodes={catalogNodes}
              loading={catalogLoading}
              onSelect={(node) =>
                insertTemplateVariable(
                  "conditionalElseTemplate",
                  data.elseTemplate ?? "",
                  `{{${node.path}}}`,
                  (nextValue) => update({ elseTemplate: nextValue }),
                )
              }
              trigger={
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 gap-1.5 text-[10px] font-bold uppercase tracking-wider text-primary hover:text-primary/80"
                >
                  <Braces size={12} />
                  Insertar Variable
                </Button>
              }
            />
          </div>
          <Textarea
            id="conditionalElseTemplate"
            value={data.elseTemplate ?? ""}
            onChange={(event) => update({ elseTemplate: event.target.value })}
            placeholder="Contenido alternativo..."
            className="min-h-[60px] bg-surface border-border/40 rounded-xl resize-none"
          />
        </div>
      </div>
    );
  };

  const renderListFields = () => {
    const data = formData as Partial<TemplateListElementNode>;
    const selectedListSourceNode = data.sourcePath
      ? getNodeByPath(catalogNodes, data.sourcePath)
      : undefined;
    const itemVariableNodes = selectedListSourceNode?.children ?? [];
    const update = (updates: Partial<TemplateListElementNode>) =>
      updateField(updates as Partial<T>);

    return (
      <div className="grid gap-4 py-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground ml-1">
              Fuente de datos (Relación)
            </Label>
            <Select
              value={data.sourcePath ?? ""}
              onValueChange={(nextValue) => update({ sourcePath: nextValue })}
            >
              <SelectTrigger className="bg-surface border-border/40 rounded-xl">
                <SelectValue placeholder="Seleccionar relación iterable..." />
              </SelectTrigger>
              <SelectContent>
                {listOptions.map((node) => (
                  <SelectItem key={node.path} value={node.path}>
                    {node.displayName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground ml-1">
              Alias del ítem
            </Label>
            <Input
              value={data.itemAlias ?? "item"}
              onChange={(event) => update({ itemAlias: event.target.value })}
              placeholder="ej. item, prod"
              className="bg-surface border-border/40 rounded-xl"
            />
          </div>
        </div>

        <div className="grid gap-2">
          <div className="flex items-center justify-between ml-1">
            <Label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              Template del ítem
            </Label>
            <VariableSelector
              nodes={itemVariableNodes}
              loading={catalogLoading}
              disabled={!data.sourcePath}
              onSelect={(node) =>
                insertTemplateVariable(
                  "listItemTemplate",
                  data.itemTemplate ?? "",
                  normalizeListToken(node.path, data.sourcePath ?? "", data.itemAlias ?? "item"),
                  (nextValue) => update({ itemTemplate: nextValue }),
                )
              }
              trigger={
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={!data.sourcePath}
                  className="h-6 gap-1.5 text-[10px] font-bold uppercase tracking-wider text-primary hover:text-primary/80"
                >
                  <Braces size={12} />
                  Insertar Variable
                </Button>
              }
            />
          </div>
          <Textarea
            id="listItemTemplate"
            value={data.itemTemplate ?? ""}
            onChange={(event) => update({ itemTemplate: event.target.value })}
            placeholder="ej. - {{item.nombre}}"
            className="min-h-[120px] bg-surface border-border/40 rounded-xl resize-none font-mono text-xs"
          />
        </div>

        <div className="grid gap-2">
          <Label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground ml-1">
            Texto si está vacío (Opcional)
          </Label>
          <Input
            value={data.emptyText ?? ""}
            onChange={(event) => update({ emptyText: event.target.value })}
            placeholder="No se encontraron elementos."
            className="bg-surface border-border/40 rounded-xl"
          />
        </div>
      </div>
    );
  };

  const renderSwitchFields = () => {
    const data = formData as Partial<TemplateSwitchElementNode>;
    const currentNode = data.fieldPath ? getNodeByPath(catalogNodes, data.fieldPath) : undefined;
    const update = (updates: Partial<TemplateSwitchElementNode>) =>
      updateField(updates as Partial<T>);

    const addCase = () => {
      const nextCases = [
        ...(data.cases ?? []),
        { equals: "", template: "" } as TemplateSwitchCaseElement,
      ];
      update({ cases: nextCases });
    };

    const autoGenerateCases = () => {
      if (!currentNode) return;
      const semantics = getFieldSemantics(currentNode.fieldType);
      if (!semantics.switchComparable) return;

      if (semantics.inputStrategy === "boolean") {
        update({
          cases: [
            { equals: true, template: "" },
            { equals: false, template: "" },
          ],
        });
        return;
      }

      const enumOptions = currentNode.enumOptions ?? [];
      if (semantics.inputStrategy === "enum" && enumOptions.length > 0) {
        update({
          cases: enumOptions.map((option) => ({ equals: option, template: "" })),
        });
      }
    };

    const removeCase = (index: number) => {
      const nextCases = [...(data.cases ?? [])];
      nextCases.splice(index, 1);
      update({ cases: nextCases });
    };

    const updateCase = (index: number, updates: Partial<TemplateSwitchCaseElement>) => {
      const nextCases = [...(data.cases ?? [])];
      nextCases[index] = { ...nextCases[index], ...updates };
      update({ cases: nextCases });
    };

    return (
      <div className="grid gap-4 py-4">
        <div className="grid gap-2">
          <Label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground ml-1">
            Campo a evaluar
          </Label>
          <Select
            value={data.fieldPath ?? ""}
            onValueChange={(nextPath) => update({ fieldPath: nextPath, cases: [] })}
          >
            <SelectTrigger className="bg-surface border-border/40 rounded-xl">
              <SelectValue placeholder="Seleccionar campo comparable..." />
            </SelectTrigger>
            <SelectContent>
              {switchOptions.map((node) => (
                <SelectItem key={node.path} value={node.path}>
                  {node.displayName} ({node.fieldType})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {currentNode && !getFieldSemantics(currentNode.fieldType).switchComparable && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              Este tipo de campo solo puede usarse con validaciones de presencia.
            </p>
          )}
        </div>

        <div className="grid gap-3">
          <div className="flex items-center justify-between ml-1">
            <Label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              Casos ({data.cases?.length ?? 0})
            </Label>
            <div className="flex items-center gap-2">
              {(currentNode?.fieldType === "BOOLEAN" ||
                (currentNode?.fieldType === "ENUM" &&
                  (currentNode.enumOptions?.length ?? 0) > 0)) && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={autoGenerateCases}
                  className="h-7 rounded-lg border-border/40"
                >
                  Autocompletar
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addCase}
                className="h-7 gap-1.5 rounded-lg border-primary/20 bg-primary/5 text-primary hover:bg-primary/10"
              >
                <Plus size={14} />
                Añadir Caso
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            {(data.cases ?? []).map((switchCase, index) => (
              <div
                key={`${String(switchCase.equals)}-${index}`}
                className="grid gap-3 rounded-xl border border-border/40 bg-surface/50 p-3"
              >
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <Label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
                      Si es igual a:
                    </Label>
                    <DynamicValueInput
                      node={currentNode}
                      operator="equals"
                      value={switchCase.equals}
                      onChange={(nextValue) => updateCase(index, { equals: nextValue ?? null })}
                      placeholder="Valor..."
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeCase(index)}
                    className="mt-5 h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <Label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
                      Template a mostrar:
                    </Label>
                    <VariableSelector
                      nodes={catalogNodes}
                      loading={catalogLoading}
                      onSelect={(node) =>
                        insertTemplateVariable(
                          `switchCaseTemplate-${index}`,
                          switchCase.template,
                          `{{${node.path}}}`,
                          (nextValue) => updateCase(index, { template: nextValue }),
                        )
                      }
                      trigger={
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 gap-1.5 text-[10px] font-bold uppercase tracking-wider text-primary hover:text-primary/80"
                        >
                          <Braces size={12} />
                          Variable
                        </Button>
                      }
                    />
                  </div>
                  <Textarea
                    id={`switchCaseTemplate-${index}`}
                    value={switchCase.template}
                    onChange={(event) => updateCase(index, { template: event.target.value })}
                    placeholder="Contenido para este caso..."
                    className="min-h-[60px] bg-surface border-border/20 rounded-lg resize-none"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-2">
          <div className="flex items-center justify-between ml-1">
            <Label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              Template por defecto (Opcional)
            </Label>
            <VariableSelector
              nodes={catalogNodes}
              loading={catalogLoading}
              onSelect={(node) =>
                insertTemplateVariable(
                  "switchDefaultTemplate",
                  data.defaultTemplate ?? "",
                  `{{${node.path}}}`,
                  (nextValue) => update({ defaultTemplate: nextValue }),
                )
              }
              trigger={
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 gap-1.5 text-[10px] font-bold uppercase tracking-wider text-primary hover:text-primary/80"
                >
                  <Braces size={12} />
                  Variable
                </Button>
              }
            />
          </div>
          <Textarea
            id="switchDefaultTemplate"
            value={data.defaultTemplate ?? ""}
            onChange={(event) => update({ defaultTemplate: event.target.value })}
            placeholder="Si ningún caso coincide..."
            className="min-h-[80px] bg-surface border-border/40 rounded-xl resize-none"
          />
        </div>
      </div>
    );
  };

  const renderAIFields = () => {
    const data = formData as Partial<TemplateAIElementNode>;
    const update = (updates: Partial<TemplateAIElementNode>) => updateField(updates as Partial<T>);
    const promptValue = data.promptTemplate ?? DEFAULT_TEMPLATE_AI_PROMPT;

    return (
      <div className="grid gap-4 py-4">
        <div className="grid gap-2">
          <div className="flex items-center justify-between ml-1">
            <Label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              Prompt de IA
            </Label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 gap-1.5 text-[10px] font-bold uppercase tracking-wider text-primary hover:text-primary/80"
                onClick={() =>
                  insertTemplateVariable("aiPromptTemplate", promptValue, "{{root}}", (nextValue) =>
                    update({ promptTemplate: nextValue }),
                  )
                }
              >
                <Braces size={12} />
                Usar Registro
              </Button>
              <VariableSelector
                nodes={catalogNodes}
                loading={catalogLoading}
                onSelect={(node) =>
                  insertTemplateVariable(
                    "aiPromptTemplate",
                    promptValue,
                    `{{${node.path}}}`,
                    (nextValue) => update({ promptTemplate: nextValue }),
                  )
                }
                trigger={
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 gap-1.5 text-[10px] font-bold uppercase tracking-wider text-primary hover:text-primary/80"
                  >
                    <Braces size={12} />
                    Insertar Variable
                  </Button>
                }
              />
            </div>
          </div>
          <Textarea
            id="aiPromptTemplate"
            value={promptValue}
            onChange={(event) => update({ promptTemplate: event.target.value })}
            placeholder="Describe lo que quieres que la IA genere..."
            className="min-h-[100px] bg-surface border-border/40 rounded-xl resize-none font-light"
          />
          <p className="text-xs text-muted-foreground ml-1">
            Ancla el bloque con variables explicitas como {`{{root}}`} o {`{{campo}}`} para que la
            IA reciba contexto real del registro y no invente datos.
          </p>
        </div>
      </div>
    );
  };

  const getBlockInfo = () => {
    switch (element.type) {
      case TEMPLATE_CONDITIONAL_TYPE:
        return {
          title: "Configurar Bloque Condicional",
          icon: <GitBranch size={18} className="text-primary" />,
        };
      case TEMPLATE_LIST_TYPE:
        return {
          title: "Configurar Bloque de Lista",
          icon: <ListTree size={18} className="text-primary" />,
        };
      case TEMPLATE_SWITCH_TYPE:
        return {
          title: "Configurar Bloque Switch",
          icon: <Split size={18} className="text-primary" />,
        };
      case TEMPLATE_AI_TYPE:
        return {
          title: "Configurar Bloque de IA",
          icon: <BrainCircuit size={18} className="text-primary" />,
        };
      default:
        return { title: "Editar Bloque", icon: null };
    }
  };

  const info = getBlockInfo();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] bg-popover border-border/50 max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSave}>
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              {info.icon}
              <DialogTitle className="text-lg font-bold tracking-tight">{info.title}</DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              Define la lógica y el contenido dinámico para este bloque de la plantilla.
            </DialogDescription>
            {catalogLoading && (
              <p className="text-xs text-muted-foreground">Cargando catálogo de variables...</p>
            )}
            {catalogError && (
              <p className="text-xs text-destructive">
                No se pudieron cargar variables del catálogo: {catalogError}
              </p>
            )}
            {catalogEmpty && (
              <p className="text-xs text-muted-foreground">
                No hay variables disponibles en esta colección.
              </p>
            )}
          </DialogHeader>

          {element.type === TEMPLATE_CONDITIONAL_TYPE && renderConditionalFields()}
          {element.type === TEMPLATE_LIST_TYPE && renderListFields()}
          {element.type === TEMPLATE_SWITCH_TYPE && renderSwitchFields()}
          {element.type === TEMPLATE_AI_TYPE && renderAIFields()}

          {validationError && (
            <p className="mt-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {validationError}
            </p>
          )}

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-border/10 mt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="rounded-xl border-border/40 px-6 h-10"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="rounded-xl font-bold bg-primary hover:bg-primary/90 px-8 h-10 shadow-lg shadow-primary/10"
            >
              Guardar Cambios
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
