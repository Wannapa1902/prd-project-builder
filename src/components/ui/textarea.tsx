import * as React from "react";

import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[88px] w-full rounded-2xl border-2 border-input bg-[#F8FAF8] px-4 py-3 text-base font-medium shadow-sm placeholder:text-muted-foreground focus-visible:border-[#22C55E] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#22C55E]/15 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Textarea.displayName = "Textarea";

export { Textarea };
