import "server-only";

import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { get, id, run } from "@/lib/db";

const scrypt = promisify(scryptCallback);
const sessionCookie = "research_dojo_session";
const sessionDays = 30;

export type CurrentUser = {
  id: string;
  name: string | null;
  email: string;
};

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function useSecureCookies() {
  return (
    process.env.NODE_ENV === "production" &&
    process.env.RESEARCH_DOJO_INSECURE_COOKIES !== "1"
  );
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  return `${salt}:${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, passwordHash: string) {
  const [salt, stored] = passwordHash.split(":");
  if (!salt || !stored) return false;
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  const storedBuffer = Buffer.from(stored, "hex");
  return (
    derived.length === storedBuffer.length &&
    timingSafeEqual(derived, storedBuffer)
  );
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + sessionDays * 24 * 60 * 60 * 1000);
  await run(
    "INSERT INTO sessions (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)",
    [id("ses"), userId, hashToken(token), expiresAt.toISOString()],
  );

  const cookieStore = await cookies();
  cookieStore.set(sessionCookie, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: useSecureCookies(),
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookie)?.value;
  if (token) {
    await run("DELETE FROM sessions WHERE token_hash = ?", [hashToken(token)]);
  }
  cookieStore.delete(sessionCookie);
}

export async function currentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookie)?.value;
  if (!token) return null;

  const user = await get<CurrentUser & { expires_at: string }>(
    `SELECT users.id, users.name, users.email, sessions.expires_at
       FROM sessions
       JOIN users ON users.id = sessions.user_id
      WHERE sessions.token_hash = ?`,
    [hashToken(token)],
  );

  if (!user) return null;
  if (new Date(String(user.expires_at)).getTime() < Date.now()) {
    await run("DELETE FROM sessions WHERE token_hash = ?", [hashToken(token)]);
    return null;
  }

  return { id: user.id, name: user.name, email: user.email };
}

export async function requireUser() {
  const user = await currentUser();
  if (!user) redirect("/login");
  return user;
}
