import "server-only";
import { db } from "./db";
import { PROPERTY_TYPES, type PropertyType } from "./constants";
import { formatCode } from "./format";

export type Duplicate = {
  id: number;
  code: string;
  title: string;
  agent: string;
  archived: boolean;
  /** Почему считаем дублем */
  reasons: string[];
};

type Candidate = {
  /** id редактируемого объекта, чтобы не найти самого себя */
  id: number | null;
  ownerPhone: string;
  districtId: number;
  street: string;
  house: string | null;
  apartment: string | null;
};

/** «ул. Ахунбаева», «Ахунбаева улица», «АХУНБАЕВА» → «ахунбаева» */
export function normalizeStreet(s: string) {
  return s
    .toLowerCase()
    .replace(/ё/g, "е")
    // \b не работает с кириллицей, поэтому границы слова — через lookaround
    .replace(/(?<!\p{L})(улица|ул|проспект|пр-т|пр|микрорайон|мкр|переулок|пер|бульвар|бул|жилмассив|ж\/м)(?!\p{L})\.?/gu, " ")
    .replace(/[^\p{L}\p{N}]+/gu, "");
}

const normalizePart = (s: string | null) => (s ?? "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");

/**
 * Ищет объекты с тем же телефоном хозяина или тем же адресом
 * (район + улица + дом + квартира). Это предупреждение: у одного хозяина
 * может быть несколько объектов, поэтому агент может сохранить всё равно.
 */
export async function findDuplicates(c: Candidate): Promise<Duplicate[]> {
  const notSelf = c.id ? { id: { not: c.id } } : {};
  const [byPhone, sameDistrict] = await Promise.all([
    db.property.findMany({ where: { ...notSelf, ownerPhone: c.ownerPhone }, include: { district: true, agent: true } }),
    // Адрес сравниваем только когда есть номер дома: у участков его часто нет
    c.house
      ? db.property.findMany({ where: { ...notSelf, districtId: c.districtId, house: { not: null } }, include: { district: true, agent: true } })
      : Promise.resolve([]),
  ]);

  const street = normalizeStreet(c.street);
  const byAddress = sameDistrict.filter(
    (p) =>
      normalizeStreet(p.street) === street &&
      normalizePart(p.house) === normalizePart(c.house) &&
      normalizePart(p.apartment) === normalizePart(c.apartment),
  );

  const result = new Map<number, Duplicate>();
  const add = (p: (typeof byPhone)[number], reason: string) => {
    const existing = result.get(p.id);
    if (existing) {
      existing.reasons.push(reason);
      return;
    }
    const type = PROPERTY_TYPES[p.type as PropertyType]?.label ?? p.type;
    result.set(p.id, {
      id: p.id,
      code: formatCode(p.id),
      title: `${type}, ${p.district.name}, ${[p.street, p.house, p.apartment && `кв. ${p.apartment}`].filter(Boolean).join(", ")}`,
      agent: p.agent.name,
      archived: p.archivedAt != null,
      reasons: [reason],
    });
  };
  byPhone.forEach((p) => add(p, "тот же телефон хозяина"));
  byAddress.forEach((p) => add(p, "тот же адрес"));

  return [...result.values()].slice(0, 10);
}
