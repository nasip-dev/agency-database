import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { byDistrict } from "@/lib/format";
import { DeleteDistrictButton, NewDistrictForm } from "./district-forms";

export const metadata: Metadata = { title: "Районы — База недвижимости" };

export default async function DistrictsPage() {
  await requireAdmin();
  const districts = (
    await db.district.findMany({ include: { _count: { select: { properties: true } } } })
  ).sort(byDistrict);
  const cities = [...new Set(districts.map((d) => d.city))];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Города и районы</h1>
        <p className="text-sm text-zinc-500">Агенты выбирают район из этого списка, поэтому фильтр по району работает точно</p>
      </div>

      <div className="card p-4 sm:p-5">
        <h2 className="mb-4 font-semibold">Добавить район</h2>
        <NewDistrictForm cities={cities} />
      </div>

      {cities.map((city) => (
        <section key={city} className="card p-4 sm:p-5">
          <h2 className="mb-3 font-semibold">{city}</h2>
          <ul className="flex flex-wrap gap-2">
            {districts.filter((d) => d.city === city).map((d) => (
              <li key={d.id} className="flex items-center gap-1 rounded-full border border-zinc-200 bg-zinc-50 py-1 pl-3 pr-1 text-sm">
                {d.name}
                <span className="text-xs text-zinc-400">{d._count.properties}</span>
                {d._count.properties === 0 ? <DeleteDistrictButton id={d.id} name={d.name} /> : <span className="w-2" />}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
