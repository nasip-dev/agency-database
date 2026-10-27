import ExcelJS from "exceljs";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { FLAGS, PROPERTY_TYPES, STATUSES, areaUnit, type Flag, type PropertyType, type Status } from "@/lib/constants";
import { buildOrderBy, buildWhere, parseFilters } from "@/lib/filters";
import { formatCode, formatPhone } from "@/lib/format";

/** Выгрузка объектов в Excel с теми же фильтрами, что в списке. Только для руководителя. */
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return new Response("Войдите в систему", { status: 401 });
  if (!user.isAdmin) return new Response("Выгрузка доступна только руководителю", { status: 403 });

  const filters = parseFilters(Object.fromEntries(new URL(req.url).searchParams));
  const properties = await db.property.findMany({
    where: buildWhere(filters),
    orderBy: buildOrderBy(filters),
    include: { district: true, agent: { select: { name: true } } },
  });

  const wb = new ExcelJS.Workbook();
  wb.creator = "База недвижимости";
  const ws = wb.addWorksheet("Объекты", { views: [{ state: "frozen", ySplit: 1 }] });

  const money = "#,##0";
  ws.columns = [
    { header: "ID", key: "code", width: 12 },
    { header: "Тип", key: "type", width: 14 },
    { header: "Комнат", key: "rooms", width: 8 },
    { header: "Город", key: "city", width: 12 },
    { header: "Район", key: "district", width: 18 },
    { header: "Площадь", key: "area", width: 9 },
    { header: "Ед.", key: "unit", width: 6 },
    { header: "Этаж", key: "floor", width: 6 },
    { header: "Этажность", key: "totalFloors", width: 10 },
    { header: "Цена объявления", key: "listPrice", width: 16, style: { numFmt: money } },
    { header: "Хозяину на руки", key: "ownerPrice", width: 16, style: { numFmt: money } },
    { header: "Разница", key: "commission", width: 12, style: { numFmt: money } },
    { header: "Валюта", key: "currency", width: 8 },
    { header: "Хозяин", key: "ownerName", width: 16 },
    { header: "Телефон хозяина", key: "ownerPhone", width: 18 },
    { header: "Агент", key: "agent", width: 14 },
    { header: "Статус", key: "status", width: 14 },
    { header: "Отметки", key: "flags", width: 30 },
    { header: "Доп. информация", key: "notes", width: 40 },
    { header: "Добавлен", key: "createdAt", width: 12, style: { numFmt: "dd.mm.yyyy" } },
    { header: "Изменён", key: "updatedAt", width: 12, style: { numFmt: "dd.mm.yyyy" } },
    { header: "В архиве с", key: "archivedAt", width: 12, style: { numFmt: "dd.mm.yyyy" } },
  ];

  for (const p of properties) {
    ws.addRow({
      code: formatCode(p.id),
      type: PROPERTY_TYPES[p.type as PropertyType]?.label ?? p.type,
      rooms: p.rooms == null ? "" : p.rooms >= 5 ? "5+" : p.rooms,
      city: p.district.city,
      district: p.district.name,
      area: p.area,
      unit: areaUnit(p.type),
      floor: p.floor ?? "",
      totalFloors: p.totalFloors ?? "",
      listPrice: p.listPrice,
      ownerPrice: p.ownerPrice,
      commission: p.listPrice - p.ownerPrice,
      currency: p.currency === "USD" ? "$" : "сом",
      ownerName: p.ownerName,
      ownerPhone: formatPhone(p.ownerPhone),
      agent: p.agent.name,
      status: STATUSES[p.status as Status]?.label ?? p.status,
      flags: (Object.keys(FLAGS) as Flag[]).filter((f) => p[f]).map((f) => FLAGS[f]).join(", "),
      notes: p.notes ?? "",
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      archivedAt: p.archivedAt ?? "",
    });
  }

  const header = ws.getRow(1);
  header.font = { bold: true };
  header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE0E7FF" } };
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: ws.columns.length } };
  ws.getColumn("notes").alignment = { wrapText: true, vertical: "top" };

  const buffer = await wb.xlsx.writeBuffer();
  const date = new Date().toISOString().slice(0, 10);
  return new Response(new Uint8Array(buffer as ArrayBuffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="baza-nedvizhimosti-${date}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
