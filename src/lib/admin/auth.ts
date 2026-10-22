import "server-only";
import { createClient } from "@/lib/supabase/server";

export type Role = "student" | "editor" | "admin";

export interface AdminSession {
  supabase: NonNullable<Awaited<ReturnType<typeof createClient>>>;
  userId: string;
  role: Role;
}

export type AdminAccess =
  | { status: "not_configured" }
  | { status: "anonymous" }
  | { status: "forbidden" }
  | { status: "ok"; session: AdminSession };

/** Role levels: an admin can do everything an editor can. */
const rank: Record<Role, number> = { student: 0, editor: 1, admin: 2 };

/**
 * Looks up who is calling and which role the database assigns them. The role is always read from
 * the database on the server; nothing the browser sends is trusted. RLS repeats the check.
 */
export async function getAdminAccess(minimum: Exclude<Role, "student"> = "editor"): Promise<AdminAccess> {
  const supabase = await createClient();
  if (!supabase) return { status: "not_configured" };
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { status: "anonymous" };

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).maybeSingle();
  const role = (profile?.role ?? "student") as Role;
  if (rank[role] < rank[minimum]) return { status: "forbidden" };
  return { status: "ok", session: { supabase, userId: data.user.id, role } };
}
