import { getOrCreateDemoUserId, isAdmin } from "@/lib/get-data";
import { getSupabaseUser } from "@/lib/supabase-auth";

export async function getAuthorizedTargetUserId(targetUserId?: string) {
  const user = await getSupabaseUser();
  if (!user?.id) {
    return null;
  }

  const sessionUserId = user.id;

  if (!targetUserId || targetUserId === sessionUserId) {
    return sessionUserId;
  }

  const admin = await isAdmin(user.email);
  if (!admin) {
    return null;
  }

  const demoUserId = await getOrCreateDemoUserId();
  if (!demoUserId || targetUserId !== demoUserId) {
    return null;
  }

  return demoUserId;
}
