import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const requestedNext = request.nextUrl.searchParams.get("next");
  const next = requestedNext === "/redefinir-senha" ? requestedNext : "/";
  const supabase = await createClient();
  if (!code || !supabase) return NextResponse.redirect(new URL("/entrar?erro=credenciais", request.url));

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return NextResponse.redirect(new URL("/entrar?erro=credenciais", request.url));
  return NextResponse.redirect(new URL(next, request.url));
}
