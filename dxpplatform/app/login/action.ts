"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

export async function candidateLogin(email: string) {
  const supabase = await createClient();

  const { data: user } = await supabase
    .from("user")
    .select("id, kabel_user_id")
    .eq("email", email)
    .eq("role", "candidate")
    .single();

  if (!user) {
    return { error: "No candidate account found with this email." };
  }

  if (!user.kabel_user_id) {
    return { error: "This account is not linked to a Kabel account." };
  }

  // ✅ CREATE YOUR OWN SESSION
  (await
    // ✅ CREATE YOUR OWN SESSION
    cookies()).set("dxp_user", JSON.stringify({
    id: user.id,
    email,
    role: "candidate"
  }), {
    httpOnly: true,
    path: "/",
  });

  return { success: true };
}
export async function mentorLogin(email: string) {
  const supabase = await createClient();

  // Check user exists with mentor role
  const { data: user } = await supabase
    .from("user")
    .select("id")
    .eq("email", email)
    .eq("role", "mentor")
    .single();

  if (!user) {
    return { error: "No mentor account found with this email." };
  }

  // const { error: otpError } = await supabase.auth.signInWithOtp({
  //   email,
  //   options: {
  //     shouldCreateUser: false,
  //     emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
  //   },
  // });

  // if (otpError) return { error: otpError.message };

  // redirect(`/login/mentor/check-email?email=${encodeURIComponent(email)}`);
  (await
    // ✅ CREATE YOUR OWN SESSION
    cookies()).set("dxp_user", JSON.stringify({
    id: user.id,
    email,
    role: "mentor"
  }), {
    httpOnly: true,
    path: "/", //replaces
  });

  return { success: true };
}