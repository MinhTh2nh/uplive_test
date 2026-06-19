import type { ButtonHTMLAttributes, PropsWithChildren } from "react";

type ButtonProps = PropsWithChildren<
  ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: "primary" | "secondary" | "ghost";
  }
>;

export function Button({ children, className = "", variant = "primary", ...props }: ButtonProps) {
  const variantClassName =
    variant === "primary"
      ? "border border-amber-300/60 bg-gradient-to-r from-amber-300 via-orange-300 to-amber-400 text-stone-950 shadow-lg shadow-amber-950/20 hover:from-amber-200 hover:via-orange-200 hover:to-amber-300"
      : variant === "secondary"
        ? "border border-stone-700 bg-stone-800 text-stone-100 hover:bg-stone-700"
        : "border border-stone-700/80 bg-stone-950/40 text-stone-200 hover:border-stone-500 hover:bg-stone-900";

  return (
    <button
      className={`rounded-full px-4 py-2 text-sm font-semibold transition duration-200 disabled:cursor-not-allowed disabled:opacity-60 ${variantClassName} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
