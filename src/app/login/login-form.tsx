"use client";

import { useActionState } from "react";
import { login, type LoginState } from "./actions";

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});

  return (
    <form action={action} className="space-y-4">
      <label className="block">
        <span className="label">Логин</span>
        <input name="login" defaultValue={state.login} autoComplete="username" autoCapitalize="none" required className="input" />
      </label>
      <label className="block">
        <span className="label">Пароль</span>
        <input name="password" type="password" autoComplete="current-password" required className="input" />
      </label>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button disabled={pending} className="btn-primary w-full">
        {pending ? "Входим…" : "Войти"}
      </button>
    </form>
  );
}
