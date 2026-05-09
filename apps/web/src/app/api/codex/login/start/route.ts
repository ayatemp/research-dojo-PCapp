import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { getCodexAuthStatus } from "@/lib/codex-auth";
import { startCodexDeviceLogin } from "@/lib/codex-login-session";

export const dynamic = "force-dynamic";

export async function POST() {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const login = await startCodexDeviceLogin();
  const codex = await getCodexAuthStatus();
  return NextResponse.json({ login, codex });
}
