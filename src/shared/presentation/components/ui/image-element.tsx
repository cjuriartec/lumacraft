"use client";

import { Image, useMediaState } from "@platejs/media/react";
import { Resizable, ResizeHandle } from "@platejs/resizable";
import type { PlateElementProps } from "platejs/react";
import { PlateElement, useReadOnly, useSelected } from "platejs/react";

import { cn } from "@/shared/lib/utils";

export function ImageElement(props: PlateElementProps) {
  const { align = "center", focused } = useMediaState();
  const selected = useSelected();
  const readOnly = useReadOnly();

  return (
    <PlateElement {...props} className={cn("my-4", props.className)}>
      <figure className="group relative" contentEditable={false}>
        <Resizable
          options={{
            align,
            maxWidth: "100%",
            minWidth: 92,
            readOnly,
          }}
          className="rounded-lg"
        >
          <ResizeHandle
            className={cn(
              "absolute top-0 left-0 z-20 h-full w-6 -translate-x-3 cursor-col-resize select-none transition-opacity",
              "before:absolute before:left-1/2 before:top-1/2 before:h-10 before:w-1.5 before:-translate-x-1/2 before:-translate-y-1/2 before:rounded-full before:bg-primary/30 before:shadow-sm before:transition-all hover:before:h-14 hover:before:bg-primary",
              !selected && "opacity-0 group-hover:opacity-100",
              selected && "opacity-100 before:bg-primary/60",
            )}
            options={{ direction: "left" }}
          />
          <Image
            alt=""
            src={props.element.url as string}
            className={cn(
              "w-full rounded-lg object-cover transition-all duration-300",
              selected &&
                focused &&
                "ring-1 ring-primary shadow-[0_0_0_1px_var(--primary),0_8px_30px_rgb(0,0,0,0.12)]",
            )}
          />
          <ResizeHandle
            className={cn(
              "absolute top-0 right-0 z-20 h-full w-6 translate-x-3 cursor-col-resize select-none transition-opacity",
              "before:absolute before:left-1/2 before:top-1/2 before:h-10 before:w-1.5 before:-translate-x-1/2 before:-translate-y-1/2 before:rounded-full before:bg-primary/30 before:shadow-sm before:transition-all hover:before:h-14 hover:before:bg-primary",
              !selected && "opacity-0 group-hover:opacity-100",
              selected && "opacity-100 before:bg-primary/60",
            )}
            options={{ direction: "right" }}
          />
        </Resizable>
      </figure>
      {props.children}
    </PlateElement>
  );
}
