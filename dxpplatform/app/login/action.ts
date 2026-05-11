"use server";

import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export async function candidateLogin(email: string) {
  const supabase = await createClient();
  const normalizedEmail = email.trim().toLowerCase();

  const { data: user } = await supabase
    .from("user")
    .select("id, kabel_user_id")
    .eq("email", normalizedEmail)
    .eq("role", "candidate")
    .single();

  if (!user) {
    return { error: "No candidate account found with this email." };
  }

  if (!user.kabel_user_id) {
    return { error: "This account is not linked to a Kabel account." };
  }

  const cookieStore = await cookies();
  cookieStore.set(
    "dxp_user",
    JSON.stringify({
      id: user.id,
      email: normalizedEmail,
      role: "candidate",
    }),
    {
      httpOnly: true,
      path: "/",
    }
  );

  return { success: true };
}

export async function mentorLogin(email: string) {
  const supabase = await createClient();
  const normalizedEmail = email.trim().toLowerCase();

  const { data: user } = await supabase
    .from("user")
    .select("id")
    .eq("email", normalizedEmail)
    .eq("role", "mentor")
    .single();

  if (!user) {
    return { error: "No mentor account found with this email." };
  }

  const cookieStore = await cookies();
  cookieStore.set(
    "dxp_user",
    JSON.stringify({
      id: user.id,
      email: normalizedEmail,
      role: "mentor",
    }),
    {
      httpOnly: true,
      path: "/",
    }
  );

  return { success: true };
}
