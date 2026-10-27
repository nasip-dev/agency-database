export const PROPERTY_TYPES = {
  APARTMENT: { label: "Квартира", icon: "🏢" },
  HOUSE: { label: "Дом", icon: "🏡" },
  LAND: { label: "Участок", icon: "🌳" },
  COMMERCIAL: { label: "Коммерческая", icon: "🏬" },
  OTHER: { label: "Другое", icon: "➕" },
} as const;
export type PropertyType = keyof typeof PROPERTY_TYPES;

export const STATUSES = {
  ACTIVE: { label: "Активен", className: "bg-emerald-100 text-emerald-800" },
  DEPOSIT: { label: "Задаток", className: "bg-amber-100 text-amber-800" },
  SOLD: { label: "Продан", className: "bg-sky-100 text-sky-800" },
  WITHDRAWN: { label: "Снят с продажи", className: "bg-zinc-200 text-zinc-700" },
} as const;
export type Status = keyof typeof STATUSES;

export const CURRENCIES = {
  USD: { label: "$" },
  KGS: { label: "сом" },
} as const;
export type Currency = keyof typeof CURRENCIES;

/** 5 означает «5+ комнат» */
export const ROOM_OPTIONS = [1, 2, 3, 4, 5] as const;

export const FLAGS = {
  bargain: "Торг",
  docsReady: "Документы готовы",
  urgent: "Срочно",
  furnished: "С мебелью",
  renovated: "С ремонтом",
} as const;
export type Flag = keyof typeof FLAGS;

/** Для каких типов есть комнаты и этаж */
export const hasRooms = (t: string) => t !== "LAND";
export const roomsRequired = (t: string) => t === "APARTMENT" || t === "HOUSE";
export const hasFloor = (t: string) => t === "APARTMENT" || t === "COMMERCIAL";
export const areaUnit = (t: string) => (t === "LAND" ? "сот." : "м²");

export const isPropertyType = (v: string): v is PropertyType => v in PROPERTY_TYPES;
export const isStatus = (v: string): v is Status => v in STATUSES;
export const isCurrency = (v: string): v is Currency => v in CURRENCIES;
