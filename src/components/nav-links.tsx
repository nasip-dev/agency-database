"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLinks({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const links = [
    { href: "/", label: "Объекты", active: pathname === "/" || (pathname.startsWith("/objects") && pathname !== "/objects/new") },
    { href: "/objects/new", label: "+ Добавить объект", active: pathname === "/objects/new" },
    ...(isAdmin
      ? [
          { href: "/agents", label: "Агенты", active: pathname.startsWith("/agents") },
          { href: "/districts", label: "Районы", active: pathname.startsWith("/districts") },
        ]
      : []),
  ];

  return (
    <nav className="order-last flex w-full gap-1 overflow-x-auto text-sm [scrollbar-width:none] sm:order-none sm:w-auto">
      {links.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className={`whitespace-nowrap rounded-lg px-3 py-1.5 ${
            l.active ? "bg-indigo-50 font-medium text-indigo-700" : "text-zinc-600 hover:bg-zinc-100"
          }`}
        >
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
