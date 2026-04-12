import { createClient } from "@supabase/supabase-js";

function getRequiredEnv(
  value: string | undefined,
  name: "NEXT_PUBLIC_SUPABASE_URL" | "SUPABASE_SERVICE_ROLE_KEY",
) {
  if (!value) {
    throw new Error(`Missing ${name} for Supabase admin operations.`);
  }

  return value;
}

export function createSupabaseAdminClient() {
  const supabaseUrl = getRequiredEnv(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    "NEXT_PUBLIC_SUPABASE_URL",
  );
  const serviceRoleKey = getRequiredEnv(
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    "SUPABASE_SERVICE_ROLE_KEY",
  );

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
