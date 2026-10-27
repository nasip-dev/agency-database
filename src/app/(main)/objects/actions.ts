"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { canEdit, requireUser } from "@/lib/auth";
import {
  FLAGS,
  hasFloor,
  hasRooms,
  isCurrency,
  isPropertyType,
  isStatus,
  roomsRequired,
  type Flag,
} from "@/lib/constants";
import { normalizePhone } from "@/lib/format";
import { buildSearchText } from "@/lib/search";
import { removePhotoFiles } from "@/lib/photos";
import { findDuplicates, type Duplicate } from "@/lib/duplicates";

export type SaveResult = { errors: Record<string, string>; duplicates?: Duplicate[] } | undefined;

const str = (fd: FormData, key: string) => String(fd.get(key) ?? "").trim();

/** «85 000», «85000$» → 85000; пусто или мусор → NaN */
const toInt = (v: string) => (v ? Number(v.replace(/[\s $]/g, "")) : NaN);
const toFloat = (v: string) => (v ? Number(v.replace(/\s/g, "").replace(",", ".")) : NaN);

export async function saveProperty(id: number | null, fd: FormData): Promise<SaveResult> {
  const user = await requireUser();
  const errors: Record<string, string> = {};

  const existing = id ? await db.property.findUnique({ where: { id } }) : null;
  if (id && (!existing || !canEdit(user, existing))) {
    return { errors: { form: "Нет прав на изменение этого объекта" } };
  }

  const type = str(fd, "type");
  if (!isPropertyType(type)) errors.type = "Выберите тип объекта";

  let rooms: number | null = null;
  if (hasRooms(type)) {
    const r = str(fd, "rooms");
    if (r) {
      rooms = Number(r);
      if (!Number.isInteger(rooms) || rooms < 1 || rooms > 5) errors.rooms = "Выберите количество комнат";
    } else if (roomsRequired(type)) {
      errors.rooms = "Выберите количество комнат";
    }
  }

  const districtId = Number(str(fd, "districtId"));
  const district = Number.isInteger(districtId) && districtId > 0
    ? await db.district.findUnique({ where: { id: districtId } })
    : null;
  if (!district) errors.districtId = "Выберите район";

  // В форме из адреса остался только район. Улица, дом и ориентир у старых
  // объектов сохраняются как были, у новых — пустые.
  const street = existing?.street ?? "";
  const house = existing?.house ?? null;
  const apartment = existing?.apartment ?? null;
  const landmark = existing?.landmark ?? null;

  const area = toFloat(str(fd, "area"));
  if (!(area > 0) || area > 1_000_000) errors.area = "Укажите площадь";

  let floor: number | null = null;
  let totalFloors: number | null = null;
  if (hasFloor(type)) {
    const f = str(fd, "floor");
    const tf = str(fd, "totalFloors");
    if (f) {
      floor = Number(f);
      if (!Number.isInteger(floor) || floor < -5 || floor > 200) errors.floor = "Неверный этаж";
    }
    if (tf) {
      totalFloors = Number(tf);
      if (!Number.isInteger(totalFloors) || totalFloors < 1 || totalFloors > 200) errors.totalFloors = "Неверная этажность";
    }
    if (floor != null && totalFloors != null && !errors.floor && !errors.totalFloors && floor > totalFloors) {
      errors.floor = "Этаж больше этажности дома";
    }
  }

  const listPrice = toInt(str(fd, "listPrice"));
  const ownerPrice = toInt(str(fd, "ownerPrice"));
  if (!Number.isInteger(listPrice) || listPrice <= 0) errors.listPrice = "Укажите цену объявления";
  if (!Number.isInteger(ownerPrice) || ownerPrice <= 0) errors.ownerPrice = "Укажите цену хозяину на руки";
  if (!errors.listPrice && !errors.ownerPrice && ownerPrice > listPrice) {
    errors.ownerPrice = "Цена на руки больше цены объявления";
  }

  const currency = str(fd, "currency");
  if (!isCurrency(currency)) errors.currency = "Выберите валюту";

  const ownerName = str(fd, "ownerName");
  if (!ownerName) errors.ownerName = "Укажите имя хозяина";
  const ownerPhone = normalizePhone(str(fd, "ownerPhone"));
  if (!ownerPhone) errors.ownerPhone = "Номер в формате +996 XXX XXX XXX";

  const notes = str(fd, "notes") || null;

  const status = str(fd, "status") || "ACTIVE";
  if (!isStatus(status)) errors.status = "Неверный статус";

  // Руководитель может передать объект другому агенту
  let agentId = existing?.agentId ?? user.id;
  const agentField = str(fd, "agentId");
  if (user.isAdmin && agentField) {
    const agent = await db.user.findUnique({ where: { id: Number(agentField) } });
    if (agent) agentId = agent.id;
    else errors.agentId = "Агент не найден";
  }

  if (Object.keys(errors).length > 0) return { errors };

  // Проверяем дубли, если объект новый или поменялся телефон / район.
  // Агент видит предупреждение и может подтвердить сохранение.
  const contactsChanged =
    !existing || existing.ownerPhone !== ownerPhone || existing.districtId !== districtId;
  if (contactsChanged && fd.get("confirmDuplicates") !== "1") {
    const duplicates = await findDuplicates({ id, ownerPhone: ownerPhone!, districtId, street, house, apartment });
    if (duplicates.length > 0) return { errors: {}, duplicates };
  }

  const flags = Object.fromEntries(
    (Object.keys(FLAGS) as Flag[]).map((k) => [k, fd.get(k) === "on"]),
  ) as Record<Flag, boolean>;

  const data = {
    type, rooms, districtId, street, house, apartment, landmark, area, floor, totalFloors,
    listPrice, ownerPrice, currency, ownerName, ownerPhone: ownerPhone!, notes, status, agentId,
    ...flags,
    searchText: buildSearchText({
      city: district!.city, districtName: district!.name, street, house, apartment, landmark,
      ownerName, ownerPhone: ownerPhone!, notes,
    }),
  };

  const prices = { listPrice, ownerPrice, currency, changedById: user.id };
  let saved: { id: number };
  if (existing) {
    const priceChanged =
      existing.listPrice !== listPrice || existing.ownerPrice !== ownerPrice || existing.currency !== currency;
    const hasHistory = priceChanged && (await db.priceHistory.count({ where: { propertyId: existing.id } })) > 0;
    saved = await db.property.update({
      where: { id: existing.id },
      data: {
        ...data,
        ...(priceChanged && {
          priceHistory: {
            create: [
              // У объектов, созданных до появления истории, сначала сохраняем старую цену
              ...(hasHistory ? [] : [{
                listPrice: existing.listPrice, ownerPrice: existing.ownerPrice, currency: existing.currency,
                changedById: existing.agentId, createdAt: existing.createdAt,
              }]),
              prices,
            ],
          },
        }),
      },
    });
  } else {
    saved = await db.property.create({ data: { ...data, priceHistory: { create: prices } } });
  }

  revalidatePath("/");
  redirect(`/objects/${saved.id}`);
}

