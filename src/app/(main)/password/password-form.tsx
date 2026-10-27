"use client";

import { useActionState } from "react";
import { changePassword, type FormState } from "./actions";

export function PasswordForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(changePassword, {});

  return (
    <form action={action} className="space-y-4">
      <label className="block">
        <span className="label">Текущий пароль</span>
        <input name="current" type="password" autoComplete="current-password" className="input" />
      </label>
      {/* Длину проверяет сервер: всплывающую подсказку браузера легко не заметить */}
      <label className="block">
        <span className="label">Новый пароль</span>
        <input name="next" type="password" autoComplete="new-password" className="input" />
        <span className="mt-1 block text-xs text-zinc-500">Минимум 6 символов</span>
      </label>
      <label className="block">
        <span className="label">Повторите новый пароль</span>
        <input name="repeat" type="password" autoComplete="new-password" className="input" />
      </label>
      {state.error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}
      {state.ok && <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">✓ {state.ok}</p>}
      <button disabled={pending} className="btn-primary w-full">{pending ? "Сохраняю…" : "Сохранить"}</button>
    </form>
  );
}
