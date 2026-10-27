"use server";

import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { normalizePhone } from "@/lib/format";
import { revalidatePath } from "next/cache";

export type FormState = { error?: string; ok?: string };

export async function changePassword(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const current = String(fd.get("current") ?? "");
  const next = String(fd.get("next") ?? "");
  const repeat = String(fd.get("repeat") ?? "");

  const record = await db.user.findUniqueOrThrow({ where: { id: user.id } });
  if (!(await bcrypt.compare(current, record.passwordHash))) return { error: "Текущий пароль неверный" };
  if (next.length < 6) return { error: "Новый пароль — минимум 6 символов" };
  if (next !== repeat) return { error: "Пароли не совпадают" };

  await db.user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(next, 10) } });
  return { ok: "Пароль изменён" };
}

export async function changePhone(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const raw = String(fd.get("phone") ?? "").trim();
  const phone = raw ? normalizePhone(raw) : null;
  if (raw && !phone) return { error: "Номер в формате +996 XXX XXX XXX" };
  await db.user.update({ where: { id: user.id }, data: { phone } });
  revalidatePath("/", "layout");
  return { ok: phone ? "Телефон сохранён" : "Телефон удалён" };
}
