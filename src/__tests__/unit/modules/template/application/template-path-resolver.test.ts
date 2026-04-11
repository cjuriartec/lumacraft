import { describe, expect, it } from "vitest";

import {
  interpolateTemplateString,
  resolveTemplatePath,
  stringifyTemplateValue,
} from "@/modules/template/application/services/template-path-resolver";
import { TemplateRuntimeScope } from "@/modules/template/domain/types/template-runtime-context";

describe("template path resolver", () => {
  it("resolves relation array field paths using projection", () => {
    const scope: TemplateRuntimeScope = {
      root: {
        requerimiento: [{ nombre: "Req A" }, { nombre: "Req B" }],
      },
      locals: {},
    };

    expect(resolveTemplatePath(scope, "requerimiento.nombre")).toEqual(["Req A", "Req B"]);
  });

  it("formats projected primitive arrays as readable text", () => {
    const scope: TemplateRuntimeScope = {
      root: {
        requerimiento: [{ nombre: "Req A" }, { nombre: "Req B" }],
      },
      locals: {},
    };

    expect(interpolateTemplateString("Requerimientos: {{requerimiento.nombre}}", scope)).toBe(
      "Requerimientos: Req A, Req B",
    );
  });

  it("formats arrays of image files as markdown image lines", () => {
    const rendered = stringifyTemplateValue([
      {
        name: "uno.jpg",
        path: "bucket/uno.jpg",
        mimeType: "image/jpeg",
      },
      {
        name: "dos.png",
        path: "bucket/dos.png",
        mimeType: "image/png",
      },
    ]);

    expect(rendered).toBe("![uno.jpg](bucket/uno.jpg)\n![dos.png](bucket/dos.png)");
  });

  it("resolves deeply nested object paths (de.oficina.nombre)", () => {
    const scope: TemplateRuntimeScope = {
      root: {
        de: { cargo: "Gerente", oficina: { nombre: "Oficina Central" } },
      },
      locals: {},
    };
    expect(resolveTemplatePath(scope, "de.oficina.nombre")).toBe("Oficina Central");
  });
});
