import { FlaskConical, Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import { createResearchLensAction } from "@/app/actions";
import { requireUser } from "@/lib/auth";
import { ensureDefaultProject, getResearchLenses } from "@/lib/store";
import { CodexSubmitStatus } from "@/components/codex-submit-status";
import { Panel, Pill, SectionHeader } from "@/components/ui";

export default async function ResearchLabPage() {
  const user = await requireUser();
  const project = await ensureDefaultProject(user);
  const lenses = await getResearchLenses(project.id);
  const latest = lenses[0];

  return (
    <div className="mx-auto grid max-w-6xl gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="space-y-5">
        <Panel className="p-6 md:p-7">
          <Pill tone="warn">Research Lab</Pill>
          <h1 className="mt-4 text-3xl font-semibold tracking-normal text-white">
            アイデアを変なレンズで深掘る
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
            研究アイデアを入れると、隠れた仮定、反証テスト、別分野アナロジー、
            査読者の攻撃、最小実験へ分解します。普通の壁打ちより少し意地悪です。
          </p>
        </Panel>

        <Panel>
          <SectionHeader eyebrow="Seed" title="深掘りしたいもの" />
          <form action={createResearchLensAction} className="space-y-4">
            <textarea
              name="seedText"
              required
              className="min-h-40 w-full rounded-lg border border-white/10 bg-slate-950/55 p-4 text-sm leading-6 text-slate-100 outline-none placeholder:text-slate-500 focus:border-amber-300/60"
              placeholder="例: pseudo label の信頼度を、teacher confidenceではなく検出ボックスの安定性から推定したい"
            />
            <div className="flex justify-end">
              <CodexSubmitStatus
                idleLabel="レンズを作る"
                pendingLabel="深掘り中"
                kind="generate"
              />
            </div>
          </form>
        </Panel>

        {latest ? (
          <>
            <Panel>
              <SectionHeader eyebrow="Core Claim" title="中心主張" />
              <p className="rounded-lg border border-amber-300/20 bg-amber-500/10 p-4 text-sm leading-7 text-amber-50">
                {latest.core_claim}
              </p>
            </Panel>

            <Panel>
              <SectionHeader eyebrow="Weird Angles" title="変な角度からの問い" />
              <div className="grid gap-4 lg:grid-cols-3">
                {latest.weird_angles.map((angle) => (
                  <div
                    key={`${angle.lens}-${angle.question}`}
                    className="rounded-xl border border-white/10 bg-white/[0.035] p-4"
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-300">
                      {angle.lens}
                    </p>
                    <p className="mt-3 text-sm font-semibold leading-6 text-white">
                      {angle.question}
                    </p>
                    <p className="mt-3 text-xs leading-5 text-slate-400">
                      {angle.why_it_is_useful}
                    </p>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel>
              <SectionHeader eyebrow="Notebook" title="次に試す最小実験" />
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-lg border border-emerald-300/20 bg-emerald-500/10 p-4">
                  <p className="text-sm font-semibold text-emerald-100">最小実験</p>
                  <p className="mt-2 text-sm leading-7 text-emerald-50">
                    {latest.minimal_experiment}
                  </p>
                </div>
                <div className="rounded-lg border border-cyan-300/20 bg-cyan-500/10 p-4">
                  <p className="text-sm font-semibold text-cyan-100">Notebook Prompt</p>
                  <p className="mt-2 text-sm leading-7 text-cyan-50">
                    {latest.next_notebook_prompt}
                  </p>
                </div>
              </div>
            </Panel>
          </>
        ) : null}
      </div>

      <aside className="space-y-5">
        {latest ? (
          <>
            <Panel>
              <SectionHeader eyebrow="Assumptions" title="隠れた仮定" />
              <div className="space-y-3">
                {latest.hidden_assumptions.map((item) => (
                  <LensLine key={item} icon={<Sparkles className="size-4" />} text={item} />
                ))}
              </div>
            </Panel>

            <Panel>
              <SectionHeader eyebrow="Falsify" title="反証テスト" />
              <div className="space-y-3">
                {latest.falsification_tests.map((item) => (
                  <LensLine key={item} icon={<FlaskConical className="size-4" />} text={item} />
                ))}
              </div>
            </Panel>

            <Panel>
              <SectionHeader eyebrow="Reviewer" title="一番痛い攻撃" />
              <p className="rounded-lg border border-rose-300/25 bg-rose-500/10 p-4 text-sm leading-7 text-rose-100">
                {latest.reviewer_attack}
              </p>
            </Panel>
          </>
        ) : (
          <Panel>
            <p className="text-sm leading-7 text-slate-300">
              研究の「面白いけど危ないところ」を見つける部屋です。まず左にアイデアを入れてください。
            </p>
          </Panel>
        )}
      </aside>
    </div>
  );
}

function LensLine({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div className="flex gap-3 rounded-lg border border-white/10 bg-white/[0.035] p-3 text-sm leading-6 text-slate-200">
      <span className="mt-1 shrink-0 text-amber-300">{icon}</span>
      {text}
    </div>
  );
}
