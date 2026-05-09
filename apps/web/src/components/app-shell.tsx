"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronRight,
  FlaskConical,
  FileText,
  Home,
  LogOut,
  MessageSquareCode,
  PanelLeftClose,
  PanelLeftOpen,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import type { CSSProperties, PointerEvent, ReactNode } from "react";
import { useEffect, useState } from "react";
import { logoutAction } from "@/app/actions";
import { cn } from "@/lib/utils";
import { BrandMark } from "@/components/ui";

const nav = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/papers", label: "Paper Room", icon: FileText },
  { href: "/topic-room", label: "Topic Room", icon: Sparkles },
  { href: "/research-lab", label: "Research Lab", icon: FlaskConical },
  { href: "/codex-room", label: "Codex Room", icon: MessageSquareCode },
];

const minWidth = 208;
const maxWidth = 320;
const collapsedWidth = 76;

export function AppShell({
  children,
  user,
  contentWidth = "normal",
}: {
  children: ReactNode;
  user: { name: string | null; email: string };
  contentWidth?: "normal" | "wide";
}) {
  const pathname = usePathname();
  const [width, setWidth] = useState(248);
  const [collapsed, setCollapsed] = useState(false);
  const displayName = user.name || user.email.split("@")[0] || "Researcher";
  const initials = displayName
    .split(/[ ._-]/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const sidebarWidth = collapsed ? collapsedWidth : width;

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const savedWidth = Number(window.localStorage.getItem("research-dojo-sidebar-width"));
      const savedCollapsed = window.localStorage.getItem("research-dojo-sidebar-collapsed");
      if (savedWidth >= minWidth && savedWidth <= maxWidth) setWidth(savedWidth);
      if (savedCollapsed === "true") setCollapsed(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    window.localStorage.setItem("research-dojo-sidebar-width", String(width));
    window.localStorage.setItem("research-dojo-sidebar-collapsed", String(collapsed));
  }, [width, collapsed]);

  function startResize(event: PointerEvent<HTMLButtonElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    const startX = event.clientX;
    const startWidth = width;

    function move(moveEvent: globalThis.PointerEvent) {
      const next = Math.min(maxWidth, Math.max(minWidth, startWidth + moveEvent.clientX - startX));
      setCollapsed(false);
      setWidth(next);
    }

    function up() {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    }

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  return (
    <div className="min-h-screen bg-[#030711] text-slate-100">
      <aside
        className="fixed inset-y-0 left-0 z-30 hidden border-r border-white/10 bg-[#06101d]/92 py-5 shadow-[18px_0_60px_rgba(0,0,0,0.28)] backdrop-blur-xl lg:block"
        style={{ width: sidebarWidth }}
      >
        <div className={cn("flex h-full flex-col", collapsed ? "px-3" : "px-4")}>
          <div className="flex items-center gap-3 px-1">
            <Link
              href="/dashboard"
              className={cn("flex min-w-0 flex-1 items-center gap-3", collapsed && "justify-center")}
              title="Research Dojo"
            >
              {!collapsed ? (
                <>
                  <BrandMark className="shrink-0" />
                  <span className="min-w-0">
                    <span className="block text-sm font-bold leading-4 text-white">
                      Research Dojo
                    </span>
                    <span className="text-xs text-slate-400">Codex research gym</span>
                  </span>
                </>
              ) : (
                <span className="flex size-10 items-center justify-center rounded-lg border border-violet-300/30 bg-violet-500/15">
                  <BrandMark className="scale-75" />
                </span>
              )}
            </Link>
            {!collapsed ? (
              <button
                type="button"
                aria-label="Collapse sidebar"
                title="Collapse sidebar"
                onClick={() => setCollapsed(true)}
                className="flex size-9 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-white/[0.06] hover:text-white"
              >
                <PanelLeftClose className="size-4" />
              </button>
            ) : null}
          </div>

          {collapsed ? (
            <button
              type="button"
              aria-label="Expand sidebar"
              title="Expand sidebar"
              onClick={() => setCollapsed(false)}
              className="mt-4 flex size-10 items-center justify-center rounded-lg text-slate-400 hover:bg-white/[0.06] hover:text-white"
            >
              <PanelLeftOpen className="size-5" />
            </button>
          ) : null}

          {!collapsed ? (
            <p className="mt-8 px-3 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">
              Main Menu
            </p>
          ) : null}

          <nav className={cn("space-y-2", collapsed ? "mt-8" : "mt-3")}>
            {nav.map((item) => {
              const active =
                pathname === item.href ||
                (item.href !== "/dashboard" && pathname.startsWith(item.href));
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    "group flex h-11 items-center gap-3 rounded-md px-3 text-sm font-medium",
                    collapsed && "justify-center px-0",
                    active
                      ? "border border-violet-300/25 bg-violet-500/22 text-white shadow-[0_0_24px_rgba(124,58,237,0.18)]"
                      : "text-slate-400 hover:bg-white/[0.04] hover:text-white",
                  )}
                >
                  <Icon className="size-4 shrink-0" />
                  {!collapsed ? <span className="truncate">{item.label}</span> : null}
                </Link>
              );
            })}
          </nav>

          <form action={logoutAction} className="mt-auto border-t border-white/10 pt-5">
            <div className={cn("flex items-center gap-3", collapsed && "justify-center")}>
              <Link
                href="/settings"
                aria-label="Account and Codex settings"
                title="Account and Codex settings"
                className={cn(
                  "flex min-w-0 items-center gap-3 rounded-lg hover:bg-white/[0.04]",
                  collapsed ? "justify-center p-0" : "flex-1 p-1",
                )}
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 text-sm font-bold text-white shadow-[0_0_24px_rgba(124,58,237,0.28)]">
                  {initials || "RD"}
                </span>
                {!collapsed ? (
                  <>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-white">
                        {displayName}
                      </span>
                      <span className="block truncate text-xs text-slate-400">
                        Free Plan
                      </span>
                    </span>
                    <SlidersHorizontal className="size-4 shrink-0 text-slate-500" />
                  </>
                ) : null}
              </Link>
              {!collapsed ? (
                <button
                  aria-label="Logout"
                  title="Logout"
                  className="flex size-9 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-white/[0.06] hover:text-white"
                >
                  <LogOut className="size-4" />
                </button>
              ) : null}
            </div>
          </form>
        </div>

        {!collapsed ? (
          <button
            type="button"
            aria-label="Resize sidebar"
            title="Drag to resize sidebar"
            onPointerDown={startResize}
            className="absolute right-[-5px] top-0 h-full w-2 cursor-col-resize border-x border-transparent hover:border-indigo-400/30"
          />
        ) : (
          <button
            type="button"
            aria-label="Expand sidebar"
            title="Expand sidebar"
            onClick={() => setCollapsed(false)}
            className="absolute right-[-14px] top-6 flex size-7 items-center justify-center rounded-full border border-white/10 bg-[#0b1220] text-slate-300 shadow-lg"
          >
            <ChevronRight className="size-4" />
          </button>
        )}
      </aside>

      <div
        className="transition-[padding] duration-200 lg:pl-[var(--sidebar-width)]"
        style={{ "--sidebar-width": `${sidebarWidth}px` } as CSSProperties}
      >
        <header className="sticky top-0 z-20 border-b border-white/10 bg-[#06101d]/92 px-4 py-3 backdrop-blur-xl lg:hidden">
          <div className="flex items-center gap-3">
            <BrandMark className="scale-75" />
            <span className="text-sm font-bold tracking-normal text-white">
              Research Dojo
            </span>
          </div>
          <nav className="mt-3 flex gap-2 overflow-x-auto">
            {nav.map((item) => {
              const active =
                pathname === item.href ||
                (item.href !== "/dashboard" && pathname.startsWith(item.href));
              const Icon = item.icon;
              return (
                <Link
                  key={`${item.label}-mobile`}
                  href={item.href}
                  className={cn(
                    "inline-flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium",
                    active
                      ? "border-indigo-300/40 bg-indigo-500/30 text-white"
                      : "border-white/10 bg-white/[0.04] text-slate-300",
                  )}
                >
                  <Icon className="size-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </header>
        <main
          data-content-width={contentWidth}
          className="dojo-main px-4 py-6 sm:px-6 lg:px-8 xl:px-10"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
