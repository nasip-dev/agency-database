import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatPhone } from "@/lib/format";
import { AgentActions, NewAgentForm } from "./agent-forms";

export const metadata: Metadata = { title: "Агенты — База недвижимости" };

export default async function AgentsPage() {
  const admin = await requireAdmin();
  const agents = await db.user.findMany({
    orderBy: [{ active: "desc" }, { name: "asc" }],
    include: { _count: { select: { properties: { where: { archivedAt: null } } } } },
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h1 className="text-2xl font-semibold">Агенты</h1>

      <div className="card divide-y divide-zinc-100">
        {agents.map((a) => (
          <div key={a.id} className={`flex flex-wrap items-center gap-x-4 gap-y-2 p-4 ${a.active ? "" : "opacity-60"}`}>
            <div className="min-w-48 flex-1">
              <p className="font-medium">
                {a.name}
                {a.role === "ADMIN" && <span className="ml-2 rounded-full bg-indigo-50 px-2 py-0.5 text-xs text-indigo-700">руководитель</span>}
                {!a.active && <span className="ml-2 rounded-full bg-zinc-200 px-2 py-0.5 text-xs">отключён</span>}
              </p>
              <p className="text-sm text-zinc-500">
                логин: {a.login}
                {a.phone && ` · ${formatPhone(a.phone)}`}
              </p>
            </div>
            <Link href={`/?agent=${a.id}&status=all`} className="text-sm text-indigo-700 hover:underline">
              Объектов: {a._count.properties}
            </Link>
            <AgentActions id={a.id} active={a.active} isSelf={a.id === admin.id} />
          </div>
        ))}
      </div>

      <div className="card p-4 sm:p-5">
        <h2 className="mb-4 font-semibold">Добавить агента</h2>
        <NewAgentForm />
      </div>
    </div>
  );
}
