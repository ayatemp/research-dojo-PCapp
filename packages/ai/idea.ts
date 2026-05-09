import type { IdeaRefinement } from "./schemas";

export function formatCodexTaskPrompt(refinement: IdeaRefinement, repoPath: string) {
  return [
    `Repo: ${repoPath}`,
    "Task:",
    refinement.codex_task_prompt,
    "",
    "Baselines:",
    ...refinement.baselines.map((item) => `- ${item}`),
    "",
    "Ablations:",
    ...refinement.ablations.map((item) => `- ${item}`),
    "",
    "Required output:",
    "- results CSV",
    "- README command examples",
    "- concise implementation summary",
  ].join("\n");
}
