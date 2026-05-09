export type CodexTaskStatus =
  | "queued"
  | "running"
  | "needs_user_approval"
  | "completed"
  | "failed"
  | "cancelled";

export type CodexBridgeEvent =
  | { type: "log"; message: string }
  | { type: "approval_required"; command: string; reason: string }
  | { type: "diff"; path: string }
  | { type: "completed"; summary: string }
  | { type: "failed"; error: string };

export type CodexBridgeOptions = {
  codexBinary?: string;
  allowedRepoPaths: string[];
  onEvent?: (event: CodexBridgeEvent) => void;
};
