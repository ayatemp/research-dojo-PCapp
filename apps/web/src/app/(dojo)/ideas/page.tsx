import { AlertTriangle, GitBranch, Lightbulb, Plus } from "lucide-react";
import { createCodexTaskAction, refineIdeaAction } from "@/app/actions";
import { requireUser } from "@/lib/auth";
import { ensureDefaultProject, getIdeas, getRepos } from "@/lib/store";
import { Panel, Pill, SectionHeader } from "@/components/ui";

export default async function IdeasPage() {
  const user = await requireUser();
  const project = await ensureDefaultProject(user);
  const ideas = await getIdeas(project.id);
  const repos = await getRepos(project.id);
  const latest = ideas[0];

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
      <div className="space-y-5">
        <Panel>
          <SectionHeader eyebrow="Idea to Experiment" title="雑な研究アイデアをCodexで仮説化" />
          <form action={refineIdeaAction}>
            <textarea
              name="rawIdea"
              required
              className="min-h-40 w-full rounded-md border border-zinc-200 bg-zinc-50 p-4 text-sm leading-6 outline-none focus:border-emerald-400 focus:bg-white"
              placeholder="例: Large YOLOでpseudo GTを作るだけだとつまらない。error_probaやIoU予測を使ってpseudo GTを選べないか？"
            />
            <div className="mt-3 flex justify-end">
              <button className="inline-flex h-9 items-center gap-2 rounded-md bg-zinc-950 px-3 text-sm font-semibold text-white hover:bg-zinc-800">
                <Plus className="size-4" />
                Codexで仮説化
              </button>
            </div>
          </form>
        </Panel>

        {latest ? (
          <>
            <Panel>
              <SectionHeader eyebrow="Hypothesis" title="研究仮説" />
              <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-sm leading-7 text-emerald-950">
                  {latest.research_hypothesis}
                </p>
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-3">
                {latest.novelty_candidates.map((item) => (
                  <div key={item} className="rounded-md border border-zinc-200 p-4">
                    <Lightbulb className="size-5 text-amber-600" />
                    <p className="mt-3 text-sm font-medium leading-6 text-zinc-800">
                      {item}
                    </p>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel>
              <SectionHeader eyebrow="Experiment Plan" title="実験計画" />
              <div className="grid gap-3 md:grid-cols-2">
                {latest.experiment_plan.map((item) => (
                  <div
                    key={item}
                    className="rounded-md border border-zinc-200 bg-zinc-50 p-4 text-sm font-medium text-zinc-800"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </Panel>
          </>
        ) : (
          <Panel>
            <p className="text-sm leading-6 text-zinc-600">
              まだ研究アイデアがありません。上のフォームに荒いアイデアを書いて、Codexに仮説・新規性・実験・失敗条件へ分解させてください。
            </p>
          </Panel>
        )}
      </div>

      <div className="space-y-5">
        {latest ? (
          <>
            <Panel>
              <SectionHeader eyebrow="Reviewer Risks" title="査読者に刺される点" />
              <div className="space-y-3">
                {latest.reviewer_risks.map((risk) => (
                  <div
                    key={risk}
                    className="flex gap-3 rounded-md border border-rose-100 bg-rose-50 p-3 text-sm leading-6 text-rose-950"
                  >
                    <AlertTriangle className="mt-1 size-4 shrink-0" />
                    {risk}
                  </div>
                ))}
              </div>
            </Panel>

            <Panel>
              <SectionHeader eyebrow="Codex Task Prompt" title="実装タスク化" />
              <pre className="whitespace-pre-wrap rounded-md bg-zinc-950 p-4 font-mono text-xs leading-6 text-zinc-100">
                {latest.codex_task_prompt}
              </pre>
              <form action={createCodexTaskAction} className="mt-4 space-y-3">
                <select
                  name="repoPath"
                  required
                  className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm"
                >
                  <option value="">実装対象repoを選択</option>
                  {repos.map((repo) => (
                    <option key={repo.id} value={repo.path}>
                      {repo.label || repo.path}
                    </option>
                  ))}
                </select>
                <textarea
                  name="prompt"
                  required
                  defaultValue={latest.codex_task_prompt}
                  className="min-h-32 w-full rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm leading-6"
                />
                <button className="inline-flex h-9 items-center gap-2 rounded-md bg-zinc-950 px-3 text-sm font-semibold text-white hover:bg-zinc-800">
                  <GitBranch className="size-4" />
                  Codex Taskに保存
                </button>
              </form>
            </Panel>
          </>
        ) : null}

        <Panel>
          <SectionHeader eyebrow="Rule" title="この画面の制約" />
          <p className="text-sm leading-7 text-zinc-600">
            OpenAI APIキーは使いません。Research Dojo backendがCodex App Serverを起動し、Codexログイン済みアカウントで生成します。
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Pill tone="warn">Weak noveltyを許さない</Pill>
            <Pill tone="info">ablation必須</Pill>
            <Pill tone="bad">失敗条件を書く</Pill>
          </div>
        </Panel>
      </div>
    </div>
  );
}
