import { cookies } from "next/headers";
import { SlidersHorizontal, UserRound } from "lucide-react";
import { updateDisplayPreferenceAction } from "@/app/actions";
import { requireUser } from "@/lib/auth";
import { getCodexAuthStatus } from "@/lib/codex-auth";
import { Panel, Pill, SectionHeader } from "@/components/ui";
import { CodexLoginPanel } from "./codex-login-panel";

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

        <CodexLoginPanel initialCodex={codex} />
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
