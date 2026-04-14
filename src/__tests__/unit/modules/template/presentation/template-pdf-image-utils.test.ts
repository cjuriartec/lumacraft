import { describe, expect, it, vi } from "vitest";

import type { TemplateBlocks } from "@/modules/template/domain/types/template-blocks";
import {
  normalizePdfImageSources,
  resolvePdfImageLayout,
} from "@/modules/template/presentation/lib/template-pdf-image-utils";
import { ok } from "@/shared/domain/result";

describe("template-pdf-image-utils", () => {
  it("resolves persisted PDF image layout from width/height fields", () => {
    const layout = resolvePdfImageLayout({
      height: 220,
      width: 458,
    });

    expect(layout).toEqual({
      heightPx: 165,
      widthPoints: 343.5,
      widthPercent: undefined,
    });
  });

  it("clamps persisted PDF image layout values", () => {
    const layout = resolvePdfImageLayout({
      imageHeightPx: 10,
      imageWidthPercent: 180,
    });

    expect(layout).toEqual({
      heightPx: 36,
      widthPoints: undefined,
      widthPercent: 100,
    });
  });

  it("preserves external image URLs without calling the storage resolver", async () => {
    const resolver = {
      resolveImageUrl: vi.fn(async () => ok("https://signed.example.com/image.png")),
    };
    const blocks: TemplateBlocks = [
      {
        type: "p",
        children: [
          {
            type: "img",
            path: "https://cdn.example.com/header.png",
            children: [{ text: "" }],
          },
        ],
      },
    ];

    const normalized = await normalizePdfImageSources(blocks, resolver);
    const children = (normalized[0] as Record<string, unknown>).children as Record<
      string,
      unknown
    >[];
    const imageNode = children[0];

    expect(resolver.resolveImageUrl).not.toHaveBeenCalled();
    expect(imageNode.url).toBe("https://cdn.example.com/header.png");
  });

  it("re-signs Supabase storage images while leaving non-storage URLs intact", async () => {
    const resolver = {
      resolveImageUrl: vi.fn(async () => ok("https://signed.example.com/footer.png")),
    };
    const blocks: TemplateBlocks = [
      {
        type: "p",
        children: [
          {
            type: "img",
            bucket: "template-media",
            path: "workspace-1/footer.png",
            url: "https://old-signed.example.com/footer.png",
            children: [{ text: "" }],
          },
          {
            type: "img",
            url: "https://assets.example.com/logo.png",
            children: [{ text: "" }],
          },
        ],
      },
    ];

    const normalized = await normalizePdfImageSources(blocks, resolver);
    const children = (normalized[0] as Record<string, unknown>).children as Record<string, unknown>[];

    expect(resolver.resolveImageUrl).toHaveBeenCalledWith({
      bucket: "template-media",
      path: "workspace-1/footer.png",
    });
    expect(children[0].url).toBe("https://signed.example.com/footer.png");
    expect(children[1].url).toBe("https://assets.example.com/logo.png");
  });
});
