import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function signOut(request: NextRequest, status: number) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  const reason = request.nextUrl.searchParams.get("reason");
  const target = new URL(reason === "inactive" ? "/login?error=inactive" : "/login", request.url);
  return NextResponse.redirect(target, { status });
}

export async function POST(request: NextRequest) {
  return signOut(request, 303);
}

// Used when a signed-in session no longer maps to an active team member.
export async function GET(request: NextRequest) {
  return signOut(request, 307);
}
