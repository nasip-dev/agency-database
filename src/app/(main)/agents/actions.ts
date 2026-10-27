"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { normalizePhone } from "@/lib/format";

export type FormState = { error?: string; ok?: string };

const MIN_PASSWORD = 6;

export async function createAgent(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const name = String(fd.get("name") ?? "").trim();
  const login = String(fd.get("login") ?? "").trim().toLowerCase();
  const password = String(fd.get("password") ?? "");
  const phoneRaw = String(fd.get("phone") ?? "").trim();
  const role = fd.get("role") === "ADMIN" ? "ADMIN" : "AGENT";

  if (!name) return { error: "Укажите имя агента" };
  if (!/^[a-z0-9._-]{3,32}$/.test(login)) return { error: "Логин: латинские буквы и цифры, от 3 символов" };
  if (password.length < MIN_PASSWORD) return { error: `Пароль — минимум ${MIN_PASSWORD} символов` };
  const phone = phoneRaw ? normalizePhone(phoneRaw) : null;
  if (phoneRaw && !phone) return { error: "Телефон в формате +996 XXX XXX XXX" };
  if (await db.user.findUnique({ where: { login } })) return { error: "Такой логин уже занят" };

  await db.user.create({
    data: { name, login, phone, role, passwordHash: await bcrypt.hash(password, 10) },
  });
  revalidatePath("/agents");
  return { ok: `Агент «${name}» добавлен. Логин: ${login}` };
}

export async function setAgentActive(id: number, active: boolean) {
  const admin = await requireAdmin();
  if (id === admin.id) throw new Error("Нельзя отключить самого себя");
  await db.user.update({ where: { id }, data: { active } });
  revalidatePath("/agents");
}

export async function resetPassword(id: number, password: string): Promise<FormState> {
  await requireAdmin();
  if (password.length < MIN_PASSWORD) return { error: `Пароль — минимум ${MIN_PASSWORD} символов` };
  await db.user.update({ where: { id }, data: { passwordHash: await bcrypt.hash(password, 10) } });
  return { ok: "Пароль изменён" };
}
