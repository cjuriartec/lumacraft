import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { makeTemplate, resetFactories } from "@/__tests__/factories/domain-factories";
import TemplateListPage from "@/modules/template/presentation/pages/template-list-page";
import { ok } from "@/shared/domain/result";

const templatesState = vi.hoisted(() => ({
  templates: [] as ReturnType<typeof makeTemplate>[],
  loading: false,
  createTemplate: vi.fn(),
  updateTemplate: vi.fn(),
  deleteTemplate: vi.fn(),
  refresh: vi.fn(),
}));

const collectionsState = vi.hoisted(() => ({
  collections: [
    { id: "collection-1", name: "projects", displayName: "Projects" },
    { id: "collection-2", name: "contracts", displayName: "Contracts" },
  ],
}));

const permissionsState = vi.hoisted(() => ({
  can: (_collectionId: string, _action: "read" | "create" | "update" | "delete"): boolean => true,
  isOwner: true,
  isSuperAdmin: false,
  loading: false,
}));

vi.mock("@/modules/template/presentation/hooks/use-templates", () => ({
  useTemplates: () => templatesState,
}));

vi.mock("@/modules/collection/presentation/hooks/use-collections", () => ({
  useCollections: () => collectionsState,
}));

vi.mock("@/modules/authorization/presentation/providers/permission-provider", () => ({
  usePermissions: () => permissionsState,
}));

vi.mock("@/shared/presentation/providers/breadcrumb-provider", () => ({
  useBreadcrumbs: vi.fn(),
}));

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("@/modules/template/presentation/components/template-create-dialog", () => ({
  TemplateCreateDialog: ({
    open,
    templateToEdit,
    onCreateTemplate,
    onUpdateTemplate,
  }: {
    open: boolean;
    templateToEdit?: { id: string } | null;
    onCreateTemplate: (params: { name: string; collectionId: string }) => Promise<unknown>;
    onUpdateTemplate: (params: {
      id: string;
      name: string;
      collectionId: string;
    }) => Promise<unknown>;
  }) =>
    open ? (
      <div data-testid="template-create-dialog">
        <button
          type="button"
          onClick={() => void onCreateTemplate({ name: "Nueva", collectionId: "collection-1" })}
        >
          submit-create
        </button>
        {templateToEdit ? (
          <button
            type="button"
            onClick={() =>
              void onUpdateTemplate({
                id: templateToEdit.id,
                name: "Actualizada",
                collectionId: "collection-1",
              })
            }
          >
            submit-update
          </button>
        ) : null}
      </div>
    ) : null,
}));

describe("TemplateListPage", () => {
  beforeEach(() => {
    resetFactories();
    templatesState.templates = [];
    templatesState.loading = false;
    templatesState.createTemplate
      .mockReset()
      .mockResolvedValue(ok(makeTemplate({ id: "template-1", collectionId: "collection-1" })));
    templatesState.updateTemplate
      .mockReset()
      .mockResolvedValue(ok(makeTemplate({ id: "template-1", collectionId: "collection-1" })));
    templatesState.deleteTemplate.mockReset().mockResolvedValue(ok(undefined));
    templatesState.refresh.mockReset();
    permissionsState.can = () => true;
    permissionsState.isOwner = true;
    permissionsState.isSuperAdmin = false;
    permissionsState.loading = false;
  });

  it("renders empty state when there are no templates", () => {
    render(<TemplateListPage />);

    expect(screen.getByText("Sin plantillas")).toBeInTheDocument();
    expect(
      screen.getByText("No se encontraron plantillas. Comienza creando una nueva."),
    ).toBeInTheDocument();
  });

  it("delegates deletion to useTemplates", async () => {
    templatesState.templates = [
      makeTemplate({ id: "template-1", name: "Contrato", collectionId: "collection-1" }),
    ];

    render(<TemplateListPage />);

    const trigger = screen.getByRole("button", { name: /acciones/i });
    fireEvent.pointerDown(trigger);
    fireEvent.click(trigger);
    await waitFor(() => {
      fireEvent.click(screen.getByText("Eliminar"));
    });
    expect(templatesState.deleteTemplate).toHaveBeenCalledWith("template-1");
  });

  it("uses injected create handler from the page hook", async () => {
    render(<TemplateListPage />);

    fireEvent.click(screen.getByText("Nueva Plantilla"));
    fireEvent.click(screen.getByText("submit-create"));

    await waitFor(() => {
      expect(templatesState.createTemplate).toHaveBeenCalledWith({
        name: "Nueva",
        collectionId: "collection-1",
      });
    });
  });

  it("uses injected update handler from the page hook", async () => {
    templatesState.templates = [
      makeTemplate({ id: "template-1", name: "Contrato", collectionId: "collection-1" }),
    ];

    render(<TemplateListPage />);

    const trigger = screen.getByRole("button", { name: /acciones/i });
    fireEvent.pointerDown(trigger);
    fireEvent.click(trigger);
    await waitFor(() => {
      fireEvent.click(screen.getByText("Configuración"));
    });
    fireEvent.click(screen.getByText("submit-update"));

    await waitFor(() => {
      expect(templatesState.updateTemplate).toHaveBeenCalledWith({
        id: "template-1",
        name: "Actualizada",
        collectionId: "collection-1",
      });
    });
  });

  it("shows only templates from accessible collections in the global read-only hub", () => {
    permissionsState.isOwner = false;
    permissionsState.can = (collectionId: string) => collectionId === "collection-1";
    templatesState.templates = [
      makeTemplate({ id: "template-1", name: "Contrato", collectionId: "collection-1" }),
      makeTemplate({ id: "template-2", name: "Privada", collectionId: "collection-2" }),
    ];

    render(
      <TemplateListPage
        canCreate={false}
        canUpdate={false}
        canDelete={false}
        enableCollectionFilter
        showCollectionShortcut
      />,
    );

    expect(screen.getByText("Contrato")).toBeInTheDocument();
    expect(screen.queryByText("Privada")).not.toBeInTheDocument();
    expect(screen.queryByText("Nueva Plantilla")).not.toBeInTheDocument();
  });
});
