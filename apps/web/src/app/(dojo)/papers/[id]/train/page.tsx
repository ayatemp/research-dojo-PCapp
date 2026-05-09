import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ClipboardPenLine } from "lucide-react";
import {
  generateAdaptiveQuestionsAction,
  generatePaperTrainingAction,
  submitAnswerAction,
} from "@/app/actions";
import { requireUser } from "@/lib/auth";
import { decodeJson } from "@/lib/db";
import { getTrainingDocument, latestAnswerReviews } from "@/lib/store";
import { CodexSubmitStatus } from "@/components/codex-submit-status";
import { Panel, Pill, ScoreMeter, SectionHeader } from "@/components/ui";

export default async function TrainPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const data = await getTrainingDocument(id);
  if (!data) notFound();

  const answerMap = await latestAnswerReviews(
    user.id,
    data.questions.map((question) => question.id),
  );
  const questionItems = data.questions.map((question, index) => ({
    question,
    index,
    latest: answerMap.get(question.id),
  }));
  const unansweredQuestions = questionItems.filter((item) => !item.latest);
  const focusQuestions = unansweredQuestions.slice(0, 4);
  const waitingQuestions = unansweredQuestions.slice(4);
  const answeredQuestions = questionItems.filter((item) => item.latest).reverse();
  const latestReviewed = answeredQuestions[0];
  const canGenerateAdaptiveQuestions = answeredQuestions.length > 0;

  return (
    <div className="mx-auto max-w-5xl space-y-5">
        <Link
          href="/papers"
          className="inline-flex h-9 items-center gap-2 rounded-md border border-white/10 bg-white/[0.04] px-3 text-sm font-medium text-slate-300 hover:bg-white/[0.08] hover:text-white"
        >
          <ArrowLeft className="size-4" />
          Paper Roomへ戻る
        </Link>

        <Panel>
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <Pill tone="good">Paper Trainer</Pill>
              <h2 className="mt-3 text-2xl font-semibold leading-9 text-white">
                {data.document.title}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                {data.card?.research_connection ||
                  "Paper Card未生成です。Codexで生成してください。"}
              </p>
            </div>
            <form action={generatePaperTrainingAction}>
              <input type="hidden" name="documentId" value={data.document.id} />
              <CodexSubmitStatus
                idleLabel="Codexで生成"
                pendingLabel="生成中"
                kind="generate"
              />
            </form>
          </div>
        </Panel>

        {data.card ? (
          <Panel>
            <SectionHeader eyebrow="Paper Card" title="研究者向けカード" />
            <div className="grid gap-4 lg:grid-cols-2">
              {[
                ["一言要約", data.card.one_line_summary],
                ["解いている問題", data.card.problem],
                ["既存手法の弱点", data.card.prior_weakness],
                ["提案手法の核", data.card.core_method],
                ["なぜ効くか", data.card.mechanism],
                ["失敗条件", data.card.limitations],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    {label}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-200">{value}</p>
                </div>
              ))}
            </div>
          </Panel>
        ) : null}

        <Panel>
          <SectionHeader
            eyebrow="Questions"
            title="次に解く問題"
            action={
              canGenerateAdaptiveQuestions ? (
                <form action={generateAdaptiveQuestionsAction}>
                  <input type="hidden" name="documentId" value={data.document.id} />
                  <CodexSubmitStatus
                    idleLabel="苦手から次の問題を作る"
                    pendingLabel="弱点を分析中"
                    kind="generate"
                  />
                </form>
              ) : null
            }
          />
          {latestReviewed?.latest ? (
            <div className="mb-5 rounded-lg border border-cyan-300/25 bg-cyan-500/10 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Pill tone="info">直近レビュー</Pill>
                <span className="text-sm font-semibold text-cyan-50">
                  Q{latestReviewed.index + 1}
                </span>
                {latestReviewed.latest.total_score !== null &&
                latestReviewed.latest.total_score !== undefined ? (
                  <span className="text-sm font-semibold text-cyan-50">
                    {latestReviewed.latest.total_score}/100
                  </span>
                ) : null}
              </div>
              <p className="mt-3 text-sm font-semibold text-cyan-100">
                次に直す一点: {latestReviewed.latest.next_fix}
              </p>
              {decodeJson<
                Array<{
                  gap: string;
                  paper_section: string;
                  why_it_matters: string;
                  reread_prompt: string;
                }>
              >(latestReviewed.latest.reading_gaps, []).length ? (
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  {decodeJson<
                    Array<{
                      gap: string;
                      paper_section: string;
                      why_it_matters: string;
                      reread_prompt: string;
                    }>
                  >(latestReviewed.latest.reading_gaps, []).map((gap) => (
                    <div
                      key={`${gap.paper_section}-${gap.gap}`}
                      className="rounded-lg border border-white/10 bg-slate-950/35 p-3"
                    >
                      <p className="text-xs font-semibold text-cyan-200">
                        {gap.paper_section}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-slate-100">{gap.gap}</p>
                      <p className="mt-2 text-xs leading-5 text-slate-400">
                        {gap.why_it_matters}
                      </p>
                      <p className="mt-2 rounded-md bg-cyan-950/45 px-2 py-1 text-xs leading-5 text-cyan-100">
                        読み直し問い: {gap.reread_prompt}
                      </p>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
          {data.questions.length ? (
            <div className="space-y-5">
              {focusQuestions.length ? (
                focusQuestions.map(({ question, index, latest }) => {
                const fatalIssues = decodeJson<string[]>(latest?.fatal_issues, []);
                const readingGaps = decodeJson<
                  Array<{
                    gap: string;
                    paper_section: string;
                    why_it_matters: string;
                    reread_prompt: string;
                  }>
                >(latest?.reading_gaps, []);
                return (
                  <div
                    key={question.id}
                    className="rounded-lg border border-white/10 bg-white/[0.035] p-4"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Pill tone="info">Q{index + 1}</Pill>
                      <Pill>{question.type}</Pill>
                      {question.source === "adaptive" ? (
                        <Pill tone="warn">弱点ベース</Pill>
                      ) : null}
                      <span className="text-xs font-medium text-slate-500">
                        difficulty {question.difficulty}/5
                      </span>
                      {latest?.decision ? <Pill tone="bad">{latest.decision}</Pill> : null}
                    </div>
                    <p className="mt-3 text-base font-medium leading-7 text-white">
                      {question.question}
                    </p>
                    {question.focus_reason ? (
                      <p className="mt-2 rounded-lg border border-amber-300/20 bg-amber-500/10 px-3 py-2 text-sm leading-6 text-amber-100">
                        この問題を出す理由: {question.focus_reason}
                      </p>
                    ) : null}
                    <div className="mt-3 flex flex-wrap gap-2">
                      {question.expected.map((point) => (
                        <span
                          key={point}
                          className="rounded-md border border-white/10 bg-slate-950/55 px-2 py-1 text-xs text-slate-300"
                        >
                          {point}
                        </span>
                      ))}
                    </div>
                    <form action={submitAnswerAction} className="mt-4 space-y-3">
                      <input type="hidden" name="documentId" value={data.document.id} />
                      <input type="hidden" name="questionId" value={question.id} />
                      <textarea
                        name="answerText"
                        required
                        className="min-h-32 w-full rounded-lg border border-white/10 bg-slate-950/55 p-4 text-sm leading-6 text-slate-100 outline-none placeholder:text-slate-500 focus:border-indigo-300/60"
                        placeholder="AIの答えを見る前に、自分の仮説・メカニズム・失敗条件を書いてください。"
                        defaultValue={latest?.answer_text ?? ""}
                      />
                      <div className="flex justify-end">
                        <CodexSubmitStatus
                          idleLabel="Codex査読へ提出"
                          pendingLabel="Codex考え中"
                        />
                      </div>
                    </form>
                    {latest?.total_score !== null && latest?.total_score !== undefined ? (
                      <div className="mt-4 rounded-lg border border-rose-400/25 bg-rose-500/10 p-4">
                        <ScoreMeter
                          label="総合点"
                          value={Number(latest.total_score)}
                          tone={Number(latest.total_score) >= 60 ? "emerald" : "rose"}
                        />
                        <p className="mt-3 text-sm font-semibold text-rose-100">
                          次に直す一点: {latest.next_fix}
                        </p>
                        <div className="mt-3 space-y-2">
                          {fatalIssues.map((issue) => (
                            <p key={issue} className="text-sm leading-6 text-rose-200">
                              {issue}
                            </p>
                          ))}
                        </div>
                      </div>
                    ) : null}
                    {readingGaps.length ? (
                      <div className="mt-4 rounded-lg border border-cyan-300/25 bg-cyan-500/10 p-4">
                        <p className="text-sm font-semibold text-cyan-100">
                          読み込みが足りなさそうな部分
                        </p>
                        <div className="mt-3 grid gap-3 md:grid-cols-2">
                          {readingGaps.map((gap) => (
                            <div
                              key={`${gap.paper_section}-${gap.gap}`}
                              className="rounded-lg border border-white/10 bg-slate-950/35 p-3"
                            >
                              <p className="text-xs font-semibold text-cyan-200">
                                {gap.paper_section}
                              </p>
                              <p className="mt-2 text-sm leading-6 text-slate-100">
                                {gap.gap}
                              </p>
                              <p className="mt-2 text-xs leading-5 text-slate-400">
                                {gap.why_it_matters}
                              </p>
                              <p className="mt-2 rounded-md bg-cyan-950/45 px-2 py-1 text-xs leading-5 text-cyan-100">
                                読み直し問い: {gap.reread_prompt}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })
              ) : (
                <div className="rounded-lg border border-emerald-400/25 bg-emerald-500/10 p-4">
                  <p className="text-sm leading-6 text-emerald-100">
                    表に出している未回答問題はありません。回答履歴から新しい弱点ベース問題を作るか、下のアーカイブを見直してください。
                  </p>
                </div>
              )}

              {waitingQuestions.length ? (
                <details className="rounded-lg border border-white/10 bg-white/[0.025] p-4">
                  <summary className="cursor-pointer text-sm font-semibold text-slate-200">
                    待機中の未回答問題 {waitingQuestions.length}件
                  </summary>
                  <div className="mt-4 space-y-3">
                    {waitingQuestions.map(({ question, index }) => (
                      <div
                        key={question.id}
                        className="rounded-lg border border-white/10 bg-slate-950/35 p-3"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <Pill tone="info">Q{index + 1}</Pill>
                          <Pill>{question.type}</Pill>
                          {question.source === "adaptive" ? (
                            <Pill tone="warn">弱点ベース</Pill>
                          ) : null}
                        </div>
                        <p className="mt-2 text-sm leading-6 text-slate-200">
                          {question.question}
                        </p>
                      </div>
                    ))}
                  </div>
                </details>
              ) : null}

              {answeredQuestions.length ? (
                <details className="rounded-lg border border-white/10 bg-white/[0.025] p-4">
                  <summary className="cursor-pointer text-sm font-semibold text-slate-200">
                    回答済みアーカイブ {answeredQuestions.length}件
                  </summary>
                  <div className="mt-4 space-y-4">
                    {answeredQuestions.map(({ question, index, latest }) => {
                      const readingGaps = decodeJson<
                        Array<{
                          gap: string;
                          paper_section: string;
                          why_it_matters: string;
                          reread_prompt: string;
                        }>
                      >(latest?.reading_gaps, []);
                      return (
                        <div
                          key={question.id}
                          className="rounded-lg border border-white/10 bg-slate-950/35 p-4"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <Pill tone="info">Q{index + 1}</Pill>
                            <Pill>{question.type}</Pill>
                            {latest?.decision ? <Pill tone="bad">{latest.decision}</Pill> : null}
                            {latest?.total_score !== null &&
                            latest?.total_score !== undefined ? (
                              <span className="text-xs font-semibold text-slate-300">
                                {latest.total_score}/100
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-3 text-sm leading-6 text-white">
                            {question.question}
                          </p>
                          {readingGaps.length ? (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {readingGaps.slice(0, 3).map((gap) => (
                                <span
                                  key={`${question.id}-${gap.paper_section}-${gap.gap}`}
                                  className="rounded-md border border-cyan-300/20 bg-cyan-500/10 px-2 py-1 text-xs text-cyan-100"
                                >
                                  {gap.paper_section}: {gap.gap}
                                </span>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </details>
              ) : null}
            </div>
          ) : (
            <div className="rounded-lg border border-amber-400/25 bg-amber-500/10 p-4">
              <div className="flex items-start gap-3">
                <ClipboardPenLine className="mt-1 size-4 shrink-0 text-amber-300" />
                <p className="text-sm leading-6 text-amber-100">
                  まだ問題がありません。上の「Codexで生成」を押すと、Codex App ServerがPaper Cardと問題を生成してDBへ保存します。
                </p>
              </div>
            </div>
          )}
        </Panel>
    </div>
  );
}
