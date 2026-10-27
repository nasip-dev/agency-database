import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { logout } from "../login/actions";
import { NavLinks } from "@/components/nav-links";

export default async function MainLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser();

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <Link href="/" className="font-semibold">
            🏢 База недвижимости
          </Link>
          <NavLinks isAdmin={user.isAdmin} />
          <div className="ml-auto flex items-center gap-3 text-sm">
            <Link href="/password" className="text-zinc-600 hover:text-zinc-900" title="Профиль: телефон и пароль">
              👨‍💼 {user.name}
              {user.isAdmin && <span className="ml-1 hidden text-xs text-zinc-400 sm:inline">(руководитель)</span>}
            </Link>
            <form action={logout}>
              <button className="text-zinc-500 hover:text-zinc-900">Выйти</button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">{children}</main>
    </>
  );
}
