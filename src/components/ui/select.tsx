import type { SelectHTMLAttributes } from "react";

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className="w-full rounded-2xl border border-stone-700/80 bg-stone-950/80 px-4 py-3 text-sm text-stone-100 shadow-inner shadow-black/20 outline-none focus:border-amber-400 focus:bg-stone-950"
      {...props}
    />
  );
}
