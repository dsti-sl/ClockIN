import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/attend", "/first-login", "/auth/confirm"];
const API_PATHS    = ["/api/attendance", "/api/token", "/api/mdas/options", "/api/config"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Supabase builds the invite-email link from the project's Site URL. When
  // that Site URL contains a path (e.g. ".../first-login"), the link arrives
  // here with that path duplicated — "/first-login/auth/confirm" or
  // "/first-login/first-login" — which 404s. Strip the duplicated leading
  // segment and forward to the real route, preserving the query string, so
  // invite links work without any Supabase dashboard change.
  if (pathname.startsWith("/first-login/")) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.slice("/first-login".length);
    return NextResponse.redirect(url);
  }

  if (
    PUBLIC_PATHS.some(p => pathname.startsWith(p)) ||
    API_PATHS.some(p => pathname.startsWith(p))
  ) {
    return NextResponse.next();
  }

  // `const` — response is mutated in place via .cookies.set(), never reassigned
  const response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll()      { return request.cookies.getAll(); },
        setAll(toSet) {
          toSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_first_login, is_super_admin, is_active")
    .eq("id", user.id)
    .single();

  if (profile && !profile.is_active) {
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL("/login?reason=inactive", request.url));
  }

  if (
    (pathname.startsWith("/users") || pathname.startsWith("/mdas")) &&
    !profile?.is_super_admin
  ) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons|manifest.json|sw.js).*)",
  ],
};