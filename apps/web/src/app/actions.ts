"use server";

import path from "node:path";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createSession, destroySession, hashPassword, requireUser, verifyPassword } from "@/lib/auth";
import { decodeJson, get, id, run } from "@/lib/db";
import { runCodexJson, runCodexText } from "@/lib/codex-runner";
import {
  adaptiveQuestionGenerationSchema,
  ideaRefinementSchema,
  paperIdeaAnswerReviewSchema,
  paperIdeaSeedsSchema,
  paperGenerationSchema,
  researchLensSchema,
  reviewResultSchema,
  topicAnswerReviewSchema,
  topicRoomGenerationSchema,
  type AdaptiveQuestionGenerationResult,
  type IdeaRefinement,
  type PaperIdeaAnswerReview,
  type PaperIdeaSeedsResult,
  type PaperGenerationResult,
  type ResearchLensResult,
  type ReviewResult,
  type TopicAnswerReviewResult,
  type TopicRoomGenerationResult,
} from "@/lib/schemas";
import {
  addTaskEvent,
  appendAdaptiveQuestions,
  createCodexTask,
  createDocument,
  ensureDefaultProject,
  getTrainingDocument,
  getPaperIdeaSeeds,
  latestAnswerReviews,
  registerRepo,
  saveAnswerReview,
  saveIdea,
  savePaperIdeaAnswerReview,
  savePaperIdeaSeeds,
  savePaperGeneration,
  saveResearchLens,
  saveTopicAnswerReview,
  saveTopicRoom,
  updateTask,
} from "@/lib/store";

