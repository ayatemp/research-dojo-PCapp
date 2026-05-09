import { cookies } from "next/headers";
import { CheckCircle2, CircleAlert, SlidersHorizontal, Terminal, UserRound } from "lucide-react";
import { updateDisplayPreferenceAction } from "@/app/actions";
import { requireUser } from "@/lib/auth";
import { getCodexAuthStatus } from "@/lib/codex-auth";
import { Panel, Pill, SectionHeader } from "@/components/ui";

export default async function SettingsPage() {
  const user = await requireUser();
  const codex = await getCodexAuthStatus();
  const cookieStore = await cookies();
  const contentWidth =
    cookieStore.get("research_dojo_content_width")?.value === "wide" ? "wide" : "normal";

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Panel className="p-6 md:p-7">
        <SectionHeader eyebrow="Settings" title="アカウントとCodex接続" />
        <p className="max-w-2xl text-sm leading-6 text-slate-300">
          Research Dojoのログインと、実際に文章生成・査読を行うCodex CLI / App Serverのログイン状態は別です。
          ここでCodex側が使える状態かを確認できます。
        </p>
      </Panel>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel>
          <div className="flex items-start gap-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-indigo-300/25 bg-indigo-500/15 text-indigo-200">
              <UserRound className="size-6" />
            </span>
            <div className="min-w-0">
              <p className="text-sm text-slate-400">Research Dojo account</p>
              <h2 className="mt-1 truncate text-xl font-semibold text-white">
                {user.name || user.email.split("@")[0]}
              </h2>
              <p className="mt-2 truncate text-sm text-slate-400">{user.email}</p>
              <p className="mt-4 text-sm leading-6 text-slate-300">
                このアカウントはローカルDB内で、保存した論文・回答・レビューを分けるために使います。
              </p>
            </div>
          </div>
        </Panel>

        <Panel>
          <div className="flex items-start gap-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-violet-300/25 bg-violet-500/15 text-violet-200">
              <SlidersHorizontal className="size-6" />
            </span>
            <div className="min-w-0">
              <p className="text-sm text-slate-400">Preferences</p>
              <h2 className="mt-1 text-xl font-semibold text-white">表示と操作</h2>
              <div className="mt-4 grid gap-3">
                <PreferenceRow label="Theme" value="Dark dojo" />
                <PreferenceRow label="Sidebar" value="Resizable / collapsible" />
                <PreferenceRow label="Training mode" value="Paper first" />
              </div>
              <form action={updateDisplayPreferenceAction} className="mt-5">
                <p className="text-sm font-medium text-slate-200">中央画面の幅</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <WidthOption
                    value="normal"
                    title="通常"
                    description="今まで通りの読みやすい幅"
                    active={contentWidth === "normal"}
                  />
                  <WidthOption
                    value="wide"
                    title="ワイド"
                    description="Notionのワイド表示のように広く使う"
                    active={contentWidth === "wide"}
                  />
                </div>
              </form>
            </div>
          </div>
        </Panel>

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
                  value={codex.available ? "available" : "not found"}
                />
                <StatusRow ok={codex.loggedIn} label="Login status" value={codex.statusText} />
                {codex.codexHome ? (
                  <StatusRow ok label="CODEX_HOME" value={codex.codexHome} />
                ) : null}
              </div>
              {codex.error ? (
                <p className="mt-4 rounded-lg border border-amber-400/25 bg-amber-500/10 p-3 text-sm leading-6 text-amber-100">
                  {codex.error}
                </p>
              ) : null}
              {!codex.loggedIn ? (
                <p className="mt-4 rounded-lg border border-rose-400/25 bg-rose-500/10 p-3 text-sm leading-6 text-rose-100">
                  ターミナルで <code className="font-mono">codex login</code> を実行してから、
                  この画面を再読み込みしてください。
                </p>
              ) : null}
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}

function PreferenceRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.035] p-3 text-sm">
      <span className="text-slate-400">{label}</span>
      <span className="font-medium text-slate-100">{value}</span>
    </div>
  );
}

function WidthOption({
  value,
  title,
  description,
  active,
}: {
  value: "normal" | "wide";
  title: string;
  description: string;
  active: boolean;
}) {
  return (
    <button
      name="contentWidth"
      value={value}
      className={`rounded-lg border p-4 text-left ${
        active
          ? "border-violet-300/45 bg-violet-500/18 shadow-[0_0_24px_rgba(124,58,237,0.16)]"
          : "border-white/10 bg-white/[0.035] hover:bg-white/[0.06]"
      }`}
    >
      <span className="flex items-center justify-between gap-3">
        <span className="text-sm font-semibold text-white">{title}</span>
        {active ? <Pill tone="info">選択中</Pill> : null}
      </span>
      <span className="mt-2 block text-xs leading-5 text-slate-400">{description}</span>
    </button>
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
