import "server-only";

import path from "node:path";
import { all, decodeJson, encodeJson, execWrite, get, id, run } from "@/lib/db";
import type { CurrentUser } from "@/lib/auth";
import type {
  AdaptiveQuestionGenerationResult,
  IdeaRefinement,
  PaperIdeaAnswerReview,
  PaperIdeaSeedsResult,
  PaperGenerationResult,
  ResearchLensResult,
  ReviewResult,
  TopicAnswerReviewResult,
  TopicRoomGenerationResult,
} from "@/lib/schemas";

export type ProjectRow = {
  id: string;
  user_id: string;
  name: string;
  theme: string | null;
  description: string | null;
  created_at: string;
};

export type DocumentRow = {
  id: string;
  project_id: string;
  type: string;
  title: string;
  source_url: string | null;
  metadata: string | null;
  extracted_text: string;
  created_at: string;
};

export type QuestionRow = {
  id: string;
  document_id: string;
  type: string;
  question: string;
  expected_points: string;
  difficulty: number;
  source: string;
  target_weakness: string;
  focus_reason: string;
  created_at: string;
};

export type PaperCardRow = {
  id: string;
  document_id: string;
  keywords: string;
  one_line_summary: string;
  problem: string;
  prior_weakness: string;
  core_method: string;
  mechanism: string;
  assumptions: string;
  limitations: string;
  research_connection: string;
};

export type PaperListRow = DocumentRow & {
  question_count: number;
  latest_score: number | null;
  card_keywords: string | null;
  tags: string[];
};

export type PaperIdeaSeedRow = {
  id: string;
  document_id: string;
  source_question: string;
  paper_takeaway: string;
  seed_questions: string;
  idea_seeds: string;
  next_actions: string;
  raw_output: string;
  created_at: string;
};

export type PaperIdeaAnswerReviewRow = {
  id: string;
  seed_id: string;
  question_index: number;
  user_id: string;
  answer_text: string;
  total_score: number;
  rubric_scores: string;
  strengths: string;
  fatal_issues: string;
  missing_perspectives: string;
  next_fix: string;
  revision_challenge: string;
  reviewer_comment: string;
  raw_output: string;
  created_at: string;
};

export type AnswerReviewRow = {
  answer_id: string;
  answer_text: string;
  answer_created_at: string;
  total_score: number | null;
  decision: string | null;
  rubric_scores: string | null;
  fatal_issues: string | null;
  next_fix: string | null;
  revision_challenge: string | null;
  reviewer_comments: string | null;
  reading_gaps: string | null;
};

export type TopicRoomRow = {
  id: string;
  project_id: string;
  topic: string;
  level: string;
  core_areas: string;
  created_at: string;
};

export type TopicQuestionRow = {
  id: string;
  room_id: string;
  area: string;
  question: string;
  difficulty: number;
  expected_points: string;
  why_this_question: string;
  created_at: string;
};

export async function ensureDefaultProject(user: CurrentUser) {
  const existing = await get<ProjectRow>(
    "SELECT * FROM projects WHERE user_id = ? ORDER BY created_at ASC LIMIT 1",
    [user.id],
  );
  if (existing) return existing;

  const projectId = id("prj");
  await run(
    `INSERT INTO projects (id, user_id, name, theme, description)
     VALUES (?, ?, ?, ?, ?)`,
    [
      projectId,
      user.id,
      "Research Dojo",
      "自分の失敗を理解し学習を改善するAI",
      "Codex App Serverで論文理解、厳しめ査読、再提出、実装タスク化を回す研究ジム。",
    ],
  );
  return (await get<ProjectRow>("SELECT * FROM projects WHERE id = ?", [projectId]))!;
}

