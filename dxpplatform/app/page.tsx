"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

type SessionCookie = {
  role?: string;
};

export default async function Page() {
  const session = (await cookies()).get("dxp_user");

  if (!session) {
    redirect("/login");
  }

  let role: string | undefined;

  try {
    role = (JSON.parse(session.value) as SessionCookie).role;
  } catch {
    redirect("/login");
  }

  if (role === "mentor") {
    redirect("/mentor");
  }

  redirect("/student");
}
