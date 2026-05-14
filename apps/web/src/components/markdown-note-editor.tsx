"use client";

import { useRef, useState } from "react";
import { Bold, Italic, Underline } from "lucide-react";

type MarkdownNoteEditorProps = {
  name?: string;
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  minHeightClassName?: string;
};

type MarkStyle = "bold" | "italic" | "underline";

function wrapSelection(value: string, start: number, end: number, style: MarkStyle) {
  const selected = value.slice(start, end) || "text";
  const marks = {
    bold: ["**", "**"],
    italic: ["_", "_"],
    underline: ["<u>", "</u>"],
  } satisfies Record<MarkStyle, [string, string]>;
  const [open, close] = marks[style];
  return {
    value: `${value.slice(0, start)}${open}${selected}${close}${value.slice(end)}`,
    start: start + open.length,
    end: start + open.length + selected.length,
  };
}

export function MarkdownNoteEditor({
  name = "text",
  value,
  onChange,
  placeholder,
  minHeightClassName = "min-h-40",
}: MarkdownNoteEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [internalValue, setInternalValue] = useState(value ?? "");
  const textValue = value ?? internalValue;

  function setText(nextValue: string) {
    setInternalValue(nextValue);
    onChange?.(nextValue);
  }

  function applyStyle(style: MarkStyle) {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const next = wrapSelection(
      textValue,
      textarea.selectionStart,
      textarea.selectionEnd,
      style,
    );
    setText(next.value);
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(next.start, next.end);
    });
  }

  return (
    <div className="grid gap-2">
      <input type="hidden" name={name} value={textValue} />
      <div className="flex flex-wrap gap-2">
        {[
          { style: "bold" as const, label: "太字", icon: Bold },
          { style: "italic" as const, label: "イタリック", icon: Italic },
          { style: "underline" as const, label: "下線", icon: Underline },
        ].map(({ style, label, icon: Icon }) => (
          <button
            key={style}
            type="button"
            title={label}
            aria-label={label}
            onClick={() => applyStyle(style)}
            className="inline-flex size-9 items-center justify-center rounded-md border border-white/10 bg-slate-950/45 text-slate-300 hover:border-violet-300/40 hover:bg-white/[0.06] hover:text-white"
          >
            <Icon className="size-4" />
          </button>
        ))}
      </div>
      <textarea
        ref={textareaRef}
        value={textValue}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={(event) => {
          const hasModifier = event.metaKey || event.ctrlKey;
          if (!hasModifier) return;
          const key = event.key.toLowerCase();
          if (key === "b" || key === "i" || key === "u") {
            event.preventDefault();
            applyStyle(key === "b" ? "bold" : key === "i" ? "italic" : "underline");
          }
        }}
        placeholder={placeholder}
        className={`${minHeightClassName} rounded-md border border-white/10 bg-slate-950/45 p-3 text-sm leading-6 text-slate-100 outline-none placeholder:text-slate-500 focus:border-violet-300/60`}
      />
    </div>
  );
}