function cleanKeyword(keyword: string) {
  return keyword.trim().replace(/^#+/, "").replace(/\s+/g, " ").slice(0, 48);
}

export function normalizeKeywords(input: string | string[] | null | undefined) {
  const raw = Array.isArray(input) ? input : (input ?? "").split(/[,\n、;；]/);
  const seen = new Set<string>();
  const keywords: string[] = [];
  for (const item of raw) {
    const keyword = cleanKeyword(item);
    const key = keyword.toLocaleLowerCase();
    if (!keyword || seen.has(key)) continue;
    seen.add(key);
    keywords.push(keyword);
    if (keywords.length >= 12) break;
  }
  return keywords;
}

function mergeKeywords(...groups: Array<string[]>) {
  return normalizeKeywords(groups.flat());
}

export async function createDocument(
  projectId: string,
  title: string,
  text: string,
  sourceUrl?: string,
  metadata?: Record<string, unknown>,
) {
  const documentId = id("doc");
  await run(
    `INSERT INTO documents (id, project_id, title, extracted_text, source_url, metadata)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [documentId, projectId, title, text, sourceUrl ?? null, metadata ? encodeJson(metadata) : null],
  );
  return documentId;
}

export async function savePaperGeneration(documentId: string, result: PaperGenerationResult) {
  await execWrite((db) => {
    db.run("DELETE FROM paper_cards WHERE document_id = ?", [documentId]);
    db.run("DELETE FROM questions WHERE document_id = ?", [documentId]);
    db.run(
      `INSERT INTO paper_cards (
        id, document_id, keywords, one_line_summary, problem, prior_weakness, core_method,
        mechanism, assumptions, limitations, research_connection
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id("card"),
        documentId,
        encodeJson(normalizeKeywords(result.paper_card.keywords)),
        result.paper_card.one_line_summary,
        result.paper_card.problem,
        result.paper_card.prior_weakness,
        result.paper_card.core_method,
        result.paper_card.mechanism,
        result.paper_card.assumptions,
        result.paper_card.limitations,
        result.paper_card.research_connection,
      ],
    );
    for (const question of result.questions) {
      db.run(
        `INSERT INTO questions (
          id, document_id, type, question, difficulty, expected_points, source
        ) VALUES (?, ?, ?, ?, ?, ?, 'initial')`,
        [
          id("que"),
          documentId,
          question.type,
          question.question,
          question.difficulty,
          encodeJson(question.expected_points),
        ],
      );
    }
  });
}

export async function getDocuments(projectId: string) {
  const rows = await all<
    DocumentRow & {
      question_count: number;
      latest_score: number | null;
      card_keywords: string | null;
    }
  >(
    `SELECT documents.*,
            paper_cards.keywords AS card_keywords,
            COUNT(DISTINCT questions.id) AS question_count,
            MAX(reviews.total_score) AS latest_score
       FROM documents
       LEFT JOIN paper_cards ON paper_cards.document_id = documents.id
       LEFT JOIN questions ON questions.document_id = documents.id
       LEFT JOIN answers ON answers.question_id = questions.id
       LEFT JOIN reviews ON reviews.answer_id = answers.id
      WHERE documents.project_id = ?
      GROUP BY documents.id
      ORDER BY documents.created_at DESC`,
    [projectId],
  );
  return rows.map((row) => {
    const metadata = decodeJson<{ keywords?: string[] }>(row.metadata, {});
    return {
      ...row,
      tags: mergeKeywords(
        normalizeKeywords(metadata.keywords ?? []),
        normalizeKeywords(decodeJson<string[]>(row.card_keywords, [])),
      ),
    };
  }) satisfies PaperListRow[];
}

export async function getTrainingDocument(documentId: string) {
  const document = await get<DocumentRow>("SELECT * FROM documents WHERE id = ?", [
    documentId,
  ]);
  if (!document) return null;
  const card = await get<PaperCardRow>("SELECT * FROM paper_cards WHERE document_id = ?", [
    documentId,
  ]);
  const questions = await all<QuestionRow>(
    "SELECT * FROM questions WHERE document_id = ? ORDER BY created_at ASC",
    [documentId],
  );
  return {
    document,
    card,
    questions: questions.map((question) => ({
      ...question,
      expected: decodeJson<string[]>(question.expected_points, []),
    })),
  };
}

