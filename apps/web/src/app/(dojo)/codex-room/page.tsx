import { requireUser } from "@/lib/auth";
import { CodexRoomClient } from "./codex-room-client";

export default async function CodexRoomPage() {
  await requireUser();

  return (
    <div className="mx-auto max-w-6xl">
      <CodexRoomClient />
    </div>
  );
}
