"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { photoUrl } from "@/lib/photo-url";
import { deletePhoto, makeMainPhoto } from "../actions";

type Photo = { id: number; file: string };

export function Photos({ propertyId, photos, editable }: { propertyId: number; photos: Photo[]; editable: boolean }) {
  const [current, setCurrent] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const index = Math.min(current, Math.max(0, photos.length - 1));

  if (photos.length === 0 && !editable) return null;

  return (
    <div className="border-b border-zinc-200">
      {photos.length > 0 ? (
        <>
          <button type="button" onClick={() => setLightbox(true)} className="block w-full bg-zinc-900">
            {/* eslint-disable-next-line @next/next/no-img-element -- фото отдаются только с cookie, оптимизатор next/image их не получит */}
            <img src={photoUrl(photos[index].file)} alt="" className="mx-auto max-h-[60vh] w-full object-contain" />
          </button>
          {photos.length > 1 && (
            <div className="flex gap-2 overflow-x-auto p-2">
              {photos.map((p, i) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setCurrent(i)}
                  className={`shrink-0 overflow-hidden rounded-md ring-2 ${i === index ? "ring-indigo-500" : "ring-transparent"}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photoUrl(p.file, true)} alt="" className="h-14 w-20 object-cover" />
                </button>
              ))}
            </div>
          )}
        </>
      ) : (
        <p className="p-4 text-sm text-zinc-500 sm:px-5">📷 Фото пока нет. Добавьте их, чтобы показывать объект клиентам.</p>
      )}

      {editable && <PhotoManager propertyId={propertyId} photos={photos} />}

      {lightbox && photos.length > 0 && (
        <Lightbox photos={photos} index={index} onChange={setCurrent} onClose={() => setLightbox(false)} />
      )}
    </div>
  );
}

function PhotoManager({ propertyId, photos }: { propertyId: number; photos: Photo[] }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();

  async function upload(files: FileList) {
    const list = [...files];
    const failed: string[] = [];
    setErrors([]);
    setProgress({ done: 0, total: list.length });
    // По одному файлу: так виден прогресс и не упираемся в размер запроса
    for (const [i, file] of list.entries()) {
      const body = new FormData();
      body.set("photo", file);
      try {
        const res = await fetch(`/api/objects/${propertyId}/photos`, { method: "POST", body });
        if (!res.ok) failed.push((await res.json().catch(() => null))?.error ?? `«${file.name}»: ошибка загрузки`);
      } catch {
        failed.push(`«${file.name}»: нет связи с сервером`);
      }
      setProgress({ done: i + 1, total: list.length });
    }
    setProgress(null);
    setErrors(failed);
    if (inputRef.current) inputRef.current.value = "";
    router.refresh();
  }

  return (
    <div className="space-y-3 p-4 sm:px-5">
      <div className="flex flex-wrap items-center gap-2">
        <label className={`btn cursor-pointer ${progress ? "pointer-events-none opacity-50" : ""}`}>
          📷 Добавить фото
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="sr-only"
            onChange={(e) => e.target.files?.length && upload(e.target.files)}
          />
        </label>
        {photos.length > 0 && (
          <button type="button" onClick={() => setEditing(!editing)} className="btn">
            {editing ? "Готово" : "Упорядочить / удалить"}
          </button>
        )}
        {progress && (
          <span className="text-sm text-zinc-600">
            Загружаем {progress.done} из {progress.total}…
          </span>
        )}
      </div>

      {errors.length > 0 && (
        <ul className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {errors.map((e, i) => <li key={i}>{e}</li>)}
        </ul>
      )}

      {editing && (
        <ul className={`grid grid-cols-3 gap-2 sm:grid-cols-5 ${pending ? "opacity-60" : ""}`}>
          {photos.map((p, i) => (
            <li key={p.id} className="relative overflow-hidden rounded-md">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photoUrl(p.file, true)} alt="" className="aspect-[4/3] w-full object-cover" />
              <div className="absolute inset-x-0 bottom-0 flex justify-between bg-black/50 p-1 text-xs text-white">
                {i === 0 ? (
                  <span className="px-1">★ Главное</span>
                ) : (
                  <button type="button" disabled={pending} onClick={() => startTransition(() => makeMainPhoto(p.id))} className="px-1 hover:underline">
                    ☆ Сделать главным
                  </button>
                )}
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => confirm("Удалить фото?") && startTransition(() => deletePhoto(p.id))}
                  className="px-1 hover:text-red-300"
                  title="Удалить"
                >
                  ✕
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Lightbox({ photos, index, onChange, onClose }: { photos: Photo[]; index: number; onChange: (i: number) => void; onClose: () => void }) {
  const prev = () => onChange((index - 1 + photos.length) % photos.length);
  const next = () => onChange((index + 1) % photos.length);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onChange((index - 1 + photos.length) % photos.length);
      if (e.key === "ArrowRight") onChange((index + 1) % photos.length);
    }
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [index, photos.length, onChange, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90" onClick={onClose}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={photoUrl(photos[index].file)} alt="" className="max-h-full max-w-full object-contain" onClick={(e) => e.stopPropagation()} />
      <span className="absolute left-4 top-4 text-sm text-white/80">{index + 1} / {photos.length}</span>
      <button type="button" onClick={onClose} className="absolute right-3 top-2 p-2 text-3xl text-white/80 hover:text-white" aria-label="Закрыть">×</button>
      {photos.length > 1 && (
        <>
          <button type="button" onClick={(e) => { e.stopPropagation(); prev(); }} className="absolute left-2 top-1/2 -translate-y-1/2 p-3 text-4xl text-white/80 hover:text-white" aria-label="Предыдущее">‹</button>
          <button type="button" onClick={(e) => { e.stopPropagation(); next(); }} className="absolute right-2 top-1/2 -translate-y-1/2 p-3 text-4xl text-white/80 hover:text-white" aria-label="Следующее">›</button>
        </>
      )}
    </div>
  );
}
