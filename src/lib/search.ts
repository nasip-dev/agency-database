import { formatPhone } from "./format";

type SearchSource = {
  city: string;
  districtName: string;
  street: string;
  house?: string | null;
  apartment?: string | null;
  landmark?: string | null;
  ownerName: string;
  ownerPhone: string;
  notes?: string | null;
};

/**
 * SQLite не умеет искать без учёта регистра по кириллице,
 * поэтому храним отдельную строку в нижнем регистре и ищем по ней.
 */
export function buildSearchText(p: SearchSource) {
  return [
    p.city,
    p.districtName,
    p.street,
    p.house,
    p.apartment,
    p.landmark,
    p.ownerName,
    p.ownerPhone,
    formatPhone(p.ownerPhone),
    p.notes,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}
