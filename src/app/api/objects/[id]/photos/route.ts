import { revalidatePath } from "next/cache";
import { canEdit, getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { MAX_PHOTO_BYTES, MAX_PHOTOS_PER_PROPERTY, removePhotoFiles, storePhoto } from "@/lib/photos";

const error = (message: string, status = 400) => Response.json({ error: message }, { status });

/** Загрузка одного фото. Клиент отправляет файлы по одному, чтобы показывать прогресс. */
export async function POST(req: Request, { params }: RouteContext<"/api/objects/[id]/photos">) {
  const user = await getCurrentUser();
  if (!user) return error("Войдите заново", 401);

  const id = Number((await params).id);
  const property = Number.isInteger(id) ? await db.property.findUnique({ where: { id } }) : null;
  if (!property) return error("Объект не найден", 404);
  if (!canEdit(user, property)) return error("Нет прав на изменение этого объекта", 403);

  const count = await db.photo.count({ where: { propertyId: id } });
  if (count >= MAX_PHOTOS_PER_PROPERTY) return error(`Не больше ${MAX_PHOTOS_PER_PROPERTY} фото на объект`);

  const photo = (await req.formData()).get("photo");
  if (!(photo instanceof File)) return error("Файл не получен");
  if (photo.size > MAX_PHOTO_BYTES) return error(`«${photo.name}»: файл больше 20 МБ`);

  let file: string;
  try {
    file = await storePhoto(Buffer.from(await photo.arrayBuffer()));
  } catch {
    return error(`«${photo.name}»: формат не поддерживается, нужен JPG, PNG или WEBP`);
  }

  try {
    const last = await db.photo.findFirst({ where: { propertyId: id }, orderBy: { position: "desc" } });
    await db.photo.create({ data: { propertyId: id, file, position: (last?.position ?? -1) + 1 } });
  } catch (e) {
    await removePhotoFiles(file);
    throw e;
  }

  revalidatePath(`/objects/${id}`);
  revalidatePath("/");
  return Response.json({ ok: true });
}
