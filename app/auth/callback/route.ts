import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { safeNext } from "@/lib/auth-errors";
import { supabaseServer } from "@/lib/supabase/server";

// Email links (confirm sign-up, reset password, change email) land here.
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const next = safeNext(url.searchParams.get("next"));
  const failed = NextResponse.redirect(new URL("/login?error=link", url.origin));

  if (code) {
    const supabase = await supabaseServer();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    return error ? failed : NextResponse.redirect(new URL(next, url.origin));
  }
  if (tokenHash && type) {
    const supabase = await supabaseServer();
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    return error ? failed : NextResponse.redirect(new URL(next, url.origin));
  }
  if (url.searchParams.get("error")) return failed;

  // The first of the two links in a secure email change arrives with only a
  // "#message=..." fragment. Browsers keep the fragment across this redirect,
  // so the page we land on can show it (see HashNotice).
  return NextResponse.redirect(new URL(next, url.origin));
}
