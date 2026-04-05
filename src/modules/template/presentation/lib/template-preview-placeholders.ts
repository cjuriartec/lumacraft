"use client";

import { TemplatePreviewBlockMeta } from "../../application/services/template-preview-block-metadata";
import { TemplatePreviewBlockState } from "../../application/services/template-preview.types";
import { TemplateBlocks } from "../../domain/types/template-blocks";

function escapeText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function getBlockLabel(blockType: string): string {
  switch (blockType) {
    case "template_ai":
      return "Bloque IA";
    case "template_conditional":
      return "Bloque condicional";
    case "template_list":
      return "Bloque de lista";
    case "template_switch":
      return "Bloque switch";
    case "variable":
      return "Variable";
    case "img":
      return "Imagen";
    default:
      return "Bloque";
  }
}

function buildStateLine(state: TemplatePreviewBlockState | undefined): string | null {
  if (!state) return null;

  if (state.status === "error" && state.message) {
    return state.message;
  }

  if (state.branch) {
    return `Rama activa: ${state.branch}`;
  }

  if (typeof state.itemCount === "number") {
    return `Items resueltos: ${state.itemCount}`;
  }

  if (state.aiText && state.aiText.trim().length > 0) {
    return escapeText(state.aiText).slice(0, 180);
  }

  if (state.message) {
    return state.message;
  }

  return state.status === "resolved" ? "Resuelto" : "Generando preview...";
}

function createPlaceholderNode(
  meta: TemplatePreviewBlockMeta,
  state: TemplatePreviewBlockState | undefined,
) {
  const label = getBlockLabel(meta.blockType);
  const statusLabel =
    state?.status === "error"
      ? "Error"
      : state?.status === "resolved"
        ? "Resuelto"
        : "Procesando";
  const detail = buildStateLine(state);

  return {
    type: "blockquote",
    id: `preview-placeholder-${meta.blockId}`,
    children: [{ text: `${label} · ${statusLabel}${detail ? ` · ${detail}` : ""}` }],
  };
}

export function buildStructuredPreviewFromStates(params: {
  order: TemplatePreviewBlockMeta[];
  outputs: Map<string, TemplateBlocks>;
  blockStates: TemplatePreviewBlockState[];
}): TemplateBlocks {
  const statesById = new Map(params.blockStates.map((state) => [state.blockId, state]));
  const result: TemplateBlocks = [];

  for (const meta of params.order) {
    const output = params.outputs.get(meta.blockId);
    if (output) {
      result.push(...output);
      continue;
    }

    result.push(createPlaceholderNode(meta, statesById.get(meta.blockId)));
  }

  return result;
}
