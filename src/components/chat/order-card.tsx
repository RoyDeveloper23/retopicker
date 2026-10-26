import type { OrderCardData } from "@/lib/chat/types";

interface OrderCardProps {
  order: OrderCardData;
  onAction: (message: string) => void;
}

const progressStages = ["Creado", "Asignado", "En ruta", "Entregado"];

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    SEARCHING: "Buscando repartidor",
    ASSIGNED: "Asignado",
    ON_THE_WAY: "En ruta",
    DELIVERED: "Entregado",
    FAILED: "Fallido",
    CANCELLED: "Cancelado",
  };

  return labels[status] ?? status.replaceAll("_", " ");
}

function getStatusClasses(status: string): string {
  if (status === "SEARCHING") return "bg-zinc-200 text-zinc-700";
  if (status === "ON_THE_WAY" || status === "DELIVERED") {
    return "bg-emerald-100 text-emerald-800";
  }
  if (status === "FAILED" || status === "CANCELLED") {
    return "bg-rose-100 text-rose-800";
  }
  if (orderHasIncidentStatus(status)) return "bg-amber-100 text-amber-800";
  return "bg-slate-100 text-slate-700";
}

function orderHasIncidentStatus(status: string): boolean {
  return status.includes("DELAY") || status.includes("INCIDENT");
}

function getProgressIndex(order: OrderCardData): number | null {
  if (order.status === "FAILED" || order.status === "CANCELLED") return null;

  const statusProgress: Record<string, number> = {
    SEARCHING: 0,
    ASSIGNED: 1,
    ON_THE_WAY: 2,
    DELIVERED: 3,
  };
  const knownProgress = statusProgress[order.status];
  const trackingProgress = order.tracking.reduce((highest, event) => {
    if (event.phase === "HACIA_LOCAL") return Math.max(highest, 1);
    if (event.phase === "HACIA_CLIENTE") return Math.max(highest, 2);
    return highest;
  }, -1);

  if (knownProgress === undefined && trackingProgress < 0) return null;
  return Math.max(knownProgress ?? 0, trackingProgress);
}

function formatTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function Detail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </dt>
      <dd className="mt-0.5 break-words text-[15px] font-medium text-slate-800">
        {value}
      </dd>
    </div>
  );
}

export function OrderCard({ order, onAction }: OrderCardProps) {
  const progressIndex = getProgressIndex(order);
  const latestTracking = order.tracking.at(-1);
  const hasIncident = Boolean(order.incident);
  const isFailed =
    order.status === "FAILED" || order.status === "CANCELLED";

  return (
    <section
      aria-label={`Resumen del pedido ${order.orderId}`}
      className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
        <h3 className="font-mono text-sm font-semibold tabular-nums text-slate-900">
          Pedido #{order.orderId}
        </h3>
        <span
          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClasses(order.status)}`}
        >
          {getStatusLabel(order.status)}
        </span>
      </div>

      <div className="space-y-4 p-4">
        {hasIncident && (
          <div className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
            <span className="font-semibold">Incidencia: </span>
            {order.incident}
          </div>
        )}
        {isFailed && !hasIncident && (
          <div className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-900">
            El pedido está {order.status === "FAILED" ? "fallido" : "cancelado"}.
          </div>
        )}

        <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
          <Detail
            label={order.branch ? `Origen · ${order.branch}` : "Origen"}
            value={order.merchant}
          />
          <Detail label="Destino · cliente" value={order.customer} />
          <Detail label="Ciudad" value={order.city} />
          {order.provider && (
            <Detail label="Proveedor" value={order.provider} />
          )}
          {order.courier && <Detail label="Repartidor" value={order.courier} />}
          {order.eta && (
            <Detail label="ETA" value={formatTimestamp(order.eta)} />
          )}
          {order.deliveredAt && (
            <Detail
              label="Entregado"
              value={formatTimestamp(order.deliveredAt)}
            />
          )}
        </dl>

        {isFailed ? (
          <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
            No se muestra progreso porque el pedido no está en curso.
          </p>
        ) : progressIndex === null ? (
          <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
            No hay datos suficientes para mostrar el progreso.
          </p>
        ) : (
          <div aria-label="Progreso del pedido" className="pt-1">
            <ol className="grid grid-cols-4">
              {progressStages.map((stage, index) => {
                const isComplete = index <= progressIndex;
                return (
                  <li
                    key={stage}
                    className="flex min-w-0 flex-col items-center gap-1.5 text-center"
                  >
                    <span className="flex w-full items-center">
                      {index > 0 && (
                        <span
                          aria-hidden="true"
                          className={`h-0.5 flex-1 ${index <= progressIndex ? "bg-teal-700" : "bg-slate-200"}`}
                        />
                      )}
                      <span
                        aria-hidden="true"
                        className={`flex size-3 shrink-0 items-center justify-center rounded-full border-2 ${isComplete ? "border-teal-700 bg-teal-700" : "border-slate-300 bg-white"}`}
                      />
                      {index < progressStages.length - 1 && (
                        <span
                          aria-hidden="true"
                          className={`h-0.5 flex-1 ${index < progressIndex ? "bg-teal-700" : "bg-slate-200"}`}
                        />
                      )}
                    </span>
                    <span
                      className={`text-[10px] leading-tight sm:text-[11px] ${isComplete ? "font-medium text-slate-800" : "text-slate-500"}`}
                    >
                      {stage}
                    </span>
                  </li>
                );
              })}
            </ol>
            {latestTracking && (
              <p className="mt-2 text-[11px] text-slate-500">
                Último evento: {latestTracking.phase.replaceAll("_", " ")} ·{" "}
                {formatTimestamp(latestTracking.timestamp)}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2 border-t border-slate-100 bg-slate-50/70 px-4 py-3">
        {[
          ["Consultar tracking", `Consulta el tracking del pedido ${order.orderId}.`],
          ["Ver intentos", `Muestra los intentos de asignación del pedido ${order.orderId}.`],
          ["Buscar incidencias", `Busca incidencias del pedido ${order.orderId}.`],
        ].map(([label, message]) => (
          <button
            key={label}
            type="button"
            onClick={() => onAction(message)}
            className="inline-flex min-h-8 items-center rounded-md border border-slate-300 bg-white px-2.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
          >
            {label}
          </button>
        ))}
      </div>
    </section>
  );
}
