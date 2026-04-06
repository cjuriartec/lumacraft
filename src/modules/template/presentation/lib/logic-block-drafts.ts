import { z } from "zod";

import { TEMPLATE_CONDITION_OPERATORS } from "@/modules/template/domain/types/template-logic-blocks";

const primitiveSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);

export const conditionalDraftSchema = z
  .object({
    fieldPath: z.string().min(1, "Debes seleccionar un campo."),
    operator: z.enum(TEMPLATE_CONDITION_OPERATORS),
    value: primitiveSchema.optional(),
    thenTemplate: z.string().min(1, "El template de condición verdadera es obligatorio."),
    elseTemplate: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.operator === "is_empty" || value.operator === "not_empty") return;

    if (value.value === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["value"],
        message: "Debes definir un valor para el operador seleccionado.",
      });
    }
  });

export const listDraftSchema = z.object({
  sourcePath: z.string().min(1, "Debes seleccionar una relación iterable."),
  itemAlias: z
    .string()
    .min(1, "El alias es obligatorio.")
    .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, "Alias inválido. Usa letras, números y guion bajo."),
  itemTemplate: z.string().min(1, "El template del ítem es obligatorio."),
  emptyText: z.string().optional(),
});

const switchCaseSchema = z.object({
  equals: primitiveSchema,
  template: z.string().min(1, "El template del caso es obligatorio."),
});

export const switchDraftSchema = z
  .object({
    fieldPath: z.string().min(1, "Debes seleccionar un campo."),
    cases: z.array(switchCaseSchema).min(1, "Debes definir al menos un caso."),
    defaultTemplate: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    const seen = new Set<string>();

    value.cases.forEach((caseValue, index) => {
      const key = `${typeof caseValue.equals}:${String(caseValue.equals)}`;
      if (seen.has(key)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["cases", index, "equals"],
          message: "Caso duplicado. Cada valor debe ser único.",
        });
        return;
      }

      seen.add(key);
    });
  });

export const aiDraftSchema = z.object({
  promptTemplate: z.string().min(1, "El prompt de IA es obligatorio."),
});

export type ConditionalDraft = z.infer<typeof conditionalDraftSchema>;
export type ListDraft = z.infer<typeof listDraftSchema>;
export type SwitchDraft = z.infer<typeof switchDraftSchema>;
export type AIDraft = z.infer<typeof aiDraftSchema>;
