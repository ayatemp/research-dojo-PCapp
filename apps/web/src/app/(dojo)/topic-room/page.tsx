import Link from "next/link";
import { ArrowRight, BrainCircuit, Plus } from "lucide-react";
import { createTopicRoomAction } from "@/app/actions";
import { requireUser } from "@/lib/auth";
import { ensureDefaultProject, getTopicRooms } from "@/lib/store";
import { CodexSubmitStatus } from "@/components/codex-submit-status";
import { Panel, Pill, ScoreMeter, SectionHeader } from "@/components/ui";

export default async function TopicRoomPage() {
  const user = await requireUser();
  const project = await ensureDefaultProject(user);
  const rooms = await getTopicRooms(project.id, user.id);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Panel className="p-6 md:p-7">
        <Pill tone="info">Topic Room</Pill>
        <h1 className="mt-4 text-3xl font-semibold tracking-normal text-white">
          トピック理解を診断する
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
          機械学習、拡散モデル、最適化、統計的検定など、広めのトピックを入れると、
          Codexが中級者向けの診断問題を作ります。回答すると苦手概念が浮きます。
        </p>
      </Panel>

      <Panel>
        <SectionHeader eyebrow="Create" title="新しい診断ルーム" />
        <form action={createTopicRoomAction} className="grid gap-4 md:grid-cols-[1fr_180px_auto]">
          <input
            name="topic"
            required
            placeholder="例: 機械学習 / Transformer / causal inference"
            className="h-11 rounded-lg border border-white/10 bg-slate-950/55 px-3 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-indigo-300/60"
          />
          <select
            name="level"
            defaultValue="中級者"
            className="h-11 rounded-lg border border-white/10 bg-slate-950/55 px-3 text-sm text-slate-100 outline-none focus:border-indigo-300/60"
          >
            <option>初中級者</option>
            <option>中級者</option>
            <option>研究入門者</option>
            <option>上級者</option>
          </select>
          <div className="flex justify-end">
            <CodexSubmitStatus
              idleLabel="診断問題を作る"
              pendingLabel="問題生成中"
              kind="generate"
            />
          </div>
        </form>
      </Panel>

      <Panel>
        <SectionHeader eyebrow="Rooms" title="診断履歴" />
        {rooms.length ? (
          <div className="grid gap-4 xl:grid-cols-2">
            {rooms.map((room) => (
              <Link
                key={room.id}
                href={`/topic-room/${room.id}`}
                className="group rounded-xl border border-white/10 bg-white/[0.035] p-5 hover:border-cyan-300/40 hover:bg-white/[0.055]"
              >
                <div className="flex items-start justify-between gap-3">
                  <Pill tone="good">{room.level}</Pill>
                  <span className="text-xs font-medium text-slate-500">
                    {new Date(room.created_at).toLocaleDateString("ja-JP")}
                  </span>
                </div>
                <div className="mt-4 flex gap-3">
                  <span className="mt-1 flex size-10 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-slate-950/55 text-cyan-200">
                    <BrainCircuit className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 className="line-clamp-2 text-lg font-semibold leading-7 text-white">
                      {room.topic}
                    </h2>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {room.core_areas.slice(0, 4).map((area) => (
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
                <div className="mt-5 flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <ScoreMeter
                      label={`${room.question_count} questions`}
                      value={Number(room.latest_score ?? 0)}
                      tone={room.latest_score ? "cyan" : "zinc"}
                    />
                  </div>
                  <span className="inline-flex items-center gap-1 text-sm font-medium text-cyan-300 group-hover:text-cyan-200">
                    入る
                    <ArrowRight className="size-4" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.03] p-8 text-center">
            <Plus className="mx-auto size-6 text-slate-400" />
            <p className="mt-3 text-base font-medium text-white">まだ診断ルームはありません。</p>
          </div>
        )}
      </Panel>
    </div>
  );
}
