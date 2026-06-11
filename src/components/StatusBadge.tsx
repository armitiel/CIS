import type { StatusUdzialu } from "@/lib/types";

const style: Record<StatusUdzialu, string> = {
  aktywny: "bg-green-100 text-green-800",
  rezerwowy: "bg-amber-100 text-amber-800",
  "zakończył": "bg-slate-200 text-slate-700",
  "przerwał": "bg-red-100 text-red-700",
};

export default function StatusBadge({ status }: { status: StatusUdzialu }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${style[status]}`}
    >
      {status}
    </span>
  );
}
