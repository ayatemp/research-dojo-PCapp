import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { getCodexAuthStatus } from "@/lib/codex-auth";
import {
  getCodexDeviceLoginSession,
  markCodexDeviceLoginCompleted,
} from "@/lib/codex-login-session";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const codex = await getCodexAuthStatus();
  const login = codex.loggedIn
    ? markCodexDeviceLoginCompleted()
    : getCodexDeviceLoginSession();

  return NextResponse.json({ login, codex });
}
