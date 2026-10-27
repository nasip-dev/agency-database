import { STATUSES, type Status } from "@/lib/constants";

export function StatusBadge({ status }: { status: string }) {
  const s = STATUSES[status as Status];
  return (
    <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${s?.className ?? "bg-zinc-100"}`}>
      {s?.label ?? status}
    </span>
  );
}
