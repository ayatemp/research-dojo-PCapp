import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import initSqlJs, { type Database, type ParamsObject } from "sql.js";

type RowValue = string | number | Uint8Array | null;
type Params = Array<RowValue> | ParamsObject;

let dbPromise: Promise<Database> | null = null;

function sqlJsDistPath() {
  const candidates = [
    process.env.RESEARCH_DOJO_SQLJS_DIR,
    path.join(/*turbopackIgnore: true*/ process.cwd(), "node_modules", "sql.js", "dist"),
    path.join(/*turbopackIgnore: true*/ process.cwd(), "../../node_modules/sql.js/dist"),
  ].filter(Boolean) as string[];

  return candidates.find((candidate) => fs.existsSync(candidate)) ?? candidates.at(-1)!;
}

function dbPath() {
  return (
    process.env.RESEARCH_DOJO_DB_PATH ??
    path.join(
      /*turbopackIgnore: true*/ process.cwd(),
      ".data",
      "research-dojo.sqlite",
    )
  );
}

async function openDb() {
  if (dbPromise) return dbPromise;

  dbPromise = (async () => {
    const sqlJsDir = sqlJsDistPath();
    const SQL = await initSqlJs({
      locateFile: (file) => path.join(sqlJsDir, file),
    });

    const filePath = dbPath();
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    const db = fs.existsSync(filePath)
      ? new SQL.Database(fs.readFileSync(filePath))
      : new SQL.Database();

    migrate(db);
    persist(db);
    return db;
  })();

  return dbPromise;
}

