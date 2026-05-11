export type CurrentUser = {
  id: string;
  email: string | null;
  role: string | null;
  kabelUserId?: string | null;
  name: string;
};

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const response = await fetch("/api/me", { cache: "no-store" });

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as { user?: CurrentUser | null };
  return data.user ?? null;
}

export async function signOutCurrentUser() {
  await fetch("/api/logout", { method: "POST" });
}
