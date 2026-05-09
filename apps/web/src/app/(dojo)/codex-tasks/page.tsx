import { Check, FolderPlus, Play, X } from "lucide-react";
import {
  createCodexTaskAction,
  registerRepoAction,
  startCodexTaskAction,
} from "@/app/actions";
import { requireUser } from "@/lib/auth";
import { ensureDefaultProject, getCodexTasks, getRepos } from "@/lib/store";
import { Panel, Pill, SectionHeader } from "@/components/ui";

export default async function CodexTasksPage() {
  const user = await requireUser();
  const project = await ensureDefaultProject(user);
  const repos = await getRepos(project.id);
  const tasks = await getCodexTasks(project.id);
  const counts = {
    queued: tasks.filter((task) => task.status === "queued").length,
    running: tasks.filter((task) => task.status === "running").length,
    completed: tasks.filter((task) => task.status === "completed").length,
    failed: tasks.filter((task) => task.status === "failed").length,
  };

  return (
    <div className="space-y-5">
      <Panel>
        <SectionHeader
          eyebrow="Codex Bridge"
          title="登録repoに対してCodex App Serverで実装する"
        />
        <div className="grid gap-3 md:grid-cols-4">
          {Object.entries(counts).map(([status, count]) => (
            <div key={status} className="rounded-md border border-zinc-200 bg-zinc-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
                {status}
              </p>
              <p className="mt-2 font-mono text-2xl font-semibold text-zinc-950">
                {count}
              </p>
            </div>
          ))}
        </div>
      </Panel>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-5">
          {tasks.map((task) => (
            <Panel key={task.id}>
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Pill
                      tone={
                        task.status === "completed"
                          ? "good"
                          : task.status === "failed"
                            ? "bad"
                            : task.status === "running"
                              ? "info"
                              : "neutral"
                      }
                    >
                      {task.status}
                    </Pill>
                    <span className="font-mono text-xs text-zinc-500">
                      {task.repo_path}
                    </span>
                  </div>
                  <h2 className="mt-3 text-lg font-semibold text-zinc-950">
                    {task.prompt.slice(0, 90)}
                  </h2>
                </div>
                <form action={startCodexTaskAction}>
                  <input type="hidden" name="taskId" value={task.id} />
                  <button className="inline-flex h-9 items-center gap-2 rounded-md bg-zinc-950 px-3 text-sm font-semibold text-white hover:bg-zinc-800">
                    <Play className="size-4" />
                    Start
                  </button>
                </form>
              </div>
              <pre className="mt-5 max-h-80 overflow-auto whitespace-pre-wrap rounded-md bg-zinc-950 p-4 text-xs leading-6 text-zinc-100">
                {task.result_summary || task.prompt}
              </pre>
            </Panel>
          ))}
          {!tasks.length ? (
            <Panel>
              <p className="text-sm leading-6 text-zinc-600">
                まだ実装タスクはありません。Ideas画面から作るか、右側のフォームで直接作成できます。
              </p>
            </Panel>
          ) : null}
        </div>

        <div className="space-y-5">
          <Panel>
            <SectionHeader eyebrow="Repo Register" title="ローカルrepo登録" />
            <form action={registerRepoAction} className="space-y-3">
              <input
                name="repoPath"
                required
                placeholder="/Users/.../your-repo"
                className="h-10 w-full rounded-md border border-zinc-200 px-3 text-sm outline-none focus:border-emerald-500"
              />
              <button className="inline-flex h-9 items-center gap-2 rounded-md bg-zinc-950 px-3 text-sm font-semibold text-white hover:bg-zinc-800">
                <FolderPlus className="size-4" />
                登録
              </button>
            </form>
            <div className="mt-4 space-y-2">
              {repos.map((repo) => (
                <p key={repo.id} className="rounded-md bg-zinc-50 p-2 font-mono text-xs text-zinc-700">
                  {repo.path}
                </p>
              ))}
            </div>
          </Panel>

          <Panel>
            <SectionHeader eyebrow="Manual Task" title="実装タスク作成" />
            <form action={createCodexTaskAction} className="space-y-3">
              <select
                name="repoPath"
                required
                className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm"
              >
                <option value="">repoを選択</option>
                {repos.map((repo) => (
                  <option key={repo.id} value={repo.path}>
                    {repo.label || repo.path}
                  </option>
                ))}
              </select>
              <textarea
                name="prompt"
                required
                placeholder="対象ファイル、追加機能、baseline、出力形式、README更新内容まで書く"
                className="min-h-40 w-full rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm leading-6"
              />
              <button className="h-9 rounded-md bg-zinc-950 px-3 text-sm font-semibold text-white hover:bg-zinc-800">
                保存
              </button>
            </form>
          </Panel>

          <Panel>
            <SectionHeader eyebrow="Safety" title="危険操作は抑制" />
            <div className="space-y-3">
              {["git commit / pushは禁止", "networkAccess=false", "登録repoのみ", "destructive操作はタスクで明示しない"].map((item) => (
                <div
                  key={item}
                  className="flex items-center justify-between rounded-md border border-zinc-200 p-3"
                >
                  <span className="text-sm font-medium text-zinc-800">{item}</span>
                  {item.includes("禁止") ? (
                    <X className="size-4 text-rose-700" />
                  ) : (
                    <Check className="size-4 text-emerald-700" />
                  )}
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
