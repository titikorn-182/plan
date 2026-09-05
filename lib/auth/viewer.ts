import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { AppRole, Viewer } from "@/features/auth/types";

const priority: AppRole[] = ["admin", "executive", "user", "staff"];

function readFullName(metadata: unknown) {
  if (typeof metadata !== "object" || metadata === null || !("full_name" in metadata)) return null;
  return typeof metadata.full_name === "string" ? metadata.full_name : null;
}

export const getViewer = cache(async (): Promise<Viewer> => {
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const claims = claimsData?.claims;

  if (claimsError || !claims?.sub) redirect("/login");

  const [{ data: profile }, { data: roleRows }, { count }] = await Promise.all([
    supabase.from("profiles").select("full_name,email").eq("id", claims.sub).maybeSingle(),
    supabase.from("user_roles").select("role").eq("profile_id", claims.sub),
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("recipient_id", claims.sub)
      .is("read_at", null),
  ]);

  const roles = (roleRows ?? []).map((item) => item.role);
  const role = priority.find((item) => roles.includes(item)) ?? "staff";
  const email = profile?.email ?? (typeof claims.email === "string" ? claims.email : "");
  const fallbackName = readFullName(claims.user_metadata) ?? (email.split("@")[0] || "ผู้ใช้งาน");

  return {
    id: claims.sub,
    email,
    fullName: profile?.full_name ?? fallbackName,
    roles,
    role,
    unreadNotifications: count ?? 0,
  };
});

export async function requireAdmin() {
  const viewer = await getViewer();
  if (!viewer.roles.includes("admin")) redirect("/?access=denied");
  return viewer;
}
