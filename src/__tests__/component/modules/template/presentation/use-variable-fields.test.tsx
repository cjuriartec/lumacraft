"use client";

import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { makeCollection, makeField, resetFactories } from "@/__tests__/factories/domain-factories";
import { useVariableFields } from "@/modules/template/presentation/hooks/use-variable-fields";
import { isIterableRelation } from "@/modules/template/presentation/lib/template-field-semantics";
import type { TemplateVariableCatalogNode } from "@/modules/template/presentation/types/template-variable-catalog";
import SupabaseProvider from "@/shared/presentation/providers/supabase-provider";

const collectionFactoryState = vi.hoisted(() => ({
  fieldsByCollectionId: new Map<string, ReturnType<typeof makeField>[]>(),
  collectionsById: new Map<
    string,
    ReturnType<typeof makeCollection> | { name: string; displayName?: string; description?: string }
  >(),
  listFieldsExecute: vi.fn(),
  eagerLoadExecute: vi.fn(),
  getCollectionExecute: vi.fn(),
}));

vi.mock("@/modules/collection/application/collection-use-case.factory", () => ({
  CollectionUseCaseFactory: {
    create: () => ({
      listFields: () => ({ execute: collectionFactoryState.listFieldsExecute }),
      eagerLoadRecord: () => ({ execute: collectionFactoryState.eagerLoadExecute }),
      getCollection: () => ({ execute: collectionFactoryState.getCollectionExecute }),
    }),
  },
}));

function flattenNodes(nodes: TemplateVariableCatalogNode[]): TemplateVariableCatalogNode[] {
  return nodes.flatMap((node) => [node, ...(node.children ? flattenNodes(node.children) : [])]);
}

function VariableFieldsProbe({
  collectionId,
  enabled = true,
}: {
  collectionId: string;
  enabled?: boolean;
}) {
  const { nodes, loading, error } = useVariableFields({ collectionId, depth: 2, enabled });

  return (
    <div>
      <div data-testid="loading">{loading ? "true" : "false"}</div>
      <div data-testid="error">{error ?? ""}</div>
      <pre data-testid="nodes">{JSON.stringify(nodes)}</pre>
    </div>
  );
}

describe("useVariableFields regression coverage", () => {
  beforeEach(() => {
    resetFactories();

    collectionFactoryState.fieldsByCollectionId = new Map();
    collectionFactoryState.collectionsById = new Map();
    collectionFactoryState.listFieldsExecute.mockReset();
    collectionFactoryState.eagerLoadExecute.mockReset();
    collectionFactoryState.getCollectionExecute.mockReset();

    collectionFactoryState.listFieldsExecute.mockImplementation(async (collectionId: string) => ({
      ok: true,
      value: collectionFactoryState.fieldsByCollectionId.get(collectionId) ?? [],
    }));
    collectionFactoryState.eagerLoadExecute.mockResolvedValue({
      ok: false,
      error: new Error("Unexpected eager-load call in regression test"),
    });
    collectionFactoryState.getCollectionExecute.mockImplementation(async (collectionId: string) => {
      const collection = collectionFactoryState.collectionsById.get(collectionId);

      if (!collection) {
        return { ok: true, value: null };
      }

      return {
        ok: true,
        value: {
          name: collection.name,
          displayName: collection.displayName,
          description: collection.description,
        },
      };
    });
  });

  it("exposes only direct relations in the template catalog", async () => {
    const ordersCollectionId = "11111111-1111-4111-8111-111111111111";
    const contactsCollectionId = "22222222-2222-4222-8222-222222222222";

    const ordersCollection = makeCollection({
      id: ordersCollectionId,
      name: "orders",
      displayName: "Orders",
    });
    const contactsCollection = makeCollection({
      id: contactsCollectionId,
      name: "contacts",
      displayName: "Contacts",
    });

    collectionFactoryState.collectionsById.set(ordersCollectionId, ordersCollection);
    collectionFactoryState.collectionsById.set(contactsCollectionId, contactsCollection);

    collectionFactoryState.fieldsByCollectionId.set(ordersCollectionId, [
      makeField({
        id: "55555555-5555-4555-8555-555555555555",
        collectionId: ordersCollectionId,
        name: "billing_contact",
        displayName: "Billing Contact",
        fieldType: "RELATION",
        config: {
          targetCollectionId: contactsCollectionId,
          relationType: "MANY_TO_ONE",
          displayField: "name",
        },
      }),
      makeField({
        id: "66666666-6666-4666-8666-666666666666",
        collectionId: ordersCollectionId,
        name: "shipping_contact",
        displayName: "Shipping Contact",
        fieldType: "RELATION",
        config: {
          targetCollectionId: contactsCollectionId,
          relationType: "MANY_TO_ONE",
          displayField: "name",
        },
      }),
    ]);

    collectionFactoryState.fieldsByCollectionId.set(contactsCollectionId, [
      makeField({
        id: "77777777-7777-4777-8777-777777777777",
        collectionId: contactsCollectionId,
        name: "orders",
        displayName: "Orders",
        fieldType: "REVERSE_LOOKUP",
        config: {
          targetCollectionId: ordersCollectionId,
          targetFieldId: "33333333-3333-4333-8333-333333333333",
        },
      }),
      makeField({
        id: "88888888-8888-4888-8888-888888888888",
        collectionId: contactsCollectionId,
        name: "managers",
        displayName: "Managers",
        fieldType: "REVERSE_LOOKUP",
        config: {
          targetCollectionId: ordersCollectionId,
          targetFieldId: "44444444-4444-4444-8444-444444444444",
        },
      }),
    ]);

    render(
      <SupabaseProvider client={{} as never}>
        <VariableFieldsProbe collectionId={ordersCollectionId} />
      </SupabaseProvider>,
    );

    await waitFor(() => {
      const nodes = JSON.parse(
        screen.getByTestId("nodes").textContent ?? "[]",
      ) as TemplateVariableCatalogNode[];
      const flattened = flattenNodes(nodes);

      expect(flattened.some((node) => node.path === "billing_contact")).toBe(true);
      expect(flattened.some((node) => node.path === "shipping_contact")).toBe(true);
    });

    const nodes = JSON.parse(
      screen.getByTestId("nodes").textContent ?? "[]",
    ) as TemplateVariableCatalogNode[];
    const flattened = flattenNodes(nodes);
    const billingContact = flattened.find((node) => node.path === "billing_contact");
    const shippingContact = flattened.find((node) => node.path === "shipping_contact");

    expect(billingContact?.cardinality).toBe("MANY_TO_ONE");
    expect(isIterableRelation(billingContact?.cardinality)).toBe(false);
    expect(shippingContact?.cardinality).toBe("MANY_TO_ONE");
    expect(flattened.some((node) => node.fieldType === "REVERSE_LOOKUP")).toBe(false);
    expect(flattened.some((node) => node.path === "billing_contact.orders")).toBe(false);
    expect(flattened.some((node) => node.path === "shipping_contact.orders")).toBe(false);
    expect(screen.getByTestId("error")).toHaveTextContent("");
  });

  it("does not fetch catalog data while disabled", async () => {
    render(
      <SupabaseProvider client={{} as never}>
        <VariableFieldsProbe collectionId="11111111-1111-4111-8111-111111111111" enabled={false} />
      </SupabaseProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("false");
    });

    expect(collectionFactoryState.listFieldsExecute).not.toHaveBeenCalled();
    expect(collectionFactoryState.eagerLoadExecute).not.toHaveBeenCalled();
  });
});
