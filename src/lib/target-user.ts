import { auth } from "@/lib/auth";
import { getOrCreateDemoUserId, isAdmin } from "@/lib/get-data";

export async function getAuthorizedTargetUserId(targetUserId?: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }

  const sessionUserId = session.user.id;

  if (!targetUserId || targetUserId === sessionUserId) {
    return sessionUserId;
  }

  const admin = await isAdmin(session.user.email);
  if (!admin) {
    return null;
  }

  const demoUserId = await getOrCreateDemoUserId();
  if (!demoUserId || targetUserId !== demoUserId) {
    return null;
  }

  return demoUserId;
}
