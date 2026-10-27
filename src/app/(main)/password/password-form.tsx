"use client";

import { useActionState } from "react";
import { changePassword, type FormState } from "./actions";

export function PasswordForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(changePassword, {});

  return (
    <form action={action} className="space-y-4">
      <label className="block">
        <span className="label">Текущий пароль</span>
        <input name="current" type="password" required autoComplete="current-password" className="input" />
      </label>
      <label className="block">
        <span className="label">Новый пароль</span>
        <input name="next" type="password" required minLength={6} autoComplete="new-password" className="input" />
      </label>
      <label className="block">
        <span className="label">Повторите новый пароль</span>
        <input name="repeat" type="password" required autoComplete="new-password" className="input" />
      </label>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.ok && <p className="text-sm text-emerald-700">{state.ok}</p>}
      <button disabled={pending} className="btn-primary w-full">Сохранить</button>
    </form>
  );
}
