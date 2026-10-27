"use client";

import { useState } from "react";

async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // Запасной вариант для http и старых браузеров
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
  }
}

export function ShareButtons({ clientText, fullText }: { clientText: string; fullText: string }) {
  const [copied, setCopied] = useState<"client" | "full" | null>(null);
  const [preview, setPreview] = useState(false);

  async function onCopy(kind: "client" | "full") {
    await copy(kind === "client" ? clientText : fullText);
    setCopied(kind);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="card p-4 sm:p-5">
      <h2 className="mb-1 font-semibold">📤 Поделиться</h2>
      <p className="mb-3 text-sm text-zinc-500">
        Для клиента — без хозяина, его телефона, цены «на руки» и заметок.{" "}
        <button type="button" onClick={() => setPreview(!preview)} className="text-indigo-700 hover:underline">
          {preview ? "Скрыть текст" : "Посмотреть текст"}
        </button>
      </p>
      {preview && <pre className="mb-3 whitespace-pre-wrap rounded-lg bg-zinc-50 p-3 font-sans text-sm">{clientText}</pre>}
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => onCopy("client")} className="btn-primary">
          {copied === "client" ? "✓ Скопировано" : "📋 Скопировать для клиента"}
        </button>
        <a
          href={`https://wa.me/?text=${encodeURIComponent(clientText)}`}
          target="_blank"
          rel="noreferrer"
          className="btn"
        >
          Отправить в WhatsApp
        </a>
        <button type="button" onClick={() => onCopy("full")} className="btn">
          {copied === "full" ? "✓ Скопировано" : "📋 Полная карточка (для агентов)"}
        </button>
      </div>
    </div>
  );
}
