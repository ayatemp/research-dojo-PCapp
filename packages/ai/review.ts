import type { ReviewResult } from "./schemas";

export function decisionFromScore(score: number): ReviewResult["decision"] {
  if (score >= 90) return "Strong Accept";
  if (score >= 80) return "Accept";
  if (score >= 70) return "Weak Accept";
  if (score >= 60) return "Borderline";
  if (score >= 45) return "Weak Reject";
  if (score >= 30) return "Reject";
  return "Strong Reject";
}

export const researchReviewRubric = {
  problem_clarity: 20,
  novelty: 20,
  mechanism_depth: 20,
  limitations: 15,
  experiment_design: 15,
  sharpness: 10,
} as const;
