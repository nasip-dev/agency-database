import "server-only";
import { db } from "@/lib/db";
import type { CurrentUser } from "@/lib/auth";
import { byDistrict } from "@/lib/format";

export async function getFormOptions(user: CurrentUser) {
  const [districts, agents] = await Promise.all([
    db.district.findMany().then((d) => d.sort(byDistrict)),
    user.isAdmin
      ? db.user.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } })
      : null,
  ]);
  return { districts, agents };
}
