import { TemplateBlocks } from "../../domain/types/template-blocks";
import { TemplateDependencyPlan } from "../types/template-dependency-plan";
import { getTemplatePreviewBlockMetadata } from "./template-preview-block-metadata";

const TOKEN_REGEX = /\{\{\s*([^{}\s]+)\s*\}\}/g;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizePath(path: string): string {
  return path
    .trim()
    .replace(/^\$\./, "")
    .replace(/^root\./, "")
    .replace(/^record\./, "");
}

function splitPath(path: string): string[] {
  return normalizePath(path)
    .replace(/\[(\d+)\]/g, ".$1")
    .split(".")
    .map((segment) => segment.trim())
    .filter(Boolean);
}

function extractTemplatePaths(template: string): string[] {
  const unique = new Set<string>();
  let match: RegExpExecArray | null;

  while ((match = TOKEN_REGEX.exec(template)) !== null) {
    const value = match[1]?.trim();
    if (!value) {
      continue;
    }

    unique.add(value);
  }

  TOKEN_REGEX.lastIndex = 0;
  return Array.from(unique);
}

function resolveAliasPath(rawPath: string, aliases: Map<string, string>): string {
  const normalized = rawPath.trim();
  const segments = splitPath(normalized);
  if (segments.length === 0) {
    return normalizePath(normalized);
  }

  const aliasTarget = aliases.get(segments[0]);
  if (!aliasTarget) {
    return normalizePath(normalized);
  }

  return [normalizePath(aliasTarget), ...segments.slice(1)].filter(Boolean).join(".");
}

function collectTextTemplatePaths(
  template: string,
  aliases: Map<string, string>,
  target: Set<string>,
): string[] {
  const resolved = extractTemplatePaths(template)
    .map((path) => resolveAliasPath(path, aliases))
    .filter(Boolean);

  resolved.forEach((path) => target.add(path));
  return resolved;
}

function computeDepth(paths: string[]): number {
  return paths.reduce((maxDepth, path) => {
    const segments = splitPath(path);
    return Math.max(maxDepth, Math.max(1, Math.min(5, segments.length - 1)));
  }, 1);
}

function isImagePathCandidate(value: string): boolean {
  return value.startsWith("/") || value.startsWith("http://") || value.startsWith("https://");
}

