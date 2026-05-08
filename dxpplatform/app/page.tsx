"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Project from "./student/page";

export default async function Page() {
  const session = (await cookies()).get("dxp_user");

  if (!session) {
    redirect("/login");
  }

  return <Project/>;
}