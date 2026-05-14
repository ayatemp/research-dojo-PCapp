import Link from "next/link";
import {
  Brain,
  ChevronDown,
  FilePlus2,
  FileText,
  FileUp,
  Lightbulb,
  Link2,
  Search,
  Tag,
} from "lucide-react";
import { createPaperAction } from "@/app/actions";
import { requireUser } from "@/lib/auth";
import { ensureDefaultProject, getDocuments } from "@/lib/store";
import { LocalPaperImporter } from "@/components/local-paper-importer";
import { MarkdownNoteEditor } from "@/components/markdown-note-editor";
import { Panel, Pill, ScoreMeter, SectionHeader } from "@/components/ui";

export default async function PapersPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string; tag?: string }>;
}) {
  const user = await requireUser();
  const project = await ensureDefaultProject(user);
  const papers = await getDocuments(project.id);
  const params = await searchParams;
  const activeTag = params?.tag?.trim() ?? "";
  const allTags = Array.from(
    new Set(papers.flatMap((paper) => paper.tags).filter(Boolean)),
  ).sort((a, b) => a.localeCompare(b));
  const visiblePapers = activeTag
    ? papers.filter((paper) =>
        paper.tags.some((tag) => tag.toLocaleLowerCase() === activeTag.toLocaleLowerCase()),
      )
    : papers;
  const errorMessage =
    params?.error === "file"
      ? "ファイルを読み取れませんでした。PDF/TXT/Markdownを選ぶか、コピー可能な本文が含まれるPDFを使ってください。"
      : params?.error === "missing"
        ? "URL、ローカルファイル、または本文メモのいずれかを入力してください。"
        : "";

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-normal text-white">Paper Room</h1>
          <p className="mt-2 text-sm text-slate-400">論文を検索し、理解を深める</p>
        </div>
        <a
          href="#add-paper"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-gradient-to-r from-violet-600 to-indigo-500 px-4 text-sm font-semibold text-white shadow-[0_0_28px_rgba(124,58,237,0.32)] hover:from-violet-500 hover:to-indigo-400"
        >
          <FilePlus2 className="size-4" />
          論文を追加
        </a>
      </div>

      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto]">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
          <input
            placeholder="論文を検索..."
            className="h-12 w-full rounded-md border border-white/10 bg-[#0b1423]/75 pl-11 pr-4 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-violet-300/60"
          />
        </label>
        <div className="flex gap-2 overflow-x-auto">
          {["すべて", "未回答", "回答済み"].map((filter, index) => (
            <button
              key={filter}
              className={`h-12 shrink-0 rounded-md border px-4 text-sm font-medium ${
                index === 0
                  ? "border-violet-300/30 bg-violet-500/18 text-violet-100"
                  : "border-white/10 bg-[#0b1423]/75 text-slate-300 hover:bg-white/[0.06]"
              }`}
            >
              {filter}
            </button>
          ))}
          <button className="inline-flex h-12 shrink-0 items-center gap-2 rounded-md border border-white/10 bg-[#0b1423]/75 px-4 text-sm font-medium text-slate-300 hover:bg-white/[0.06]">
            最新順
            <ChevronDown className="size-4" />
          </button>
        </div>
      </div>

      {allTags.length ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex h-9 items-center gap-2 text-sm font-medium text-slate-400">
            <Tag className="size-4" />
            タグ
          </span>
          <Link
            href="/papers"
            className={`inline-flex h-9 items-center rounded-md border px-3 text-sm font-medium ${
              activeTag
                ? "border-white/10 bg-[#0b1423]/75 text-slate-300 hover:bg-white/[0.06]"
                : "border-violet-300/30 bg-violet-500/18 text-violet-100"
            }`}
          >
            すべて
          </Link>
          {allTags.map((tag) => (
            <Link
              key={tag}
              href={`/papers?tag=${encodeURIComponent(tag)}`}
              className={`inline-flex h-9 items-center rounded-md border px-3 text-sm font-medium ${
                activeTag.toLocaleLowerCase() === tag.toLocaleLowerCase()
                  ? "border-cyan-300/35 bg-cyan-500/18 text-cyan-100"
                  : "border-white/10 bg-[#0b1423]/75 text-slate-300 hover:bg-white/[0.06]"
              }`}
            >
              {tag}
            </Link>
          ))}
        </div>
      ) : null}

      <Panel className="p-0">
        {visiblePapers.length ? (
          <div className="divide-y divide-white/10">
            {visiblePapers.map((paper) => (
              <div
                key={paper.id}
                className="grid gap-4 p-5 hover:bg-white/[0.035] md:grid-cols-[44px_minmax(0,1fr)_110px_150px_300px] md:items-center"
              >
                <span className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-violet-300/22 bg-violet-500/18 text-violet-100">
                  <FileText className="size-5" />
                </span>
                <div className="min-w-0">
                  <h2 className="truncate text-base font-semibold leading-7 text-white">
                    {paper.title}
                  </h2>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {paper.tags.length ? (
                      paper.tags.slice(0, 5).map((tag) => (
                        <span
                          key={`${paper.id}-${tag}`}
                          className="rounded-md bg-cyan-500/10 px-2 py-1 text-xs text-cyan-100/85"
                        >
                          {tag}
                        </span>
                      ))
                    ) : (
                      <span className="rounded-md bg-white/[0.06] px-2 py-1 text-xs text-slate-500">
                        タグ未設定
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <Pill tone={paper.question_count > 0 ? "good" : "warn"}>
                    {paper.question_count > 0 ? "回答済み" : "未回答"}
                  </Pill>
                  <p className="mt-2 text-xs text-slate-500">
                    {new Date(paper.created_at).toLocaleDateString("ja-JP")}
                  </p>
                </div>
                <div>
                  {paper.latest_score !== null ? (
                    <ScoreMeter
                      label="スコア"
                      value={Number(paper.latest_score)}
                      tone={Number(paper.latest_score) >= 60 ? "emerald" : "rose"}
                    />
                  ) : (
                    <span className="text-sm text-slate-500">-</span>
                  )}
                </div>
                <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2">
                  <Link
                    href={`/papers/${paper.id}/train`}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-cyan-300/20 bg-cyan-500/10 px-3 text-sm font-semibold text-cyan-100 hover:bg-cyan-500/16"
                  >
                    <Brain className="size-4" />
                    理解チェック
                  </Link>
                  <Link
                    href={`/papers/${paper.id}/ideas`}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-amber-300/20 bg-amber-500/12 px-3 text-sm font-semibold text-amber-100 hover:bg-amber-500/18"
                  >
                    <Lightbulb className="size-4" />
                    アイデアを育てる
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-white/15 bg-white/[0.03] p-8 text-center">
            <p className="text-base font-medium text-white">
              {papers.length ? "このタグの論文はありません。" : "まだ保存済み論文はありません。"}
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              {papers.length
                ? "別のタグを選ぶか、Paper Card生成時にキーワードを追加してください。"
                : "arXiv URLだけでも始められます。タイトルとabstractを取れたら自動で埋めて保存します。"}
            </p>
          </div>
        )}
      </Panel>

      <Panel id="add-paper" className="scroll-mt-6">
        <SectionHeader eyebrow="Add Paper" title="論文をTrainerに入れる" />
        {errorMessage ? (
          <div className="mb-4 rounded-lg border border-rose-300/25 bg-rose-500/10 p-3 text-sm leading-6 text-rose-100">
            {errorMessage}
          </div>
        ) : null}

        <LocalPaperImporter />

        <div className="my-2 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
          <span className="h-px flex-1 bg-white/10" />
          URLから追加
          <span className="h-px flex-1 bg-white/10" />
        </div>

        <form action={createPaperAction} className="grid gap-4">
          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-200">論文URL</span>
            <span className="relative">
              <Link2 className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
              <input
                name="sourceUrl"
                type="url"
                placeholder="https://arxiv.org/abs/2401.12345"
                className="h-11 w-full rounded-md border border-white/10 bg-slate-950/45 pl-10 pr-3 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-violet-300/60"
              />
            </span>
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-200">
              タイトル <span className="text-slate-500">URLから自動取得。必要なら上書き</span>
            </span>
            <input
              name="title"
              placeholder="未入力ならURLから取得したタイトルを使います"
              className="h-11 rounded-md border border-white/10 bg-slate-950/45 px-3 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-violet-300/60"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-200">
              タグ <span className="text-slate-500">任意。カンマ区切り</span>
            </span>
            <input
              name="keywords"
              placeholder="例: LLM Agents, Retrieval, Human Evaluation"
              className="h-11 rounded-md border border-white/10 bg-slate-950/45 px-3 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-violet-300/60"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-200">
              本文・補足メモ <span className="text-slate-500">任意。PDF本文、abstract、自分の読みメモ</span>
            </span>
            <MarkdownNoteEditor
              name="text"
              placeholder="URLからabstractを取れない場合や、自分のメモも一緒にTrainerへ渡したい場合に使います。"
            />
          </label>

          <div className="flex justify-end">
            <button className="inline-flex h-10 items-center gap-2 rounded-md bg-gradient-to-r from-violet-600 to-indigo-500 px-4 text-sm font-semibold text-white shadow-[0_0_26px_rgba(124,58,237,0.3)] hover:from-violet-500 hover:to-indigo-400">
              <FileUp className="size-4" />
              保存してTrainerへ
            </button>
          </div>
        </form>
      </Panel>
    </div>
  );
}
