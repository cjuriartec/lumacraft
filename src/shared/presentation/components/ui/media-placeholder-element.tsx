"use client";

import { Loader2Icon, XCircleIcon } from "lucide-react";
import type { PlateElementProps } from "platejs/react";
import { PlateElement, useEditorRef, useElement } from "platejs/react";
import * as React from "react";

import { cn } from "@/shared/lib/utils";
import { placeholderFileStore } from "@/shared/presentation/hooks/use-placeholder-file-store";
import { useUploadFile } from "@/shared/presentation/hooks/use-upload-file";

export function MediaPlaceholderElement(props: PlateElementProps) {
  const editor = useEditorRef();
  const element = useElement();
  const elementId = element.id as string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mediaType = (element as any).mediaType || "img";
  const file = placeholderFileStore.get(elementId);

  const { uploadFile } = useUploadFile();
  const [error, setError] = React.useState<string | null>(null);
  const [uploadedUrl, setUploadedUrl] = React.useState<string | null>(null);
  const uploadStarted = React.useRef(false);

  // Upload the file
  React.useEffect(() => {
    if (!file || !editor || uploadStarted.current) return;
    uploadStarted.current = true;

    const upload = async () => {
      const result = await uploadFile(file);

      if (result.ok) {
        setUploadedUrl(result.value.url);
        placeholderFileStore.remove(elementId);
      } else {
        setError(result.error instanceof Error ? result.error.message : "Upload failed");
      }
    };

    upload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file]);

  // Replace placeholder with real media node once URL is ready
  React.useEffect(() => {
    if (!uploadedUrl || !editor) return;

    const path = editor.api.findPath(element);

    if (path) {
      editor.tf.withoutNormalizing(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        editor.tf.removeNodes({ at: path as any });
        editor.tf.insertNodes(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          { type: mediaType, url: uploadedUrl, children: [{ text: "" }] } as any,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          { at: path as any },
        );
      });
    } else {
      setError("Could not locate placeholder");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uploadedUrl]);

  return (
    <PlateElement {...props} className={cn("py-2", props.className)}>
      <div
        className={cn(
          "flex h-14 items-center gap-3 rounded-lg border px-4 transition-all",
          error ? "border-destructive/20 bg-destructive/5" : "border-border/40 bg-surface/50",
        )}
        contentEditable={false}
      >
        {error ? (
          <>
            <XCircleIcon className="size-4 shrink-0 text-destructive/60" />
            <span className="text-xs font-medium text-destructive/70">{error}</span>
          </>
        ) : (
          <>
            <Loader2Icon className="size-4 shrink-0 animate-spin text-primary/40" />
            <div className="flex flex-col gap-0.5">
              <span className="text-[11px] font-medium text-foreground/60">
                {file?.name || "media"}
              </span>
              <span className="text-[10px] text-muted-foreground/50">Uploading…</span>
            </div>
          </>
        )}
      </div>
      {props.children}
    </PlateElement>
  );
}
