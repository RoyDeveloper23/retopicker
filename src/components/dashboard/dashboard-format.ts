export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    SEARCHING: "Buscando repartidor",
    ASSIGNED: "Asignado",
    ON_THE_WAY: "En tránsito",
    DELIVERED: "Entregado",
    FAILED: "Fallido",
    CANCELLED: "Cancelado",
  };
  return labels[status] ?? status.replaceAll("_", " ");
}

export function getStatusClasses(status: string): string {
  if (status === "SEARCHING") return "bg-zinc-200 text-zinc-700";
  if (status === "ON_THE_WAY" || status === "DELIVERED") {
    return "bg-emerald-100 text-emerald-800";
  }
  if (status === "FAILED" || status === "CANCELLED") {
    return "bg-rose-100 text-rose-800";
  }
  if (status.includes("DELAY") || status.includes("INCIDENT")) {
    return "bg-amber-100 text-amber-800";
  }
  return status === "ASSIGNED"
    ? "bg-sky-100 text-sky-800"
    : "bg-slate-100 text-slate-700";
}

export function formatMinutes(value: number | null): string {
  return value === null ? "No disponible" : `${value.toFixed(1)} min`;
}

export function formatPercent(value: number | null): string {
  return value === null ? "No disponible" : `${(value * 100).toFixed(1)}%`;
}

export function formatOperationalTimestamp(value: string | null): string {
  if (!value) return "No disponible";
  const match =
    /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/.exec(value);
  if (!match) return value;
  const [, year, month, day, hour, minute] = match;
  return `${day}/${month}/${year} ${hour}:${minute}`;
}
