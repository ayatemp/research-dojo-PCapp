export const paperGenerationSchema = {
  type: "object",
  additionalProperties: false,
  required: ["paper_card", "questions"],
  properties: {
    paper_card: {
      type: "object",
      additionalProperties: false,
      required: [
        "one_line_summary",
        "problem",
        "prior_weakness",
        "core_method",
        "mechanism",
        "assumptions",
        "limitations",
        "research_connection",
      ],
      properties: {
        one_line_summary: { type: "string" },
        problem: { type: "string" },
        prior_weakness: { type: "string" },
        core_method: { type: "string" },
        mechanism: { type: "string" },
        assumptions: { type: "string" },
        limitations: { type: "string" },
        research_connection: { type: "string" },
      },
    },
    questions: {
      type: "array",
      minItems: 5,
      maxItems: 10,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["type", "question", "difficulty", "expected_points"],
        properties: {
          type: {
            type: "string",
            enum: [
              "definition",
              "mechanism",
              "math",
              "comparison",
              "failure_case",
              "experiment_design",
              "research_extension",
              "reviewer_view",
            ],
          },
          question: { type: "string" },
          difficulty: { type: "integer", minimum: 1, maximum: 5 },
          expected_points: {
            type: "array",
            minItems: 2,
            items: { type: "string" },
          },
        },
      },
    },
  },
} as const;

export const reviewResultSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "total_score",
    "decision",
    "rubric_scores",
    "strengths",
    "fatal_issues",
    "missing_perspectives",
    "shallow_phrases",
    "next_fix",
    "revision_challenge",
    "reading_gaps",
    "reviewer_comments",
  ],
  properties: {
    total_score: { type: "integer", minimum: 0, maximum: 100 },
    decision: {
      type: "string",
      enum: [
        "Strong Accept",
        "Accept",
        "Weak Accept",
        "Borderline",
        "Weak Reject",
        "Reject",
        "Strong Reject",
      ],
    },
    rubric_scores: {
      type: "object",
      additionalProperties: false,
      required: [
        "problem_clarity",
        "novelty",
        "mechanism_depth",
        "limitations",
        "experiment_design",
        "sharpness",
      ],
      properties: {
        problem_clarity: { type: "integer", minimum: 0, maximum: 20 },
        novelty: { type: "integer", minimum: 0, maximum: 20 },
        mechanism_depth: { type: "integer", minimum: 0, maximum: 20 },
        limitations: { type: "integer", minimum: 0, maximum: 15 },
        experiment_design: { type: "integer", minimum: 0, maximum: 15 },
        sharpness: { type: "integer", minimum: 0, maximum: 10 },
      },
    },
    strengths: { type: "array", items: { type: "string" } },
    fatal_issues: { type: "array", minItems: 1, items: { type: "string" } },
    missing_perspectives: { type: "array", items: { type: "string" } },
    shallow_phrases: { type: "array", items: { type: "string" } },
    next_fix: { type: "string" },
    revision_challenge: { type: "string" },
    reading_gaps: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["gap", "paper_section", "why_it_matters", "reread_prompt"],
        properties: {
          gap: { type: "string" },
          paper_section: { type: "string" },
          why_it_matters: { type: "string" },
          reread_prompt: { type: "string" },
        },
      },
    },
    reviewer_comments: {
      type: "object",
      additionalProperties: false,
      required: [
        "theory_reviewer",
        "experiment_reviewer",
        "novelty_reviewer",
        "implementation_reviewer",
      ],
      properties: {
        theory_reviewer: { type: "string" },
        experiment_reviewer: { type: "string" },
        novelty_reviewer: { type: "string" },
        implementation_reviewer: { type: "string" },
      },
    },
  },
} as const;

export const adaptiveQuestionGenerationSchema = {
  type: "object",
  additionalProperties: false,
  required: ["diagnosis", "questions"],
  properties: {
    diagnosis: {
      type: "object",
      additionalProperties: false,
      required: ["weakness_summary", "why_new_questions"],
      properties: {
        weakness_summary: { type: "string" },
        why_new_questions: { type: "string" },
      },
    },
    questions: {
      type: "array",
      minItems: 2,
      maxItems: 4,
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "type",
          "question",
          "difficulty",
          "expected_points",
          "target_weakness",
          "focus_reason",
        ],
        properties: {
          type: {
            type: "string",
            enum: [
              "definition",
              "mechanism",
              "math",
              "comparison",
              "failure_case",
              "experiment_design",
              "research_extension",
              "reviewer_view",
            ],
          },
          question: { type: "string" },
          difficulty: { type: "integer", minimum: 1, maximum: 5 },
          expected_points: {
            type: "array",
            minItems: 2,
            items: { type: "string" },
          },
          target_weakness: { type: "string" },
          focus_reason: { type: "string" },
        },
      },
    },
  },
} as const;

