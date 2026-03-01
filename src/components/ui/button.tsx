import { cn } from "@/lib/utils";
import { forwardRef } from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center font-medium uppercase tracking-widest transition-colors focus:outline-none focus:ring-2 focus:ring-white/20 disabled:pointer-events-none disabled:opacity-50",
          {
            "bg-white text-black hover:bg-white/90": variant === "primary",
            "bg-white/10 text-white backdrop-blur-sm hover:bg-white/20":
              variant === "secondary",
            "border border-white/10 bg-transparent text-white hover:bg-white/5":
              variant === "outline",
            "text-white/60 hover:bg-white/5 hover:text-white":
              variant === "ghost",
            "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500":
              variant === "danger",
          },
          {
            "px-3 py-1.5 text-sm": size === "sm",
            "px-4 py-2 text-sm": size === "md",
            "px-6 py-3 text-base": size === "lg",
          },
          className
        )}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";
