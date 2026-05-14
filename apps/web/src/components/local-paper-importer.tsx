"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { FolderOpen, Loader2, UploadCloud } from "lucide-react";
import { createPaperAction } from "@/app/actions";

const supportedExtensions = [".pdf", ".txt", ".md", ".markdown"];

function isSupported(file: File) {
  const name = file.name.toLowerCase();
  return supportedExtensions.some((extension) => name.endsWith(extension));
}

function fileTitle(file: File) {
  return file.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();
}

function filePath(file: File) {
  const withPath = file as File & { webkitRelativePath?: string };
  return withPath.webkitRelativePath || file.name;
}

export function LocalPaperImporter() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [isPending, startTransition] = useTransition();

  const selectedFile = files[selectedIndex] ?? null;
  const selectedTitle = title || (selectedFile ? fileTitle(selectedFile) : "");
  const fileCountLabel = useMemo(() => {
    if (!files.length) return "PDF / TXT / Markdown";
    return `${files.length}件の対応ファイル`;
  }, [files.length]);

  function applyFiles(fileList: FileList | null) {
    const nextFiles = Array.from(fileList ?? []).filter(isSupported);
    setFiles(nextFiles);
    setSelectedIndex(0);
    setTitle(nextFiles[0] ? fileTitle(nextFiles[0]) : "");
  }

  function submit() {
    if (!selectedFile || isPending) return;
    const formData = new FormData();
    formData.set("title", selectedTitle);
    formData.set("sourceUrl", "");
    formData.set("text", notes);
    formData.set("paperFile", selectedFile);
    formData.set("localFilePath", filePath(selectedFile));
    startTransition(() => {
      void createPaperAction(formData);
    });
  }

  return (
    <div className="grid gap-4 rounded-lg border border-cyan-300/20 bg-cyan-500/10 p-4">
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.txt,.md,.markdown,application/pdf,text/plain,text/markdown"
        className="hidden"
        onChange={(event) => applyFiles(event.currentTarget.files)}
      />
      <input
        ref={folderInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(event) => applyFiles(event.currentTarget.files)}
        // React does not type these non-standard but widely supported picker attributes.
        {...{ webkitdirectory: "", directory: "" }}
      />

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold text-cyan-50">ローカル論文を選ぶ</p>
          <p className="mt-1 text-xs leading-5 text-cyan-100/75">
            {fileCountLabel}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex h-10 items-center gap-2 rounded-md border border-cyan-200/25 bg-cyan-500/12 px-3 text-sm font-semibold text-cyan-50 hover:bg-cyan-500/18"
          >
            <UploadCloud className="size-4" />
            ファイルを選ぶ
          </button>
          <button
            type="button"
            onClick={() => folderInputRef.current?.click()}
            className="inline-flex h-10 items-center gap-2 rounded-md border border-violet-200/25 bg-violet-500/12 px-3 text-sm font-semibold text-violet-50 hover:bg-violet-500/18"
          >
            <FolderOpen className="size-4" />
            フォルダを開く
          </button>
        </div>
      </div>

      {files.length ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,280px)_minmax(0,1fr)]">
          <div className="max-h-72 overflow-auto rounded-md border border-white/10 bg-slate-950/45 p-2">
            {files.map((file, index) => (
              <button
                key={`${filePath(file)}-${file.size}`}
                type="button"
                onClick={() => {
                  setSelectedIndex(index);
                  setTitle(fileTitle(file));
                }}
                className={`block w-full rounded-md px-3 py-2 text-left text-sm ${
                  index === selectedIndex
                    ? "bg-cyan-500/22 text-white"
                    : "text-slate-300 hover:bg-white/[0.06]"
                }`}
              >
                <span className="block truncate font-medium">{file.name}</span>
                <span className="mt-1 block truncate text-xs text-slate-500">
                  {filePath(file)}
                </span>
              </button>
            ))}
          </div>

          <div className="grid gap-3">
            <label className="grid gap-2">
              <span className="text-sm font-medium text-slate-200">タイトル</span>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="ファイル名から自動入力"
                className="h-11 rounded-md border border-white/10 bg-slate-950/45 px-3 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-cyan-300/60"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-medium text-slate-200">補足メモ</span>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="この論文で注目したい観点、自分の研究との接続など"
                className="min-h-24 rounded-md border border-white/10 bg-slate-950/45 p-3 text-sm leading-6 text-slate-100 outline-none placeholder:text-slate-500 focus:border-cyan-300/60"
              />
            </label>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={submit}
                disabled={!selectedFile || isPending}
                className="inline-flex h-10 items-center gap-2 rounded-md bg-gradient-to-r from-cyan-500 to-indigo-500 px-4 text-sm font-semibold text-white shadow-[0_0_26px_rgba(34,211,238,0.22)] hover:from-cyan-400 hover:to-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isPending ? <Loader2 className="size-4 animate-spin" /> : <UploadCloud className="size-4" />}
                読み取ってTrainerへ
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
