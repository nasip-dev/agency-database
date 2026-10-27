"use client";

import { useId, useRef, useState, type KeyboardEvent } from "react";

type District = { id: number; city: string; name: string };

const norm = (s: string) => s.toLowerCase().replace(/ё/g, "е").trim();

/**
 * Выбор района с поиском: печатаешь часть названия — список сужается.
 * Выбранный id уходит в форму скрытым полем `name`.
 */
export function DistrictPicker({
  name,
  districts,
  defaultValue,
  invalid,
  onPick,
}: {
  name: string;
  districts: District[];
  defaultValue: number | null;
  invalid?: boolean;
  onPick?: () => void;
}) {
  const initial = districts.find((d) => d.id === defaultValue) ?? null;
  const [selected, setSelected] = useState<District | null>(initial);
  const [query, setQuery] = useState(initial?.name ?? "");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);
  const listId = useId();

  const showCity = new Set(districts.map((d) => d.city)).size > 1;
  const label = (d: District) => (showCity ? `${d.name}, ${d.city}` : d.name);

  // Пока район выбран и текст не меняли — показываем весь список
  const q = selected && query === selected.name ? "" : norm(query);
  const matches = q ? districts.filter((d) => norm(`${d.name} ${d.city}`).includes(q)) : districts;

  function pick(d: District) {
    setSelected(d);
    setQuery(d.name);
    setOpen(false);
    onPick?.();
  }

  function scrollTo(i: number) {
    listRef.current?.children[i]?.scrollIntoView({ block: "nearest" });
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) return setOpen(true);
      const next = Math.max(0, Math.min(matches.length - 1, active + (e.key === "ArrowDown" ? 1 : -1)));
      setActive(next);
      scrollTo(next);
    } else if (e.key === "Enter" && open) {
      // Enter выбирает район, а не отправляет форму
      e.preventDefault();
      if (matches[active]) pick(matches[active]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className="relative">
      <input type="hidden" name={name} value={selected?.id ?? ""} />
      <input
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        value={query}
        placeholder="🔎 Начните вводить район"
        autoComplete="off"
        onFocus={(e) => {
          e.target.select();
          setOpen(true);
        }}
        onChange={(e) => {
          setQuery(e.target.value);
          setSelected(null);
          setActive(0);
          setOpen(true);
        }}
        onBlur={() => {
          setOpen(false);
          // Название набрали целиком, но из списка не выбрали — выбираем сами
          if (!selected) {
            const exact = districts.find((d) => norm(d.name) === norm(query));
            if (exact) pick(exact);
          }
        }}
        onKeyDown={onKeyDown}
        className={"input" + (invalid ? " input-error" : "")}
      />
      {open && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          className="absolute z-30 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-zinc-200 bg-white py-1 shadow-lg"
        >
          {matches.length === 0 && <li className="px-3 py-2 text-sm text-zinc-500">Район не найден</li>}
          {matches.map((d, i) => (
            <li
              key={d.id}
              role="option"
              aria-selected={selected?.id === d.id}
              // mousedown, а не click: иначе поле потеряет фокус и список закроется раньше
              onMouseDown={(e) => {
                e.preventDefault();
                pick(d);
              }}
              onMouseEnter={() => setActive(i)}
              className={`cursor-pointer px-3 py-2 text-sm ${i === active ? "bg-indigo-50 text-indigo-800" : ""} ${selected?.id === d.id ? "font-medium" : ""}`}
            >
              {label(d)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
