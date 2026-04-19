"use server";

import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { Resend } from "resend";

type AuthResult = {
  success: boolean;
  error?: string;
  message?: string;
  pendingVerification?: boolean;
};

type GeneratedLinkProperties = {
  action_link: string;
  hashed_token?: string;
  verification_type?: string;
};

function getAuthBaseUrl() {
  return process.env.NODE_ENV === "production"
    ? "https://axis.yuvrajkashyap.com"
    : "http://localhost:3000";
}

function getAuthConfirmRedirectUrl() {
  return `${getAuthBaseUrl()}/auth/confirm?next=/`;
}

function getPasswordRecoveryRedirectUrl() {
  return `${getAuthBaseUrl()}/auth/confirm?next=/reset-password`;
}

function buildInternalAuthConfirmUrl({
  tokenHash,
  type,
  next,
}: {
  tokenHash: string;
  type: string;
  next: string;
}) {
  const url = new URL("/auth/confirm", getAuthBaseUrl());
  url.searchParams.set("token_hash", tokenHash);
  url.searchParams.set("type", type);
  url.searchParams.set("next", next);
  return url.toString();
}

function hasCustomAuthEmailConfig() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY &&
      process.env.RESEND_API_KEY &&
      process.env.RESEND_FROM_EMAIL,
  );
}

function getResendClient() {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("Missing RESEND_API_KEY for auth emails.");
  }

  return new Resend(process.env.RESEND_API_KEY);
}

async function sendAxisAuthEmail({
  email,
  name,
  actionLink,
  subject,
  intro,
  cta,
}: {
  email: string;
  name: string;
  actionLink: string;
  subject: string;
  intro: string;
  cta: string;
}) {
  if (!process.env.RESEND_FROM_EMAIL) {
    throw new Error("Missing RESEND_FROM_EMAIL for auth emails.");
  }

  const resend = getResendClient();
  const firstName = name.trim() || "there";
  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL,
    to: [email],
    subject,
    html: `
      <div style="background:#09090b;color:#f4f4f5;padding:32px;font-family:Inter,Helvetica,Arial,sans-serif;">
        <p style="margin:0 0 16px;font-size:11px;letter-spacing:0.32em;text-transform:uppercase;color:#71717a;">Axis</p>
        <h1 style="margin:0 0 16px;font-size:24px;line-height:1.2;font-weight:600;">Hi ${firstName}.</h1>
        <p style="margin:0;color:#d4d4d8;font-size:15px;line-height:1.7;">${intro}</p>
        <p style="margin:28px 0 0;">
          <a href="${actionLink}" style="display:inline-block;border:1px solid rgba(255,255,255,0.14);padding:12px 18px;color:#f4f4f5;text-decoration:none;letter-spacing:0.18em;text-transform:uppercase;font-size:11px;">${cta}</a>
        </p>
        <p style="margin:20px 0 0;color:#71717a;font-size:13px;line-height:1.6;">If the button does not work, open this link:</p>
        <p style="margin:8px 0 0;color:#a1a1aa;font-size:13px;line-height:1.6;word-break:break-all;">${actionLink}</p>
      </div>
    `,
    text: `Axis\n\n${intro}\n\n${cta}: ${actionLink}`,
  });

  if (error) {
    throw new Error(error.message);
  }
}

function resolveGeneratedActionLink(
  properties: GeneratedLinkProperties,
  next: string,
) {
  if (properties.hashed_token && properties.verification_type) {
    return buildInternalAuthConfirmUrl({
      tokenHash: properties.hashed_token,
      type: properties.verification_type,
      next,
    });
  }

  return properties.action_link;
}

async function sendCustomSignupEmail(
  name: string,
  email: string,
  password: string,
  redirectTo: string,
) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.auth.admin.generateLink({
    type: "signup",
    email,
    password,
    options: {
      data: {
        name,
      },
      redirectTo,
    },
  });

  if (error) {
    throw error;
  }

  await sendAxisAuthEmail({
    email,
    name,
    actionLink: resolveGeneratedActionLink(data.properties, "/"),
    subject: "Confirm your Axis account",
    intro: "Confirm your email to enter your orrery.",
    cta: "Confirm email",
  });
}

async function sendExistingUserLink(name: string, email: string, redirectTo: string) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: {
      redirectTo,
    },
  });

  if (error) {
    throw error;
  }

  await sendAxisAuthEmail({
    email,
    name,
    actionLink: resolveGeneratedActionLink(data.properties, "/"),
    subject: "Continue to Axis",
    intro: "Use this secure link to continue into Axis.",
    cta: "Open Axis",
  });
}

async function sendPasswordRecoveryEmail(email: string, redirectTo: string) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.auth.admin.generateLink({
    type: "recovery",
    email,
    options: {
      redirectTo,
    },
  });

  if (error) {
    throw error;
  }

  await sendAxisAuthEmail({
    email,
    name: "",
    actionLink: data.properties.action_link,
    subject: "Reset your Axis password",
    intro: "Use this secure link to set a new password for Axis.",
    cta: "Reset password",
  });
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

  if (hasCustomAuthEmailConfig()) {
    try {
      await sendCustomSignupEmail(
        trimmedName,
        trimmedEmail,
        password,
        emailRedirectTo,
      );

      return {
        success: true,
        pendingVerification: true,
        message: "Check your email to confirm your account.",
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message.toLowerCase() : "";

      if (
        message.includes("already") ||
        message.includes("registered") ||
        message.includes("exists")
      ) {
        try {
          await sendExistingUserLink(trimmedName, trimmedEmail, emailRedirectTo);
          return {
            success: true,
            pendingVerification: true,
            message: "Check your email to continue into Axis.",
          };
        } catch (existingUserError) {
          return {
            success: false,
            error:
              existingUserError instanceof Error
                ? existingUserError.message
                : "Failed to send Axis email.",
          };
        }
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create account.",
      };
    }
  }

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

export async function requestPasswordReset(
  email: string,
): Promise<AuthResult> {
  const trimmedEmail = email.trim().toLowerCase();

  if (!trimmedEmail) {
    return { success: false, error: "Enter your email first." };
  }

  const emailRedirectTo = getPasswordRecoveryRedirectUrl();
  const genericSuccessMessage =
    "If an account exists for that email, check your inbox for a reset link.";

  if (hasCustomAuthEmailConfig()) {
    try {
      await sendPasswordRecoveryEmail(trimmedEmail, emailRedirectTo);
      return {
        success: true,
        message: genericSuccessMessage,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message.toLowerCase() : "";

      if (
        message.includes("not found") ||
        message.includes("no user") ||
        message.includes("user not found")
      ) {
        return {
          success: true,
          message: genericSuccessMessage,
        };
      }

      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to send password reset email.",
      };
    }
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
    redirectTo: emailRedirectTo,
  });

  if (error) {
    return {
      success: false,
      error: error.message || "Failed to send password reset email.",
    };
  }

  return {
    success: true,
    message: genericSuccessMessage,
  };
}

export async function resetPassword(password: string): Promise<AuthResult> {
  if (password.length < 6) {
    return {
      success: false,
      error: "Password must be at least 6 characters.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      error: "This reset link is invalid or expired. Request a new one.",
    };
  }

  const { error } = await supabase.auth.updateUser({
    password,
  });

  if (error) {
    return {
      success: false,
      error: error.message || "Failed to update password.",
    };
  }

  return {
    success: true,
    message: "Password updated.",
  };
}

export async function logout() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
}
