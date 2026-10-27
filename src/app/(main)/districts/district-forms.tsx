"use client";

import { useActionState, useTransition } from "react";
import { createDistrict, deleteDistrict, type FormState } from "./actions";

export function NewDistrictForm({ cities }: { cities: string[] }) {
  const [state, action, pending] = useActionState<FormState, FormData>(createDistrict, {});

  return (
    <form action={action} className="grid gap-4 sm:grid-cols-[1fr_1fr_auto]">
      <label>
        <span className="label">Город</span>
        <input name="city" required defaultValue={cities[0] ?? "Бишкек"} list="cities" className="input" />
        <datalist id="cities">
          {cities.map((c) => <option key={c} value={c} />)}
        </datalist>
      </label>
      <label>
        <span className="label">Район / микрорайон</span>
        <input name="name" required placeholder="Асанбай" className="input" />
      </label>
      <div className="flex items-end">
        <button disabled={pending} className="btn-primary w-full">Добавить</button>
      </div>
      {state.error && <p className="text-sm text-red-600 sm:col-span-3">{state.error}</p>}
      {state.ok && <p className="text-sm text-emerald-700 sm:col-span-3">{state.ok}</p>}
    </form>
  );
}

export function DeleteDistrictButton({ id, name }: { id: number; name: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() => {
        if (confirm(`Удалить район «${name}»?`)) startTransition(() => deleteDistrict(id));
      }}
      className="rounded-full px-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-600"
      title="Удалить"
    >
      ✕
    </button>
  );
}
