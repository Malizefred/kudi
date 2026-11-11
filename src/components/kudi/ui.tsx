import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatNgn, initials, toneClass, type Tone } from "@/lib/kudi/model";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function Avatar({
  name,
  tone,
  size = "md",
}: {
  name: string;
  tone: Tone;
  size?: "sm" | "md" | "lg";
}) {
  const box = size === "lg" ? "size-14 text-lg" : size === "sm" ? "size-10 text-xs" : "size-12 text-sm";
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold",
        box,
        toneClass(tone),
      )}
    >
      {initials(name)}
    </span>
  );
}

export function Money({
  kobo,
  hidden,
  className,
}: {
  kobo: number;
  hidden?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("tabular-nums", className)}>
      {hidden ? "₦••••••" : formatNgn(kobo)}
    </span>
  );
}
