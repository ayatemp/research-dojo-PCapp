import { notFound } from "next/navigation";
import { BrainCircuit } from "lucide-react";
import { submitTopicAnswerAction } from "@/app/actions";
import { requireUser } from "@/lib/auth";
import { decodeJson } from "@/lib/db";
import { getTopicRoom } from "@/lib/store";
import { CodexSubmitStatus } from "@/components/codex-submit-status";
import { Panel, Pill, ScoreMeter, SectionHeader } from "@/components/ui";

export default async function TopicRoomDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const data = await getTopicRoom(id, user.id);
  if (!data) notFound();

  const unanswered = data.questions.filter((question) => !question.latest);
  const answered = data.questions.filter((question) => question.latest).reverse();
  const focus = unanswered.slice(0, 3);
  const latest = answered[0]?.latest;

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <Panel>
        <div className="flex items-start gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-cyan-300/25 bg-cyan-500/15 text-cyan-200">
            <BrainCircuit className="size-6" />
          </span>
          <div>
            <Pill tone="info">Topic Room</Pill>
            <h1 className="mt-3 text-2xl font-semibold leading-9 text-white">
              {data.room.topic}
            </h1>
            <div className="mt-3 flex flex-wrap gap-2">
              {data.room.core_areas.map((area) => (
                <span
                  key={area}
                  className="rounded-md border border-white/10 bg-slate-950/55 px-2 py-1 text-xs text-slate-300"
                >
                  {area}
                </span>
              ))}
            </div>
          </div>
        </div>
      </Panel>

      {latest ? (
        <Panel>
          <SectionHeader eyebrow="Diagnosis" title="直近の理解診断" />
          <ScoreMeter label={latest.understanding_level} value={Number(latest.score)} tone="cyan" />
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <ConceptList
              title="苦手そうな概念"
              items={decodeJson<string[]>(latest.missing_concepts, [])}
              tone="warn"
            />
            <ConceptList
              title="次の出題方針"
              items={[latest.next_question_strategy]}
              tone="info"
            />
          </div>
        </Panel>
      ) : null}

      <Panel>
        <SectionHeader eyebrow="Questions" title="今解く診断問題" />
        {focus.length ? (
          <div className="space-y-5">
            {focus.map((question, index) => (
              <div
                key={question.id}
                className="rounded-xl border border-white/10 bg-white/[0.035] p-5"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Pill tone="info">Q{index + 1}</Pill>
                  <Pill>{question.area}</Pill>
                  <span className="text-xs font-medium text-slate-500">
                    difficulty {question.difficulty}/5
                  </span>
                </div>
                <p className="mt-3 text-base font-medium leading-7 text-white">
                  {question.question}
                </p>
                <p className="mt-2 rounded-lg border border-cyan-300/20 bg-cyan-500/10 px-3 py-2 text-sm leading-6 text-cyan-100">
                  狙い: {question.why_this_question}
                </p>
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
                <form action={submitTopicAnswerAction} className="mt-4 space-y-3">
                  <input type="hidden" name="roomId" value={data.room.id} />
                  <input type="hidden" name="questionId" value={question.id} />
                  <textarea
                    name="answerText"
                    required
                    className="min-h-32 w-full rounded-lg border border-white/10 bg-slate-950/55 p-4 text-sm leading-6 text-slate-100 outline-none placeholder:text-slate-500 focus:border-cyan-300/60"
                    placeholder="定義だけでなく、なぜそうなるか・どこで失敗するかまで書く"
                  />
                  <div className="flex justify-end">
                    <CodexSubmitStatus
                      idleLabel="診断してもらう"
                      pendingLabel="採点中"
                    />
                  </div>
                </form>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-emerald-400/25 bg-emerald-500/10 p-4 text-sm leading-6 text-emerald-100">
            表の診断問題は解き終わりました。下の回答済みから苦手概念を見直してください。
          </div>
        )}
      </Panel>

      {answered.length ? (
        <Panel>
          <SectionHeader eyebrow="Archive" title="回答済み" />
          <div className="grid gap-4 xl:grid-cols-2">
            {answered.map((question) => (
              <div
                key={question.id}
                className="rounded-xl border border-white/10 bg-white/[0.03] p-4"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Pill>{question.area}</Pill>
                  <span className="text-xs font-semibold text-slate-300">
                    {question.latest?.score}/100
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-white">{question.question}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {decodeJson<string[]>(question.latest?.weak_points, []).slice(0, 3).map((item) => (
                    <span
                      key={item}
                      className="rounded-md border border-amber-300/20 bg-amber-500/10 px-2 py-1 text-xs text-amber-100"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Panel>
      ) : null}
    </div>
  );
}

function ConceptList({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: "warn" | "info";
}) {
  const color =
    tone === "warn"
      ? "border-amber-300/25 bg-amber-500/10 text-amber-100"
      : "border-cyan-300/25 bg-cyan-500/10 text-cyan-100";
  return (
    <div className={`rounded-lg border p-4 ${color}`}>
      <p className="text-sm font-semibold">{title}</p>
      <div className="mt-3 space-y-2">
        {items.map((item) => (
          <p key={item} className="text-sm leading-6">
            {item}
          </p>
        ))}
      </div>
    </div>
  );
}
