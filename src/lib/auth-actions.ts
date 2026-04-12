"use server";

import { createSupabaseServerClient } from "@/lib/supabase-server";

type AuthResult = {
  success: boolean;
  error?: string;
  message?: string;
  pendingVerification?: boolean;
};

function getAuthConfirmRedirectUrl() {
  const baseUrl =
    process.env.NODE_ENV === "production"
      ? "https://axis.yuvrajkashyap.com"
      : "http://localhost:3000";

  return `${baseUrl}/auth/confirm?next=/`;
}

export async function signup(
  name: string,
  email: string,
  password: string,
): Promise<AuthResult> {
  const trimmedEmail = email.trim().toLowerCase();
  const trimmedName = name.trim();

  if (!trimmedName) return { success: false, error: "Name is required." };
  if (!trimmedEmail) return { success: false, error: "Email is required." };
  if (password.length < 6) return { success: false, error: "Password must be at least 6 characters." };

  const emailRedirectTo = getAuthConfirmRedirectUrl();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email: trimmedEmail,
    password,
    options: {
      data: {
        name: trimmedName,
      },
      emailRedirectTo,
    },
  });

  if (error) {
    const lowerMessage = error.message.toLowerCase();
    if (
      lowerMessage.includes("already") ||
      lowerMessage.includes("registered") ||
      lowerMessage.includes("exists")
    ) {
      const { error: resendError } = await supabase.auth.resend({
        type: "signup",
        email: trimmedEmail,
        options: {
          emailRedirectTo,
        },
      });

      if (!resendError) {
        return {
          success: true,
          pendingVerification: true,
          message: "Check your email to confirm your account.",
        };
      }
    }

    return {
      success: false,
      error: error.message || "Failed to create account.",
    };
  }

  if (!data.session && data.user?.identities?.length === 0) {
    const { error: resendError } = await supabase.auth.resend({
      type: "signup",
      email: trimmedEmail,
      options: {
        emailRedirectTo,
      },
    });

    if (!resendError) {
      return {
        success: true,
        pendingVerification: true,
        message: "Check your email to confirm your account.",
      };
    }

    return {
      success: false,
      error: "An account with that email already exists. Try signing in.",
    };
  }

  if (!data.session) {
    return {
      success: true,
      pendingVerification: true,
      message: "Check your email to confirm your account.",
    };
  }

  return {
    success: true,
  };
}

export async function login(
  email: string,
  password: string,
): Promise<AuthResult> {
  const trimmedEmail = email.trim().toLowerCase();

  if (!trimmedEmail) {
    return { success: false, error: "Invalid email or password." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: trimmedEmail,
    password,
  });

  if (error) {
    return { success: false, error: "Invalid email or password." };
  }

  return { success: true };
}

export async function logout() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
}