export const ideaRefinementSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "research_hypothesis",
    "core_claim",
    "novelty_candidates",
    "method_sketch",
    "experiment_plan",
    "baselines",
    "ablations",
    "expected_failure_cases",
    "reviewer_risks",
    "codex_task_prompt",
  ],
  properties: {
    research_hypothesis: { type: "string" },
    core_claim: { type: "string" },
    novelty_candidates: { type: "array", items: { type: "string" } },
    method_sketch: { type: "string" },
    experiment_plan: { type: "array", items: { type: "string" } },
    baselines: { type: "array", items: { type: "string" } },
    ablations: { type: "array", items: { type: "string" } },
    expected_failure_cases: { type: "array", items: { type: "string" } },
    reviewer_risks: { type: "array", items: { type: "string" } },
    codex_task_prompt: { type: "string" },
  },
} as const;

export const paperIdeaSeedsSchema = {
  type: "object",
  additionalProperties: false,
  required: ["paper_takeaway", "pressure_questions", "thinking_drills", "next_actions"],
  properties: {
    paper_takeaway: { type: "string" },
    pressure_questions: {
      type: "array",
      minItems: 6,
      maxItems: 10,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["angle", "question", "why_it_matters", "what_you_must_answer"],
        properties: {
          angle: { type: "string" },
          question: { type: "string" },
          why_it_matters: { type: "string" },
          what_you_must_answer: { type: "string" },
        },
      },
    },
    thinking_drills: {
      type: "array",
      minItems: 3,
      maxItems: 6,
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "title",
          "prompt",
          "paper_anchor",
          "strict_standard",
          "output_format",
        ],
        properties: {
          title: { type: "string" },
          prompt: { type: "string" },
          paper_anchor: { type: "string" },
          strict_standard: { type: "string" },
          output_format: { type: "string" },
        },
      },
    },
    next_actions: {
      type: "array",
      minItems: 3,
      maxItems: 6,
      items: { type: "string" },
    },
  },
} as const;

export const paperIdeaAnswerReviewSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "total_score",
    "rubric_scores",
    "strengths",
    "fatal_issues",
    "missing_perspectives",
    "next_fix",
    "revision_challenge",
    "reviewer_comment",
  ],
  properties: {
    total_score: { type: "integer", minimum: 0, maximum: 100 },
    rubric_scores: {
      type: "object",
      additionalProperties: false,
      required: [
        "problem_specificity",
        "novelty",
        "paper_grounding",
        "feasibility",
        "evaluation_design",
        "risk_awareness",
      ],
      properties: {
        problem_specificity: { type: "integer", minimum: 0, maximum: 20 },
        novelty: { type: "integer", minimum: 0, maximum: 20 },
        paper_grounding: { type: "integer", minimum: 0, maximum: 20 },
        feasibility: { type: "integer", minimum: 0, maximum: 15 },
        evaluation_design: { type: "integer", minimum: 0, maximum: 15 },
        risk_awareness: { type: "integer", minimum: 0, maximum: 10 },
      },
    },
    strengths: { type: "array", items: { type: "string" } },
    fatal_issues: { type: "array", minItems: 1, items: { type: "string" } },
    missing_perspectives: { type: "array", minItems: 1, items: { type: "string" } },
    next_fix: { type: "string" },
    revision_challenge: { type: "string" },
    reviewer_comment: { type: "string" },
  },
} as const;

