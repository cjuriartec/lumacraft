import * as React from "react";

import { cn } from "@/shared/lib/utils";

import { AITextImprover } from "../ai/ai-text-improver";

export interface TextareaProps extends React.ComponentProps<"textarea"> {
  enableAI?: boolean;
  autoSize?: boolean;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, value, onChange, enableAI, autoSize, ...props }, ref) => {
    const showAI = enableAI === true && typeof value === "string" && onChange !== undefined;
    const innerRef = React.useRef<HTMLTextAreaElement>(null);

    // Merge refs: external ref (from forwardRef) and internal ref (for height adjustment)
    React.useImperativeHandle(ref, () => innerRef.current!);

    const adjustHeight = React.useCallback(() => {
      if (!autoSize || !innerRef.current) return;
      const element = innerRef.current;
      element.style.height = "auto";
      element.style.height = `${element.scrollHeight}px`;
    }, [autoSize]);

    React.useLayoutEffect(() => {
      adjustHeight();
    }, [value, adjustHeight]);

    const textarea = (
      <textarea
        className={cn(
          "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          showAI && "pr-10",
          autoSize && "overflow-hidden resize-none",
          className,
        )}
        value={value}
        onChange={(e) => {
          onChange?.(e);
          if (autoSize) adjustHeight();
        }}
        ref={innerRef}
        {...props}
      />
    );

    if (!showAI) return textarea;

    return (
      <div className="relative group/textarea-container w-full">
        {textarea}
        <div className="absolute right-2 bottom-2 opacity-0 group-hover/textarea-container:opacity-100 focus-within:opacity-100 transition-opacity duration-300">
          <AITextImprover
            value={value as string}
            onImprove={(newValue) => {
              if (onChange) {
                // Create a simulated event that RHF can understand correctly
                onChange({
                  target: {
                    ...props,
                    name: (props as { name?: string }).name,
                    value: newValue,
                  },
                } as unknown as React.ChangeEvent<HTMLTextAreaElement>);
              }
            }}
          />
        </div>
      </div>
    );
  },
);
Textarea.displayName = "Textarea";

export { Textarea };
