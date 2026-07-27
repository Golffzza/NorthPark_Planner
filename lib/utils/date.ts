export function formatThaiDate(dateString: string): string {
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
  }).format(new Date(dateString));
}

export function formatThaiDateTime(dateString: string): string {
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(dateString));
}

export function toDateInputValue(dateString: string): string {
  return dateString.slice(0, 10);
}