export const topicRoomGenerationSchema = {
  type: "object",
  additionalProperties: false,
  required: ["topic_map", "questions"],
  properties: {
    topic_map: {
      type: "object",
      additionalProperties: false,
      required: ["topic", "level", "core_areas"],
      properties: {
        topic: { type: "string" },
        level: { type: "string" },
        core_areas: { type: "array", minItems: 4, items: { type: "string" } },
      },
    },
    questions: {
      type: "array",
      minItems: 5,
      maxItems: 7,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["area", "question", "difficulty", "expected_points", "why_this_question"],
        properties: {
          area: { type: "string" },
          question: { type: "string" },
          difficulty: { type: "integer", minimum: 1, maximum: 5 },
          expected_points: { type: "array", minItems: 2, items: { type: "string" } },
          why_this_question: { type: "string" },
        },
      },
    },
  },
} as const;

export const topicAnswerReviewSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "score",
    "understanding_level",
    "strong_points",
    "weak_points",
    "missing_concepts",
    "next_question_strategy",
  ],
  properties: {
    score: { type: "integer", minimum: 0, maximum: 100 },
    understanding_level: { type: "string" },
    strong_points: { type: "array", items: { type: "string" } },
    weak_points: { type: "array", minItems: 1, items: { type: "string" } },
    missing_concepts: { type: "array", minItems: 1, items: { type: "string" } },
    next_question_strategy: { type: "string" },
  },
} as const;

export const researchLensSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "core_claim",
    "hidden_assumptions",
    "falsification_tests",
    "weird_angles",
    "minimal_experiment",
    "reviewer_attack",
    "next_notebook_prompt",
  ],
  properties: {
    core_claim: { type: "string" },
    hidden_assumptions: { type: "array", minItems: 3, items: { type: "string" } },
    falsification_tests: { type: "array", minItems: 3, items: { type: "string" } },
    weird_angles: {
      type: "array",
      minItems: 3,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["lens", "question", "why_it_is_useful"],
        properties: {
          lens: { type: "string" },
          question: { type: "string" },
          why_it_is_useful: { type: "string" },
        },
      },
    },
    minimal_experiment: { type: "string" },
    reviewer_attack: { type: "string" },
    next_notebook_prompt: { type: "string" },
  },
} as const;

export type PaperGenerationResult = {
  paper_card: {
    one_line_summary: string;
    problem: string;
    prior_weakness: string;
    core_method: string;
    mechanism: string;
    assumptions: string;
    limitations: string;
    research_connection: string;
  };
  questions: Array<{
    type: string;
    question: string;
    difficulty: number;
    expected_points: string[];
  }>;
};

export type ReviewResult = {
  total_score: number;
  decision: string;
  rubric_scores: Record<string, number>;
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
  reviewer_comments: Record<string, string>;
};

export type AdaptiveQuestionGenerationResult = {
  diagnosis: {
    weakness_summary: string;
    why_new_questions: string;
  };
  questions: Array<{
    type: string;
    question: string;
    difficulty: number;
    expected_points: string[];
    target_weakness: string;
    focus_reason: string;
  }>;
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

export type PaperIdeaSeedsResult = {
  paper_takeaway: string;
  pressure_questions: Array<{
    angle: string;
    question: string;
    why_it_matters: string;
    what_you_must_answer: string;
  }>;
  thinking_drills: Array<{
    title: string;
    prompt: string;
    paper_anchor: string;
    strict_standard: string;
    output_format: string;
  }>;
  next_actions: string[];
};

export type PaperIdeaAnswerReview = {
  total_score: number;
  rubric_scores: {
    problem_specificity: number;
    novelty: number;
    paper_grounding: number;
    feasibility: number;
    evaluation_design: number;
    risk_awareness: number;
  };
  strengths: string[];
  fatal_issues: string[];
  missing_perspectives: string[];
  next_fix: string;
  revision_challenge: string;
  reviewer_comment: string;
};

export type TopicRoomGenerationResult = {
  topic_map: {
    topic: string;
    level: string;
    core_areas: string[];
  };
  questions: Array<{
    area: string;
    question: string;
    difficulty: number;
    expected_points: string[];
    why_this_question: string;
  }>;
};

export type TopicAnswerReviewResult = {
  score: number;
  understanding_level: string;
  strong_points: string[];
  weak_points: string[];
  missing_concepts: string[];
  next_question_strategy: string;
};

export type ResearchLensResult = {
  core_claim: string;
  hidden_assumptions: string[];
  falsification_tests: string[];
  weird_angles: Array<{
    lens: string;
    question: string;
    why_it_is_useful: string;
  }>;
  minimal_experiment: string;
  reviewer_attack: string;
  next_notebook_prompt: string;
};
