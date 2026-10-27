import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatPhone } from "@/lib/format";
import { PasswordForm } from "./password-form";
import { PhoneForm } from "./phone-form";

export const metadata: Metadata = { title: "Профиль — База недвижимости" };

export default async function ProfilePage() {
  const user = await requireUser();
  const { phone } = await db.user.findUniqueOrThrow({ where: { id: user.id }, select: { phone: true } });

  return (
    <div className="mx-auto max-w-sm space-y-4">
      <div>
        <h1 className="mb-1 text-2xl font-semibold">Профиль</h1>
        <p className="text-sm text-zinc-500">{user.name}, логин: {user.login}</p>
      </div>
      <div className="card p-5">
        <PhoneForm phone={phone ? formatPhone(phone) : ""} />
      </div>
      <div className="card p-5">
        <h2 className="mb-4 font-semibold">Смена пароля</h2>
        <PasswordForm />
      </div>
    </div>
  );
}
