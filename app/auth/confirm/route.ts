import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/auth/schemas";

const emailOtpTypes = ["signup", "invite", "magiclink", "recovery", "email_change", "email"] as const satisfies readonly EmailOtpType[];

function parseEmailOtpType(value: string | null): EmailOtpType | null {
  return emailOtpTypes.find((type) => type === value) ?? null;
}

export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = parseEmailOtpType(request.nextUrl.searchParams.get("type"));
  const next = safeNextPath(request.nextUrl.searchParams.get("next"), type === "recovery" ? "/update-password" : "/");
  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return NextResponse.redirect(new URL(next, request.url));
  }
  return NextResponse.redirect(new URL("/login?error=confirmation", request.url));
}
