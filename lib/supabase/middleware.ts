import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { hasSupabaseEnv, SUPABASE_ANON_KEY, SUPABASE_URL } from "./env";

const PROTECTED = ["/learn", "/leaderboard", "/admin", "/account"];
const AUTH_PAGES = ["/login", "/register"];

/** Refreshes the session cookie on every request and guards the signed-in pages. */
export async function updateSession(request: NextRequest) {
  if (!hasSupabaseEnv()) return NextResponse.next({ request });

  let response = NextResponse.next({ request });
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(list) {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const redirect = (to: string) => {
    const url = request.nextUrl.clone();
    url.pathname = to;
    url.search = "";
    if (to === "/login") url.searchParams.set("next", path);
    const r = NextResponse.redirect(url);
    response.cookies.getAll().forEach((c) => r.cookies.set(c));
    return r;
  };

  if (!user && PROTECTED.some((p) => path === p || path.startsWith(`${p}/`))) return redirect("/login");
  if (user && AUTH_PAGES.includes(path)) return redirect("/learn");
  return response;
}
