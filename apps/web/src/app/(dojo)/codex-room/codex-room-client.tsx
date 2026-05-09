"use client";

import { FormEvent, useRef, useState } from "react";
import { BotMessageSquare, SendHorizontal, UserRound } from "lucide-react";
import {
  sendCodexRoomMessageAction,
  type CodexRoomMessage,
} from "@/app/actions";
import { cn } from "@/lib/utils";

const starterMessages: CodexRoomMessage[] = [
  {
    role: "codex",
    content:
      "Codex Roomです。ここに書いた内容は Research Dojo backend から codex app-server に送られます。接続確認なら、短い質問を投げてみてください。",
  },
];

export function CodexRoomClient() {
  const [messages, setMessages] = useState<CodexRoomMessage[]>(starterMessages);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    const text = inputRef.current?.value.trim() ?? "";
    if (!text) return;

    setError("");
    setPending(true);
    if (inputRef.current) inputRef.current.value = "";

    const nextMessages: CodexRoomMessage[] = [...messages, { role: "user", content: text }];
    setMessages(nextMessages);

    const result = await sendCodexRoomMessageAction(messages, text);
    if (result.ok) {
      setMessages([...nextMessages, { role: "codex", content: result.reply }]);
    } else {
      setError(result.error || "Codexから応答を受け取れませんでした。");
      setMessages(nextMessages);
    }
    setPending(false);
  }

  return (
    <div className="grid min-h-[calc(100vh-9rem)] gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
      <section className="flex min-h-[620px] flex-col overflow-hidden rounded-xl border border-white/10 bg-[#07101d]/85 shadow-[0_18px_60px_rgba(0,0,0,0.28)]">
        <div className="border-b border-white/10 px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-lg border border-cyan-300/30 bg-cyan-500/15 text-cyan-200">
              <BotMessageSquare className="size-5" />
            </span>
            <div>
              <h2 className="text-lg font-semibold text-white">Codex Room</h2>
              <p className="text-sm text-slate-400">codex app-server 接続テスト用チャット</p>
            </div>
          </div>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
          {messages.map((message, index) => {
            const isUser = message.role === "user";
            return (
              <div
                key={`${message.role}-${index}`}
                className={cn("flex gap-3", isUser && "justify-end")}
              >
                {!isUser ? (
                  <MessageIcon>
                    <BotMessageSquare className="size-4" />
                  </MessageIcon>
                ) : null}
                <div
                  className={cn(
                    "max-w-[78%] rounded-lg border px-4 py-3 text-sm leading-6",
                    isUser
                      ? "border-indigo-300/30 bg-indigo-500/20 text-indigo-50"
                      : "border-white/10 bg-white/[0.045] text-slate-100",
                  )}
                >
                  {message.content}
                </div>
                {isUser ? (
                  <MessageIcon>
                    <UserRound className="size-4" />
                  </MessageIcon>
                ) : null}
              </div>
            );
          })}

          {pending ? (
            <div className="flex gap-3">
              <MessageIcon>
                <BotMessageSquare className="size-4" />
              </MessageIcon>
              <div className="rounded-lg border border-cyan-300/25 bg-cyan-500/10 px-4 py-3">
                <div className="flex items-center gap-3 text-sm font-medium text-cyan-100">
                  <ThinkingTiles />
                  Codexが考え中
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <form onSubmit={submit} className="border-t border-white/10 p-4">
          {error ? (
            <p className="mb-3 rounded-lg border border-rose-300/25 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">
              {error}
            </p>
          ) : null}
          <div className="flex gap-3">
            <textarea
              ref={inputRef}
              rows={2}
              disabled={pending}
              className="min-h-12 flex-1 rounded-lg border border-white/10 bg-slate-950/55 px-4 py-3 text-sm leading-6 text-slate-100 outline-none placeholder:text-slate-500 focus:border-cyan-300/60 disabled:opacity-60"
              placeholder="Codexに普通に話しかける"
            />
            <button
              disabled={pending}
              className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-md bg-cyan-500 px-4 text-sm font-semibold text-slate-950 hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-70"
            >
              <SendHorizontal className="size-4" />
              送信
            </button>
          </div>
        </form>
      </section>

      <aside className="rounded-xl border border-white/10 bg-[#0b1220]/80 p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">
          Connection
        </p>
        <h3 className="mt-2 text-base font-semibold text-white">確認できること</h3>
        <div className="mt-4 space-y-3 text-sm leading-6 text-slate-300">
          <p>この部屋の送信は、Research Dojoのサーバーを経由してCodex App Serverへ届きます。</p>
          <p>返信が返れば、少なくともCodex CLIログインとApp Server起動経路は通っています。</p>
        </div>
      </aside>
    </div>
  );
}

function MessageIcon({ children }: { children: React.ReactNode }) {
  return (
    <span className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-slate-300">
      {children}
    </span>
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
