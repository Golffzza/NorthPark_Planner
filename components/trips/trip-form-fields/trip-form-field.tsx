import type { ReactNode } from "react";

type TripFormFieldProps = {
  label: string;
  htmlFor: string;
  hint?: string;
  children: ReactNode;
};

export function TripFormField({ label, htmlFor, hint, children }: TripFormFieldProps) {
  return (
    <label htmlFor={htmlFor} className="flex flex-col gap-2">
      <span className="text-sm font-semibold text-[var(--foreground)]">{label}</span>
      {hint ? <span className="-mt-1 text-xs leading-6 text-[var(--muted)]">{hint}</span> : null}
      <div>{children}</div>
    </label>
  );
}
