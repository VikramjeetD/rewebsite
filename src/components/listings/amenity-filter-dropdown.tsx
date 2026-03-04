"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { AMENITY_CATALOG } from "@/lib/amenities";

interface AmenityFilterDropdownProps {
  value: string[];
  onValueChange: (keys: string[]) => void;
}

export function AmenityFilterDropdown({
  value,
  onValueChange,
}: AmenityFilterDropdownProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPos, setMenuPos] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);

  function toggle(key: string) {
    if (value.includes(key)) {
      onValueChange(value.filter((k) => k !== key));
    } else {
      onValueChange([...value, key]);
    }
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

  const label =
    value.length > 0 ? `Amenities (${value.length})` : "Amenities";

  const menu =
    open && menuPos
      ? createPortal(
          <div
            ref={menuRef}
            className="fixed z-[9999] max-h-80 w-72 overflow-auto border border-white/10 bg-neutral-900 py-1 shadow-xl"
            style={{
              top: menuPos.top,
              left: menuPos.left,
            }}
          >
            {AMENITY_CATALOG.map((category) => (
              <div key={category.name}>
                <div className="px-3 pb-1 pt-2.5 text-[11px] font-semibold uppercase tracking-wider text-white/30">
                  {category.name}
                </div>
                {category.amenities.map((amenity) => {
                  const selected = value.includes(amenity.key);
                  return (
                    <button
                      key={amenity.key}
                      type="button"
                      onClick={() => toggle(amenity.key)}
                      className={cn(
                        "flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors hover:bg-white/10",
                        selected ? "text-white" : "text-white/60"
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-3.5 w-3.5 shrink-0 items-center justify-center border",
                          selected
                            ? "border-white bg-white/20"
                            : "border-white/30"
                        )}
                      >
                        {selected && <Check className="h-2.5 w-2.5" />}
                      </span>
                      <span>{amenity.label}</span>
                    </button>
                  );
                })}
              </div>
            ))}
            {value.length > 0 && (
              <div className="border-t border-white/10 px-3 py-2">
                <button
                  type="button"
                  onClick={() => onValueChange([])}
                  className="text-xs text-white/40 hover:text-white"
                >
                  Clear all
                </button>
              </div>
            )}
          </div>,
          document.body
        )
      : null;

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => {
          if (!open && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            setMenuPos({
              top: rect.bottom + 4,
              left: rect.left,
              width: rect.width,
            });
          }
          setOpen(!open);
        }}
        className={cn(
          "inline-flex shrink-0 items-center justify-between gap-2 border px-2 py-0.5 text-xs text-white transition-colors focus:outline-none focus:ring-1",
          "border-white/10 bg-white/5 hover:bg-white/10 focus:border-white/30 focus:ring-white/20",
          value.length === 0 && "text-white/40"
        )}
      >
        <span className="truncate">{label}</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-white/40 transition-transform",
            open && "rotate-180"
          )}
        />
      </button>
      {menu}
    </div>
  );
}
