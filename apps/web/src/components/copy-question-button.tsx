"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

type CopyQuestionButtonProps = {
  text: string;
};

export function CopyQuestionButton({ text }: CopyQuestionButtonProps) {
  const [copied, setCopied] = useState(false);

  async function copyQuestion() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }

  return (
    <button
      type="button"
      title={copied ? "コピーしました" : "質問文をコピー"}
      aria-label={copied ? "コピーしました" : "質問文をコピー"}
      onClick={copyQuestion}
      className="inline-flex size-8 shrink-0 items-center justify-center rounded-md border border-white/10 bg-slate-950/55 text-slate-400 hover:border-cyan-300/35 hover:bg-cyan-500/10 hover:text-cyan-100"
    >
      {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
    </button>
  );
}
