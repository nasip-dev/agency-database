"use client";

import { useActionState, useState, useTransition } from "react";
import { createAgent, resetPassword, setAgentActive, type FormState } from "./actions";

export function NewAgentForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(createAgent, {});

  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <label>
        <span className="label">Имя</span>
        <input name="name" required placeholder="Улугбек" className="input" />
      </label>
      <label>
        <span className="label">Телефон (необязательно)</span>
        <input name="phone" type="tel" placeholder="+996 555 123 456" className="input" />
      </label>
      <label>
        <span className="label">Логин для входа</span>
        <input name="login" required autoCapitalize="none" placeholder="ulugbek" className="input" />
      </label>
      <label>
        <span className="label">Пароль</span>
        <input name="password" required autoComplete="new-password" placeholder="минимум 6 символов" className="input" />
      </label>
      <label>
        <span className="label">Роль</span>
        <select name="role" className="input">
          <option value="AGENT">Агент</option>
          <option value="ADMIN">Руководитель</option>
        </select>
      </label>
      <div className="flex items-end">
        <button disabled={pending} className="btn-primary w-full sm:w-auto">Добавить агента</button>
      </div>
      {state.error && <p className="text-sm text-red-600 sm:col-span-2">{state.error}</p>}
      {state.ok && <p className="text-sm text-emerald-700 sm:col-span-2">{state.ok}</p>}
    </form>
  );
}

export function AgentActions({ id, active, isSelf }: { id: number; active: boolean; isSelf: boolean }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<FormState>({});
  // Поле ввода прямо в строке: окно prompt() многие браузеры молча блокируют
  const [editing, setEditing] = useState(false);
  const [password, setPassword] = useState("");

  function save() {
    startTransition(async () => {
      const result = await resetPassword(id, password);
      setMessage(result);
      if (result.ok) {
        setEditing(false);
        setPassword("");
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {editing ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
          className="flex flex-wrap items-center gap-2"
        >
          <input
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Новый пароль, от 6 символов"
            autoComplete="new-password"
            className="input w-56"
          />
          <button disabled={pending} className="btn-primary">
            {pending ? "Сохраняю…" : "Сохранить"}
          </button>
          <button
            type="button"
            onClick={() => {
              setEditing(false);
              setPassword("");
              setMessage({});
            }}
            className="btn"
          >
            Отмена
          </button>
        </form>
      ) : (
        <button
          disabled={pending}
          onClick={() => {
            setMessage({});
            setEditing(true);
          }}
          className="btn"
        >
          Сменить пароль
        </button>
      )}
      {!isSelf && !editing && (
        <button
          disabled={pending}
          onClick={() => startTransition(() => setAgentActive(id, !active))}
          className={active ? "btn-danger" : "btn"}
        >
          {active ? "Отключить" : "Включить"}
        </button>
      )}
      {message.error && <span className="text-sm text-red-600">{message.error}</span>}
      {message.ok && <span className="text-sm text-emerald-700">{message.ok}</span>}
    </div>
  );
}
