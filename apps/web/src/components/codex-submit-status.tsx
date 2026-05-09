"use client";

import { useFormStatus } from "react-dom";
import { SendHorizontal, WandSparkles } from "lucide-react";

type CodexSubmitStatusProps = {
  idleLabel: string;
  pendingLabel: string;
  kind?: "send" | "generate";
};

export function CodexSubmitStatus({
  idleLabel,
  pendingLabel,
  kind = "send",
}: CodexSubmitStatusProps) {
  const { pending } = useFormStatus();
  const Icon = kind === "generate" ? WandSparkles : SendHorizontal;

  return (
    <div className="space-y-3">
      <button
        disabled={pending}
        className="inline-flex h-9 items-center gap-2 rounded-md bg-zinc-950 px-3 text-sm font-semibold text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-75"
      >
        {pending ? <ThinkingTiles /> : <Icon className="size-4" />}
        {pending ? pendingLabel : idleLabel}
      </button>
      {pending ? (
        <div className="codex-thinking-card rounded-lg border border-cyan-300/25 bg-cyan-500/10 p-4">
          <div className="flex items-center gap-3">
            <span className="codex-signal" aria-hidden="true">
              <span />
              <span />
              <span />
              <span />
            </span>
            <div>
              <p className="text-sm font-semibold text-cyan-100">Codexへ送信済み</p>
              <p className="mt-1 text-xs leading-5 text-cyan-100/75">
                App Serverが回答を読み、査読コメントを組み立てています。
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ThinkingTiles() {
  return (
    <span className="codex-thinking-tiles" aria-hidden="true">
      <span />
      <span />
      <span />
    </span>
  );
}
