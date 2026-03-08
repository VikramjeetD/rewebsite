"use client";

import { useRef, useCallback, useEffect, useState } from "react";
import { Bold, Italic, Underline } from "lucide-react";

const FONT_SIZES = [
  { label: "Small", value: "12px" },
  { label: "Normal", value: "14px" },
  { label: "Medium", value: "16px" },
  { label: "Large", value: "20px" },
  { label: "XL", value: "24px" },
];

interface RichTextEditorProps {
  name: string;
  label?: string;
  defaultValue?: string;
  required?: boolean;
}

export function RichTextEditor({
  name,
  label,
  defaultValue,
  required,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const hiddenRef = useRef<HTMLInputElement>(null);
  const [activeFormats, setActiveFormats] = useState({
    bold: false,
    italic: false,
    underline: false,
  });

  const syncContent = useCallback(() => {
    if (editorRef.current && hiddenRef.current) {
      hiddenRef.current.value = editorRef.current.innerHTML;
    }
  }, []);

  // Set initial content — convert plain text newlines to <br> if no HTML tags
  useEffect(() => {
    if (editorRef.current && defaultValue) {
      const isPlainText = !/<[a-z][\s\S]*?>/i.test(defaultValue);
      editorRef.current.innerHTML = isPlainText
        ? defaultValue.replace(/\n/g, "<br>")
        : defaultValue;
      syncContent();
    }
  }, [defaultValue, syncContent]);

  const updateActiveFormats = useCallback(() => {
    setActiveFormats({
      bold: document.queryCommandState("bold"),
      italic: document.queryCommandState("italic"),
      underline: document.queryCommandState("underline"),
    });
  }, []);

  const exec = useCallback(
    (command: string) => {
      editorRef.current?.focus();
      document.execCommand(command, false);
      syncContent();
      updateActiveFormats();
    },
    [syncContent, updateActiveFormats]
  );

  const applyFontSize = useCallback(
    (size: string) => {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;
      editorRef.current?.focus();
      // Use execCommand fontSize with a marker value, then replace <font> with <span>
      document.execCommand("fontSize", false, "7");
      const editor = editorRef.current;
      if (!editor) return;
      const fonts = editor.querySelectorAll('font[size="7"]');
      fonts.forEach((font) => {
        const span = document.createElement("span");
        span.style.fontSize = size;
        span.innerHTML = font.innerHTML;
        font.replaceWith(span);
      });
      syncContent();
    },
    [syncContent]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        // Insert <br> instead of default <div> and prevent form submission
        e.preventDefault();
        document.execCommand("insertLineBreak");
        syncContent();
        return;
      }
      // Update active formats after keyboard shortcuts (Cmd+B, etc.)
      setTimeout(updateActiveFormats, 0);
      setTimeout(syncContent, 0);
    },
    [updateActiveFormats, syncContent]
  );

  return (
    <div>
      {label && (
        <label className="mb-1 block text-sm font-medium text-white/80">
          {label}
        </label>
      )}
      <div className="border border-white/10 focus-within:border-white/30 focus-within:ring-1 focus-within:ring-white/20 transition-colors">
        {/* Toolbar */}
        <div className="flex items-center gap-0.5 border-b border-white/10 px-2 py-1.5">
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => exec("bold")}
            title="Bold (Cmd+B)"
            className={`flex h-7 w-7 items-center justify-center rounded transition-colors ${
              activeFormats.bold
                ? "bg-white/20 text-white"
                : "text-white/50 hover:bg-white/10 hover:text-white/80"
            }`}
          >
            <Bold className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => exec("italic")}
            title="Italic (Cmd+I)"
            className={`flex h-7 w-7 items-center justify-center rounded transition-colors ${
              activeFormats.italic
                ? "bg-white/20 text-white"
                : "text-white/50 hover:bg-white/10 hover:text-white/80"
            }`}
          >
            <Italic className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => exec("underline")}
            title="Underline (Cmd+U)"
            className={`flex h-7 w-7 items-center justify-center rounded transition-colors ${
              activeFormats.underline
                ? "bg-white/20 text-white"
                : "text-white/50 hover:bg-white/10 hover:text-white/80"
            }`}
          >
            <Underline className="h-3.5 w-3.5" />
          </button>

          <div className="mx-1 h-4 w-px bg-white/10" />

          <select
            onMouseDown={(e) => e.stopPropagation()}
            onChange={(e) => {
              if (e.target.value) {
                applyFontSize(e.target.value);
                e.target.value = "";
              }
            }}
            defaultValue=""
            className="h-7 rounded bg-white/5 px-1.5 text-xs text-white/60 outline-none hover:bg-white/10 cursor-pointer border-none"
            title="Font Size"
          >
            <option value="" disabled>
              Size
            </option>
            {FONT_SIZES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        {/* Editable area */}
        <div
          ref={editorRef}
          contentEditable
          onInput={syncContent}
          onKeyDown={handleKeyDown}
          onMouseUp={updateActiveFormats}
          onSelect={updateActiveFormats}
          style={{ fontSize: "16px" }}
          className="rte-editor min-h-[120px] resize-y overflow-auto bg-white/5 px-4 py-2 text-white outline-none [&_b]:font-bold [&_strong]:font-bold [&_i]:italic [&_em]:italic [&_u]:underline"
          suppressContentEditableWarning
        />
        {/* Placeholder when empty */}
        <style>{`
          .rte-editor:empty::before {
            content: "Enter description...";
            color: rgba(255, 255, 255, 0.3);
            pointer-events: none;
          }
        `}</style>
      </div>

      <input type="hidden" name={name} ref={hiddenRef} required={required} />
    </div>
  );
}
