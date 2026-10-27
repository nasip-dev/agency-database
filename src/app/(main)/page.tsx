import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { PROPERTY_TYPES, areaUnit, type PropertyType } from "@/lib/constants";
import { PAGE_SIZE, buildOrderBy, buildWhere, filtersToQuery, parseFilters } from "@/lib/filters";
import { byDistrict, formatCode, formatNumber, formatPhone, formatPrice, formatRooms } from "@/lib/format";
import { photoUrl } from "@/lib/photo-url";
import { StatusBadge } from "@/components/status-badge";
import { FilterForm } from "./filter-form";

export default async function PropertiesPage({ searchParams }: PageProps<"/">) {
  const user = await requireUser();
  const filters = parseFilters(await searchParams);
  const where = buildWhere(filters);

  const [total, properties, districts, agents] = await Promise.all([
    db.property.count({ where }),
    db.property.findMany({
      where,
      orderBy: buildOrderBy(filters),
      skip: (filters.page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        district: true,
        agent: { select: { name: true } },
        photos: { orderBy: { position: "asc" }, take: 1, select: { file: true } },
      },
    }),
    db.district.findMany().then((d) => d.sort(byDistrict)),
    db.user.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const rows = properties.map((p) => ({
    ...p,
    code: formatCode(p.id),
    typeInfo: PROPERTY_TYPES[p.type as PropertyType],
    address: [p.street, p.house, p.apartment && `кв. ${p.apartment}`].filter(Boolean).join(", "),
    commission: p.listPrice - p.ownerPrice,
    thumb: p.photos[0] ? photoUrl(p.photos[0].file, true) : null,
  }));

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Объекты</h1>
        <div className="flex flex-wrap gap-2">
          {user.isAdmin && (
            // Обычная ссылка, не Link: это скачивание файла
            <a href={`/export${filtersToQuery(filters, { page: 1 }).slice(1)}`} className="btn" title="Скачать объекты с текущими фильтрами">
              ⬇ Excel
            </a>
          )}
          <Link href={filtersToQuery(filters, { agent: user.id, page: 1 })} className="btn">Мои объекты</Link>
          <Link href="/objects/new" className="btn-primary">+ Добавить</Link>
        </div>
      </div>

      <FilterForm key={filtersToQuery(filters)} filters={filters} districts={districts} agents={agents} />

      <p className="mb-3 text-sm text-zinc-500">Найдено: {total}</p>

      {rows.length === 0 ? (
        <div className="card p-10 text-center text-zinc-500">Ничего не найдено. Попробуйте изменить фильтры.</div>
      ) : (
        <>
          {/* Телефон: карточки */}
          <ul className="space-y-3 md:hidden">
            {rows.map((p) => (
              <li key={p.id}>
                <Link href={`/objects/${p.id}`} className="card flex gap-3 p-3 active:bg-zinc-50">
                  <Thumb src={p.thumb} className="h-20 w-24" />
                  <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="font-mono text-xs text-zinc-500">{p.code}</span>
                    <StatusBadge status={p.status} />
                  </div>
                  <p className="font-medium">
                    {p.typeInfo?.icon} {p.typeInfo?.label}
                    {p.rooms != null && `, ${formatRooms(p.rooms)}-комн.`}, {formatNumber(p.area)} {areaUnit(p.type)}
                  </p>
                  <p className="text-sm text-zinc-600">📍 {p.district.name}, {p.address}</p>
                  <div className="mt-2 flex flex-wrap items-baseline gap-x-3 text-sm">
                    <span className="text-base font-semibold">{formatPrice(p.listPrice, p.currency)}</span>
                    <span className="text-zinc-500">на руки {formatPrice(p.ownerPrice, p.currency)}</span>
                    <span className="text-emerald-700">+{formatPrice(p.commission, p.currency)}</span>
                  </div>
                  <p className="mt-1 text-xs text-zinc-500">👤 {p.ownerName} · 👨‍💼 {p.agent.name}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>

          {/* Компьютер: таблица */}
          <div className="card hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500">
                <tr>
                  <th className="px-3 py-2.5">ID</th>
                  <th className="px-3 py-2.5">Объект</th>
                  <th className="px-3 py-2.5">Адрес</th>
                  <th className="px-3 py-2.5 text-right">Цена</th>
                  <th className="px-3 py-2.5 text-right">На руки</th>
                  <th className="px-3 py-2.5 text-right">Разница</th>
                  <th className="px-3 py-2.5">Хозяин</th>
                  <th className="px-3 py-2.5">Агент</th>
                  <th className="px-3 py-2.5">Статус</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {rows.map((p) => (
                  <tr key={p.id} className="relative hover:bg-indigo-50/40">
                    <td className="whitespace-nowrap px-3 py-2.5 font-mono text-xs">
                      {/* Ссылка растянута на всю строку */}
                      <Link href={`/objects/${p.id}`} className="after:absolute after:inset-0">{p.code}</Link>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-3">
                        <Thumb src={p.thumb} className="h-10 w-14" />
                        <div>
                          <span className="whitespace-nowrap">{p.typeInfo?.icon} {p.typeInfo?.label}</span>
                          <span className="block text-xs text-zinc-500">
                            {p.rooms != null && `${formatRooms(p.rooms)}-комн. · `}{formatNumber(p.area)} {areaUnit(p.type)}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      {p.district.name}
                      <span className="block text-xs text-zinc-500">{p.address}</span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-right font-medium">{formatPrice(p.listPrice, p.currency)}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-right">{formatPrice(p.ownerPrice, p.currency)}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-right text-emerald-700">{formatPrice(p.commission, p.currency)}</td>
                    <td className="px-3 py-2.5">
                      {p.ownerName}
                      <span className="block whitespace-nowrap text-xs text-zinc-500">{formatPhone(p.ownerPhone)}</span>
                    </td>
                    <td className="px-3 py-2.5">{p.agent.name}</td>
                    <td className="px-3 py-2.5"><StatusBadge status={p.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {pages > 1 && (
        <nav className="mt-4 flex items-center justify-center gap-2 text-sm">
          {filters.page > 1 && <Link href={filtersToQuery(filters, { page: filters.page - 1 })} className="btn">← Назад</Link>}
          <span className="px-2 text-zinc-500">Страница {filters.page} из {pages}</span>
          {filters.page < pages && <Link href={filtersToQuery(filters, { page: filters.page + 1 })} className="btn">Вперёд →</Link>}
        </nav>
      )}
    </>
  );
}

function Thumb({ src, className }: { src: string | null; className: string }) {
  if (!src) return <div className={`${className} flex shrink-0 items-center justify-center rounded-md bg-zinc-100 text-xl text-zinc-300`}>📷</div>;
  // eslint-disable-next-line @next/next/no-img-element -- фото отдаются только с cookie, оптимизатор next/image их не получит
  return <img src={src} alt="" loading="lazy" className={`${className} shrink-0 rounded-md object-cover`} />;
}
