import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import { db } from "./db";

const COOKIE_NAME = "nb_session";
const MAX_AGE_DAYS = 30;

function secretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error("SESSION_SECRET в .env не задан или слишком короткий");
  return new TextEncoder().encode(secret);
}

export type CurrentUser = {
  id: number;
  name: string;
  login: string;
  role: string;
  isAdmin: boolean;
};

export async function createSession(userId: number) {
  const token = await new SignJWT({ uid: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_DAYS}d`)
    .sign(secretKey());

  (await cookies()).set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_DAYS * 24 * 60 * 60,
  });
}

export async function deleteSession() {
  (await cookies()).delete(COOKIE_NAME);
}

/** Текущий пользователь или null. Отключённый агент считается не вошедшим. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;

  let uid: unknown;
  try {
    ({ payload: { uid } } = await jwtVerify(token, secretKey()));
  } catch {
    return null;
  }
  if (typeof uid !== "number") return null;

  const user = await db.user.findUnique({ where: { id: uid } });
  if (!user || !user.active) return null;

  return { id: user.id, name: user.name, login: user.login, role: user.role, isAdmin: user.role === "ADMIN" };
});

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (!user.isAdmin) redirect("/");
  return user;
}

/** Изменять объект может агент, который его добавил, и руководитель */
export function canEdit(user: CurrentUser, property: { agentId: number }) {
  return user.isAdmin || property.agentId === user.id;
}
