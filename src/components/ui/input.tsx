import { cn } from "@/lib/utils";
import { forwardRef } from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, ...props }, ref) => {
    return (
      <div>
        {label && (
          <label
            htmlFor={id}
            className="mb-1 block text-sm font-medium text-white/80"
          >
            {label}
          </label>
        )}
        <input
          id={id}
          ref={ref}
          className={cn(
            "w-full border bg-white/5 px-4 py-2 text-sm text-white placeholder:text-white/30 transition-colors focus:outline-none focus:ring-1",
            error
              ? "border-red-500/50 focus:border-red-500 focus:ring-red-500"
              : "border-white/10 focus:border-white/30 focus:ring-white/20",
            className
          )}
          {...props}
        />
        {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";
