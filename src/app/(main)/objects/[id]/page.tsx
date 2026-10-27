import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { canEdit, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { FLAGS, PROPERTY_TYPES, areaUnit, hasFloor, hasRooms, type Flag, type PropertyType } from "@/lib/constants";
import { formatCode, formatDate, formatNumber, formatPhone, formatPrice, formatRooms } from "@/lib/format";
import { StatusBadge } from "@/components/status-badge";
import { clientText, fullText } from "@/lib/share";
import { ArchiveButton } from "./archive-button";
import { Photos } from "./photos";
import { ShareButtons } from "./share-buttons";

export async function generateMetadata({ params }: PageProps<"/objects/[id]">): Promise<Metadata> {
  const id = Number((await params).id);
  return { title: `${Number.isInteger(id) ? formatCode(id) : "Объект"} — База недвижимости` };
}

export default async function PropertyPage({ params }: PageProps<"/objects/[id]">) {
  const user = await requireUser();
  const id = Number((await params).id);
  const p = Number.isInteger(id)
    ? await db.property.findUnique({
      where: { id },
       include: {
        district: true,
        agent: true,
        photos: { orderBy: { position: "asc" }, select: { id: true, file: true } },
        priceHistory: { orderBy: { createdAt: "desc" }, include: { changedBy: { select: { name: true } } } },
      },
    })
    : null;
  if (!p) notFound();

  const type = PROPERTY_TYPES[p.type as PropertyType];
  const commission = p.listPrice - p.ownerPrice;
  const flags = (Object.keys(FLAGS) as Flag[]).filter((f) => p[f]);
  const address = [p.street, p.house && `д. ${p.house}`, p.apartment && `кв. ${p.apartment}`].filter(Boolean).join(", ");
  const editable = canEdit(user, p);

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/" className="mb-4 inline-block text-sm text-zinc-500 hover:text-zinc-900">← Все объекты</Link>

      {p.archivedAt && (
        <div className="mb-4 rounded-lg bg-zinc-200 p-3 text-sm text-zinc-700">
          Объект в архиве с {formatDate(p.archivedAt)}. Его не видно в общем списке.
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-zinc-200 p-4 sm:p-5">
          <div>
            <p className="font-mono text-sm text-zinc-500">🆔 {formatCode(p.id)}</p>
            <h1 className="text-xl font-semibold sm:text-2xl">
              {type?.icon} {type?.label ?? p.type}
              {p.rooms != null && `, ${formatRooms(p.rooms)}-комн.`}
              {`, ${formatNumber(p.area)} ${areaUnit(p.type)}`}
            </h1>
            <p className="text-zinc-600">📍 {[p.district.city, p.district.name, address].filter(Boolean).join(", ")}</p>
          </div>
          <StatusBadge status={p.status} />
        </div>

        <Photos propertyId={p.id} photos={p.photos} editable={editable && !p.archivedAt} />

        <div className="grid gap-px bg-zinc-200 sm:grid-cols-3">
          <PriceBox label="💰 Цена объявления" value={formatPrice(p.listPrice, p.currency)} />
          <PriceBox label="💵 Хозяину на руки" value={formatPrice(p.ownerPrice, p.currency)} />
          <PriceBox
            label="Разница (комиссия)"
            value={formatPrice(commission, p.currency)}
            hint={`${((commission / p.listPrice) * 100).toFixed(1)}%`}
            accent
          />
        </div>

        <dl className="divide-y divide-zinc-100 px-4 sm:px-5">
          <Row label="🏠 Тип">{type?.label ?? p.type}</Row>
          {hasRooms(p.type) && <Row label="🛏 Комнат">{formatRooms(p.rooms)}</Row>}
          <Row label="📐 Площадь">{formatNumber(p.area)} {areaUnit(p.type)}</Row>
          {hasFloor(p.type) && (p.floor != null || p.totalFloors != null) && (
            <Row label="🏢 Этаж">{p.floor ?? "—"} из {p.totalFloors ?? "—"}</Row>
          )}
          <Row label="📍 Адрес">
            {[p.district.city, p.district.name, address].filter(Boolean).join(", ")}
            {p.landmark && <span className="block text-sm text-zinc-500">Ориентир: {p.landmark}</span>}
          </Row>
          <Row label="👤 Хозяин">{p.ownerName}</Row>
          <Row label="📞 Телефон хозяина">
            <a href={`tel:+${p.ownerPhone}`} className="text-indigo-700 hover:underline">{formatPhone(p.ownerPhone)}</a>
            <a href={`https://wa.me/${p.ownerPhone}`} target="_blank" rel="noreferrer" className="ml-3 text-sm text-emerald-700 hover:underline">WhatsApp</a>
          </Row>
          <Row label="👨‍💼 Агент">
            {p.agent.name}
            {p.agent.phone && <a href={`tel:+${p.agent.phone}`} className="ml-2 text-sm text-indigo-700 hover:underline">{formatPhone(p.agent.phone)}</a>}
          </Row>
          {flags.length > 0 && (
            <Row label="Отметки">
              <div className="flex flex-wrap gap-1.5">
                {flags.map((f) => (
                  <span key={f} className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-sm text-indigo-800">{FLAGS[f]}</span>
                ))}
              </div>
            </Row>
          )}
          {p.notes && <Row label="📝 Доп. информация"><p className="whitespace-pre-line">{p.notes}</p></Row>}
          <Row label="Добавлен">{formatDate(p.createdAt)}{p.updatedAt.getTime() - p.createdAt.getTime() > 60_000 && `, изменён ${formatDate(p.updatedAt)}`}</Row>
        </dl>
      </div>

      {p.priceHistory.length > 1 && (
        <div className="card mt-4 p-4 sm:p-5">
          <h2 className="mb-3 font-semibold">📈 История цены</h2>
          <ol className="space-y-2 text-sm">
            {p.priceHistory.map((h, i) => {
              const prev = p.priceHistory[i + 1];
              const diff = prev && prev.currency === h.currency ? h.listPrice - prev.listPrice : 0;
              return (
                <li key={h.id} className="flex flex-wrap items-baseline gap-x-3">
                  <span className="w-24 shrink-0 text-zinc-500">{formatDate(h.createdAt)}</span>
                  <span className="font-medium">{formatPrice(h.listPrice, h.currency)}</span>
                  <span className="text-zinc-500">на руки {formatPrice(h.ownerPrice, h.currency)}</span>
                  {diff !== 0 && (
                    <span className={diff < 0 ? "text-red-600" : "text-emerald-700"}>
                      {diff < 0 ? "↓" : "↑"} {formatPrice(Math.abs(diff), h.currency)}
                    </span>
                  )}
                  {!prev && <span className="text-zinc-400">первая цена</span>}
                  {h.changedBy && <span className="text-zinc-400">· {h.changedBy.name}</span>}
                </li>
              );
            })}
          </ol>
        </div>
      )}

      {!p.archivedAt && (
        <div className="mt-4">
          <ShareButtons clientText={clientText(p)} fullText={fullText(p)} />
        </div>
      )}

      {editable && (
        <div className="mt-4 flex flex-wrap gap-3">
          {!p.archivedAt && <Link href={`/objects/${p.id}/edit`} className="btn-primary">Редактировать</Link>}
          <ArchiveButton id={p.id} archived={!!p.archivedAt} />
        </div>
      )}
    </div>
  );
}

function PriceBox({ label, value, hint, accent }: { label: string; value: string; hint?: string; accent?: boolean }) {
  return (
    <div className={`p-4 sm:p-5 ${accent ? "bg-emerald-50" : "bg-white"}`}>
      <p className="text-sm text-zinc-500">{label}</p>
      <p className={`text-xl font-semibold ${accent ? "text-emerald-800" : ""}`}>
        {value} {hint && <span className="text-sm font-normal text-emerald-700">· {hint}</span>}
      </p>
    </div>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1 py-3 sm:grid-cols-[200px_1fr] sm:gap-4">
      <dt className="text-sm text-zinc-500">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}
