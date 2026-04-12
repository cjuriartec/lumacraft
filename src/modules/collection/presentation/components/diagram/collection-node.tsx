"use client";

import { Handle, Position } from "@xyflow/react";
import {
  Calendar,
  CheckSquare,
  Database,
  Eye,
  File,
  Hash,
  ImageIcon,
  Link2,
  List,
  MapPin,
  Type,
} from "lucide-react";
import { memo } from "react";

import { Collection } from "../../../domain/entities/collection.entity";
import { Field } from "../../../domain/entities/field.entity";

const typeIcons: Record<string, React.ReactNode> = {
  TEXT: <Type size={12} />,
  NUMBER: <Hash size={12} />,
  BOOLEAN: <CheckSquare size={12} />,
  DATE: <Calendar size={12} />,
  ENUM: <List size={12} />,
  RELATION: <Link2 size={12} />,
  REVERSE_LOOKUP: <Eye size={12} />,
  FILE: <File size={12} />,
  IMAGE: <ImageIcon size={12} />,
  LOCATION: <MapPin size={12} />,
};

interface CollectionNodeProps {
  data: {
    collection: Collection;
    fields: Field[];
  };
}

export const CollectionNode = memo(({ data }: CollectionNodeProps) => {
  const { collection, fields } = data;

  return (
    <div className="min-w-[220px] rounded-2xl border border-border/40 bg-surface shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] overflow-hidden transition-all hover:border-primary/20 hover:shadow-[0_8px_30px_rgba(var(--primary-rgb),0.05)]">
      {/* Target for incoming relations */}
      <Handle type="target" position={Position.Top} className="opacity-0! w-0! h-0!" />

      {/* Header */}
      <div className="px-5 py-4 flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-primary/5 flex items-center justify-center text-primary/60">
          <Database size={16} strokeWidth={1.5} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-[12px] font-semibold text-foreground/90 truncate tracking-[-0.01em]">
            {collection.displayName || collection.name}
          </h3>
          <p className="text-[10px] text-foreground/30 font-medium">
            {fields.length} {fields.length === 1 ? "campo" : "campos"}
          </p>
        </div>
      </div>

      {/* Fields List */}
      <div className="pb-3 border-t border-border/10">
        {fields.map((field) => (
          <div
            key={field.id}
            className="px-5 py-2 flex items-center justify-between group hover:bg-primary/2 transition-colors relative"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-foreground/20 group-hover:text-primary/40 transition-colors shrink-0">
                {typeIcons[field.fieldType.value] || <Hash size={12} />}
              </span>
              <span className="text-[11px] font-normal text-foreground/70 group-hover:text-foreground/90 transition-colors truncate">
                {field.displayName || field.name}
                {field.isRequired && <span className="ml-1 text-primary/40 font-bold">*</span>}
              </span>
            </div>

            {/* Handle for relations */}
            {(field.fieldType.value === "RELATION" ||
              field.fieldType.value === "REVERSE_LOOKUP") && (
              <Handle
                type="source"
                position={Position.Right}
                id={field.id}
                className="bg-primary! w-1.5! h-1.5! border-none! transition-all group-hover:scale-150 group-hover:shadow-[0_0_8px_rgba(var(--primary-rgb),0.4)]"
              />
            )}
          </div>
        ))}
      </div>

      {/* Source handle at bottom as fallback */}
      <Handle type="source" position={Position.Bottom} className="opacity-0! w-0! h-0!" />
    </div>
  );
});

CollectionNode.displayName = "CollectionNode";
