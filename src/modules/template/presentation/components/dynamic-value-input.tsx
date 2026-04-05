"use client";

import {
  type TemplateConditionOperator,
  type TemplatePrimitive,
} from "@/modules/template/domain/types/template-logic-blocks";
import { Input } from "@/shared/presentation/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/presentation/components/ui/select";

import { getFieldSemantics } from "../lib/template-field-semantics";
import { TemplateVariableCatalogNode } from "../types/template-variable-catalog";

interface DynamicValueInputProps {
  node?: TemplateVariableCatalogNode;
  operator?: TemplateConditionOperator;
  value?: TemplatePrimitive;
  onChange: (value: TemplatePrimitive | undefined) => void;
  placeholder?: string;
}

function toInputValue(value: TemplatePrimitive | undefined): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value);
}

export function DynamicValueInput({
  node,
  operator,
  value,
  onChange,
  placeholder = "Valor...",
}: DynamicValueInputProps) {
  if (operator === "is_empty" || operator === "not_empty") {
    return (
      <Input
        disabled
        value=""
        placeholder="No aplica para este operador"
        className="bg-surface/50 border-border/20 rounded-xl"
      />
    );
  }

  if (!node) {
    return (
      <Input
        value={toInputValue(value)}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="bg-surface border-border/40 rounded-xl"
      />
    );
  }

  const semantics = getFieldSemantics(node.fieldType);

  if (semantics.inputStrategy === "none") {
    return (
      <Input
        disabled
        value=""
        placeholder="Este campo solo permite evaluar vacío/no vacío"
        className="bg-surface/50 border-border/20 rounded-xl"
      />
    );
  }

  if (semantics.inputStrategy === "boolean") {
    return (
      <Select
        value={typeof value === "boolean" ? String(value) : ""}
        onValueChange={(nextValue) => onChange(nextValue === "true")}
      >
        <SelectTrigger className="bg-surface border-border/40 rounded-xl">
          <SelectValue placeholder="Seleccionar..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="true">Verdadero</SelectItem>
          <SelectItem value="false">Falso</SelectItem>
        </SelectContent>
      </Select>
    );
  }

  if (semantics.inputStrategy === "enum") {
    const enumOptions = node.enumOptions ?? [];
    return (
      <Select
        value={typeof value === "string" ? value : ""}
        onValueChange={(nextValue) => onChange(nextValue)}
      >
        <SelectTrigger className="bg-surface border-border/40 rounded-xl">
          <SelectValue placeholder="Seleccionar opción..." />
        </SelectTrigger>
        <SelectContent>
          {enumOptions.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  if (semantics.inputStrategy === "number") {
    return (
      <Input
        type="number"
        value={typeof value === "number" ? value : ""}
        onChange={(event) => {
          if (event.target.value === "") {
            onChange(undefined);
            return;
          }
          onChange(Number(event.target.value));
        }}
        placeholder={placeholder}
        className="bg-surface border-border/40 rounded-xl"
      />
    );
  }

  return (
    <Input
      value={toInputValue(value)}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="bg-surface border-border/40 rounded-xl"
    />
  );
}