export async function latestAnswerReviews(userId: string, questionIds: string[]) {
  if (questionIds.length === 0) return new Map<string, AnswerReviewRow>();
  const placeholders = questionIds.map(() => "?").join(",");
  const rows = await all<AnswerReviewRow & { question_id: string }>(
    `SELECT answers.question_id,
            answers.id AS answer_id,
            answers.answer_text,
            answers.created_at AS answer_created_at,
            reviews.total_score,
            reviews.decision,
            reviews.rubric_scores,
            reviews.fatal_issues,
            reviews.next_fix,
            reviews.revision_challenge,
            reviews.reviewer_comments,
            reviews.reading_gaps
       FROM answers
       LEFT JOIN reviews ON reviews.answer_id = answers.id
      WHERE answers.user_id = ? AND answers.question_id IN (${placeholders})
      ORDER BY answers.created_at DESC`,
    [userId, ...questionIds],
  );
  const map = new Map<string, AnswerReviewRow>();
  for (const row of rows) {
    if (!map.has(row.question_id)) map.set(row.question_id, row);
  }
  return map;
}

export async function saveAnswerReview(
  userId: string,
  questionId: string,
  answerText: string,
  review: ReviewResult,
  rawOutput: string,
) {
  const answerId = id("ans");
  const reviewId = id("rev");
  await execWrite((db) => {
    db.run(
      `INSERT INTO answers (id, question_id, user_id, answer_text)
       VALUES (?, ?, ?, ?)`,
      [answerId, questionId, userId, answerText],
    );
    db.run(
      `INSERT INTO reviews (
        id, answer_id, total_score, decision, rubric_scores, strengths,
        fatal_issues, missing_perspectives, shallow_phrases, next_fix,
        revision_challenge, reviewer_comments, reading_gaps, raw_output
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        reviewId,
        answerId,
        review.total_score,
        review.decision,
        encodeJson(review.rubric_scores),
        encodeJson(review.strengths),
        encodeJson(review.fatal_issues),
        encodeJson(review.missing_perspectives),
        encodeJson(review.shallow_phrases),
        review.next_fix,
        review.revision_challenge,
        encodeJson(review.reviewer_comments),
        encodeJson(review.reading_gaps),
        rawOutput,
      ],
    );
  });
}

export async function appendAdaptiveQuestions(
  documentId: string,
  result: AdaptiveQuestionGenerationResult,
) {
  await execWrite((db) => {
    for (const question of result.questions) {
      db.run(
        `INSERT INTO questions (
          id, document_id, type, question, difficulty, expected_points,
          source, target_weakness, focus_reason
        ) VALUES (?, ?, ?, ?, ?, ?, 'adaptive', ?, ?)`,
        [
          id("que"),
          documentId,
          question.type,
          question.question,
          question.difficulty,
          encodeJson(question.expected_points),
          question.target_weakness,
          question.focus_reason,
        ],
      );
    }
  });
}

export async function saveIdea(projectId: string, rawIdea: string, result: IdeaRefinement, rawOutput: string) {
  const ideaId = id("idea");
  await run(
    `INSERT INTO ideas (
      id, project_id, raw_idea, research_hypothesis, core_claim, novelty_candidates,
      method_sketch, experiment_plan, baselines, ablations, expected_failure_cases,
      reviewer_risks, codex_task_prompt, raw_output
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      ideaId,
      projectId,
      rawIdea,
      result.research_hypothesis,
      result.core_claim,
      encodeJson(result.novelty_candidates),
      result.method_sketch,
      encodeJson(result.experiment_plan),
      encodeJson(result.baselines),
      encodeJson(result.ablations),
      encodeJson(result.expected_failure_cases),
      encodeJson(result.reviewer_risks),
      result.codex_task_prompt,
      rawOutput,
    ],
  );
  return ideaId;
}

export async function getIdeas(projectId: string) {
  const rows = await all<{
    id: string;
    project_id: string;
    raw_idea: string;
    research_hypothesis: string;
    core_claim: string;
    novelty_candidates: string;
    method_sketch: string;
    experiment_plan: string;
    baselines: string;
    ablations: string;
    expected_failure_cases: string;
    reviewer_risks: string;
    codex_task_prompt: string;
    raw_output: string;
    created_at: string;
  }>(
    "SELECT * FROM ideas WHERE project_id = ? ORDER BY created_at DESC",
    [projectId],
  );
  return rows.map((row) => ({
    ...row,
    novelty_candidates: decodeJson<string[]>(row.novelty_candidates, []),
    experiment_plan: decodeJson<string[]>(row.experiment_plan, []),
    baselines: decodeJson<string[]>(row.baselines, []),
    ablations: decodeJson<string[]>(row.ablations, []),
    expected_failure_cases: decodeJson<string[]>(row.expected_failure_cases, []),
    reviewer_risks: decodeJson<string[]>(row.reviewer_risks, []),
  }));
}

export async function savePaperIdeaSeeds(
  documentId: string,
  sourceQuestion: string,
  result: PaperIdeaSeedsResult,
  rawOutput: string,
) {
  const seedId = id("pseed");
  await run(
    `INSERT INTO paper_idea_seeds (
      id, document_id, source_question, paper_takeaway, seed_questions,
      idea_seeds, next_actions, raw_output
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      seedId,
      documentId,
      sourceQuestion,
      result.paper_takeaway,
      encodeJson(result.pressure_questions),
      encodeJson(result.thinking_drills),
      encodeJson(result.next_actions),
      rawOutput,
    ],
  );
  return seedId;
}

export async function getPaperIdeaSeeds(documentId: string) {
  const rows = await all<PaperIdeaSeedRow>(
    "SELECT * FROM paper_idea_seeds WHERE document_id = ? ORDER BY created_at DESC",
    [documentId],
  );
  return rows.map((row) => ({
    ...row,
    pressure_questions: decodeJson<PaperIdeaSeedsResult["pressure_questions"]>(
      row.seed_questions,
      [],
    ),
    thinking_drills: decodeJson<PaperIdeaSeedsResult["thinking_drills"]>(
      row.idea_seeds,
      [],
    ),
    next_actions: decodeJson<string[]>(row.next_actions, []),
  }));
}

export async function latestPaperIdeaAnswerReviews(userId: string, seedId: string) {
  const rows = await all<PaperIdeaAnswerReviewRow>(
    `SELECT *
       FROM paper_idea_answers
      WHERE user_id = ? AND seed_id = ?
      ORDER BY created_at DESC`,
    [userId, seedId],
  );
  const map = new Map<number, PaperIdeaAnswerReviewRow & {
    rubric: PaperIdeaAnswerReview["rubric_scores"];
    strengths_list: string[];
    fatal_issue_list: string[];
    missing_perspective_list: string[];
  }>();
  for (const row of rows) {
    if (map.has(row.question_index)) continue;
    map.set(row.question_index, {
      ...row,
      rubric: decodeJson<PaperIdeaAnswerReview["rubric_scores"]>(row.rubric_scores, {
        problem_specificity: 0,
        novelty: 0,
        paper_grounding: 0,
        feasibility: 0,
        evaluation_design: 0,
        risk_awareness: 0,
      }),
      strengths_list: decodeJson<string[]>(row.strengths, []),
      fatal_issue_list: decodeJson<string[]>(row.fatal_issues, []),
      missing_perspective_list: decodeJson<string[]>(row.missing_perspectives, []),
    });
  }
  return map;
}

export async function savePaperIdeaAnswerReview(
  userId: string,
  seedId: string,
  questionIndex: number,
  answerText: string,
  review: PaperIdeaAnswerReview,
  rawOutput: string,
) {
  await run(
    `INSERT INTO paper_idea_answers (
      id, seed_id, question_index, user_id, answer_text, total_score,
      rubric_scores, strengths, fatal_issues, missing_perspectives,
      next_fix, revision_challenge, reviewer_comment, raw_output
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id("pia"),
      seedId,
      questionIndex,
      userId,
      answerText,
      review.total_score,
      encodeJson(review.rubric_scores),
      encodeJson(review.strengths),
      encodeJson(review.fatal_issues),
      encodeJson(review.missing_perspectives),
      review.next_fix,
      review.revision_challenge,
      review.reviewer_comment,
      rawOutput,
    ],
  );
}

export async function saveTopicRoom(
  projectId: string,
  topic: string,
  result: TopicRoomGenerationResult,
) {
  const roomId = id("top");
  await execWrite((db) => {
    db.run(
      `INSERT INTO topic_rooms (id, project_id, topic, level, core_areas)
       VALUES (?, ?, ?, ?, ?)`,
      [
        roomId,
        projectId,
        result.topic_map.topic || topic,
        result.topic_map.level,
        encodeJson(result.topic_map.core_areas),
      ],
    );
    for (const question of result.questions) {
      db.run(
        `INSERT INTO topic_questions (
          id, room_id, area, question, difficulty, expected_points, why_this_question
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          id("tq"),
          roomId,
          question.area,
          question.question,
          question.difficulty,
          encodeJson(question.expected_points),
          question.why_this_question,
        ],
      );
    }
  });
  return roomId;
}

export async function getTopicRooms(projectId: string, userId: string) {
  const rooms = await all<TopicRoomRow & { question_count: number; latest_score: number | null }>(
    `SELECT topic_rooms.*,
            COUNT(DISTINCT topic_questions.id) AS question_count,
            MAX(topic_answers.score) AS latest_score
       FROM topic_rooms
       LEFT JOIN topic_questions ON topic_questions.room_id = topic_rooms.id
       LEFT JOIN topic_answers ON topic_answers.question_id = topic_questions.id
        AND topic_answers.user_id = ?
      WHERE topic_rooms.project_id = ?
      GROUP BY topic_rooms.id
      ORDER BY topic_rooms.created_at DESC`,
    [userId, projectId],
  );
  return rooms.map((room) => ({
    ...room,
    core_areas: decodeJson<string[]>(room.core_areas, []),
  }));
}

export async function getTopicRoom(roomId: string, userId: string) {
  const room = await get<TopicRoomRow>("SELECT * FROM topic_rooms WHERE id = ?", [roomId]);
  if (!room) return null;
  const questions = await all<TopicQuestionRow>(
    "SELECT * FROM topic_questions WHERE room_id = ? ORDER BY created_at ASC",
    [roomId],
  );
  const answers = await all<{
    question_id: string;
    answer_text: string;
    score: number;
    understanding_level: string;
    strong_points: string;
    weak_points: string;
    missing_concepts: string;
    next_question_strategy: string;
    created_at: string;
  }>(
    `SELECT *
       FROM topic_answers
      WHERE user_id = ? AND question_id IN (${questions.map(() => "?").join(",") || "NULL"})
      ORDER BY created_at DESC`,
    [userId, ...questions.map((question) => question.id)],
  );
  const answerMap = new Map<string, (typeof answers)[number]>();
  for (const answer of answers) {
    if (!answerMap.has(answer.question_id)) answerMap.set(answer.question_id, answer);
  }
  return {
    room: {
      ...room,
      core_areas: decodeJson<string[]>(room.core_areas, []),
    },
    questions: questions.map((question) => ({
      ...question,
      expected: decodeJson<string[]>(question.expected_points, []),
      latest: answerMap.get(question.id) ?? null,
    })),
  };
}

export async function saveTopicAnswerReview(
  userId: string,
  questionId: string,
  answerText: string,
  review: TopicAnswerReviewResult,
  rawOutput: string,
) {
  await run(
    `INSERT INTO topic_answers (
      id, question_id, user_id, answer_text, score, understanding_level,
      strong_points, weak_points, missing_concepts, next_question_strategy, raw_output
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id("ta"),
      questionId,
      userId,
      answerText,
      review.score,
      review.understanding_level,
      encodeJson(review.strong_points),
      encodeJson(review.weak_points),
      encodeJson(review.missing_concepts),
      review.next_question_strategy,
      rawOutput,
    ],
  );
}

export async function saveResearchLens(
  projectId: string,
  seedText: string,
  result: ResearchLensResult,
  rawOutput: string,
) {
  await run(
    `INSERT INTO research_lenses (
      id, project_id, seed_text, core_claim, hidden_assumptions,
      falsification_tests, weird_angles, minimal_experiment, reviewer_attack,
      next_notebook_prompt, raw_output
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id("lens"),
      projectId,
      seedText,
      result.core_claim,
      encodeJson(result.hidden_assumptions),
      encodeJson(result.falsification_tests),
      encodeJson(result.weird_angles),
      result.minimal_experiment,
      result.reviewer_attack,
      result.next_notebook_prompt,
      rawOutput,
    ],
  );
}

export async function getResearchLenses(projectId: string) {
  const rows = await all<{
    id: string;
    seed_text: string;
    core_claim: string;
    hidden_assumptions: string;
    falsification_tests: string;
    weird_angles: string;
    minimal_experiment: string;
    reviewer_attack: string;
    next_notebook_prompt: string;
    created_at: string;
  }>(
    "SELECT * FROM research_lenses WHERE project_id = ? ORDER BY created_at DESC",
    [projectId],
  );
  return rows.map((row) => ({
    ...row,
    hidden_assumptions: decodeJson<string[]>(row.hidden_assumptions, []),
    falsification_tests: decodeJson<string[]>(row.falsification_tests, []),
    weird_angles: decodeJson<ResearchLensResult["weird_angles"]>(row.weird_angles, []),
  }));
}

export async function registerRepo(projectId: string, repoPath: string) {
  const normalized = path.resolve(repoPath);
  await run(
    `INSERT OR IGNORE INTO repo_paths (id, project_id, path, label)
     VALUES (?, ?, ?, ?)`,
    [id("repo"), projectId, normalized, path.basename(normalized)],
  );
}

export async function getRepos(projectId: string) {
  return all<{ id: string; path: string; label: string | null }>(
    "SELECT * FROM repo_paths WHERE project_id = ? ORDER BY created_at DESC",
    [projectId],
  );
}

export async function createCodexTask(projectId: string, repoPath: string, prompt: string) {
  const taskId = id("task");
  await run(
    `INSERT INTO codex_tasks (id, project_id, repo_path, prompt, status)
     VALUES (?, ?, ?, ?, 'queued')`,
    [taskId, projectId, path.resolve(repoPath), prompt],
  );
  return taskId;
}

export async function getCodexTasks(projectId: string) {
  return all<Record<string, string>>(
    "SELECT * FROM codex_tasks WHERE project_id = ? ORDER BY created_at DESC",
    [projectId],
  );
}

export async function addTaskEvent(taskId: string, type: string, message: string, payload?: unknown) {
  await run(
    `INSERT INTO codex_task_events (id, task_id, type, message, payload)
     VALUES (?, ?, ?, ?, ?)`,
    [id("evt"), taskId, type, message, payload ? encodeJson(payload) : null],
  );
}

export async function updateTask(
  taskId: string,
  fields: { status?: string; threadId?: string; turnId?: string; resultSummary?: string; diffText?: string },
) {
  const updates: string[] = ["updated_at = CURRENT_TIMESTAMP"];
  const values: Array<string | null> = [];
  if (fields.status !== undefined) {
    updates.push("status = ?");
    values.push(fields.status);
  }
  if (fields.threadId !== undefined) {
    updates.push("thread_id = ?");
    values.push(fields.threadId);
  }
  if (fields.turnId !== undefined) {
    updates.push("turn_id = ?");
    values.push(fields.turnId);
  }
  if (fields.resultSummary !== undefined) {
    updates.push("result_summary = ?");
    values.push(fields.resultSummary);
  }
  if (fields.diffText !== undefined) {
    updates.push("diff_text = ?");
    values.push(fields.diffText);
  }
  await run(`UPDATE codex_tasks SET ${updates.join(", ")} WHERE id = ?`, [
    ...values,
    taskId,
  ]);
}

export async function dashboardStats(projectId: string, userId: string) {
  const docs = await getDocuments(projectId);
  const pending = await all<{ count: number }>(
    `SELECT COUNT(*) AS count
       FROM questions
       JOIN documents ON documents.id = questions.document_id
      WHERE documents.project_id = ?
        AND questions.id NOT IN (
          SELECT question_id FROM answers WHERE user_id = ?
        )`,
    [projectId, userId],
  );
  const reviews = await all<{ total_score: number; decision: string; created_at: string }>(
    `SELECT reviews.total_score, reviews.decision, reviews.created_at
       FROM reviews
       JOIN answers ON answers.id = reviews.answer_id
      WHERE answers.user_id = ?
      ORDER BY reviews.created_at DESC
      LIMIT 8`,
    [userId],
  );
  return {
    documents: docs,
    pendingQuestions: Number(pending[0]?.count ?? 0),
    reviews,
  };
}
