"use client";

import { useTransition } from "react";
import { archiveProperty, restoreProperty } from "../actions";

export function ArchiveButton({ id, archived }: { id: number; archived: boolean }) {
  const [pending, startTransition] = useTransition();

  if (archived) {
    return (
      <button disabled={pending} onClick={() => startTransition(() => restoreProperty(id))} className="btn">
        Вернуть из архива
      </button>
    );
  }

  return (
    <button
      disabled={pending}
      onClick={() => {
        if (confirm("Убрать объект в архив? Его можно будет вернуть.")) startTransition(() => archiveProperty(id));
      }}
      className="btn-danger"
    >
      В архив
    </button>
  );
}
