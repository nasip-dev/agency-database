import type { Prisma } from "@/generated/prisma/client";
import { isCurrency, isPropertyType, isStatus } from "./constants";
import { parseCode } from "./format";

export type Filters = {
  q: string;
  type: string;
  rooms: string;
  district: string;
  cur: string;
  priceMin: string;
  priceMax: string;
  areaMin: string;
  areaMax: string;
  agent: string;
  /** "" = активные, all, archived или код статуса */
  status: string;
  sort: string;
  page: number;
};

export const SORTS = {
  new: { label: "Сначала новые", orderBy: { id: "desc" } },
  old: { label: "Сначала старые", orderBy: { id: "asc" } },
  price_asc: { label: "Цена ↑", orderBy: { listPrice: "asc" } },
  price_desc: { label: "Цена ↓", orderBy: { listPrice: "desc" } },
  area_asc: { label: "Площадь ↑", orderBy: { area: "asc" } },
  area_desc: { label: "Площадь ↓", orderBy: { area: "desc" } },
} as const satisfies Record<string, { label: string; orderBy: Prisma.PropertyOrderByWithRelationInput }>;

export const PAGE_SIZE = 30;

type SearchParams = Record<string, string | string[] | undefined>;

export function parseFilters(sp: SearchParams): Filters {
  const get = (k: string) => {
    const v = sp[k];
    return (Array.isArray(v) ? v[0] : v)?.trim() ?? "";
  };
  return {
    q: get("q"),
    type: get("type"),
    rooms: get("rooms"),
    district: get("district"),
    cur: get("cur"),
    priceMin: get("priceMin"),
    priceMax: get("priceMax"),
    areaMin: get("areaMin"),
    areaMax: get("areaMax"),
    agent: get("agent"),
    status: get("status"),
    sort: get("sort"),
    page: Math.max(1, Number(get("page")) || 1),
  };
}

const num = (v: string) => {
  const n = Number(v.replace(/\s/g, "").replace(",", "."));
  return v && Number.isFinite(n) ? n : null;
};

export function buildWhere(f: Filters): Prisma.PropertyWhereInput {
  const and: Prisma.PropertyWhereInput[] = [];

  if (f.status === "archived") and.push({ archivedAt: { not: null } });
  else {
    and.push({ archivedAt: null });
    if (f.status === "") and.push({ status: "ACTIVE" });
    else if (isStatus(f.status)) and.push({ status: f.status });
  }

  if (f.q) {
    const code = parseCode(f.q);
    const text = { searchText: { contains: f.q.toLowerCase() } };
    // Телефон ищем по цифрам: «0555 12-34» → «5551234»
    const digits = f.q.replace(/\D/g, "").replace(/^0+/, "");
    const or: Prisma.PropertyWhereInput[] = [text];
    if (code != null) or.push({ id: code });
    if (digits.length >= 4) or.push({ ownerPhone: { contains: digits } });
    and.push({ OR: or });
  }

  if (isPropertyType(f.type)) and.push({ type: f.type });

  const rooms = Number(f.rooms);
  if (rooms >= 5) and.push({ rooms: { gte: 5 } });
  else if (rooms >= 1) and.push({ rooms });

  const district = Number(f.district);
  if (district > 0) and.push({ districtId: district });

  const priceMin = num(f.priceMin);
  const priceMax = num(f.priceMax);
  // Цены в разных валютах сравнивать нельзя: при фильтре по цене валюта по умолчанию — доллары
  const currency = isCurrency(f.cur) ? f.cur : priceMin != null || priceMax != null ? "USD" : null;
  if (currency) and.push({ currency });
  if (priceMin != null) and.push({ listPrice: { gte: priceMin } });
  if (priceMax != null) and.push({ listPrice: { lte: priceMax } });

  const areaMin = num(f.areaMin);
  const areaMax = num(f.areaMax);
  if (areaMin != null) and.push({ area: { gte: areaMin } });
  if (areaMax != null) and.push({ area: { lte: areaMax } });

  const agent = Number(f.agent);
  if (agent > 0) and.push({ agentId: agent });

  return { AND: and };
}

export function buildOrderBy(f: Filters) {
  return (SORTS[f.sort as keyof typeof SORTS] ?? SORTS.new).orderBy;
}

/** Ссылка на ту же выборку с изменёнными параметрами */
export function filtersToQuery(f: Filters, patch: Partial<Record<keyof Filters, string | number>> = {}) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...f, ...patch })) {
    if (v !== "" && v != null && !(k === "page" && Number(v) <= 1)) params.set(k, String(v));
  }
  const s = params.toString();
  return s ? `/?${s}` : "/";
}
