"use client";

import { render, screen, waitFor } from "@testing-library/react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { makeCollection, makeField, resetFactories } from "@/__tests__/factories/domain-factories";
import SupabaseProvider from "@/shared/presentation/providers/supabase-provider";
import { useVariableFields } from "@/modules/template/presentation/hooks/use-variable-fields";
import { isIterableRelation } from "@/modules/template/presentation/lib/template-field-semantics";
import type { TemplateVariableCatalogNode } from "@/modules/template/presentation/types/template-variable-catalog";

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

const reverseLookupState = vi.hoisted(() => ({
  records: [] as Array<{
    id: string;
    name: string;
    display_name: string | null;
    config: Record<string, unknown>;
  }>,
  from: vi.fn(),
  select: vi.fn(),
  in: vi.fn(),
}));

function flattenNodes(nodes: TemplateVariableCatalogNode[]): TemplateVariableCatalogNode[] {
  return nodes.flatMap((node) => [node, ...(node.children ? flattenNodes(node.children) : [])]);
}

function VariableFieldsProbe({ collectionId }: { collectionId: string }) {
  const { nodes, loading, error } = useVariableFields({ collectionId, depth: 2 });

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

    reverseLookupState.records = [];
    reverseLookupState.from.mockReset();
    reverseLookupState.select.mockReset();
    reverseLookupState.in.mockReset();

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

    reverseLookupState.in.mockImplementation(async (_column: string, ids: string[]) => ({
      data: reverseLookupState.records.filter((record) => ids.includes(record.id)),
    }));
    reverseLookupState.select.mockImplementation(() => ({
      in: reverseLookupState.in,
    }));
    reverseLookupState.from.mockImplementation(() => ({
      select: reverseLookupState.select,
    }));
  });

  it("keeps iterable reverse lookups visible and disambiguated across relation paths", async () => {
    const ordersCollectionId = "11111111-1111-4111-8111-111111111111";
    const contactsCollectionId = "22222222-2222-4222-8222-222222222222";
    const customerRelationFieldId = "33333333-3333-4333-8333-333333333333";
    const managerRelationFieldId = "44444444-4444-4444-8444-444444444444";

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
          targetFieldId: customerRelationFieldId,
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
          targetFieldId: managerRelationFieldId,
        },
      }),
    ]);

    reverseLookupState.records = [
      {
        id: customerRelationFieldId,
        name: "customer",
        display_name: "Customer",
        config: { relationType: "MANY_TO_ONE" },
      },
      {
        id: managerRelationFieldId,
        name: "manager",
        display_name: "Manager",
        config: { relationType: "ONE_TO_MANY" },
      },
    ];

    const supabaseClient = {
      from: reverseLookupState.from,
    } as unknown as SupabaseClient;

    render(
      <SupabaseProvider client={supabaseClient}>
        <VariableFieldsProbe collectionId={ordersCollectionId} />
      </SupabaseProvider>,
    );

    await waitFor(() => {
      const nodes = JSON.parse(screen.getByTestId("nodes").textContent ?? "[]") as TemplateVariableCatalogNode[];
      const flattened = flattenNodes(nodes);

      expect(flattened.some((node) => node.path === "billing_contact.orders")).toBe(true);
      expect(flattened.some((node) => node.path === "shipping_contact.orders")).toBe(true);
    });

    const nodes = JSON.parse(screen.getByTestId("nodes").textContent ?? "[]") as TemplateVariableCatalogNode[];
    const flattened = flattenNodes(nodes);
    const billingOrders = flattened.find((node) => node.path === "billing_contact.orders");
    const shippingOrders = flattened.find((node) => node.path === "shipping_contact.orders");
    const billingManagers = flattened.find((node) => node.path === "billing_contact.managers");

    expect(reverseLookupState.from).toHaveBeenCalledWith("fields");
    expect(reverseLookupState.in).toHaveBeenCalledTimes(1);
    expect(reverseLookupState.in).toHaveBeenCalledWith(
      "id",
      expect.arrayContaining([customerRelationFieldId, managerRelationFieldId]),
    );

    expect(billingOrders?.cardinality).toBe("ONE_TO_MANY");
    expect(isIterableRelation(billingOrders?.cardinality)).toBe(true);
    expect(shippingOrders?.cardinality).toBe("ONE_TO_MANY");
    expect(billingManagers?.cardinality).toBe("MANY_TO_ONE");
    expect(isIterableRelation(billingManagers?.cardinality)).toBe(false);

    expect(billingOrders?.displayName).toBe("Orders (Customer) [Billing Contact]");
    expect(shippingOrders?.displayName).toBe("Orders (Customer) [Shipping Contact]");
    expect(billingOrders?.displayName).not.toBe(shippingOrders?.displayName);
    expect(screen.getByTestId("error")).toHaveTextContent("");
  });
});
