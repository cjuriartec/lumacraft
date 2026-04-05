import { z } from "zod";

export const TEMPLATE_CONDITION_OPERATORS = [
  "equals",
  "not_equals",
  "contains",
  "gt",
  "gte",
  "lt",
  "lte",
  "is_empty",
  "not_empty",
] as const;

export type TemplateConditionOperator = (typeof TEMPLATE_CONDITION_OPERATORS)[number];

export type TemplatePrimitive = string | number | boolean | null;

export interface TemplateCondition {
  path: string;
  operator: TemplateConditionOperator;
  value?: TemplatePrimitive;
}

export interface TemplateTextLogicBlock {
  type: "text";
  text: string;
}

export interface TemplateVariableLogicBlock {
  type: "variable";
  path: string;
  valueType?: "text" | "image";
  fallback?: string;
}

export interface TemplateConditionalLogicBlock {
  type: "conditional";
  condition: TemplateCondition;
  thenBlocks: TemplateLogicBlock[];
  elseBlocks?: TemplateLogicBlock[];
}

export interface TemplateListLogicBlock {
  type: "list";
  sourcePath: string;
  itemAlias?: string;
  blocks: TemplateLogicBlock[];
  emptyText?: string;
}

export interface TemplateSwitchCase {
  equals: TemplatePrimitive;
  blocks: TemplateLogicBlock[];
}

export interface TemplateSwitchLogicBlock {
  type: "switch";
  path: string;
  cases: TemplateSwitchCase[];
  defaultBlocks?: TemplateLogicBlock[];
}

export interface TemplateAILogicBlock {
  type: "ai";
  prompt: string;
  provider?: "GEMINI" | "OPENAI" | "ANTHROPIC";
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export type TemplateLogicBlock =
  | TemplateTextLogicBlock
  | TemplateVariableLogicBlock
  | TemplateConditionalLogicBlock
  | TemplateListLogicBlock
  | TemplateSwitchLogicBlock
  | TemplateAILogicBlock;

const primitiveSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);

const conditionSchema = z.object({
  path: z.string().min(1),
  operator: z.enum(TEMPLATE_CONDITION_OPERATORS),
  value: primitiveSchema.optional(),
});

const textBlockSchema = z.object({
  type: z.literal("text"),
  text: z.string(),
});

const variableBlockSchema = z.object({
  type: z.literal("variable"),
  path: z.string().min(1),
  valueType: z.enum(["text", "image"]).optional(),
  fallback: z.string().optional(),
});

const logicBlockSchema: z.ZodType<TemplateLogicBlock> = z.lazy(() =>
  z.union([
    textBlockSchema,
    variableBlockSchema,
    z.object({
      type: z.literal("conditional"),
      condition: conditionSchema,
      thenBlocks: z.array(logicBlockSchema),
      elseBlocks: z.array(logicBlockSchema).optional(),
    }),
    z.object({
      type: z.literal("list"),
      sourcePath: z.string().min(1),
      itemAlias: z.string().min(1).optional(),
      blocks: z.array(logicBlockSchema),
      emptyText: z.string().optional(),
    }),
    z.object({
      type: z.literal("switch"),
      path: z.string().min(1),
      cases: z.array(
        z.object({
          equals: primitiveSchema,
          blocks: z.array(logicBlockSchema),
        }),
      ),
      defaultBlocks: z.array(logicBlockSchema).optional(),
    }),
    z.object({
      type: z.literal("ai"),
      prompt: z.string().min(1),
      provider: z.enum(["GEMINI", "OPENAI", "ANTHROPIC"]).optional(),
      model: z.string().min(1).optional(),
      temperature: z.number().min(0).max(2).optional(),
      maxTokens: z.number().int().positive().optional(),
    }),
  ]),
);

export const templateLogicBlocksSchema = z.array(logicBlockSchema);

export function parseTemplateLogicBlocks(value: unknown) {
  return templateLogicBlocksSchema.safeParse(value);
}

export function isTemplateLogicBlocks(value: unknown): value is TemplateLogicBlock[] {
  return parseTemplateLogicBlocks(value).success;
}
