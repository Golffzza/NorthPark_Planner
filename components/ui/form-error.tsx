type FormErrorProps = {
  message?: string;
  id?: string;
};

export function FormError({ message, id }: FormErrorProps) {
  if (!message) {
    return null;
  }

  return (
    <p
      id={id}
      role="alert"
      className="form-error scroll-mt-28 mt-2 rounded-2xl bg-rose-50/95 dark:bg-rose-950/60 px-3.5 py-2 text-sm font-semibold text-rose-700 dark:text-rose-300 ring-1 ring-rose-300/80 dark:ring-rose-800/60 shadow-xs flex items-center gap-2"
    >
      <span className="shrink-0 text-rose-500">⚠️</span>
      <span>{message}</span>
    </p>
  );
}
