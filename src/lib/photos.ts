import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

/** Папка с фото. На сервере её нужно включить в резервное копирование. */
const PHOTO_DIR = path.resolve(process.env.UPLOAD_DIR ?? "uploads", "photos");

export const MAX_PHOTO_BYTES = 20 * 1024 * 1024;
export const MAX_PHOTOS_PER_PROPERTY = 30;

const FILE_RE = /^[0-9a-f-]{36}(_thumb)?\.webp$/;

/**
 * Сжимает фото и сохраняет две версии: большую (до 1600px) и превью 480×360.
 * Возвращает имя файла без расширения. Бросает ошибку, если это не картинка.
 */
export async function storePhoto(input: Buffer): Promise<string> {
  const file = randomUUID();
  // rotate() без аргументов поворачивает фото по EXIF (снимки с телефона)
  const image = sharp(input, { failOn: "error" }).rotate();
  const [full, thumb] = await Promise.all([
    image.clone().resize(1600, 1600, { fit: "inside", withoutEnlargement: true }).webp({ quality: 80 }).toBuffer(),
    image.clone().resize(480, 360, { fit: "cover" }).webp({ quality: 70 }).toBuffer(),
  ]);
  await mkdir(PHOTO_DIR, { recursive: true });
  await Promise.all([
    writeFile(path.join(PHOTO_DIR, `${file}.webp`), full),
    writeFile(path.join(PHOTO_DIR, `${file}_thumb.webp`), thumb),
  ]);
  return file;
}

export async function removePhotoFiles(file: string) {
  await Promise.all(
    [`${file}.webp`, `${file}_thumb.webp`].map((name) => unlink(path.join(PHOTO_DIR, name)).catch(() => {})),
  );
}

/** Читает файл фото по имени из URL; null, если имя неверное или файла нет */
export async function readPhotoFile(name: string): Promise<Buffer | null> {
  if (!FILE_RE.test(name)) return null;
  return readFile(path.join(PHOTO_DIR, name)).catch(() => null);
}