function migrate(db: Database) {
  db.run(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      theme TEXT,
      description TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS repo_paths (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      path TEXT NOT NULL,
      label TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(project_id, path),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'paper',
      title TEXT NOT NULL,
      source_url TEXT,
      file_path TEXT,
      extracted_text TEXT NOT NULL DEFAULT '',
      metadata TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS paper_cards (
      id TEXT PRIMARY KEY,
      document_id TEXT NOT NULL UNIQUE,
      one_line_summary TEXT NOT NULL DEFAULT '',
      problem TEXT NOT NULL DEFAULT '',
      prior_weakness TEXT NOT NULL DEFAULT '',
      core_method TEXT NOT NULL DEFAULT '',
      mechanism TEXT NOT NULL DEFAULT '',
      assumptions TEXT NOT NULL DEFAULT '',
      limitations TEXT NOT NULL DEFAULT '',
      research_connection TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS questions (
      id TEXT PRIMARY KEY,
      document_id TEXT NOT NULL,
      type TEXT NOT NULL,
      question TEXT NOT NULL,
      expected_points TEXT NOT NULL,
      difficulty INTEGER NOT NULL,
      source TEXT NOT NULL DEFAULT 'initial',
      target_weakness TEXT NOT NULL DEFAULT '',
      focus_reason TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS answers (
      id TEXT PRIMARY KEY,
      question_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      answer_text TEXT NOT NULL,
      revision_of_id TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (revision_of_id) REFERENCES answers(id)
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id TEXT PRIMARY KEY,
      answer_id TEXT NOT NULL,
      total_score INTEGER NOT NULL,
      decision TEXT NOT NULL,
      rubric_scores TEXT NOT NULL,
      strengths TEXT NOT NULL,
      fatal_issues TEXT NOT NULL,
      missing_perspectives TEXT NOT NULL,
      shallow_phrases TEXT NOT NULL,
      next_fix TEXT NOT NULL,
      revision_challenge TEXT NOT NULL,
      reviewer_comments TEXT NOT NULL,
      reading_gaps TEXT NOT NULL DEFAULT '[]',
      raw_output TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (answer_id) REFERENCES answers(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS ideas (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      raw_idea TEXT NOT NULL,
      research_hypothesis TEXT NOT NULL DEFAULT '',
      core_claim TEXT NOT NULL DEFAULT '',
      novelty_candidates TEXT NOT NULL DEFAULT '[]',
      method_sketch TEXT NOT NULL DEFAULT '',
      experiment_plan TEXT NOT NULL DEFAULT '[]',
      baselines TEXT NOT NULL DEFAULT '[]',
      ablations TEXT NOT NULL DEFAULT '[]',
      expected_failure_cases TEXT NOT NULL DEFAULT '[]',
      reviewer_risks TEXT NOT NULL DEFAULT '[]',
      codex_task_prompt TEXT NOT NULL DEFAULT '',
      raw_output TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS paper_idea_seeds (
      id TEXT PRIMARY KEY,
      document_id TEXT NOT NULL,
      source_question TEXT NOT NULL DEFAULT '',
      paper_takeaway TEXT NOT NULL DEFAULT '',
      seed_questions TEXT NOT NULL DEFAULT '[]',
      idea_seeds TEXT NOT NULL DEFAULT '[]',
      next_actions TEXT NOT NULL DEFAULT '[]',
      raw_output TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS paper_idea_answers (
      id TEXT PRIMARY KEY,
      seed_id TEXT NOT NULL,
      question_index INTEGER NOT NULL,
      user_id TEXT NOT NULL,
      answer_text TEXT NOT NULL,
      total_score INTEGER NOT NULL,
      rubric_scores TEXT NOT NULL DEFAULT '{}',
      strengths TEXT NOT NULL DEFAULT '[]',
      fatal_issues TEXT NOT NULL DEFAULT '[]',
      missing_perspectives TEXT NOT NULL DEFAULT '[]',
      next_fix TEXT NOT NULL DEFAULT '',
      revision_challenge TEXT NOT NULL DEFAULT '',
      reviewer_comment TEXT NOT NULL DEFAULT '',
      raw_output TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (seed_id) REFERENCES paper_idea_seeds(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS topic_rooms (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      topic TEXT NOT NULL,
      level TEXT NOT NULL DEFAULT 'intermediate',
      core_areas TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS topic_questions (
      id TEXT PRIMARY KEY,
      room_id TEXT NOT NULL,
      area TEXT NOT NULL,
      question TEXT NOT NULL,
      difficulty INTEGER NOT NULL,
      expected_points TEXT NOT NULL DEFAULT '[]',
      why_this_question TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (room_id) REFERENCES topic_rooms(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS topic_answers (
      id TEXT PRIMARY KEY,
      question_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      answer_text TEXT NOT NULL,
      score INTEGER NOT NULL,
      understanding_level TEXT NOT NULL,
      strong_points TEXT NOT NULL DEFAULT '[]',
      weak_points TEXT NOT NULL DEFAULT '[]',
      missing_concepts TEXT NOT NULL DEFAULT '[]',
      next_question_strategy TEXT NOT NULL DEFAULT '',
      raw_output TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (question_id) REFERENCES topic_questions(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS research_lenses (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      seed_text TEXT NOT NULL,
      core_claim TEXT NOT NULL DEFAULT '',
      hidden_assumptions TEXT NOT NULL DEFAULT '[]',
      falsification_tests TEXT NOT NULL DEFAULT '[]',
      weird_angles TEXT NOT NULL DEFAULT '[]',
      minimal_experiment TEXT NOT NULL DEFAULT '',
      reviewer_attack TEXT NOT NULL DEFAULT '',
      next_notebook_prompt TEXT NOT NULL DEFAULT '',
      raw_output TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS codex_tasks (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      repo_path TEXT NOT NULL,
      prompt TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'queued',
      thread_id TEXT,
      turn_id TEXT,
      result_summary TEXT NOT NULL DEFAULT '',
      diff_text TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS codex_task_events (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      type TEXT NOT NULL,
      message TEXT NOT NULL,
      payload TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (task_id) REFERENCES codex_tasks(id) ON DELETE CASCADE
    );
  `);

  for (const statement of [
    "ALTER TABLE questions ADD COLUMN source TEXT NOT NULL DEFAULT 'initial'",
    "ALTER TABLE questions ADD COLUMN target_weakness TEXT NOT NULL DEFAULT ''",
    "ALTER TABLE questions ADD COLUMN focus_reason TEXT NOT NULL DEFAULT ''",
    "ALTER TABLE reviews ADD COLUMN reading_gaps TEXT NOT NULL DEFAULT '[]'",
  ]) {
    try {
      db.run(statement);
    } catch {
      // Column already exists in older local databases.
    }
  }
}

function persist(db: Database) {
  fs.writeFileSync(dbPath(), Buffer.from(db.export()));
}

export async function all<T extends Record<string, unknown>>(
  sql: string,
  params: Params = [],
) {
  const db = await openDb();
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows: T[] = [];
  while (stmt.step()) rows.push(stmt.getAsObject() as T);
  stmt.free();
  return rows;
}

export async function get<T extends Record<string, unknown>>(
  sql: string,
  params: Params = [],
) {
  return (await all<T>(sql, params))[0] ?? null;
}

export async function run(sql: string, params: Params = []) {
  const db = await openDb();
  db.run(sql, params);
  persist(db);
}

export async function execWrite(work: (db: Database) => void) {
  const db = await openDb();
  db.run("BEGIN");
  try {
    work(db);
    db.run("COMMIT");
    persist(db);
  } catch (error) {
    db.run("ROLLBACK");
    throw error;
  }
}

export function id(prefix: string) {
  return `${prefix}_${randomUUID().replaceAll("-", "")}`;
}

export function encodeJson(value: unknown) {
  return JSON.stringify(value ?? null);
}

export function decodeJson<T>(value: unknown, fallback: T): T {
  if (typeof value !== "string" || !value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}
