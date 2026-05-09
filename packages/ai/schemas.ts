export type ReviewDecision =
  | "Strong Accept"
  | "Accept"
  | "Weak Accept"
  | "Borderline"
  | "Weak Reject"
  | "Reject"
  | "Strong Reject";

export type ReviewResult = {
  total_score: number;
  decision: ReviewDecision;
  rubric_scores: {
    problem_clarity: number;
    novelty: number;
    mechanism_depth: number;
    limitations: number;
    experiment_design: number;
    sharpness: number;
  };
  strengths: string[];
  fatal_issues: string[];
  missing_perspectives: string[];
  shallow_phrases: string[];
  next_fix: string;
  revision_challenge: string;
  reading_gaps: Array<{
    gap: string;
    paper_section: string;
    why_it_matters: string;
    reread_prompt: string;
  }>;
  reviewer_comments: {
    theory_reviewer: string;
    experiment_reviewer: string;
    novelty_reviewer: string;
    implementation_reviewer: string;
  };
};

export type GeneratedQuestion = {
  type:
    | "definition"
    | "mechanism"
    | "math"
    | "comparison"
    | "failure_case"
    | "experiment_design"
    | "research_extension"
    | "reviewer_view";
  question: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  expected_points: string[];
  target_weakness?: string;
  focus_reason?: string;
};

export type IdeaRefinement = {
  research_hypothesis: string;
  core_claim: string;
  novelty_candidates: string[];
  method_sketch: string;
  experiment_plan: string[];
  baselines: string[];
  ablations: string[];
  expected_failure_cases: string[];
  reviewer_risks: string[];
  codex_task_prompt: string;
};
