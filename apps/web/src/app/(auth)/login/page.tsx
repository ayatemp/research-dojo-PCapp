import Link from "next/link";
import { BookOpenCheck, BrainCircuit, Eye, Sparkles } from "lucide-react";
import { loginAction } from "@/app/actions";
import { BrandMark } from "@/components/ui";
import startBackground from "../../../../../../assets/start_background.png";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  return (
    <main
      className="auth-start-screen flex min-h-screen items-center bg-[#030711] px-5 py-6 md:px-10"
      style={{ backgroundImage: `url(${startBackground.src})` }}
    >
      <div className="mx-auto grid w-full max-w-7xl items-center gap-8 lg:grid-cols-[minmax(0,1fr)_440px]">
        <div className="min-h-[560px] rounded-lg border border-white/10 bg-black/10 p-6 shadow-[0_28px_100px_rgba(0,0,0,0.36)] backdrop-blur-[2px] md:p-8">
          <div className="flex h-full flex-col justify-between">
          <div>
            <div className="inline-flex items-center gap-4 rounded-lg border border-white/10 bg-slate-950/26 px-4 py-3 backdrop-blur-md">
              <BrandMark className="shrink-0" />
              <div>
                <h1 className="text-xl font-semibold text-white">Research Dojo</h1>
                <p className="mt-1 text-sm text-slate-400">
                  Codex App Serverで研究力を鍛える
                </p>
              </div>
            </div>
            <div className="mt-20 max-w-2xl">
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-violet-200">
                Paper Training Studio
              </p>
              <h2 className="mt-5 text-4xl font-semibold leading-tight tracking-normal text-white md:text-5xl">
                論文を読んで、答えて、研究の理解を深くする。
              </h2>
              <p className="mt-5 max-w-xl text-base leading-7 text-slate-300">
                Paper Roomで理解の浅い部分を見つけ、Topic RoomとResearch Labで次の問いへ進めます。
              </p>
            </div>
            <div className="mt-12 grid max-w-3xl gap-3 md:grid-cols-3">
              <AuthFeature
                icon={BookOpenCheck}
                title="論文を読み解く"
                text="重要な論点を効率的に理解"
              />
              <AuthFeature
                icon={BrainCircuit}
                title="問題を作成する"
                text="AIが理解度を測る問題を生成"
              />
              <AuthFeature
                icon={Sparkles}
                title="自分で答えて成長する"
                text="疑問から学習サイクルを向上"
              />
            </div>
          </div>
          <p className="mt-10 text-xs text-slate-500">© 2026 Research Dojo. All rights reserved.</p>
          </div>
        </div>

        <section className="rounded-lg border border-white/12 bg-[linear-gradient(180deg,rgba(18,27,45,0.74),rgba(7,12,22,0.82))] p-6 shadow-[0_28px_100px_rgba(0,0,0,0.48)] backdrop-blur-xl md:p-7">
          <div className="mb-7">
            <p className="text-sm font-medium text-violet-200">Welcome back</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">ようこそ</h2>
            <p className="mt-2 text-sm text-slate-400">アカウントにログインしてください</p>
          </div>
          {params.error ? (
            <p className="mt-4 rounded-md border border-rose-300/30 bg-rose-500/12 p-3 text-sm text-rose-100">
              メールアドレスかパスワードが違います。
            </p>
          ) : null}
          <form action={loginAction} className="mt-6 space-y-4">
            <label className="block text-sm font-medium text-slate-200">
              メールアドレス
              <input
                name="email"
                type="email"
                required
                className="mt-2 h-11 w-full rounded-md border border-white/10 bg-slate-950/50 px-3 text-white outline-none focus:border-violet-400"
              />
            </label>
            <label className="block text-sm font-medium text-slate-200">
              パスワード
              <span className="relative mt-2 block">
                <input
                  name="password"
                  type="password"
                  required
                  className="h-11 w-full rounded-md border border-white/10 bg-slate-950/50 px-3 pr-10 text-white outline-none focus:border-violet-400"
                />
                <Eye className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
              </span>
            </label>
            <button className="h-11 w-full rounded-md bg-gradient-to-r from-violet-600 to-indigo-500 px-3 text-sm font-semibold text-white shadow-[0_0_28px_rgba(124,58,237,0.32)] hover:from-violet-500 hover:to-indigo-400">
              ログイン
            </button>
          </form>
          <p className="mt-6 text-center text-sm text-slate-400">
            アカウントがない場合は{" "}
            <Link href="/signup" className="font-semibold text-violet-300">
              サインアップ
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}

function AuthFeature({
  icon: Icon,
  title,
  text,
}: {
  icon: typeof BookOpenCheck;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-slate-950/24 p-4 backdrop-blur-md">
      <span className="flex size-10 items-center justify-center rounded-lg border border-violet-300/25 bg-violet-500/18 text-violet-100">
        <Icon className="size-5" />
      </span>
      <div className="mt-4">
        <p className="text-sm font-semibold text-white">{title}</p>
        <p className="mt-1 text-xs leading-5 text-slate-400">{text}</p>
      </div>
    </div>
  );
}
