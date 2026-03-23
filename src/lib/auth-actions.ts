"use server";

import { prisma } from "@/lib/prisma";
import { signIn, signOut } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function signup(
  name: string,
  email: string,
  password: string,
): Promise<{ success: boolean; error?: string }> {
  const trimmedEmail = email.trim().toLowerCase();
  const trimmedName = name.trim();

  if (!trimmedName) return { success: false, error: "Name is required." };
  if (!trimmedEmail) return { success: false, error: "Email is required." };
  if (password.length < 6) return { success: false, error: "Password must be at least 6 characters." };

  const existing = await prisma.user.findUnique({ where: { email: trimmedEmail } });
  if (existing) return { success: false, error: "An account with that email already exists." };

  const hashed = await bcrypt.hash(password, 10);

  await prisma.user.create({
    data: {
      name: trimmedName,
      email: trimmedEmail,
      password: hashed,
    },
  });

  await signIn("credentials", {
    email: trimmedEmail,
    password,
    redirect: false,
  });

  return { success: true };
}

export async function login(
  email: string,
  password: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    await signIn("credentials", {
      email: email.trim().toLowerCase(),
      password,
      redirect: false,
    });
    return { success: true };
  } catch {
    return { success: false, error: "Invalid email or password." };
  }
}

export async function logout() {
  await signOut({ redirect: false });
}
