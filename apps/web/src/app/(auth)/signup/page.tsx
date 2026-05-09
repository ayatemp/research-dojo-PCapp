import Link from "next/link";
import { UserPlus } from "lucide-react";
import { signUpAction } from "@/app/actions";
import { BrandMark } from "@/components/ui";
import startBackground from "../../../../../../assets/start_background.png";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  return (
    <main
      className="auth-start-screen flex min-h-screen items-center justify-center bg-[#030711] px-5 py-8"
      style={{ backgroundImage: `url(${startBackground.src})` }}
    >
      <div className="w-full max-w-md rounded-lg border border-white/12 bg-[linear-gradient(180deg,rgba(18,27,45,0.74),rgba(7,12,22,0.82))] p-6 shadow-[0_28px_100px_rgba(0,0,0,0.48)] backdrop-blur-xl md:p-7">
        <div className="flex items-center gap-4">
          <BrandMark className="shrink-0" />
          <div>
            <h1 className="text-lg font-semibold text-white">Research Dojo</h1>
            <p className="text-sm text-slate-400">最初のDojoアカウントを作成</p>
          </div>
        </div>
        {params.error ? (
          <p className="mt-4 rounded-md border border-rose-300/30 bg-rose-500/12 p-3 text-sm text-rose-100">
            登録内容を確認してください。パスワードは8文字以上です。
          </p>
        ) : null}
        <form action={signUpAction} className="mt-6 space-y-4">
          <label className="block text-sm font-medium text-slate-200">
            Name
            <input
              name="name"
              className="mt-2 h-11 w-full rounded-md border border-white/10 bg-slate-950/50 px-3 text-white outline-none focus:border-violet-400"
            />
          </label>
          <label className="block text-sm font-medium text-slate-200">
            Email
            <input
              name="email"
              type="email"
              required
              className="mt-2 h-11 w-full rounded-md border border-white/10 bg-slate-950/50 px-3 text-white outline-none focus:border-violet-400"
            />
          </label>
          <label className="block text-sm font-medium text-slate-200">
            Password
            <input
              name="password"
              type="password"
              minLength={8}
              required
              className="mt-2 h-11 w-full rounded-md border border-white/10 bg-slate-950/50 px-3 text-white outline-none focus:border-violet-400"
            />
          </label>
          <button className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-gradient-to-r from-violet-600 to-indigo-500 px-3 text-sm font-semibold text-white shadow-[0_0_28px_rgba(124,58,237,0.32)] hover:from-violet-500 hover:to-indigo-400">
            <UserPlus className="size-4" />
            サインアップ
          </button>
        </form>
        <p className="mt-5 text-center text-sm text-slate-400">
          すでにある場合は{" "}
          <Link href="/login" className="font-semibold text-violet-300">
            ログイン
          </Link>
        </p>
      </div>
    </main>
  );
}
