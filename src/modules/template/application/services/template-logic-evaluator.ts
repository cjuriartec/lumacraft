import { buildGroundedPrompt } from "@/modules/ai/application/services/prompt-builder";
import { AIProviderFactoryPort } from "@/modules/ai/domain/ports/ai-provider-factory.port";
import { DomainError, fail, ok, Result } from "@/shared/domain/result";

import {
  TemplateCondition,
  TemplateLogicBlock,
  TemplatePrimitive,
} from "../../domain/types/template-logic-blocks";
import {
  TemplateRuntimeContext,
  TemplateRuntimeScope,
} from "../../domain/types/template-runtime-context";
import {
  interpolateTemplateString,
  isEmptyValue,
  resolveTemplatePath,
  stringifyTemplateValue,
} from "./template-path-resolver";

interface StreamMeta {
  blockIndex: number;
  blockType: TemplateLogicBlock["type"];
}

type TemplateLogicStreamEvent =
  | {
      type: "chunk";
      blockIndex: number;
      blockType: TemplateLogicBlock["type"];
      text: string;
    }
  | {
      type: "block_start" | "block_end";
      blockIndex: number;
      blockType: TemplateLogicBlock["type"];
    };

interface EvaluateTemplateLogicParams {
  blocks: TemplateLogicBlock[];
  context: TemplateRuntimeContext;
  aiProviderFactory: AIProviderFactoryPort;
  onEvent?: (event: TemplateLogicStreamEvent) => void;
  signal?: AbortSignal;
}

interface EvaluateTemplateLogicResult {
  markdown: string;
  warnings: string[];
  aiBlockResponses: string[];
}

function isComparableValue(value: unknown): value is string | number | boolean {
  return typeof value === "string" || typeof value === "number" || typeof value === "boolean";
}

function evaluateCondition(condition: TemplateCondition, scope: TemplateRuntimeScope): boolean {
  const left = resolveTemplatePath(scope, condition.path);
  const right = condition.value;

  switch (condition.operator) {
    case "equals":
      return left === right;
    case "not_equals":
      return left !== right;
    case "contains":
      if (typeof left === "string" && typeof right === "string") {
        return left.includes(right);
      }
      if (Array.isArray(left)) {
        return left.some((item) => item === right);
      }
      return false;
    case "gt":
      return isComparableValue(left) && isComparableValue(right) ? left > right : false;
    case "gte":
      return isComparableValue(left) && isComparableValue(right) ? left >= right : false;
    case "lt":
      return isComparableValue(left) && isComparableValue(right) ? left < right : false;
    case "lte":
      return isComparableValue(left) && isComparableValue(right) ? left <= right : false;
    case "is_empty":
      return isEmptyValue(left);
    case "not_empty":
      return !isEmptyValue(left);
    default:
      return false;
  }
}

function findSwitchCase(
  value: unknown,
  cases: Array<{ equals: TemplatePrimitive; blocks: TemplateLogicBlock[] }>,
): TemplateLogicBlock[] | undefined {
  for (const switchCase of cases) {
    if (Object.is(value, switchCase.equals)) {
      return switchCase.blocks;
    }

    if (
      (typeof value === "string" || typeof value === "number" || typeof value === "boolean") &&
      String(value) === String(switchCase.equals)
    ) {
      return switchCase.blocks;
    }
  }

  return undefined;
}

function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function markdownToHtml(markdown: string): string {
  const lines = markdown.split("\n");
  const html: string[] = [];

  let inUnorderedList = false;
  let inOrderedList = false;

  const closeLists = () => {
    if (inUnorderedList) {
      html.push("</ul>");
      inUnorderedList = false;
    }

    if (inOrderedList) {
      html.push("</ol>");
      inOrderedList = false;
    }
  };

  for (const line of lines) {
    if (line.startsWith("### ")) {
      closeLists();
      html.push(`<h3>${escapeHtml(line.slice(4))}</h3>`);
      continue;
    }

    if (line.startsWith("## ")) {
      closeLists();
      html.push(`<h2>${escapeHtml(line.slice(3))}</h2>`);
      continue;
    }

    if (line.startsWith("# ")) {
      closeLists();
      html.push(`<h1>${escapeHtml(line.slice(2))}</h1>`);
      continue;
    }

    if (/^\s*-\s+/.test(line)) {
      if (!inUnorderedList) {
        closeLists();
        inUnorderedList = true;
        html.push("<ul>");
      }

      html.push(`<li>${escapeHtml(line.replace(/^\s*-\s+/, ""))}</li>`);
      continue;
    }

    if (/^\s*\d+\.\s+/.test(line)) {
      if (!inOrderedList) {
        closeLists();
        inOrderedList = true;
        html.push("<ol>");
      }

      html.push(`<li>${escapeHtml(line.replace(/^\s*\d+\.\s+/, ""))}</li>`);
      continue;
    }

    closeLists();

    if (line.trim().length === 0) {
      html.push("<br />");
      continue;
    }

    html.push(`<p>${escapeHtml(line)}</p>`);
  }

  closeLists();

  return html.join("\n");
}

