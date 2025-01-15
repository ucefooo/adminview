import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  const publicPaths = ["/login"];
  const isPublicPath = publicPaths.includes(request.nextUrl.pathname);
  if (request.nextUrl.pathname == "/") {
    const redirectUrl = new URL("/homepage", request.url);
    return NextResponse.redirect(redirectUrl);
  }
  let response = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user && !isPublicPath) {
      const redirectUrl = new URL("/login", request.url);
      return NextResponse.redirect(redirectUrl);
    }

    if (user && isPublicPath) {
      const redirectUrl = new URL("/homepage", request.url);
      return NextResponse.redirect(redirectUrl);
    }

    return response;
  } catch (error) {
    console.error("Erreur d'authentification:", error);
    if (!isPublicPath) {
      const redirectUrl = new URL("/login", request.url);
      return NextResponse.redirect(redirectUrl);
    }
    return response;
  }
}
