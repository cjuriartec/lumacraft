"use client";

import { cn } from "@/shared/lib/utils";

import { Toolbar } from "./toolbar";

export function FixedToolbar(props: React.ComponentProps<typeof Toolbar>) {
  return (
    <Toolbar
      {...props}
      className={cn(
        "sticky top-0 left-0 z-50 w-full justify-between overflow-x-auto p-1 backdrop-blur-sm",
        props.className,
      )}
      style={{
        scrollbarWidth: "none",
      }}
    />
  );
}
