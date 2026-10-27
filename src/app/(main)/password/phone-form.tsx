"use client";

import { useActionState } from "react";
import { changePhone, type FormState } from "./actions";

export function PhoneForm({ phone }: { phone: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(changePhone, {});

  return (
    <form action={action} className="space-y-4">
      <label className="block">
        <span className="label">Мой телефон</span>
        <input name="phone" type="tel" defaultValue={phone} placeholder="+996 555 123 456" className="input" />
        <span className="mt-1 block text-xs text-zinc-500">Подставляется в текст «Скопировать для клиента»</span>
      </label>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.ok && <p className="text-sm text-emerald-700">{state.ok}</p>}
      <button disabled={pending} className="btn w-full">Сохранить телефон</button>
    </form>
  );
}