async function evaluateBlocks(
  blocks: TemplateLogicBlock[],
  scope: TemplateRuntimeScope,
  params: EvaluateTemplateLogicParams,
  warnings: string[],
  aiBlockResponses: string[],
  streamMeta: StreamMeta,
): Promise<Result<string, DomainError>> {
  const chunks: string[] = [];

  for (const block of blocks) {
    const result = await evaluateBlock(
      block,
      scope,
      params,
      warnings,
      aiBlockResponses,
      streamMeta,
    );
    if (!result.ok) {
      return fail(result.error);
    }

    if (result.value.length > 0) {
      chunks.push(result.value);

      if (
        block.type !== "ai" &&
        block.type !== "conditional" &&
        block.type !== "list" &&
        block.type !== "switch"
      ) {
        params.onEvent?.({
          type: "chunk",
          blockIndex: streamMeta.blockIndex,
          blockType: streamMeta.blockType,
          text: result.value,
        });
      }
    }
  }

  return ok(chunks.join(""));
}

async function evaluateBlock(
  block: TemplateLogicBlock,
  scope: TemplateRuntimeScope,
  params: EvaluateTemplateLogicParams,
  warnings: string[],
  aiBlockResponses: string[],
  streamMeta: StreamMeta,
): Promise<Result<string, DomainError>> {
  switch (block.type) {
    case "text": {
      return ok(interpolateTemplateString(block.text, scope));
    }

    case "variable": {
      const value = resolveTemplatePath(scope, block.path);
      if (value === undefined && block.fallback !== undefined) {
        return ok(block.fallback);
      }

      return ok(stringifyTemplateValue(value));
    }

    case "conditional": {
      const shouldUseThen = evaluateCondition(block.condition, scope);
      const targetBlocks = shouldUseThen ? block.thenBlocks : (block.elseBlocks ?? []);

      return evaluateBlocks(targetBlocks, scope, params, warnings, aiBlockResponses, streamMeta);
    }

    case "list": {
      const value = resolveTemplatePath(scope, block.sourcePath);
      const alias = block.itemAlias ?? "item";

      if (!Array.isArray(value)) {
        warnings.push(`List source is not an array: ${block.sourcePath}`);
        return ok(block.emptyText ?? "");
      }

      if (value.length === 0) {
        return ok(block.emptyText ?? "");
      }

      const results: string[] = [];

      for (const item of value) {
        const childScope: TemplateRuntimeScope = {
          root: scope.root,
          locals: {
            ...scope.locals,
            [alias]: item,
          },
        };

        const result = await evaluateBlocks(
          block.blocks,
          childScope,
          params,
          warnings,
          aiBlockResponses,
          streamMeta,
        );
        if (!result.ok) return fail(result.error);
        results.push(result.value);
      }

      return ok(results.join(""));
    }

    case "switch": {
      const value = resolveTemplatePath(scope, block.path);
      const match = findSwitchCase(value, block.cases);
      const targetBlocks = match ?? block.defaultBlocks ?? [];

      return evaluateBlocks(targetBlocks, scope, params, warnings, aiBlockResponses, streamMeta);
    }

    case "ai": {
      const providerResult = params.aiProviderFactory.create(block.provider);
      if (!providerResult.ok) {
        return fail(providerResult.error);
      }

      const provider = providerResult.value;
      const groundedPrompt = buildGroundedPrompt({
        promptTemplate: block.prompt,
        context: scope.root,
        locals: scope.locals,
        fieldMetadataByPath: params.context.fieldMetadataByPath,
      });

      if (groundedPrompt.truncated) {
        warnings.push("AI context/metadata was truncated due to size limits.");
      }

      let text = "";

      const stream = provider.stream(
        {
          prompt: groundedPrompt.prompt,
          model: block.model,
          temperature: block.temperature,
          maxTokens: block.maxTokens,
          groundingContext: groundedPrompt.contextSnapshot,
          metadata: {
            usedPaths: groundedPrompt.usedPaths,
            fieldMetadataSnapshot: groundedPrompt.metadataSnapshot,
          },
        },
        params.signal,
      );

      for await (const chunkResult of stream) {
        if (!chunkResult.ok) {
          return fail(chunkResult.error);
        }

        text += chunkResult.value.text;

        params.onEvent?.({
          type: "chunk",
          blockIndex: streamMeta.blockIndex,
          blockType: streamMeta.blockType,
          text: chunkResult.value.text,
        });
      }

      aiBlockResponses.push(text);
      return ok(text);
    }

    default:
      return fail(new DomainError("Unsupported template block", "TEMPLATE_COMPILE_ERROR"));
  }
}

export async function evaluateTemplateLogic(
  params: EvaluateTemplateLogicParams,
): Promise<Result<EvaluateTemplateLogicResult, DomainError>> {
  const warnings: string[] = [];
  const aiBlockResponses: string[] = [];

  const scope: TemplateRuntimeScope = {
    root: params.context.root,
    locals: {},
  };

  const chunks: string[] = [];

  for (let index = 0; index < params.blocks.length; index += 1) {
    const block = params.blocks[index];

    params.onEvent?.({
      type: "block_start",
      blockIndex: index,
      blockType: block.type,
    });

    const result = await evaluateBlock(block, scope, params, warnings, aiBlockResponses, {
      blockIndex: index,
      blockType: block.type,
    });

    if (!result.ok) {
      return fail(result.error);
    }

    if (result.value.length > 0) {
      chunks.push(result.value);
    }

    params.onEvent?.({
      type: "block_end",
      blockIndex: index,
      blockType: block.type,
    });
  }

  return ok({
    markdown: chunks.join(""),
    warnings,
    aiBlockResponses,
  });
}
