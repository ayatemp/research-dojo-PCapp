export type PaperCard = {
  one_line_summary: string;
  problem: string;
  prior_weakness: string;
  core_method: string;
  mechanism: string;
  assumptions: string;
  limitations: string;
  research_connection: string;
};

export const paperCardFields = [
  "one_line_summary",
  "problem",
  "prior_weakness",
  "core_method",
  "mechanism",
  "assumptions",
  "limitations",
  "research_connection",
] as const;