function analyzeBlocks(
  blocks: TemplateBlocks,
  aliases: Map<string, string>,
  referencedPaths: Set<string>,
  aiDependencies: TemplateDependencyPlan["aiBlocks"],
  imagePaths: Set<string>,
  blockIndexFallback = 0,
) {
  for (const block of blocks) {
    if (!isRecord(block)) {
      continue;
    }

    const blockType = typeof block.type === "string" ? block.type : "unknown";
    const blockId =
      typeof block.id === "string" && block.id.trim().length > 0
        ? block.id.trim()
        : `dependency-block-${blockIndexFallback}`;

    if (typeof block.fieldPath === "string") {
      referencedPaths.add(resolveAliasPath(block.fieldPath, aliases));
    }

    if (typeof block.path === "string") {
      referencedPaths.add(resolveAliasPath(block.path, aliases));
    }

    if (typeof block.sourcePath === "string") {
      referencedPaths.add(resolveAliasPath(block.sourcePath, aliases));
    }

    if (blockType === "img" && typeof block.url === "string" && isImagePathCandidate(block.url)) {
      imagePaths.add(block.url);
    }

    if (typeof block.promptTemplate === "string" || typeof block.prompt === "string") {
      const promptTemplate =
        typeof block.promptTemplate === "string"
          ? block.promptTemplate
          : typeof block.prompt === "string"
            ? block.prompt
            : "";
      const promptPaths = collectTextTemplatePaths(promptTemplate, aliases, referencedPaths);
      aiDependencies.push({
        blockId,
        blockIndex: blockIndexFallback,
        promptPaths,
        requiresFullContext:
          promptPaths.length === 0 ||
          promptPaths.some((path) => {
            const normalized = normalizePath(path);
            return normalized === "" || normalized === "root" || normalized === "record";
          }),
      });
    }

    if (typeof block.thenTemplate === "string") {
      collectTextTemplatePaths(block.thenTemplate, aliases, referencedPaths);
    }

    if (typeof block.elseTemplate === "string") {
      collectTextTemplatePaths(block.elseTemplate, aliases, referencedPaths);
    }

    if (typeof block.defaultTemplate === "string") {
      collectTextTemplatePaths(block.defaultTemplate, aliases, referencedPaths);
    }

    if (typeof block.itemTemplate === "string") {
      collectTextTemplatePaths(block.itemTemplate, aliases, referencedPaths);
    }

    if (typeof block.emptyText === "string") {
      collectTextTemplatePaths(block.emptyText, aliases, referencedPaths);
    }

    if (Array.isArray(block.cases)) {
      for (const switchCase of block.cases) {
        if (!isRecord(switchCase)) {
          continue;
        }

        if (typeof switchCase.template === "string") {
          collectTextTemplatePaths(switchCase.template, aliases, referencedPaths);
        }

        if (Array.isArray(switchCase.blocks)) {
          analyzeBlocks(
            switchCase.blocks as TemplateBlocks,
            aliases,
            referencedPaths,
            aiDependencies,
            imagePaths,
            blockIndexFallback,
          );
        }
      }
    }

    if (Array.isArray(block.thenBlocks)) {
      analyzeBlocks(
        block.thenBlocks as TemplateBlocks,
        aliases,
        referencedPaths,
        aiDependencies,
        imagePaths,
        blockIndexFallback,
      );
    }

    if (Array.isArray(block.elseBlocks)) {
      analyzeBlocks(
        block.elseBlocks as TemplateBlocks,
        aliases,
        referencedPaths,
        aiDependencies,
        imagePaths,
        blockIndexFallback,
      );
    }

    if (Array.isArray(block.defaultBlocks)) {
      analyzeBlocks(
        block.defaultBlocks as TemplateBlocks,
        aliases,
        referencedPaths,
        aiDependencies,
        imagePaths,
        blockIndexFallback,
      );
    }

    if (Array.isArray(block.blocks)) {
      const nextAliases = new Map(aliases);

      if (blockType === "template_list") {
        const sourcePath =
          typeof block.sourcePath === "string" ? resolveAliasPath(block.sourcePath, aliases) : "";
        const itemAlias =
          typeof block.itemAlias === "string" && block.itemAlias.trim().length > 0
            ? block.itemAlias.trim()
            : "item";

        if (sourcePath) {
          nextAliases.set(itemAlias, sourcePath);
        }
      }

      analyzeBlocks(
        block.blocks as TemplateBlocks,
        nextAliases,
        referencedPaths,
        aiDependencies,
        imagePaths,
        blockIndexFallback,
      );
    }

    if (Array.isArray(block.children)) {
      for (const child of block.children) {
        if (isRecord(child) && typeof child.text === "string") {
          collectTextTemplatePaths(child.text, aliases, referencedPaths);
        }
      }

      analyzeBlocks(
        block.children as TemplateBlocks,
        aliases,
        referencedPaths,
        aiDependencies,
        imagePaths,
        blockIndexFallback,
      );
    }
  }
}

export function analyzeTemplateDependencies(blocks: TemplateBlocks): TemplateDependencyPlan {
  const blockMetadata = getTemplatePreviewBlockMetadata(blocks);
  const referencedPaths = new Set<string>();
  const aiDependencies: TemplateDependencyPlan["aiBlocks"] = [];
  const imagePaths = new Set<string>();
  const aliases = new Map<string, string>();

  blocks.forEach((_block, index) => {
    analyzeBlocks(
      blocks.slice(index, index + 1),
      aliases,
      referencedPaths,
      aiDependencies,
      imagePaths,
      index,
    );
  });

  const referenced = Array.from(referencedPaths)
    .filter((path) => path !== "root" && path !== "record")
    .sort();

  return {
    blockMetadata,
    referencedPaths: referenced,
    relationPaths: referenced,
    aiBlocks: aiDependencies.sort((left, right) => left.blockIndex - right.blockIndex),
    imagePaths: Array.from(imagePaths).sort(),
    depth: computeDepth(referenced),
  };
}
