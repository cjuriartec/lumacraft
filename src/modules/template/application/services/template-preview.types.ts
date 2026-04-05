import { TemplateBlocks } from "../../domain/types/template-blocks";
import { TemplatePreviewBlockMeta } from "./template-preview-block-metadata";

export interface TemplatePreviewResult {
  requestId: string;
  warnings: string[];
  blocks: TemplateBlocks;
}

export interface TemplatePreviewBlockState extends TemplatePreviewBlockMeta {
  status: "pending" | "resolved" | "error";
  branch?: string;
  itemCount?: number;
  aiText?: string;
  message?: string;
}

export type TemplatePreviewEvent =
  | {
      type: "meta";
      requestId: string;
      templateId: string;
      blocks: TemplatePreviewBlockMeta[];
      warnings: string[];
    }
  | {
      type: "pending";
      requestId: string;
      blockId: string;
      blockIndex: number;
      blockType: string;
    }
  | {
      type: "branch_selected";
      requestId: string;
      blockId: string;
      blockIndex: number;
      blockType: string;
      branch: "then" | "else" | "default" | "case";
      path: string;
      matchedValue?: string;
    }
  | {
      type: "items_resolved";
      requestId: string;
      blockId: string;
      blockIndex: number;
      blockType: string;
      sourcePath: string;
      count: number;
    }
  | {
      type: "ai_chunk";
      requestId: string;
      blockId: string;
      blockIndex: number;
      blockType: string;
      text: string;
    }
  | {
      type: "resolved";
      requestId: string;
      blockId: string;
      blockIndex: number;
      blockType: string;
      blocks: TemplateBlocks;
    }
  | {
      type: "done";
      requestId: string;
      warnings: string[];
      blocks: TemplateBlocks;
    }
  | {
      type: "error";
      requestId: string;
      code: string;
      message: string;
      blockId?: string;
      blockIndex?: number;
      blockType?: string;
    };
