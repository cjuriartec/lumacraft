"use client";

import { RecordDocumentSelectorModal } from "@/modules/document/presentation/components/record-document-selector-modal";

interface ExportRecordModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  collectionId: string;
  recordId: string | null;
}

export function ExportRecordModal({
  isOpen,
  onOpenChange,
  collectionId,
  recordId,
}: ExportRecordModalProps) {
  return (
    <RecordDocumentSelectorModal
      collectionId={collectionId}
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      recordId={recordId}
    />
  );
}
