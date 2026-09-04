import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { AppRole, Viewer } from "@/lib/domain";

const priority: AppRole[] = ["admin", "executive", "user", "staff"];

export const getViewer = cache(async (): Promise<Viewer> => {
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const claims = claimsData?.claims;

  if (claimsError || !claims?.sub) redirect("/login");

  const [{ data: profile }, { data: roleRows }, { count }] = await Promise.all([
    supabase.from("profiles").select("full_name,email").eq("id", claims.sub).maybeSingle(),
    supabase.from("user_roles").select("role").eq("profile_id", claims.sub),
    supabase.from("notifications").select("id", { count: "exact", head: true }).eq("recipient_id", claims.sub).is("read_at", null),
  ]);

  const roles = ((roleRows ?? []) as { role: AppRole }[]).map((item) => item.role);
  const role = priority.find((item) => roles.includes(item)) ?? "staff";
  const email = profile?.email ?? (typeof claims.email === "string" ? claims.email : "");
  const metadata = claims.user_metadata as { full_name?: unknown } | undefined;
  const fallbackName = typeof metadata?.full_name === "string" ? metadata.full_name : email.split("@")[0] || "ผู้ใช้งาน";

  return {
    id: claims.sub,
    email,
    fullName: profile?.full_name ?? fallbackName,
    role,
    unreadNotifications: count ?? 0,
  };
});

export async function requireAdmin() {
  const viewer = await getViewer();
  if (viewer.role !== "admin") redirect("/?access=denied");
  return viewer;
}
