import type { InputHTMLAttributes } from "react";

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className="w-full rounded-2xl border border-stone-700/80 bg-stone-950/80 px-4 py-3 text-sm text-stone-100 shadow-inner shadow-black/20 outline-none ring-0 placeholder:text-stone-500 focus:border-amber-400 focus:bg-stone-950"
      {...props}
    />
  );
}
