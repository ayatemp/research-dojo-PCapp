import Link from "next/link";
import {
  ArrowRight,
  BookOpenCheck,
  Brain,
  Dumbbell,
  FileText,
  Flame,
  ShieldCheck,
  Sparkles,
  Target,
} from "lucide-react";
import { requireUser } from "@/lib/auth";
import { dashboardStats, ensureDefaultProject, getDocuments } from "@/lib/store";
import { Panel, Pill, ScoreMeter, SectionHeader } from "@/components/ui";
import { cn } from "@/lib/utils";

const taskTones = {
  violet: "border-violet-400/30 bg-violet-500/12 text-violet-200",
  blue: "border-blue-400/30 bg-blue-500/12 text-blue-200",
  cyan: "border-cyan-400/30 bg-cyan-500/12 text-cyan-200",
  amber: "border-amber-400/30 bg-amber-500/12 text-amber-200",
} as const;

export default async function DashboardPage() {
  const user = await requireUser();
  const project = await ensureDefaultProject(user);
  const papers = await getDocuments(project.id);
  const stats = await dashboardStats(project.id, user.id);
  const scoredPapers = papers.filter((paper) => paper.latest_score !== null);
  const avgScore = scoredPapers.length
    ? Math.round(
        scoredPapers.reduce((sum, paper) => sum + Number(paper.latest_score), 0) /
          scoredPapers.length,
      )
    : 0;
  const generatedCount = papers.filter((paper) => Number(paper.question_count) > 0).length;
  const ungeneratedCount = papers.filter((paper) => Number(paper.question_count) === 0).length;
  const xp = papers.length * 160 + generatedCount * 260 + stats.reviews.length * 420 + avgScore * 12;
  const level = Math.max(1, Math.floor(xp / 1200) + 1);
  const nextXp = level * 1200;
  const currentLevelXp = (level - 1) * 1200;
  const progress = Math.round(((xp - currentLevelXp) / (nextXp - currentLevelXp)) * 100);
  const latestPaper = papers[0];

  const abilities = [
    ["読解力", Math.min(100, 38 + papers.length * 12 + generatedCount * 8)],
    ["批判力", Math.min(100, 32 + stats.reviews.length * 14 + Math.round(avgScore / 5))],
    ["考察力", Math.min(100, 30 + generatedCount * 10 + Math.round(avgScore / 4))],
    ["実験設計", Math.min(100, 28 + stats.reviews.length * 9 + generatedCount * 7)],
  ] as const;

  const tasks = [
    {
      label: "未回答問題",
      value: stats.pendingQuestions,
      sub: "自分で答えてから査読へ",
      href: latestPaper ? `/papers/${latestPaper.id}/train` : "/papers",
      icon: Brain,
      tone: "violet",
    },
    {
      label: "Paper Card生成待ち",
      value: ungeneratedCount,
      sub: "Codexで問題セット作成",
      href: "/papers",
      icon: FileText,
      tone: "blue",
    },
    {
      label: "レビュー済み回答",
      value: stats.reviews.length,
      sub: "弱点を見て再提出",
      href: latestPaper ? `/papers/${latestPaper.id}/train` : "/papers",
      icon: ShieldCheck,
      tone: "cyan",
    },
    {
      label: "今日の論文追加",
      value: papers.length ? 0 : 1,
      sub: papers.length ? "追加済み" : "まず1本入れる",
      href: "/papers",
      icon: Target,
      tone: "amber",
    },
  ] as const;

  return (
    <div className="mx-auto grid max-w-7xl gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="min-w-0 space-y-6">
        <section className="rounded-2xl border border-white/10 bg-[#08101f]/82 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur md:p-8">
          <Pill tone="info">Paper Room</Pill>
          <h1 className="mt-4 max-w-3xl text-3xl font-semibold tracking-normal text-white md:text-4xl">
            論文を読み、答えて、Codexに厳しく査読させる。
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
            今日やることはPaper Trainerに集約します。論文を入れる、問題を作る、自分で答える、査読で直す。
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/papers"
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-indigo-500 px-4 text-sm font-semibold text-white shadow-[0_0_28px_rgba(99,102,241,0.35)] hover:bg-indigo-400"
            >
              論文を追加する
              <ArrowRight className="size-4" />
            </Link>
            {latestPaper ? (
              <Link
                href={`/papers/${latestPaper.id}/train`}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-4 text-sm font-semibold text-slate-200 hover:bg-white/[0.08]"
              >
                最新のTrainerへ
              </Link>
            ) : null}
          </div>
        </section>

        <section>
          <SectionHeader eyebrow="Daily Training" title="今日のタスク" />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {tasks.map((task) => (
              <Link
                key={task.label}
                href={task.href}
                className={cn(
                  "rounded-xl border p-5 shadow-[0_18px_60px_rgba(0,0,0,0.18)] hover:bg-white/[0.06]",
                  taskTones[task.tone],
                )}
              >
                <span className="flex size-12 items-center justify-center rounded-xl border border-white/10 bg-white/[0.08]">
                  <task.icon className="size-6" />
                </span>
                <p className="mt-4 font-mono text-3xl font-semibold text-white">{task.value}</p>
                <p className="mt-2 text-sm font-semibold text-white">{task.label}</p>
                <p className="mt-1 text-sm text-slate-400">{task.sub}</p>
              </Link>
            ))}
          </div>
        </section>

        <Panel>
          <SectionHeader
            eyebrow="Recent Papers"
            title="最近の論文"
            action={
              <Link
                href="/papers"
                className="text-sm font-medium text-indigo-300 hover:text-indigo-200"
              >
                Paper Roomへ
              </Link>
            }
          />
          {papers.length ? (
            <div className="divide-y divide-white/10">
              {papers.slice(0, 5).map((paper) => (
                <Link
                  key={paper.id}
                  href={`/papers/${paper.id}/train`}
                  className="grid gap-3 py-4 text-sm hover:bg-white/[0.025] sm:grid-cols-[minmax(0,1fr)_120px_120px]"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-white">{paper.title}</p>
                    <p className="mt-1 line-clamp-1 text-slate-400">
                      {paper.extracted_text.slice(0, 140)}
                    </p>
                  </div>
                  <Pill tone={Number(paper.question_count) > 0 ? "good" : "warn"}>
                    {Number(paper.question_count) > 0 ? "問題あり" : "未生成"}
                  </Pill>
                  <div className="text-slate-400">
                    {paper.latest_score !== null ? (
                      <ScoreMeter
                        label="score"
                        value={Number(paper.latest_score)}
                        tone={Number(paper.latest_score) >= 60 ? "emerald" : "rose"}
                      />
                    ) : (
                      <span className="text-sm">未レビュー</span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.03] p-8 text-center">
              <p className="text-base font-medium text-white">まだ論文がありません。</p>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Paper RoomでURLを貼ると、タイトルとabstractを可能な範囲で自動取得します。
              </p>
            </div>
          )}
        </Panel>
      </div>

      <aside className="space-y-5">
        <Panel>
          <div className="flex items-center gap-3">
            <span className="flex size-12 items-center justify-center rounded-xl border border-amber-300/25 bg-amber-500/15 text-amber-200">
              <Flame className="size-6" />
            </span>
            <div>
              <p className="text-sm text-slate-400">Research Level</p>
              <p className="font-mono text-3xl font-semibold text-white">Lv. {level}</p>
            </div>
          </div>
          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="text-slate-400">XP</span>
              <span className="font-mono text-slate-200">
                {xp} / {nextXp}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-cyan-400"
                style={{ width: `${Math.min(100, progress)}%` }}
              />
            </div>
          </div>
        </Panel>

        <Panel>
          <SectionHeader eyebrow="Ability" title="能力値" />
          <div className="space-y-4">
            {abilities.map(([label, value]) => (
              <ScoreMeter key={label} label={label} value={value} tone="cyan" />
            ))}
          </div>
        </Panel>

        <Panel>
          <SectionHeader eyebrow="Stats" title="研究ログ" />
          <div className="grid gap-3">
            <MiniStat icon={FileText} label="保存済み論文" value={papers.length} />
            <MiniStat icon={BookOpenCheck} label="問題生成済み" value={generatedCount} />
            <MiniStat icon={Sparkles} label="平均レビュー点" value={avgScore || "-"} />
            <MiniStat icon={Dumbbell} label="レビュー回数" value={stats.reviews.length} />
          </div>
        </Panel>
      </aside>
    </div>
  );
}

function MiniStat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof FileText;
  label: string;
  value: number | string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.035] p-3">
      <Icon className="size-4 shrink-0 text-indigo-300" />
      <span className="min-w-0 flex-1 truncate text-sm text-slate-300">{label}</span>
      <span className="font-mono text-sm font-semibold text-white">{value}</span>
    </div>
  );
}
