import { getCurrentUser } from "@/lib/auth";
import { readPhotoFile } from "@/lib/photos";

// Фото отдаются только вошедшим агентам
export async function GET(_req: Request, { params }: RouteContext<"/photos/[name]">) {
  if (!(await getCurrentUser())) return new Response("Unauthorized", { status: 401 });

  const data = await readPhotoFile((await params).name);
  if (!data) return new Response("Not found", { status: 404 });

  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": "image/webp",
      // Имена файлов уникальны и не меняются
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}
