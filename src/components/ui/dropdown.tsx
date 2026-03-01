"use client";

import { cn } from "@/lib/utils";
import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Check } from "lucide-react";

export interface DropdownOption {
  value: string;
  label: string;
}

interface DropdownProps {
  options: DropdownOption[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  label?: string;
  error?: string;
  placeholder?: string;
  name?: string;
  id?: string;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "glass" | "pill";
  disabled?: boolean;
  className?: string;
}

export function Dropdown({
  options,
  value: controlledValue,
  defaultValue,
  onValueChange,
  label,
  error,
  placeholder,
  name,
  id,
  size = "md",
  variant = "default",
  disabled = false,
  className,
}: DropdownProps) {
  const [open, setOpen] = useState(false);
  const [internalValue, setInternalValue] = useState(defaultValue ?? "");
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPos, setMenuPos] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);

  const currentValue = controlledValue ?? internalValue;

  const selectedOption = options.find((o) => o.value === currentValue);
  const displayLabel = selectedOption?.label ?? placeholder ?? "Select...";

  function select(val: string) {
    if (controlledValue === undefined) {
      setInternalValue(val);
    }
    onValueChange?.(val);
    setOpen(false);
  }

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        menuRef.current &&
        !menuRef.current.contains(target)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  const menu =
    open && menuPos
      ? createPortal(
          <div
            ref={menuRef}
            className="fixed z-[9999] max-h-60 overflow-auto border border-white/10 bg-neutral-900 py-1 shadow-xl"
            style={{
              top: menuPos.top,
              left: menuPos.left,
              width: menuPos.width,
            }}
          >
            {placeholder && (
              <button
                type="button"
                onClick={() => select("")}
                className={cn(
                  "flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors hover:bg-white/10",
                  currentValue === "" ? "text-white" : "text-white/40"
                )}
              >
                {currentValue === "" && <Check className="h-3 w-3 shrink-0" />}
                <span className={currentValue === "" ? "" : "pl-5"}>
                  {placeholder}
                </span>
              </button>
            )}
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => select(opt.value)}
                className={cn(
                  "flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors hover:bg-white/10",
                  opt.value === currentValue ? "text-white" : "text-white/60"
                )}
              >
                {opt.value === currentValue && (
                  <Check className="h-3 w-3 shrink-0" />
                )}
                <span className={opt.value === currentValue ? "" : "pl-5"}>
                  {opt.label}
                </span>
              </button>
            ))}
          </div>,
          document.body
        )
      : null;

  return (
    <div ref={containerRef} className="relative">
      {label && (
        <label
          htmlFor={id}
          className="mb-1 block text-sm font-medium text-white/80"
        >
          {label}
        </label>
      )}

      {/* Hidden input for form submission */}
      {name && <input type="hidden" name={name} value={currentValue} />}

      <button
        ref={buttonRef}
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!open && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            setMenuPos({
              top: rect.bottom + 4,
              left: rect.left,
              width: Math.max(rect.width, 128),
            });
          }
          setOpen(!open);
        }}
        className={cn(
          "inline-flex items-center justify-between gap-2 border text-white transition-colors focus:outline-none focus:ring-1 disabled:pointer-events-none disabled:opacity-50",
          {
            "border-white/10 bg-white/5 hover:bg-white/10 focus:border-white/30 focus:ring-white/20":
              variant === "default",
            "border-white/10 bg-white/5 backdrop-blur-sm hover:bg-white/10 focus:border-white/30 focus:ring-white/20":
              variant === "glass",
            "rounded-full border-white/10 bg-white/5 hover:bg-white/10 focus:ring-white/20":
              variant === "pill",
          },
          {
            "px-2 py-0.5 text-xs": size === "sm",
            "px-4 py-2 text-sm": size === "md",
            "px-5 py-3 text-base": size === "lg",
          },
          error && "border-red-500/50 focus:border-red-500 focus:ring-red-500",
          !selectedOption && "text-white/40",
          className
        )}
      >
        <span className="truncate">{displayLabel}</span>
        <ChevronDown
          className={cn(
            "shrink-0 text-white/40 transition-transform",
            {
              "h-3 w-3": size === "sm",
              "h-4 w-4": size === "md" || size === "lg",
            },
            open && "rotate-180"
          )}
        />
      </button>

      {menu}

      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
}
