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
          "bg-gradient-to-br from-[#DCFCE7] to-[#BBF7D0] text-[#2C3E50] shadow-[0_4px_20px_rgb(34_197_94_/_0.4)] hover:brightness-105",
        destructive:
          "bg-[#16A34A] text-destructive-foreground shadow-[0_4px_20px_rgb(34_197_94_/_0.35)] hover:bg-[#15803D]",
        outline:
          "border-2 border-primary bg-white text-primary shadow-[0_4px_20px_rgb(34_197_94_/_0.18)] hover:bg-[#ECFDF5]",
        secondary:
          "bg-[#F8FAF8] text-secondary-foreground shadow-[0_4px_20px_rgb(34_197_94_/_0.1)] hover:bg-[#DCFCE7]",
        ghost: "text-muted-foreground hover:bg-[#ECFDF5] hover:text-[#15803D]",
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
