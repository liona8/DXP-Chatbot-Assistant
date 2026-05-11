import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface SessionCookie {
  id?: string;
  email?: string;
  role?: string;
}

function asString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function resolveName(user: Record<string, unknown>, fallbackEmail?: string | null) {
  const directName =
    asString(user.full_name) ??
    asString(user.name) ??
    asString(user.display_name) ??
    asString(user.username);

  if (directName) return directName;

  const firstName = asString(user.first_name);
  const lastName = asString(user.last_name);
  const combined = [firstName, lastName].filter(Boolean).join(" ");
  if (combined) return combined;

  const email = asString(user.email) ?? fallbackEmail;
  return email?.split("@")[0] ?? "Student";
}

export async function GET() {
  const cookieStore = await cookies();
  const sessionValue = cookieStore.get("dxp_user")?.value;

  if (!sessionValue) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  let session: SessionCookie;
  try {
    session = JSON.parse(sessionValue) as SessionCookie;
  } catch {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  if (!session.id) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("user")
    .select("*")
    .eq("id", session.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const dbUser = (data ?? {}) as Record<string, unknown>;
  const email = asString(dbUser.email) ?? session.email ?? null;

  return NextResponse.json({
    user: {
      id: session.id,
      email,
      role: asString(dbUser.role) ?? session.role ?? null,
      kabelUserId: asString(dbUser.kabel_user_id),
      name: resolveName(dbUser, email),
    },
  });
}
