"use client";

import { useRef, useState, useTransition, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import {
  CURRENCIES,
  FLAGS,
  PROPERTY_TYPES,
  ROOM_OPTIONS,
  STATUSES,
  areaUnit,
  hasFloor,
  hasRooms,
  roomsRequired,
  type Flag,
} from "@/lib/constants";
import { formatPhone, formatPrice } from "@/lib/format";
import { saveProperty, type SaveResult } from "./actions";
import { DistrictPicker } from "./district-picker";

type Duplicates = NonNullable<SaveResult>["duplicates"];

export type PropertyFormValues = {
  type: string;
  rooms: number | null;
  districtId: number | null;
  area: number | null;
  floor: number | null;
  totalFloors: number | null;
  listPrice: number | null;
  ownerPrice: number | null;
  currency: string;
  ownerName: string;
  ownerPhone: string;
  notes: string | null;
  status: string;
  agentId: number | null;
} & Record<Flag, boolean>;

type Props = {
  id: number | null;
  initial: PropertyFormValues;
  districts: { id: number; city: string; name: string }[];
  /** Только для руководителя — можно сменить ответственного агента */
  agents: { id: number; name: string }[] | null;
};

const parseAmount = (v: string) => Number(v.replace(/[^\d]/g, "")) || 0;

export function PropertyForm({ id, initial, districts, agents }: Props) {
  const [type, setType] = useState(initial.type);
  const [listPrice, setListPrice] = useState(initial.listPrice?.toString() ?? "");
  const [ownerPrice, setOwnerPrice] = useState(initial.ownerPrice?.toString() ?? "");
  const [currency, setCurrency] = useState(initial.currency);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [duplicates, setDuplicates] = useState<Duplicates>();
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  const commission = parseAmount(listPrice) - parseAmount(ownerPrice);
  const commissionPct = parseAmount(listPrice) > 0 ? (commission / parseAmount(listPrice)) * 100 : 0;

  function submit(confirmDuplicates: boolean) {
    const fd = new FormData(formRef.current!);
    if (confirmDuplicates) fd.set("confirmDuplicates", "1");
    startTransition(async () => {
      const res = await saveProperty(id, fd);
      if (res) {
        setErrors(res.errors);
        setDuplicates(res.duplicates);
        // Прокрутить к первой ошибке
        requestAnimationFrame(() => document.querySelector("[data-error]")?.scrollIntoView({ block: "center", behavior: "smooth" }));
      }
    });
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    submit(false);
  }

  const err = (name: string) => (errors[name] ? " input-error" : "");

  function clearError(name: string) {
    if (!errors[name]) return;
    setErrors((prev) => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
  }

  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      // Ошибка поля пропадает, как только его начали исправлять
      onChange={(e) => clearError((e.target as unknown as HTMLInputElement).name)}
      className="space-y-6"
      noValidate
    >
      {errors.form && <p data-error className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{errors.form}</p>}

      <Section title="🏠 Объект">
        <Field label="Тип объекта" error={errors.type} className="sm:col-span-2">
          <div className="flex flex-wrap gap-2">
            {Object.entries(PROPERTY_TYPES).map(([value, t]) => (
              <label
                key={value}
                className={`cursor-pointer rounded-lg border px-3 py-2 text-sm ${
                  type === value ? "border-indigo-500 bg-indigo-50 text-indigo-800" : "border-zinc-300 bg-white hover:bg-zinc-50"
                }`}
              >
                <input type="radio" name="type" value={value} checked={type === value} onChange={() => setType(value)} className="sr-only" />
                {t.icon} {t.label}
              </label>
            ))}
          </div>
        </Field>

        {hasRooms(type) && (
          <Field label={`Количество комнат${roomsRequired(type) ? "" : " (необязательно)"}`} error={errors.rooms} className="sm:col-span-2">
            <div className="flex flex-wrap gap-2">
              {!roomsRequired(type) && <RoomOption value="" label="—" defaultChecked={initial.rooms == null} />}
              {ROOM_OPTIONS.map((r) => (
                <RoomOption key={r} value={String(r)} label={r === 5 ? "5+" : String(r)} defaultChecked={initial.rooms === r} />
              ))}
            </div>
          </Field>
        )}

        <Field label={`📐 Площадь, ${areaUnit(type)}`} error={errors.area}>
          <input name="area" inputMode="decimal" defaultValue={initial.area ?? ""} placeholder={type === "LAND" ? "6" : "75"} className={"input" + err("area")} />
        </Field>

        {hasFloor(type) && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Этаж" error={errors.floor}>
              <input name="floor" inputMode="numeric" defaultValue={initial.floor ?? ""} className={"input" + err("floor")} />
            </Field>
            <Field label="Этажей в доме" error={errors.totalFloors}>
              <input name="totalFloors" inputMode="numeric" defaultValue={initial.totalFloors ?? ""} className={"input" + err("totalFloors")} />
            </Field>
          </div>
        )}
      </Section>

      <Section title="📍 Адрес">
        <Field label="Район" error={errors.districtId}>
          <DistrictPicker
            name="districtId"
            districts={districts}
            defaultValue={initial.districtId}
            invalid={!!errors.districtId}
            onPick={() => clearError("districtId")}
          />
        </Field>
      </Section>

      <Section title="💰 Цена">
        <Field label="Валюта" error={errors.currency} className="sm:col-span-2">
          <div className="flex gap-2">
            {Object.entries(CURRENCIES).map(([value, c]) => (
              <label key={value} className={`cursor-pointer rounded-lg border px-4 py-2 text-sm ${currency === value ? "border-indigo-500 bg-indigo-50 text-indigo-800" : "border-zinc-300 bg-white"}`}>
                <input type="radio" name="currency" value={value} checked={currency === value} onChange={() => setCurrency(value)} className="sr-only" />
                {c.label}
              </label>
            ))}
          </div>
        </Field>
        <Field label="💰 Цена объявления" error={errors.listPrice}>
          <input name="listPrice" inputMode="numeric" value={listPrice} onChange={(e) => setListPrice(e.target.value)} placeholder="85000" className={"input" + err("listPrice")} />
        </Field>
        <Field label="💵 Хозяину на руки" error={errors.ownerPrice}>
          <input name="ownerPrice" inputMode="numeric" value={ownerPrice} onChange={(e) => setOwnerPrice(e.target.value)} placeholder="82000" className={"input" + err("ownerPrice")} />
        </Field>
        {parseAmount(listPrice) > 0 && parseAmount(ownerPrice) > 0 && (
          <div className={`rounded-lg p-3 text-sm sm:col-span-2 ${commission >= 0 ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>
            Разница (комиссия): <b>{formatPrice(commission, currency)}</b>
            {commission >= 0 && <> · {commissionPct.toFixed(1)}%</>}
          </div>
        )}
      </Section>

      <Section title="👤 Хозяин">
        <Field label="Имя хозяина" error={errors.ownerName}>
          <input name="ownerName" defaultValue={initial.ownerName} placeholder="Бакыт" className={"input" + err("ownerName")} />
        </Field>
        <Field label="📞 Телефон хозяина" error={errors.ownerPhone}>
          <input
            name="ownerPhone"
            type="tel"
            defaultValue={initial.ownerPhone ? formatPhone(initial.ownerPhone) : ""}
            placeholder="+996 555 123 456"
            className={"input" + err("ownerPhone")}
          />
        </Field>
      </Section>

      <Section title="📝 Дополнительно">
        <div className="flex flex-wrap gap-2 sm:col-span-2">
          {(Object.entries(FLAGS) as [Flag, string][]).map(([name, label]) => (
            <label key={name} className="flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm has-[:checked]:border-indigo-500 has-[:checked]:bg-indigo-50">
              <input type="checkbox" name={name} defaultChecked={initial[name]} className="accent-indigo-600" />
              {label}
            </label>
          ))}
        </div>
        <Field label="Дополнительная информация" className="sm:col-span-2">
          <textarea
            name="notes"
            rows={5}
            defaultValue={initial.notes ?? ""}
            placeholder="Состояние, ремонт, мебель, документы, договорённости с хозяином…"
            className="input"
          />
        </Field>
        <Field label="Статус" error={errors.status}>
          <select name="status" defaultValue={initial.status} className="input">
            {Object.entries(STATUSES).map(([value, s]) => (
              <option key={value} value={value}>{s.label}</option>
            ))}
          </select>
        </Field>
        {agents && (
          <Field label="👨‍💼 Ответственный агент" error={errors.agentId}>
            <select name="agentId" defaultValue={initial.agentId ?? ""} className="input">
              {agents.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </Field>
        )}
      </Section>

      {duplicates && duplicates.length > 0 && (
        <div data-error className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm">
          <p className="mb-2 font-semibold text-amber-900">⚠️ Похоже, такой объект уже есть в базе</p>
          <ul className="mb-3 space-y-1.5">
            {duplicates.map((d) => (
              <li key={d.id}>
                <a href={`/objects/${d.id}`} target="_blank" rel="noreferrer" className="font-mono text-indigo-700 hover:underline">{d.code}</a>{" "}
                {d.title} · агент {d.agent}
                {d.archived && <span className="text-zinc-500"> (в архиве)</span>}
                <span className="block text-amber-800">Совпадает: {d.reasons.join(", ")}</span>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={pending} onClick={() => submit(true)} className="btn">
              Это другой объект, сохранить
            </button>
            <button type="button" onClick={() => setDuplicates(undefined)} className="btn">Отмена</button>
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <button disabled={pending} className="btn-primary">
          {pending ? "Сохраняем…" : id ? "Сохранить изменения" : "Добавить объект"}
        </button>
        <Link href={id ? `/objects/${id}` : "/"} className="btn">Отмена</Link>
      </div>
      {Object.keys(errors).length > 0 && !errors.form && !duplicates?.length && (
        <p className="text-sm text-red-600">Проверьте поля, отмеченные красным</p>
      )}
    </form>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="card p-4 sm:p-5">
      <h2 className="mb-4 font-semibold">{title}</h2>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function Field({ label, error, className, children }: { label: string; error?: string; className?: string; children: ReactNode }) {
  return (
    <div className={className}>
      <span className="label">{label}</span>
      {children}
      {error && <p data-error className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}

function RoomOption({ value, label, defaultChecked }: { value: string; label: string; defaultChecked: boolean }) {
  return (
    <label className="cursor-pointer rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm has-[:checked]:border-indigo-500 has-[:checked]:bg-indigo-50 has-[:checked]:text-indigo-800">
      <input type="radio" name="rooms" value={value} defaultChecked={defaultChecked} className="sr-only" />
      {label}
    </label>
  );
}
