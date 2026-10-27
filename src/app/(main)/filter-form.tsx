"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent, type ReactNode } from "react";
import { CURRENCIES, PROPERTY_TYPES, ROOM_OPTIONS, STATUSES } from "@/lib/constants";
import { SORTS, type Filters } from "@/lib/filters";

type Props = {
  filters: Filters;
  districts: { id: number; city: string; name: string }[];
  agents: { id: number; name: string }[];
};

export function FilterForm({ filters: f, districts, agents }: Props) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const cities = [...new Set(districts.map((d) => d.city))];

  function apply(form: HTMLFormElement) {
    const params = new URLSearchParams();
    for (const [k, v] of new FormData(form)) {
      const value = String(v).trim();
      if (value) params.set(k, value);
    }
    const s = params.toString();
    router.push(s ? `/?${s}` : "/");
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    apply(e.currentTarget);
  }

  // Списки применяются сразу, текстовые поля — по Enter или кнопке
  const onSelect = () => formRef.current && apply(formRef.current);

  const activeCount = [f.type, f.rooms, f.district, f.cur, f.priceMin, f.priceMax, f.areaMin, f.areaMax, f.agent, f.status].filter(Boolean).length;
  // На телефоне фильтры свёрнуты, пока ни один не выбран
  const [open, setOpen] = useState(activeCount > 0);

  return (
    <form ref={formRef} onSubmit={onSubmit} className="card mb-4 p-3 sm:p-4">
      <div className="flex gap-2">
        <input
          name="q"
          type="search"
          defaultValue={f.q}
          placeholder="🔎 ID (NS-0125), район, хозяин, телефон…"
          className="input flex-1"
        />
        <button className="btn-primary">Найти</button>
      </div>

      <button type="button" onClick={() => setOpen(!open)} className="mt-3 text-sm text-indigo-700 sm:hidden">
        {open ? "Скрыть фильтры" : "Фильтры"}{activeCount > 0 && ` (${activeCount})`}
      </button>
      <div className={`${open ? "grid" : "hidden"} mt-3 grid-cols-2 gap-3 sm:grid sm:grid-cols-3 lg:grid-cols-6`}>
          <Select label="Тип" name="type" value={f.type} onChange={onSelect}>
            <option value="">Все типы</option>
            {Object.entries(PROPERTY_TYPES).map(([v, t]) => <option key={v} value={v}>{t.icon} {t.label}</option>)}
          </Select>
          <Select label="Комнат" name="rooms" value={f.rooms} onChange={onSelect}>
            <option value="">Любое</option>
            {ROOM_OPTIONS.map((r) => <option key={r} value={r}>{r === 5 ? "5+" : r}</option>)}
          </Select>
          <Select label="Район" name="district" value={f.district} onChange={onSelect}>
            <option value="">Все районы</option>
            {cities.map((city) => (
              <optgroup key={city} label={city}>
                {districts.filter((d) => d.city === city).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </optgroup>
            ))}
          </Select>
          <Select label="Агент" name="agent" value={f.agent} onChange={onSelect}>
            <option value="">Все агенты</option>
            {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </Select>
          <Select label="Статус" name="status" value={f.status} onChange={onSelect}>
            <option value="">Активные</option>
            {Object.entries(STATUSES).filter(([v]) => v !== "ACTIVE").map(([v, s]) => <option key={v} value={v}>{s.label}</option>)}
            <option value="all">Все статусы</option>
            <option value="archived">Архив</option>
          </Select>
          <Select label="Сортировка" name="sort" value={f.sort} onChange={onSelect}>
            {Object.entries(SORTS).map(([v, s]) => <option key={v} value={v === "new" ? "" : v}>{s.label}</option>)}
          </Select>

          <div className="col-span-2 sm:col-span-2 lg:col-span-3">
            <span className="label">Цена объявления</span>
            <div className="flex gap-2">
              <input name="priceMin" inputMode="numeric" defaultValue={f.priceMin} placeholder="от" className="input min-w-0" />
              <input name="priceMax" inputMode="numeric" defaultValue={f.priceMax} placeholder="до" className="input min-w-0" />
              <select name="cur" defaultValue={f.cur} onChange={onSelect} className="input w-28 shrink-0" aria-label="Валюта">
                <option value="">Валюта</option>
                {Object.entries(CURRENCIES).map(([v, c]) => <option key={v} value={v}>{c.label}</option>)}
              </select>
            </div>
          </div>
          <div className="col-span-2 sm:col-span-1 lg:col-span-2">
            <span className="label">Площадь</span>
            <div className="flex gap-2">
              <input name="areaMin" inputMode="decimal" defaultValue={f.areaMin} placeholder="от" className="input min-w-0" />
              <input name="areaMax" inputMode="decimal" defaultValue={f.areaMax} placeholder="до" className="input min-w-0" />
            </div>
          </div>
          <div className="col-span-2 flex items-end gap-2 sm:col-span-3 lg:col-span-1">
            <button className="btn flex-1">Применить</button>
            <button
              type="button"
              onClick={() => router.push("/")}
              className="btn"
              title="Сбросить фильтры"
            >
              ✕
            </button>
          </div>
      </div>
    </form>
  );
}

function Select({ label, name, value, onChange, children }: { label: string; name: string; value: string; onChange: () => void; children: ReactNode }) {
  return (
    <label className="block min-w-0">
      <span className="label">{label}</span>
      <select name={name} defaultValue={value} onChange={onChange} className="input">
        {children}
      </select>
    </label>
  );
}
