import { FLAGS, PROPERTY_TYPES, areaUnit, hasFloor, type Flag, type PropertyType } from "./constants";
import { formatCode, formatNumber, formatPhone, formatPrice, formatRooms } from "./format";

type ShareSource = {
  id: number;
  type: string;
  rooms: number | null;
  street: string;
  house: string | null;
  apartment: string | null;
  landmark: string | null;
  area: number;
  floor: number | null;
  totalFloors: number | null;
  listPrice: number;
  ownerPrice: number;
  currency: string;
  ownerName: string;
  ownerPhone: string;
  notes: string | null;
  district: { city: string; name: string };
  agent: { name: string; phone: string | null };
} & Record<Flag, boolean>;

const typeLabel = (p: ShareSource) => PROPERTY_TYPES[p.type as PropertyType]?.label ?? p.type;
const typeIcon = (p: ShareSource) => PROPERTY_TYPES[p.type as PropertyType]?.icon ?? "🏠";

function floorLine(p: ShareSource) {
  if (!hasFloor(p.type) || (p.floor == null && p.totalFloors == null)) return null;
  return `🏢 Этаж: ${p.floor ?? "—"} из ${p.totalFloors ?? "—"}`;
}

/**
 * Текст для клиента. Без данных хозяина, цены «на руки», заметок
 * (там бывают договорённости с хозяином) и без номера дома и квартиры.
 */
export function clientText(p: ShareSource) {
  const flags = (Object.keys(FLAGS) as Flag[]).filter((f) => p[f]).map((f) => FLAGS[f]);
  const title = `${typeIcon(p)} ${typeLabel(p)}${p.rooms != null ? `, ${formatRooms(p.rooms)}-комнатная` : ""}`;
  const agent = p.agent.phone ? `${p.agent.name}, ${formatPhone(p.agent.phone)}` : p.agent.name;

  return [
    title,
    `📍 ${[p.district.city, p.district.name, p.street].filter(Boolean).join(", ")}${p.landmark ? ` (${p.landmark})` : ""}`,
    `📐 Площадь: ${formatNumber(p.area)} ${areaUnit(p.type)}`,
    floorLine(p),
    `💰 Цена: ${formatPrice(p.listPrice, p.currency)}`,
    flags.length ? `✅ ${flags.join(", ")}` : null,
    `🆔 ${formatCode(p.id)}`,
    `👨‍💼 Агент: ${agent}`,
  ]
    .filter(Boolean)
    .join("\n");
}

/** Полная карточка для агентов — в формате из ТЗ */
export function fullText(p: ShareSource) {
  const address = [
    p.district.city, p.district.name, p.street,
    p.house && `д. ${p.house}`, p.apartment && `кв. ${p.apartment}`,
  ].filter(Boolean).join(", ");
  const flags = (Object.keys(FLAGS) as Flag[]).filter((f) => p[f]).map((f) => FLAGS[f]);
  const extra = [flags.join(", "), p.notes].filter(Boolean).join(". ");

  return [
    `🏠 Тип: ${typeLabel(p)}`,
    p.rooms != null ? `🛏 Комнат: ${formatRooms(p.rooms)}` : null,
    `📍 Адрес: ${address}${p.landmark ? ` (${p.landmark})` : ""}`,
    `📐 Площадь: ${formatNumber(p.area)} ${areaUnit(p.type)}`,
    floorLine(p),
    `💰 Цена объявления: ${formatPrice(p.listPrice, p.currency)}`,
    `💵 Хозяину на руки: ${formatPrice(p.ownerPrice, p.currency)}`,
    `👨‍💼 Агент: ${p.agent.name}`,
    `📞 Телефон хозяина: ${formatPhone(p.ownerPhone)}`,
    `👤 Хозяин: ${p.ownerName}`,
    extra ? `📝 Доп. информация: ${extra}` : null,
    `🆔 ID: ${formatCode(p.id)}`,
  ]
    .filter(Boolean)
    .join("\n");
}
