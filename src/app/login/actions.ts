"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { createSession, deleteSession } from "@/lib/auth";

export type LoginState = { error?: string; login?: string };

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const loginValue = String(formData.get("login") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  const user = loginValue ? await db.user.findUnique({ where: { login: loginValue } }) : null;
  const ok = user && user.active && (await bcrypt.compare(password, user.passwordHash));
  if (!ok) return { error: "Неверный логин или пароль", login: loginValue };

  await createSession(user.id);
  redirect("/");
}

export async function logout() {
  await deleteSession();
  redirect("/login");
}
