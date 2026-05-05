"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import ClientHome from "./clienthome";

export default async function Page() {
  const session = (await cookies()).get("dxp_user");

  if (!session) {
    redirect("/login");
  }

  return <ClientHome />;
}