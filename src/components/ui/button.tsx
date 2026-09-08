import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-bold cursor-pointer transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/20 disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-br from-[#FFD23F] to-[#E6B800] text-[#2C3E50] shadow-[0_4px_20px_rgb(255_210_63_/_0.4)] hover:brightness-105",
        destructive:
          "bg-[#EF6C4A] text-destructive-foreground shadow-[0_4px_20px_rgb(239_108_74_/_0.35)] hover:bg-[#D45233]",
        outline:
          "border-2 border-primary bg-white text-primary shadow-[0_4px_20px_rgb(43_168_162_/_0.18)] hover:bg-[#E8F6F5]",
        secondary:
          "bg-[#FFF8E7] text-secondary-foreground shadow-[0_4px_20px_rgb(43_168_162_/_0.1)] hover:bg-[#FFE47A]",
        ghost: "text-muted-foreground hover:bg-[#E8F6F5] hover:text-[#1E8C86]",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-5 py-2",
        sm: "h-9 px-4 text-xs",
        lg: "h-12 px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
