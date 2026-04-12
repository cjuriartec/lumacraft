import * as React from "react";

import { cn } from "@/shared/lib/utils";

import { AITextImprover } from "../ai/ai-text-improver";

export interface InputProps extends React.ComponentProps<"input"> {
  enableAI?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, value, onChange, enableAI, ...props }, ref) => {
    // Show AI improver only for text-like inputs, when EXPLICITLY enabled,
    // and when we have a controlled value and onChange.
    const showAI =
      enableAI === true &&
      (type === "text" || !type) &&
      typeof value === "string" &&
      onChange !== undefined;

    const input = (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          showAI && "pr-10",
          className,
        )}
        value={value}
        onChange={onChange}
        ref={ref}
        {...props}
      />
    );

    if (!showAI) return input;

    return (
      <div className="relative group/input-container w-full">
        {input}
        <div className="absolute right-1.5 top-1/2 -translate-y-1/2 opacity-0 group-hover/input-container:opacity-100 focus-within:opacity-100 transition-opacity duration-300">
          <AITextImprover
            value={value as string}
            onImprove={(newValue) => {
              if (onChange) {
                // Better event simulation for RHF compatibility
                onChange({
                  target: {
                    ...props,
                    name: (props as { name?: string }).name,
                    value: newValue,
                  },
                } as unknown as React.ChangeEvent<HTMLInputElement>);
              }
            }}
          />
        </div>
      </div>
    );
  },
);
Input.displayName = "Input";

export { Input };
