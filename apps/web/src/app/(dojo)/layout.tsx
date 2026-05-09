import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/auth";

export default async function DojoLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  const cookieStore = await cookies();
  const contentWidth =
    cookieStore.get("research_dojo_content_width")?.value === "wide" ? "wide" : "normal";
  return (
    <AppShell user={user} contentWidth={contentWidth}>
      {children}
    </AppShell>
  );
}
