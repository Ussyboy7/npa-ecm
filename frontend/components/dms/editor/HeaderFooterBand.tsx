"use client";

/**
 * Word-like header/footer band: inactive until double-clicked, then editable.
 */
import { useEffect, useRef, type CSSProperties } from "react";
import { cn } from "@/lib/utils";

type HeaderFooterBandProps = {
  kind: "header" | "footer";
  value: string;
  editing: boolean;
  onStartEdit: () => void;
  onChange: (value: string) => void;
  onEndEdit: () => void;
  className?: string;
  style?: CSSProperties;
};

export function HeaderFooterBand({
  kind,
  value,
  editing,
  onStartEdit,
  onChange,
  onEndEdit,
  className,
  style,
}: HeaderFooterBandProps) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const label = kind === "header" ? "Header" : "Footer";
  const emptyHint =
    kind === "header" ? "Double-click to edit header" : "Double-click to edit footer";

  useEffect(() => {
    if (editing) {
      ref.current?.focus();
      ref.current?.select();
    }
  }, [editing]);

  if (editing) {
    return (
      <div
        className={cn(
          "px-1 py-0.5 border border-primary/40 bg-primary/5 rounded-sm",
          className,
        )}
        style={style}
      >
        <textarea
          ref={ref}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onEndEdit}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              onEndEdit();
            }
          }}
          rows={2}
          aria-label={label}
          placeholder={label}
          className="w-full resize-none bg-transparent text-[9pt] text-foreground outline-none leading-snug"
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      className={cn(
        "w-full text-left px-1 py-0.5 rounded-sm border border-transparent",
        "hover:border-border/70 hover:bg-muted/30 cursor-pointer",
        "text-[9pt] leading-snug text-muted-foreground",
        !value.trim() && "text-muted-foreground/45 italic",
        className,
      )}
      style={style}
      title={`${emptyHint} · Esc to finish when editing`}
      aria-label={`${label}. ${emptyHint}`}
      onDoubleClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onStartEdit();
      }}
      onClick={(e) => {
        // Single click selects the band affordance without stealing body focus awkwardly.
        e.stopPropagation();
      }}
    >
      <span className="line-clamp-2 whitespace-pre-wrap break-words">
        {value.trim() ? value : emptyHint}
      </span>
    </button>
  );
}
