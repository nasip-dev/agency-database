import { CURRENCIES, type Currency } from "./constants";

const CODE_PREFIX = "NS-";

/** 125 → NS-0125; после 9999 номер просто становится длиннее */
export function formatCode(id: number) {
  return CODE_PREFIX + String(id).padStart(4, "0");
}

/** «NS-0125», «ns125», «0125», «125» → 125 */
export function parseCode(input: string): number | null {
  const m = input.trim().match(/^(?:ns-?)?0*(\d{1,9})$/i);
  return m ? Number(m[1]) : null;
}

const numberFmt = new Intl.NumberFormat("ru-RU");

export function formatNumber(n: number) {
  return numberFmt.format(n);
}

export function formatPrice(amount: number, currency: string) {
  const n = formatNumber(amount);
  return currency === "USD" ? `$${n}` : `${n} ${CURRENCIES[currency as Currency]?.label ?? currency}`;
}

export function formatRooms(rooms: number | null) {
  if (rooms == null) return "—";
  return rooms >= 5 ? "5+" : String(rooms);
}

/**
 * Приводит телефон к цифрам с кодом страны.
 * «0555 12-34-56» → 996555123456, «+996 555 123 456» → 996555123456.
 * Возвращает null, если номер не похож на телефон.
 */
export function normalizePhone(input: string): string | null {
  const plus = input.trim().startsWith("+");
  let d = input.replace(/\D/g, "");
  if (!plus) {
    if (d.length === 10 && d.startsWith("0")) d = "996" + d.slice(1);
    else if (d.length === 9) d = "996" + d;
  }
  if (d.startsWith("996")) return d.length === 12 ? d : null;
  // Иностранный номер: только с явным «+»
  return plus && d.length >= 10 && d.length <= 15 ? d : null;
}

/** 996555123456 → +996 555 123 456 */
export function formatPhone(digits: string) {
  if (digits.length === 12 && digits.startsWith("996")) {
    return `+996 ${digits.slice(3, 6)} ${digits.slice(6, 9)} ${digits.slice(9)}`;
  }
  return "+" + digits;
}

export function formatDate(d: Date) {
  return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
}

const collator = new Intl.Collator("ru", { numeric: true });

/** Сортировка районов: по городу, затем по названию («мкр. 3» раньше «мкр. 10») */
export function byDistrict(a: { city: string; name: string }, b: { city: string; name: string }) {
  return collator.compare(a.city, b.city) || collator.compare(a.name, b.name);
}