function field(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function useSecureCookies() {
  return (
    process.env.NODE_ENV === "production" &&
    process.env.RESEARCH_DOJO_INSECURE_COOKIES !== "1"
  );
}

export type CodexRoomMessage = {
  role: "user" | "codex";
  content: string;
};

function stripHtml(value: string) {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeHtml(value: string) {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function matchFirst(html: string, patterns: RegExp[]) {
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return decodeHtml(stripHtml(match[1]));
  }
  return "";
}

function normalizePaperUrl(sourceUrl: string) {
  try {
    const url = new URL(sourceUrl);
    if (url.hostname.includes("arxiv.org") && url.pathname.startsWith("/pdf/")) {
      const idPart = url.pathname.replace(/^\/pdf\//, "").replace(/\.pdf$/i, "");
      return `https://arxiv.org/abs/${idPart}`;
    }
  } catch {
    return sourceUrl;
  }
  return sourceUrl;
}

async function fetchPaperMetadata(sourceUrl: string) {
  try {
    const normalizedUrl = normalizePaperUrl(sourceUrl);
    const response = await fetch(normalizedUrl, {
      cache: "no-store",
      headers: {
        "user-agent": "ResearchDojo/0.1 (+local)",
        accept: "text/html,application/xhtml+xml",
      },
    });
    if (!response.ok) return { title: "", text: "" };

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
      return { title: "", text: "" };
    }

    const html = await response.text();
    const title = matchFirst(html, [
      /<h1[^>]*class=["'][^"']*\btitle\b[^"']*["'][^>]*>([\s\S]*?)<\/h1>/i,
      /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["'][^>]*>/i,
      /<meta[^>]+name=["']citation_title["'][^>]+content=["']([^"']+)["'][^>]*>/i,
      /<title[^>]*>([\s\S]*?)<\/title>/i,
    ]).replace(/^Title:\s*/i, "");

    const text = matchFirst(html, [
      /<blockquote[^>]*class=["'][^"']*\babstract\b[^"']*["'][^>]*>([\s\S]*?)<\/blockquote>/i,
      /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["'][^>]*>/i,
      /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["'][^>]*>/i,
    ]).replace(/^Abstract:\s*/i, "");

    return { title, text };
  } catch {
    return { title: "", text: "" };
  }
}

export async function signUpAction(formData: FormData) {
  const name = field(formData, "name");
  const email = field(formData, "email").toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || password.length < 8) {
    redirect("/signup?error=invalid");
  }

  const existing = await get("SELECT id FROM users WHERE email = ?", [email]);
  if (existing) redirect("/signup?error=exists");

  const userId = id("usr");
  await run(
    "INSERT INTO users (id, name, email, password_hash) VALUES (?, ?, ?, ?)",
    [userId, name || null, email, await hashPassword(password)],
  );
  await createSession(userId);
  await ensureDefaultProject({ id: userId, name: name || null, email });
  redirect("/dashboard");
}

export async function loginAction(formData: FormData) {
  const email = field(formData, "email").toLowerCase();
  const password = String(formData.get("password") ?? "");
  const user = await get<{ id: string; password_hash: string; name: string | null }>(
    "SELECT id, password_hash, name FROM users WHERE email = ?",
    [email],
  );
  if (!user || !(await verifyPassword(password, user.password_hash))) {
    redirect("/login?error=invalid");
  }
  await createSession(user.id);
  await ensureDefaultProject({ id: user.id, name: user.name, email });
  redirect("/dashboard");
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}

export async function updateDisplayPreferenceAction(formData: FormData) {
  await requireUser();
  const contentWidth = field(formData, "contentWidth");
  const value = contentWidth === "wide" ? "wide" : "normal";
  const cookieStore = await cookies();
  cookieStore.set("research_dojo_content_width", value, {
    httpOnly: true,
    sameSite: "lax",
    secure: useSecureCookies(),
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  revalidatePath("/settings");
  redirect("/settings");
}

export async function createPaperAction(formData: FormData) {
  const user = await requireUser();
  const project = await ensureDefaultProject(user);
  const titleInput = field(formData, "title");
  const sourceUrl = field(formData, "sourceUrl");
  const textInput = field(formData, "text");
  const fetched = sourceUrl ? await fetchPaperMetadata(sourceUrl) : { title: "", text: "" };
  const title = titleInput || fetched.title || sourceUrl || "";
  const text = [
    fetched.text ? `Fetched abstract / description:\n${fetched.text}` : "",
    textInput ? `User notes / source text:\n${textInput}` : "",
  ]
    .filter(Boolean)
    .join("\n\n")
    .trim();
  if (!title || !text) redirect("/papers?error=missing");

  const documentId = await createDocument(project.id, title, text, sourceUrl || undefined);
  redirect(`/papers/${documentId}/train`);
}

export async function generatePaperTrainingAction(formData: FormData) {
  await requireUser();
  const documentId = field(formData, "documentId");
  const data = await getTrainingDocument(documentId);
  if (!data) redirect("/papers");

  const prompt = `
以下の論文テキストを読み、Research Dojo用のPaper Cardと研究力を鍛える問題を生成してください。
AIは答えを先に出す先生ではなく、ユーザーの思考を鍛える問題作成者です。

制約:
- 日本語で書く
- 単なる要約ではなく、問題設定、既存研究の弱点、提案手法の核、仮定、失敗条件、自分の研究への接続を書く
- 問題は暗記問題ではなく、メカニズム説明、失敗条件、実験設計、研究拡張、査読者視点を重視する
- 出力はJSONのみ

Title:
${data.document.title}

Text:
${data.document.extracted_text.slice(0, 28_000)}
`;

  const result = await runCodexJson<PaperGenerationResult>({
    prompt,
    outputSchema: paperGenerationSchema,
    sandbox: "read-only",
  });
  await savePaperGeneration(documentId, result.json);
  revalidatePath("/papers");
  revalidatePath(`/papers/${documentId}/train`);
  redirect(`/papers/${documentId}/train`);
}

export async function submitAnswerAction(formData: FormData) {
  const user = await requireUser();
  const documentId = field(formData, "documentId");
  const questionId = field(formData, "questionId");
  const answerText = field(formData, "answerText");
  if (!questionId || !answerText) redirect(`/papers/${documentId}/train`);

  const data = await getTrainingDocument(documentId);
  const question = data?.questions.find((item) => item.id === questionId);
  if (!data || !question) redirect("/papers");

  const prompt = `
あなたは非常に厳しい機械学習分野の査読者です。
ユーザーの回答を過度に褒めてはいけません。
研究として弱い点を明確に指摘してください。
ただし人格否定は禁止です。

採点ルーブリック:
- problem_clarity: 20
- novelty: 20
- mechanism_depth: 20
- limitations: 15
- experiment_design: 15
- sharpness: 10

必ずJSONのみで出力してください。
reading_gapsには「回答者が論文のどの部分を読み落としている/浅く読んでいるか」を入れてください。
paper_sectionは、可能なら Abstract / Method / Experiments / Limitations / Figure/Table / Related Work のように論文中の読み直し場所を示してください。
reread_promptは、読み直す時に自問すべき短い問いにしてください。

Paper:
${data.document.title}

Paper Card:
${JSON.stringify(data.card ?? {}, null, 2)}

Question:
${question.question}

Expected points:
${question.expected.join("\n")}

User answer:
${answerText}
`;

  const result = await runCodexJson<ReviewResult>({
    prompt,
    outputSchema: reviewResultSchema,
    sandbox: "read-only",
  });
  await saveAnswerReview(user.id, questionId, answerText, result.json, result.text);
  revalidatePath(`/papers/${documentId}/train`);
  redirect(`/papers/${documentId}/train`);
}

export async function generateAdaptiveQuestionsAction(formData: FormData) {
  const user = await requireUser();
  const documentId = field(formData, "documentId");
  const data = await getTrainingDocument(documentId);
  if (!data) redirect("/papers");

  const answerMap = await latestAnswerReviews(
    user.id,
    data.questions.map((question) => question.id),
  );
  const answered = data.questions
    .map((question) => {
      const latest = answerMap.get(question.id);
      if (!latest) return null;
      return {
        question: question.question,
        type: question.type,
        difficulty: question.difficulty,
        answer: latest.answer_text,
        total_score: latest.total_score,
        decision: latest.decision,
        rubric_scores: decodeJson<Record<string, number>>(latest.rubric_scores, {}),
        fatal_issues: decodeJson<string[]>(latest.fatal_issues, []),
        reading_gaps: decodeJson<ReviewResult["reading_gaps"]>(latest.reading_gaps, []),
        next_fix: latest.next_fix,
      };
    })
    .filter(Boolean);

  if (answered.length === 0) redirect(`/papers/${documentId}/train?error=no_answers`);

  const existingQuestions = data.questions.map((question) => ({
    type: question.type,
    question: question.question,
    source: question.source,
    target_weakness: question.target_weakness,
  }));

  const prompt = `
以下はResearch Dojoでの論文理解トレーニング履歴です。
ユーザーの過去回答・採点・読み込み不足から、次に解くべき追加問題を2〜4問だけ生成してください。

目的:
- すでに出した問題を繰り返さない
- 低いルーブリック、fatal_issues、reading_gapsから弱点を推定する
- 「なぜこの問題を今出すのか」が分かる focus_reason を書く
- 問題を増やしすぎないため、最重要の弱点に絞る
- 日本語で書く
- JSONのみ

Paper:
${data.document.title}

Paper Card:
${JSON.stringify(data.card ?? {}, null, 2)}

Existing questions:
${JSON.stringify(existingQuestions, null, 2)}

Recent answered history:
${JSON.stringify(answered, null, 2)}

Paper text excerpt:
${data.document.extracted_text.slice(0, 18_000)}
`;

  const result = await runCodexJson<AdaptiveQuestionGenerationResult>({
    prompt,
    outputSchema: adaptiveQuestionGenerationSchema,
    sandbox: "read-only",
  });
  await appendAdaptiveQuestions(documentId, result.json);
  revalidatePath(`/papers/${documentId}/train`);
  redirect(`/papers/${documentId}/train`);
}

export async function sendCodexRoomMessageAction(
  history: CodexRoomMessage[],
  message: string,
) {
  await requireUser();
  const text = message.trim();
  if (!text) return { ok: false, reply: "", error: "メッセージを入力してください。" };

  const transcript = history
    .slice(-12)
    .map((item) => `${item.role === "user" ? "User" : "Codex"}:\n${item.content}`)
    .join("\n\n");

  try {
    const result = await runCodexText({
      sandbox: "read-only",
      timeoutMs: 180_000,
      prompt: `
あなたはResearch DojoのCodex接続確認ルームです。
この部屋では、ユーザーがCodex App Serverに実際につながっていることを確認できるように、普通に会話してください。

ルール:
- 日本語で返答する
- 簡潔に、ただし必要な説明は省かない
- ファイル編集やコマンド実行はしない
- Codex側に届いていることが分かるように、質問に自然に答える

これまでの会話:
${transcript || "(まだありません)"}

今回のユーザーメッセージ:
${text}
`,
    });
    return { ok: true, reply: result.text, error: "" };
  } catch (error) {
    return {
      ok: false,
      reply: "",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function refineIdeaAction(formData: FormData) {
  const user = await requireUser();
  const project = await ensureDefaultProject(user);
  const rawIdea = field(formData, "rawIdea");
  if (!rawIdea) redirect("/ideas");

  const prompt = `
あなたはAI/ML研究の共同研究者です。
ユーザーの雑なアイデアを、研究仮説、手法、実験、失敗条件、Codex実装タスクに変換してください。
アイデアを無条件に肯定してはいけません。
既存研究との差分が弱い場合は弱いと明確に指摘してください。
日本語で、JSONのみで出力してください。

Raw idea:
${rawIdea}
`;

  const result = await runCodexJson<IdeaRefinement>({
    prompt,
    outputSchema: ideaRefinementSchema,
    sandbox: "read-only",
  });
  await saveIdea(project.id, rawIdea, result.json, result.text);
  revalidatePath("/ideas");
  redirect("/ideas");
}

export async function generatePaperIdeaSeedsAction(formData: FormData) {
  await requireUser();
  const documentId = field(formData, "documentId");
  const sourceQuestion = field(formData, "sourceQuestion");
  const data = await getTrainingDocument(documentId);
  if (!data) redirect("/papers");

  const prompt = `
Research DojoのPaper Idea Grow Roomです。
以下の論文から、理解度チェックの問題でも、AIによるアイデア提案でもなく、
ユーザー自身が新しい研究アイデアを考えるための「厳しめの問い」を生成してください。

目的:
- AIが完成案を出さない。考える主体はユーザー。
- ただし問いはかなり厳しめにする。
- ユーザーが曖昧な発想で逃げられないよう、何を答えなければいけないかを明確にする。
- 論文の仮定、失敗条件、実験設計、比較対象、再現性、新規性の弱さを突く。
- thinking_drills は「ユーザーが自分で書く作業」の形式にする。
- paper_anchor には、その問いが論文のどの要素に根を持つかを書く。
- 日本語で書く
- JSONのみ

ユーザーが今考えたい/伸ばしたい観点:
${sourceQuestion || "未指定。論文から自然に、研究アイデア化するときの弱点を突く。"}

Paper:
${data.document.title}

Paper Card:
${JSON.stringify(data.card ?? {}, null, 2)}

Paper text excerpt:
${data.document.extracted_text.slice(0, 26_000)}
`;

  const result = await runCodexJson<PaperIdeaSeedsResult>({
    prompt,
    outputSchema: paperIdeaSeedsSchema,
    sandbox: "read-only",
  });
  await savePaperIdeaSeeds(documentId, sourceQuestion, result.json, result.text);
  revalidatePath("/papers");
  revalidatePath(`/papers/${documentId}/ideas`);
  redirect(`/papers/${documentId}/ideas`);
}

export async function submitPaperIdeaAnswerAction(formData: FormData) {
  const user = await requireUser();
  const documentId = field(formData, "documentId");
  const seedId = field(formData, "seedId");
  const questionIndex = Number(field(formData, "questionIndex"));
  const answerText = field(formData, "answerText");
  if (!documentId || !seedId || !Number.isInteger(questionIndex) || !answerText) {
    redirect(`/papers/${documentId}/ideas`);
  }

  const data = await getTrainingDocument(documentId);
  const generations = await getPaperIdeaSeeds(documentId);
  const seed = generations.find((item) => item.id === seedId);
  const question = seed?.pressure_questions[questionIndex];
  if (!data || !seed || !question) redirect("/papers");

  const prompt = `
あなたは非常に厳しいAI/ML研究アイデア査読者です。
ユーザーが論文から発想した回答を採点してください。
褒めすぎず、研究として弱い点を具体的に指摘してください。
ただし人格否定は禁止です。

採点ルーブリック:
- problem_specificity: 20
- novelty: 20
- paper_grounding: 20
- feasibility: 15
- evaluation_design: 15
- risk_awareness: 10

観点:
- ただの感想や「面白そう」なら低く採点する
- 論文のどの仮定・失敗条件・実験設定から発想しているかを見る
- 既存研究との差分が曖昧なら厳しく指摘する
- 実験で反証できないアイデアは弱いと指摘する
- missing_perspectivesには、次に考えるべき不足観点を入れる
- revision_challengeには、次に書き直すための具体的な課題を入れる
- 日本語で書く
- JSONのみ

Paper:
${data.document.title}

Paper Card:
${JSON.stringify(data.card ?? {}, null, 2)}

Idea Room focus:
${seed.source_question || "(未指定)"}

Question:
${question.question}

What the user must answer:
${question.what_you_must_answer}

Why it matters:
${question.why_it_matters}

User answer:
${answerText}
`;

  const result = await runCodexJson<PaperIdeaAnswerReview>({
    prompt,
    outputSchema: paperIdeaAnswerReviewSchema,
    sandbox: "read-only",
  });
  await savePaperIdeaAnswerReview(
    user.id,
    seedId,
    questionIndex,
    answerText,
    result.json,
    result.text,
  );
  revalidatePath(`/papers/${documentId}/ideas`);
  redirect(`/papers/${documentId}/ideas`);
}

export async function createTopicRoomAction(formData: FormData) {
  const user = await requireUser();
  const project = await ensureDefaultProject(user);
  const topic = field(formData, "topic");
  const level = field(formData, "level") || "中級者";
  if (!topic) redirect("/topic-room");

  const prompt = `
Research Dojoに新しいTopic Roomを作ります。
トピック「${topic}」について、${level}向けの理解診断問題を作ってください。

設計方針:
- 単なる用語暗記ではなく、モデルの仕組み、比較、失敗条件、実験判断を問う
- ユーザーの苦手領域を推定できるよう、各問題は別のcore areaを狙う
- 機械学習トピックなら、中級者が「分かったつもり」になりやすい所を突く
- 日本語で書く
- JSONのみ
`;

  const result = await runCodexJson<TopicRoomGenerationResult>({
    prompt,
    outputSchema: topicRoomGenerationSchema,
    sandbox: "read-only",
  });
  const roomId = await saveTopicRoom(project.id, topic, result.json);
  revalidatePath("/topic-room");
  redirect(`/topic-room/${roomId}`);
}

export async function submitTopicAnswerAction(formData: FormData) {
  const user = await requireUser();
  const roomId = field(formData, "roomId");
  const questionId = field(formData, "questionId");
  const answerText = field(formData, "answerText");
  if (!roomId || !questionId || !answerText) redirect(`/topic-room/${roomId}`);

  const question = await get<{
    area: string;
    question: string;
    difficulty: number;
    expected_points: string;
  }>("SELECT area, question, difficulty, expected_points FROM topic_questions WHERE id = ?", [
    questionId,
  ]);
  const room = await get<{ topic: string; core_areas: string }>(
    "SELECT topic, core_areas FROM topic_rooms WHERE id = ?",
    [roomId],
  );
  if (!question || !room) redirect("/topic-room");

  const prompt = `
あなたは厳しい研究トピック診断官です。
ユーザーの回答から、このトピック内で何が苦手かを推定してください。
褒めすぎず、理解の穴を具体的な概念名で返してください。
日本語で、JSONのみで出力してください。

Topic:
${room.topic}

Core areas:
${room.core_areas}

Question area:
${question.area}

Question:
${question.question}

Expected points:
${decodeJson<string[]>(question.expected_points, []).join("\n")}

User answer:
${answerText}
`;

  const result = await runCodexJson<TopicAnswerReviewResult>({
    prompt,
    outputSchema: topicAnswerReviewSchema,
    sandbox: "read-only",
  });
  await saveTopicAnswerReview(user.id, questionId, answerText, result.json, result.text);
  revalidatePath(`/topic-room/${roomId}`);
  redirect(`/topic-room/${roomId}`);
}

export async function createResearchLensAction(formData: FormData) {
  const user = await requireUser();
  const project = await ensureDefaultProject(user);
  const seedText = field(formData, "seedText");
  if (!seedText) redirect("/research-lab");

  const prompt = `
Research DojoのResearch Labです。
以下の研究アイデア/トピックを、普通の要約ではなく「深く考えるための変なレンズ」に分解してください。

欲しいもの:
- 隠れた仮定
- 反証できる最小テスト
- 別分野や逆向きの発想から出る weird angle
- 最小実験
- 査読者の一番痛い攻撃
- 次にnotebookで検証するプロンプト

制約:
- 日本語
- アイデアを無条件に肯定しない
- JSONのみ

Seed:
${seedText}
`;

  const result = await runCodexJson<ResearchLensResult>({
    prompt,
    outputSchema: researchLensSchema,
    sandbox: "read-only",
  });
  await saveResearchLens(project.id, seedText, result.json, result.text);
  revalidatePath("/research-lab");
  redirect("/research-lab");
}

export async function registerRepoAction(formData: FormData) {
  const user = await requireUser();
  const project = await ensureDefaultProject(user);
  const repoPath = path.resolve(field(formData, "repoPath"));
  await registerRepo(project.id, repoPath);
  revalidatePath("/codex-tasks");
  redirect("/codex-tasks");
}

export async function createCodexTaskAction(formData: FormData) {
  const user = await requireUser();
  const project = await ensureDefaultProject(user);
  const repoPath = field(formData, "repoPath");
  const prompt = field(formData, "prompt");
  if (!repoPath || !prompt) redirect("/codex-tasks");
  await createCodexTask(project.id, repoPath, prompt);
  revalidatePath("/codex-tasks");
  redirect("/codex-tasks");
}

export async function startCodexTaskAction(formData: FormData) {
  await requireUser();
  const taskId = field(formData, "taskId");
  const task = await get<{ id: string; repo_path: string; prompt: string }>(
    "SELECT id, repo_path, prompt FROM codex_tasks WHERE id = ?",
    [taskId],
  );
  if (!task) redirect("/codex-tasks");

  await updateTask(taskId, { status: "running" });
  await addTaskEvent(taskId, "started", "Codex App Server task started.");

  try {
    const result = await runCodexText({
      cwd: task.repo_path,
      sandbox: "workspace-write",
      timeoutMs: 240_000,
      prompt: `
Research Dojo implementation task.

Rules:
- Do not run git commit.
- Do not run git push.
- Do not delete files unless the task explicitly requires it.
- Keep changes scoped.
- At the end, summarize changed files and validation.

Task:
${task.prompt}
`,
      onEvent: async (event) => {
        if (
          [
            "turn/started",
            "turn/completed",
            "item/agentMessage/delta",
            "item/commandExecution/outputDelta",
            "item/fileChange/patchUpdated",
            "stderr",
          ].includes(event.type)
        ) {
          await addTaskEvent(taskId, event.type, event.message, event.payload);
        }
      },
    });
    await updateTask(taskId, {
      status: "completed",
      threadId: result.threadId,
      turnId: result.turnId,
      resultSummary: result.text,
    });
    await addTaskEvent(taskId, "completed", result.text);
  } catch (error) {
    await updateTask(taskId, { status: "failed" });
    await addTaskEvent(
      taskId,
      "failed",
      error instanceof Error ? error.message : String(error),
    );
  }

  revalidatePath("/codex-tasks");
  redirect("/codex-tasks");
}
