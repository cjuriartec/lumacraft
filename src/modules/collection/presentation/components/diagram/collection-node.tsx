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
    <div className="min-w-[200px] rounded-xl border border-border/50 bg-surface shadow-2xl overflow-hidden backdrop-blur-sm transition-all hover:border-primary/30">
      {/* Target for incoming relations */}
      <Handle type="target" position={Position.Top} className="opacity-0" />

      {/* Header */}
      <div className="bg-primary/5 px-4 py-3 border-b border-border/40 flex items-center gap-2.5">
        <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center text-primary">
          <Database size={14} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-xs font-bold text-foreground truncate uppercase tracking-wider">
            {collection.displayName || collection.name}
          </h3>
        </div>
      </div>

      {/* Fields List */}
      <div className="py-2">
        {fields.map((field) => (
          <div
            key={field.id}
            className="px-4 py-2 flex items-center justify-between group hover:bg-primary/3 transition-colors relative"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="text-foreground/40 group-hover:text-primary/60 transition-colors shrink-0">
                {typeIcons[field.fieldType.value] || <Hash size={12} />}
              </span>
              <span className="text-[12px] font-medium text-foreground/80 truncate">
                {field.displayName || field.name}
                {field.isRequired && <span className="ml-1 text-primary/60">*</span>}
              </span>
            </div>

            {/* Handle for relations */}
            {(field.fieldType.value === "RELATION" ||
              field.fieldType.value === "REVERSE_LOOKUP") && (
              <Handle
                type="source"
                position={Position.Right}
                id={field.id}
                className="bg-primary! w-2! h-2! border-none! transition-transform group-hover:scale-125"
              />
            )}
          </div>
        ))}
      </div>

      {/* Source handle at bottom as fallback */}
      <Handle type="source" position={Position.Bottom} className="opacity-0" />
    </div>
  );
});

CollectionNode.displayName = "CollectionNode";
