import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return (
    <span className={cn("brand-mark", className)} aria-hidden="true">
      <span />
      <span />
      <span />
      <span />
    </span>
  );
}

export function Panel({
  children,
  className,
  id,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section
      id={id}
      className={cn(
        "rounded-lg border border-white/10 bg-[linear-gradient(180deg,rgba(20,31,49,0.82),rgba(9,16,29,0.86))] p-5 shadow-[0_18px_60px_rgba(0,0,0,0.24)] backdrop-blur-xl",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  action,
}: {
  eyebrow?: string;
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-4">
      <div>
        {eyebrow ? (
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-300">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="mt-1 text-lg font-semibold tracking-normal text-slate-50">
          {title}
        </h2>
      </div>
      {action}
    </div>
  );
}

export function Pill({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "good" | "warn" | "bad" | "info";
}) {
  const toneClass = {
    neutral: "border-white/10 bg-white/[0.06] text-slate-300",
    good: "border-emerald-400/40 bg-emerald-500/15 text-emerald-300",
    warn: "border-amber-400/40 bg-amber-500/15 text-amber-300",
    bad: "border-pink-400/40 bg-pink-500/15 text-pink-300",
    info: "border-violet-400/40 bg-violet-500/15 text-violet-200",
  }[tone];

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-1 text-xs font-medium",
        toneClass,
      )}
    >
      {children}
    </span>
  );
}

export function IconButton({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <button
      aria-label={label}
      title={label}
      className="inline-flex size-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08] hover:text-white"
    >
      {children}
    </button>
  );
}

export function ButtonLink({
  href,
  children,
  variant = "primary",
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary";
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex h-9 items-center justify-center rounded-md px-3 text-sm font-semibold",
        variant === "primary"
          ? "bg-gradient-to-r from-violet-600 to-indigo-500 text-white shadow-[0_0_24px_rgba(124,58,237,0.35)] hover:from-violet-500 hover:to-indigo-400"
          : "border border-white/10 bg-white/[0.04] text-slate-200 hover:bg-white/[0.08]",
      )}
    >
      {children}
    </Link>
  );
}

export function ScoreMeter({
  label,
  value,
  max = 100,
  tone = "emerald",
}: {
  label: string;
  value: number;
  max?: number;
  tone?: "emerald" | "amber" | "cyan" | "rose" | "zinc";
}) {
  const color = {
    emerald: "bg-emerald-400",
    amber: "bg-amber-500",
    cyan: "bg-cyan-400",
    rose: "bg-rose-400",
    zinc: "bg-zinc-700",
  }[tone];

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3 text-sm">
        <span className="font-medium text-slate-300">{label}</span>
        <span className="font-mono text-white">
          {value}/{max}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-md bg-slate-800/90">
        <div
          className={cn("h-full rounded-md shadow-[0_0_16px_currentColor]", color)}
          style={{ width: `${Math.min(100, (value / max) * 100)}%` }}
        />
      </div>
    </div>
  );
}
