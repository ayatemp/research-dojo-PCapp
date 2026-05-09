import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ClipboardPenLine,
  Orbit,
  ShieldAlert,
  Target,
  TriangleAlert,
} from "lucide-react";
import {
  generatePaperIdeaSeedsAction,
  submitPaperIdeaAnswerAction,
} from "@/app/actions";
import { requireUser } from "@/lib/auth";
import {
  getPaperIdeaSeeds,
  getTrainingDocument,
  latestPaperIdeaAnswerReviews,
} from "@/lib/store";
import { CodexSubmitStatus } from "@/components/codex-submit-status";
import { Panel, Pill, ScoreMeter, SectionHeader } from "@/components/ui";

export default async function PaperIdeasPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const data = await getTrainingDocument(id);
  if (!data) notFound();

  const generations = await getPaperIdeaSeeds(id);
  const latest = generations[0];
  const answerMap = latest
    ? await latestPaperIdeaAnswerReviews(user.id, latest.id)
    : new Map();

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <Link
        href="/papers"
        className="inline-flex h-9 items-center gap-2 rounded-md border border-white/10 bg-white/[0.04] px-3 text-sm font-medium text-slate-300 hover:bg-white/[0.08] hover:text-white"
      >
        <ArrowLeft className="size-4" />
        Paper Roomへ戻る
      </Link>

      <Panel>
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Pill tone="info">Idea Grow Room</Pill>
              <Pill tone="warn">厳しめの問いで考える</Pill>
            </div>
            <h1 className="mt-3 text-2xl font-semibold leading-9 text-white">
              {data.document.title}
            </h1>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              この部屋ではCodexが研究アイデアを代わりに出すのではなく、あなた自身が考えるための
              厳しめの問いを作ります。曖昧な「面白そう」を、仮説・差分・検証可能性まで詰めます。
            </p>
            {data.card?.research_connection ? (
              <p className="mt-3 rounded-lg border border-violet-300/20 bg-violet-500/10 p-3 text-sm leading-6 text-violet-100">
                {data.card.research_connection}
              </p>
            ) : null}
          </div>

          <form action={generatePaperIdeaSeedsAction} className="rounded-lg border border-white/10 bg-slate-950/40 p-4">
            <input type="hidden" name="documentId" value={data.document.id} />
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-slate-100">
                今考えたい方向
              </span>
              <textarea
                name="sourceQuestion"
                className="min-h-32 rounded-md border border-white/10 bg-slate-950/65 p-3 text-sm leading-6 text-slate-100 outline-none placeholder:text-slate-500 focus:border-violet-300/60"
                placeholder="例: この論文の失敗条件を、自分の半教師あり学習テーマに接続したい。まだ案は曖昧でよいです。"
                defaultValue={latest?.source_question ?? ""}
              />
            </label>
            <div className="mt-4 flex justify-end">
              <CodexSubmitStatus
                idleLabel="厳しめの問いを作る"
                pendingLabel="問いを研いでいます"
                kind="generate"
              />
            </div>
          </form>
        </div>
      </Panel>

      {latest ? (
        <>
          <Panel>
            <SectionHeader eyebrow="Seed Map" title="この論文から拾うべき核" />
            <div className="rounded-lg border border-cyan-300/20 bg-cyan-500/10 p-4">
              <div className="flex items-start gap-3">
                <Orbit className="mt-1 size-5 shrink-0 text-cyan-200" />
                <p className="text-sm leading-7 text-cyan-50">{latest.paper_takeaway}</p>
              </div>
            </div>
          </Panel>

          <Panel>
            <SectionHeader eyebrow="Pressure Questions" title="まず答えるべき厳しめの問い" />
            <div className="grid gap-3">
              {latest.pressure_questions.map((item, index) => {
                const review = answerMap.get(index);
                return (
                  <div
                    key={`${item.angle}-${item.question}`}
                    className="rounded-lg border border-white/10 bg-white/[0.035] p-4"
                  >
                  <div className="flex flex-wrap items-center gap-2">
                    <Pill tone="bad">Q{index + 1}</Pill>
                    <Pill tone="info">{item.angle}</Pill>
                  </div>
                  <div className="mt-3 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
                    <div>
                      <p className="text-base font-semibold leading-7 text-white">
                        {item.question}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-slate-400">
                        {item.why_it_matters}
                      </p>
                    </div>
                    <div className="rounded-md border border-rose-300/20 bg-rose-500/10 p-3">
                      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-rose-200">
                        <ShieldAlert className="size-3.5" />
                        逃げずに答えること
                      </div>
                      <p className="mt-2 text-sm leading-6 text-rose-50">
                        {item.what_you_must_answer}
                      </p>
                    </div>
                  </div>
                  <form action={submitPaperIdeaAnswerAction} className="mt-4 space-y-3">
                    <input type="hidden" name="documentId" value={data.document.id} />
                    <input type="hidden" name="seedId" value={latest.id} />
                    <input type="hidden" name="questionIndex" value={index} />
                    <textarea
                      name="answerText"
                      required
                      className="min-h-32 w-full rounded-lg border border-white/10 bg-slate-950/55 p-4 text-sm leading-6 text-slate-100 outline-none placeholder:text-slate-500 focus:border-amber-300/60"
                      placeholder="この問いに対する自分の研究アイデアを書いてください。仮説、論文からの根拠、検証方法、弱点まで書くと採点しやすいです。"
                      defaultValue={review?.answer_text ?? ""}
                    />
                    <div className="flex justify-end">
                      <CodexSubmitStatus
                        idleLabel="Codexに採点してもらう"
                        pendingLabel="厳しめに査読中"
                      />
                    </div>
                  </form>
                  {review ? (
                    <div className="mt-4 rounded-lg border border-rose-400/25 bg-rose-500/10 p-4">
                      <ScoreMeter
                        label="アイデア発想スコア"
                        value={Number(review.total_score)}
                        tone={Number(review.total_score) >= 60 ? "emerald" : "rose"}
                      />
                      <div className="mt-4 grid gap-2 md:grid-cols-3">
                        {[
                          ["問題の具体性", review.rubric.problem_specificity, 20],
                          ["新規性", review.rubric.novelty, 20],
                          ["論文への根ざし", review.rubric.paper_grounding, 20],
                          ["実現可能性", review.rubric.feasibility, 15],
                          ["評価設計", review.rubric.evaluation_design, 15],
                          ["リスク認識", review.rubric.risk_awareness, 10],
                        ].map(([label, value, max]) => (
                          <div
                            key={label}
                            className="rounded-md border border-white/10 bg-slate-950/35 p-3"
                          >
                            <p className="text-xs text-slate-500">{label}</p>
                            <p className="mt-1 font-mono text-sm text-white">
                              {value}/{max}
                            </p>
                          </div>
                        ))}
                      </div>
                      <p className="mt-4 text-sm font-semibold text-rose-100">
                        次に直す一点: {review.next_fix}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-slate-200">
                        {review.reviewer_comment}
                      </p>
                      <div className="mt-4 grid gap-3 md:grid-cols-2">
                        <ReviewList
                          title="致命的に弱い点"
                          items={review.fatal_issue_list}
                          tone="bad"
                        />
                        <ReviewList
                          title="足りない観点"
                          items={review.missing_perspective_list}
                          tone="warn"
                        />
                      </div>
                      <div className="mt-3 rounded-md border border-cyan-300/20 bg-cyan-500/10 p-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-200">
                          Revision Challenge
                        </p>
                        <p className="mt-2 text-sm leading-6 text-cyan-50">
                          {review.revision_challenge}
                        </p>
                      </div>
                    </div>
                  ) : null}
                  </div>
                );
              })}
            </div>
          </Panel>

          <Panel>
            <SectionHeader eyebrow="Thinking Drills" title="自分で書くためのワーク" />
            <div className="grid gap-4 xl:grid-cols-2">
              {latest.thinking_drills.map((drill) => (
                <article
                  key={`${drill.title}-${drill.paper_anchor}`}
                  className="rounded-lg border border-white/10 bg-[linear-gradient(180deg,rgba(124,58,237,0.12),rgba(15,23,42,0.42))] p-4"
                >
                  <div className="flex items-start gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-amber-300/25 bg-amber-500/15 text-amber-200">
                      <ClipboardPenLine className="size-5" />
                    </span>
                    <div>
                      <h2 className="text-base font-semibold leading-7 text-white">
                        {drill.title}
                      </h2>
                      <p className="mt-2 text-sm leading-6 text-slate-300">
                        {drill.prompt}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-3">
                    <SeedField label="論文内の根" value={drill.paper_anchor} />
                    <SeedField label="合格ライン" value={drill.strict_standard} icon="risk" />
                    <SeedField label="書く形式" value={drill.output_format} icon="target" />
                  </div>
                </article>
              ))}
            </div>
          </Panel>

          <Panel>
            <SectionHeader eyebrow="Next Moves" title="次にやると発想が進むこと" />
            <div className="grid gap-3 md:grid-cols-3">
              {latest.next_actions.map((action, index) => (
                <div
                  key={action}
                  className="rounded-lg border border-emerald-300/20 bg-emerald-500/10 p-4"
                >
                  <div className="flex items-center gap-2 text-sm font-semibold text-emerald-100">
                    <Target className="size-4" />
                    Step {index + 1}
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-200">{action}</p>
                </div>
              ))}
            </div>
          </Panel>

          {generations.length > 1 ? (
            <Panel>
              <SectionHeader eyebrow="History" title="過去の発想ログ" />
              <div className="space-y-3">
                {generations.slice(1, 5).map((item) => (
                  <div
                    key={item.id}
                    className="rounded-lg border border-white/10 bg-white/[0.03] p-3"
                  >
                    <p className="text-xs text-slate-500">
                      {new Date(item.created_at).toLocaleString("ja-JP")}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-300">
                      {item.paper_takeaway}
                    </p>
                  </div>
                ))}
              </div>
            </Panel>
          ) : null}
        </>
      ) : (
        <Panel>
          <div className="rounded-lg border border-dashed border-white/15 bg-white/[0.03] p-8 text-center">
            <ClipboardPenLine className="mx-auto size-8 text-amber-200" />
            <p className="mt-4 text-base font-semibold text-white">
              まだ思考用の問いはありません。
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              右上のフォームから、論文のどの部分を自分の研究に接続したいかを少しだけ書いてください。
              Codexは答えではなく、考えるための厳しい問いを返します。
            </p>
          </div>
        </Panel>
      )}
    </div>
  );
}

function ReviewList({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: "bad" | "warn";
}) {
  return (
    <div
      className={
        tone === "bad"
          ? "rounded-md border border-rose-300/20 bg-rose-950/25 p-3"
          : "rounded-md border border-amber-300/20 bg-amber-950/25 p-3"
      }
    >
      <p
        className={
          tone === "bad"
            ? "text-sm font-semibold text-rose-100"
            : "text-sm font-semibold text-amber-100"
        }
      >
        {title}
      </p>
      <div className="mt-2 space-y-2">
        {items.map((item) => (
          <p key={item} className="text-sm leading-6 text-slate-200">
            {item}
          </p>
        ))}
      </div>
    </div>
  );
}

function SeedField({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: "risk" | "target";
}) {
  const Icon = icon === "risk" ? TriangleAlert : icon === "target" ? Target : Orbit;

  return (
    <div className="rounded-md border border-white/10 bg-slate-950/35 p-3">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
        <Icon className="size-3.5" />
        {label}
      </div>
      <p className="mt-2 text-sm leading-6 text-slate-200">{value}</p>
    </div>
  );
}
