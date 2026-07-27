type FormErrorProps = {
  message?: string;
};

export function FormError({ message }: FormErrorProps) {
  if (!message) {
    return null;
  }

  return (
    <p className="mt-2 rounded-2xl bg-rose-50/90 px-3 py-2 text-sm font-medium text-rose-700 ring-1 ring-rose-200">
      {message}
    </p>
  );
}
