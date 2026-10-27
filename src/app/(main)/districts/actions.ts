"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export type FormState = { error?: string; ok?: string };

export async function createDistrict(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const city = String(fd.get("city") ?? "").trim();
  const name = String(fd.get("name") ?? "").trim();
  if (!city || !name) return { error: "Укажите город и район" };

  const exists = await db.district.findUnique({ where: { city_name: { city, name } } });
  if (exists) return { error: "Такой район уже есть" };

  await db.district.create({ data: { city, name } });
  revalidatePath("/districts");
  return { ok: `Добавлен район «${name}» (${city})` };
}

export async function deleteDistrict(id: number) {
  await requireAdmin();
  const used = await db.property.count({ where: { districtId: id } });
  if (used > 0) throw new Error("В районе есть объекты, удалить нельзя");
  await db.district.delete({ where: { id } });
  revalidatePath("/districts");
}
