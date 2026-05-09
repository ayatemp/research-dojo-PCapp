"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  CircleAlert,
  Copy,
  ExternalLink,
  Loader2,
  RefreshCw,
  Terminal,
} from "lucide-react";
import { Panel, Pill } from "@/components/ui";

type CodexAuthStatus = {
  available: boolean;
  loggedIn: boolean;
  method: string;
  statusText: string;
  appServerAvailable: boolean;
  binaryPath?: string;
  codexHome?: string;
  userAgent?: string;
  error?: string;
};

type CodexDeviceLoginSession = {
  status: "idle" | "running" | "completed" | "failed";
  startedAt?: string;
  completedAt?: string;
  authUrl?: string;
  userCode?: string;
  expiresAt?: string;
  output: string;
  error?: string;
  exitCode?: number | null;
  binaryPath?: string;
};

type CodexLoginResponse = {
  login: CodexDeviceLoginSession;
  codex: CodexAuthStatus;
  error?: string;
};

export function CodexLoginPanel({ initialCodex }: { initialCodex: CodexAuthStatus }) {
  const router = useRouter();
  const [codex, setCodex] = useState(initialCodex);
  const [login, setLogin] = useState<CodexDeviceLoginSession>({
    status: "idle",
    output: "",
  });
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const isRunning = login.status === "running";

  const loadSession = useCallback(async () => {
    const response = await fetch("/api/codex/login/session", { cache: "no-store" });
    const data = (await response.json()) as CodexLoginResponse;
    if (!response.ok) throw new Error(data.error || "Codex status refresh failed.");
    setLogin(data.login);
    setCodex(data.codex);
    if (data.codex.loggedIn) {
      setMessage("Codexログインを確認しました。");
      router.refresh();
    }
  }, [router]);

  function refresh() {
    startTransition(async () => {
      try {
        await loadSession();
      } catch (error) {
        setMessage(error instanceof Error ? error.message : String(error));
      }
    });
  }

  function startLogin() {
    startTransition(async () => {
      setMessage("");
      try {
        const response = await fetch("/api/codex/login/start", {
          method: "POST",
          cache: "no-store",
        });
        const data = (await response.json()) as CodexLoginResponse;
        if (!response.ok) throw new Error(data.error || "Codex login start failed.");
        setLogin(data.login);
        setCodex(data.codex);
        if (data.codex.loggedIn) {
          setMessage("Codexはすでにログイン済みです。");
          router.refresh();
        }
      } catch (error) {
        setMessage(error instanceof Error ? error.message : String(error));
      }
    });
  }

  async function copyCode() {
    if (!login.userCode) return;
    await navigator.clipboard.writeText(login.userCode);
    setMessage("認証コードをコピーしました。");
  }

  useEffect(() => {
    if (!isRunning) return;
    const timer = window.setInterval(() => {
      void loadSession().catch((error) => {
        setMessage(error instanceof Error ? error.message : String(error));
      });
    }, 2500);
    return () => window.clearInterval(timer);
  }, [isRunning, loadSession]);

  return (
    <Panel>
      <div className="flex items-start gap-4">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-cyan-300/25 bg-cyan-500/15 text-cyan-200">
          <Terminal className="size-6" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm text-slate-400">Codex App Server</p>
            <Pill tone={codex.loggedIn ? "good" : "bad"}>
              {codex.loggedIn ? "ログイン済み" : "未ログイン"}
            </Pill>
          </div>
          <h2 className="mt-1 text-xl font-semibold text-white">
            {codex.loggedIn ? `Logged in using ${codex.method}` : "Codex login required"}
          </h2>

          <div className="mt-4 space-y-3 text-sm leading-6">
            <StatusRow
              ok={codex.available}
              label="Codex CLI"
              value={codex.binaryPath || (codex.available ? "available" : "not found")}
            />
            <StatusRow
              ok={codex.appServerAvailable}
              label="App Server"
              value={codex.appServerAvailable ? "JSON-RPC probe ok" : "not connected"}
            />
            <StatusRow ok={codex.loggedIn} label="Login status" value={codex.statusText} />
            {codex.codexHome ? <StatusRow ok label="CODEX_HOME" value={codex.codexHome} /> : null}
          </div>

          {codex.error ? (
            <p className="mt-4 rounded-lg border border-amber-400/25 bg-amber-500/10 p-3 text-sm leading-6 text-amber-100">
              {codex.error}
            </p>
          ) : null}

          {!codex.loggedIn ? (
            <div className="mt-4 rounded-lg border border-cyan-300/20 bg-cyan-500/10 p-4">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={startLogin}
                  disabled={!codex.available || isPending}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-gradient-to-r from-violet-600 to-indigo-500 px-4 text-sm font-semibold text-white shadow-[0_0_24px_rgba(124,58,237,0.28)] hover:from-violet-500 hover:to-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isRunning || isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                  {isRunning ? "ログイン待機中" : "この画面でCodexログイン"}
                </button>
                <button
                  type="button"
                  onClick={refresh}
                  disabled={isPending}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-white/10 bg-white/[0.04] px-4 text-sm font-semibold text-slate-200 hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <RefreshCw className="size-4" />
                  再確認
                </button>
              </div>

              {login.userCode ? (
                <div className="mt-4 grid gap-3 rounded-lg border border-white/10 bg-slate-950/40 p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Device code
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <code className="rounded-md border border-cyan-300/20 bg-cyan-400/10 px-3 py-2 font-mono text-lg font-semibold tracking-normal text-cyan-100">
                      {login.userCode}
                    </code>
                    <button
                      type="button"
                      onClick={copyCode}
                      className="inline-flex size-10 items-center justify-center rounded-md border border-white/10 bg-white/[0.04] text-slate-200 hover:bg-white/[0.08]"
                      aria-label="認証コードをコピー"
                      title="認証コードをコピー"
                    >
                      <Copy className="size-4" />
                    </button>
                    {login.authUrl ? (
                      <a
                        href={login.authUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-white/10 bg-white/[0.04] px-3 text-sm font-semibold text-slate-100 hover:bg-white/[0.08]"
                      >
                        <ExternalLink className="size-4" />
                        認証ページを開く
                      </a>
                    ) : null}
                  </div>
                  {login.expiresAt ? (
                    <p className="text-xs text-slate-400">
                      コード期限: {new Date(login.expiresAt).toLocaleTimeString()}
                    </p>
                  ) : null}
                </div>
              ) : null}

              {login.output && !login.userCode ? (
                <pre className="mt-4 max-h-40 overflow-auto rounded-lg border border-white/10 bg-slate-950/50 p-3 text-xs leading-5 text-slate-300">
                  {login.output}
                </pre>
              ) : null}

              {login.error ? (
                <p className="mt-3 rounded-lg border border-rose-400/25 bg-rose-500/10 p-3 text-sm leading-6 text-rose-100">
                  {login.error}
                </p>
              ) : null}
              {message ? <p className="mt-3 text-sm text-cyan-100">{message}</p> : null}
            </div>
          ) : null}
        </div>
      </div>
    </Panel>
  );
}

function StatusRow({ ok, label, value }: { ok: boolean; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-white/10 bg-white/[0.035] p-3">
      {ok ? (
        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-300" />
      ) : (
        <CircleAlert className="mt-0.5 size-4 shrink-0 text-rose-300" />
      )}
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
          {label}
        </p>
        <p className="mt-1 break-words text-slate-200">{value}</p>
      </div>
    </div>
  );
}
