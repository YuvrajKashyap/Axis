import { createSupabaseServerClient } from "@/lib/supabase-server";

type RestoreLegacyOutcome =
  | { restored: false; reason: "no-auth-user" | "already-has-domains" | "no_legacy_match" | "rpc-noop" }
  | { restored: true; reason: "restored" };

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function matchesNoLegacyMatch(value: unknown): boolean {
  if (typeof value === "string") {
    return value.toLowerCase().includes("no_legacy_match");
  }

  if (Array.isArray(value)) {
    return value.some(matchesNoLegacyMatch);
  }

  if (value && typeof value === "object") {
    return Object.values(value).some(matchesNoLegacyMatch);
  }

  return false;
}

function getStructuredPayloadError(value: unknown): string | null {
  if (Array.isArray(value)) {
    for (const item of value) {
      const error = getStructuredPayloadError(item);
      if (error) {
        return error;
      }
    }

    return null;
  }

  if (!isRecord(value)) {
    return null;
  }

  const status = typeof value.status === "string" ? value.status.toLowerCase() : null;
  const code = typeof value.code === "string" ? value.code : null;
  const message = typeof value.message === "string" ? value.message : null;
  const error = typeof value.error === "string" ? value.error : null;
  const success = typeof value.success === "boolean" ? value.success : null;

  if (
    matchesNoLegacyMatch(status) ||
    matchesNoLegacyMatch(code) ||
    matchesNoLegacyMatch(message) ||
    matchesNoLegacyMatch(error)
  ) {
    return "no_legacy_match";
  }

  if (success === false || status === "error" || status === "failed") {
    return error ?? message ?? code ?? "Legacy restore RPC returned an unexpected error payload.";
  }

  return null;
}

export async function restoreLegacyIfNeededForCurrentUser(): Promise<RestoreLegacyOutcome> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw new Error(`Failed to load authenticated user for legacy restore: ${userError.message}`);
  }

  if (!user) {
    return { restored: false, reason: "no-auth-user" };
  }

  const { count, error: countError } = await supabase
    .schema("axis")
    .from("domains")
    .select("id", { head: true, count: "exact" })
    .eq("user_id", user.id);

  if (countError) {
    throw new Error(`Failed to check existing domains for legacy restore: ${countError.message}`);
  }

  if ((count ?? 0) > 0) {
    return { restored: false, reason: "already-has-domains" };
  }

  const { data, error } = await supabase.rpc("restore_legacy_for_current_user");

  if (error) {
    if (matchesNoLegacyMatch(error.message) || matchesNoLegacyMatch(error.details) || matchesNoLegacyMatch(error.hint) || matchesNoLegacyMatch(error.code)) {
      return { restored: false, reason: "no_legacy_match" };
    }

    throw new Error(`Failed to restore legacy Axis data: ${error.message}`);
  }

  if (matchesNoLegacyMatch(data)) {
    return { restored: false, reason: "no_legacy_match" };
  }

  const payloadError = getStructuredPayloadError(data);
  if (payloadError === "no_legacy_match") {
    return { restored: false, reason: "no_legacy_match" };
  }

  if (payloadError) {
    throw new Error(payloadError);
  }

  if (data == null) {
    return { restored: false, reason: "rpc-noop" };
  }

  return { restored: true, reason: "restored" };
}