async function setArchived(id: number, archived: boolean) {
  const user = await requireUser();
  const property = await db.property.findUnique({ where: { id } });
  if (!property || !canEdit(user, property)) throw new Error("Нет прав на изменение этого объекта");

  await db.property.update({ where: { id }, data: { archivedAt: archived ? new Date() : null } });
  revalidatePath("/");
  revalidatePath(`/objects/${id}`);
}

export async function archiveProperty(id: number) {
  await setArchived(id, true);
}

export async function restoreProperty(id: number) {
  await setArchived(id, false);
}

/** Фото объекта, если текущий пользователь может его менять */
async function editablePhoto(photoId: number) {
  const user = await requireUser();
  const photo = await db.photo.findUnique({ where: { id: photoId }, include: { property: true } });
  if (!photo || !canEdit(user, photo.property)) throw new Error("Нет прав на изменение этого объекта");
  return photo;
}

export async function deletePhoto(photoId: number) {
  const photo = await editablePhoto(photoId);
  await db.photo.delete({ where: { id: photoId } });
  await removePhotoFiles(photo.file);
  revalidatePath(`/objects/${photo.propertyId}`);
  revalidatePath("/");
}

/** Делает фото главным: оно встаёт первым, остальные сдвигаются */
export async function makeMainPhoto(photoId: number) {
  const photo = await editablePhoto(photoId);
  const photos = await db.photo.findMany({ where: { propertyId: photo.propertyId }, orderBy: { position: "asc" } });
  const ordered = [photo, ...photos.filter((p) => p.id !== photoId)];
  await db.$transaction(ordered.map((p, position) => db.photo.update({ where: { id: p.id }, data: { position } })));
  revalidatePath(`/objects/${photo.propertyId}`);
  revalidatePath("/");
}
