"use client";

import { useLink } from "@platejs/link/react";
import { type TElement } from "platejs";
import { PlateElement, type PlateElementProps } from "platejs/react";
import * as React from "react";

import { cn } from "@/shared/lib/utils";

type TLinkElement = TElement & { url: string; target?: string };

export const LinkElement = React.forwardRef<HTMLAnchorElement, PlateElementProps>(
  ({ children, className, ...props }, ref) => {
    const element = props.element as TLinkElement;

    const { props: linkProps } = useLink({
      element,
    });

    return (
      <PlateElement
        as="a"
        ref={ref}
        className={cn(
          "text-primary underline decoration-primary/30 underline-offset-4 transition-colors hover:text-primary-hover hover:decoration-primary",
          className,
        )}
        {...linkProps}
        {...props}
      >
        {children}
      </PlateElement>
    );
  },
);

LinkElement.displayName = "LinkElement";
