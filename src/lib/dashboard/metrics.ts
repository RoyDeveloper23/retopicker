import type {
  DashboardData,
  DashboardOrder,
  DailyTrend,
  HistoricalOrder,
  OrderOperations,
  ProviderPerformance,
} from "./types";

const ACTIVE_STATUSES = new Set(["ASSIGNED", "ON_THE_WAY", "SEARCHING"]);
const FINAL_HISTORICAL_STATUSES = new Set([
  "DELIVERED",
  "FAILED",
  "CANCELLED",
]);
const ATTENTION_STATUS_ORDER = [
  "FAILED",
  "CANCELLED",
  "SEARCHING",
  "ON_THE_WAY",
  "ASSIGNED",
  "DELIVERED",
];

function parseOperationalDate(value: string | null | undefined): number | null {
  if (!value) return null;
  const match =
    /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/.exec(value);
  if (!match) return null;

  const [, year, month, day, hour, minute, second = "0"] = match;
  const timestamp = Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second),
  );
  const date = new Date(timestamp);
  if (
    date.getUTCFullYear() !== Number(year) ||
    date.getUTCMonth() !== Number(month) - 1 ||
    date.getUTCDate() !== Number(day)
  ) {
    return null;
  }
  return timestamp;
}

function elapsedMinutes(
  start: string | null | undefined,
  end: string | null | undefined,
): number | null {
  const startAt = parseOperationalDate(start);
  const endAt = parseOperationalDate(end);
  if (startAt === null || endAt === null || endAt < startAt) return null;
  return (endAt - startAt) / 60_000;
}

function average(values: number[]): number | null {
  return values.length
    ? values.reduce((total, value) => total + value, 0) / values.length
    : null;
}

function getAsOf(orders: OrderOperations[]): string | null {
  const dates = orders.flatMap(({ order, attempts, tracking }) => [
    order.creado_at,
    order.entregado_at,
    ...attempts.map((attempt) => attempt.enviado_at),
    ...tracking.map((record) => record.timestamp),
  ]);
  return dates
    .filter((date) => parseOperationalDate(date) !== null)
    .sort((left, right) =>
      (parseOperationalDate(right) ?? 0) - (parseOperationalDate(left) ?? 0),
    )[0] ?? null;
}

function getAssignmentMinutes(
  { order, attempts }: OrderOperations,
): number | null {
  const firstAccepted = attempts
    .filter((attempt) => attempt.respuesta === "ACCEPTED")
    .map((attempt) => attempt.enviado_at)
    .sort(
      (left, right) =>
        (parseOperationalDate(left) ?? Number.MAX_SAFE_INTEGER) -
        (parseOperationalDate(right) ?? Number.MAX_SAFE_INTEGER),
    )[0];
  return elapsedMinutes(order.creado_at, firstAccepted);
}

function hasStationaryTracking(
  tracking: OrderOperations["tracking"],
): boolean {
  const records = [...tracking].sort(
    (left, right) => left.secuencia - right.secuencia,
  );
  for (let index = 1; index < records.length; index += 1) {
    const previous = records[index - 1];
    const current = records[index];
    if (
      previous.lat === current.lat &&
      previous.lng === current.lng &&
      (elapsedMinutes(previous.timestamp, current.timestamp) ?? 0) > 10
    ) {
      return true;
    }
  }
  return false;
}

function buildOrder(
  operations: OrderOperations,
  asOf: string | null,
): DashboardOrder {
  const { order, slaMinutes, tracking } = operations;
  const deliveryMinutes = elapsedMinutes(order.creado_at, order.entregado_at);
  const ageMinutes = elapsedMinutes(order.creado_at, asOf);
  const isActive = ACTIVE_STATUSES.has(order.estado_actual);
  const isPharmacy = order.comercio.toLocaleLowerCase("es").includes("farmacia");
  const alertReasons: string[] = [];

  if (order.estado_actual === "FAILED") {
    alertReasons.push(order.motivo_falla || "Pedido fallido");
  } else if (order.estado_actual === "CANCELLED") {
    alertReasons.push(order.motivo_falla || "Pedido cancelado");
  }

  if (order.estado_actual === "SEARCHING" && ageMinutes !== null && ageMinutes > 10) {
    alertReasons.push("Buscando repartidor por más de 10 minutos");
  }

  if (
    order.estado_actual === "ON_THE_WAY" &&
    order.eta_entrega &&
    asOf &&
    (elapsedMinutes(order.eta_entrega, asOf) ?? 0) > 0
  ) {
    alertReasons.push("ETA vencida");
  }

  if (
    isActive &&
    slaMinutes !== null &&
    ageMinutes !== null &&
    ageMinutes > slaMinutes
  ) {
    alertReasons.push(`Pedido activo fuera del SLA de ${slaMinutes} min`);
  } else if (
    order.estado_actual === "DELIVERED" &&
    slaMinutes !== null &&
    deliveryMinutes !== null &&
    deliveryMinutes > slaMinutes
  ) {
    alertReasons.push(`Entrega fuera del SLA de ${slaMinutes} min`);
  }

  if (
    (order.estado_actual === "ASSIGNED" ||
      order.estado_actual === "ON_THE_WAY") &&
    hasStationaryTracking(tracking)
  ) {
    alertReasons.push("Sin movimiento registrado por más de 10 minutos");
  }

  if (
    isPharmacy &&
    (order.estado_actual === "FAILED" || order.estado_actual === "SEARCHING")
  ) {
    alertReasons.push(
      "Farmacia: avisar a la sucursal antes de cualquier reasignación",
    );
  }

  return {
    orderId: order.order_id,
    status: order.estado_actual,
    merchant: order.comercio,
    provider: order.proveedor_asignado,
    city: order.ciudad,
    createdAt: order.creado_at,
    eta: order.eta_entrega,
    deliveredAt: order.entregado_at,
    customer: order.cliente,
    incident: order.motivo_falla,
    slaMinutes,
    deliveryMinutes,
    assignmentMinutes: getAssignmentMinutes(operations),
    alertReasons,
  };
}

function createDailyTrend(history: HistoricalOrder[]): DailyTrend[] {
  const validRows = history
    .map((row) => ({ row, date: row.creado_at.slice(0, 10) }))
    .filter(({ row }) => parseOperationalDate(`${row.creado_at.slice(0, 10)} 00:00`) !== null)
    .sort((left, right) => left.date.localeCompare(right.date));
  if (!validRows.length) return [];

  const firstDay = parseOperationalDate(`${validRows[0].date} 00:00`);
  const lastDay = parseOperationalDate(
    `${validRows[validRows.length - 1].date} 00:00`,
  );
  if (firstDay === null || lastDay === null) return [];

  const days = new Map<string, DailyTrend>();
  for (
    let day = firstDay;
    day <= lastDay;
    day += 24 * 60 * 60 * 1000
  ) {
    const date = new Date(day).toISOString().slice(0, 10);
    days.set(date, { date, created: 0, delivered: 0, failed: 0 });
  }
  for (const { row, date } of validRows) {
    const entry = days.get(date);
    if (!entry) continue;
    entry.created += 1;
    if (row.estado_final === "DELIVERED") entry.delivered += 1;
    if (row.estado_final === "FAILED") entry.failed += 1;
  }
  return [...days.values()];
}

function createProviderPerformance(
  history: HistoricalOrder[],
): ProviderPerformance[] {
  const providers = new Map<
    string,
    { completed: number; delivered: number }
  >();

  for (const row of history) {
    const provider = row.proveedor.trim();
    const country = row.pais.trim();
    if (
      !provider ||
      !country ||
      !FINAL_HISTORICAL_STATUSES.has(row.estado_final)
    ) {
      continue;
    }
    const key = `${country}\u0000${provider}`;
    const performance = providers.get(key) ?? {
      completed: 0,
      delivered: 0,
    };
    performance.completed += 1;
    if (row.estado_final === "DELIVERED") performance.delivered += 1;
    providers.set(key, performance);
  }

  return [...providers.entries()]
    .map(([key, { completed, delivered }]) => {
      const [country, provider] = key.split("\u0000");
      return {
        country,
      provider,
      completed,
      delivered,
      deliveryRate: delivered / completed,
      };
    })
    .sort(
      (left, right) =>
        left.country.localeCompare(right.country) ||
        right.deliveryRate - left.deliveryRate ||
        right.completed - left.completed,
    );
}

export function calculateDashboard(
  operations: OrderOperations[],
  history: HistoricalOrder[],
): DashboardData {
  const asOf = getAsOf(operations);
  const orders = operations.map((item) => buildOrder(item, asOf));
  const count = (status: string) =>
    operations.filter(({ order }) => order.estado_actual === status).length;
  const delivered = count("DELIVERED");
  const active = operations.filter(({ order }) =>
    ACTIVE_STATUSES.has(order.estado_actual),
  ).length;
  const incidentIds = new Set(
    orders
      .filter((order) => order.alertReasons.length > 0)
      .map((order) => order.orderId),
  );
  const deliveryTimes = orders
    .filter((order) => order.status === "DELIVERED")
    .map((order) => order.deliveryMinutes)
    .filter((value): value is number => value !== null);
  const assignmentTimes = orders
    .map((order) => order.assignmentMinutes)
    .filter((value): value is number => value !== null);
  const slaEvaluations = orders.flatMap((order) => {
    if (order.slaMinutes === null) return [];
    const duration =
      order.status === "DELIVERED"
        ? order.deliveryMinutes
        : ACTIVE_STATUSES.has(order.status)
          ? elapsedMinutes(order.createdAt, asOf)
          : null;
    return duration === null ? [] : [{ duration, slaMinutes: order.slaMinutes }];
  });
  const outsideSla = slaEvaluations.filter(
    ({ duration, slaMinutes }) => duration > slaMinutes,
  ).length;
  const stateCounts = new Map<string, number>();
  for (const { order } of operations) {
    stateCounts.set(
      order.estado_actual,
      (stateCounts.get(order.estado_actual) ?? 0) + 1,
    );
  }

  const dashboardOrders = [...orders].sort(
    (left, right) =>
      ATTENTION_STATUS_ORDER.indexOf(left.status) -
        ATTENTION_STATUS_ORDER.indexOf(right.status) ||
      left.orderId - right.orderId,
  );

  return {
    asOf,
    metrics: {
      totalOrders: operations.length,
      delivered,
      inTransit: count("ON_THE_WAY"),
      searching: count("SEARCHING"),
      failed: count("FAILED"),
      cancelled: count("CANCELLED"),
      active,
      incidentOrders: incidentIds.size,
      activeOrIncident: new Set([
        ...operations
          .filter(({ order }) => ACTIVE_STATUSES.has(order.estado_actual))
          .map(({ order }) => order.order_id),
        ...incidentIds,
      ]).size,
      deliveryRate:
        delivered + active > 0 ? delivered / (delivered + active) : null,
      averageDeliveryMinutes: average(deliveryTimes),
      averageAssignmentMinutes: average(assignmentTimes),
      outsideSla:
        slaEvaluations.length > 0 ? outsideSla : null,
      outsideSlaSampleSize: slaEvaluations.length,
    },
    stateDistribution: [...stateCounts.entries()]
      .map(([status, value]) => ({ status, count: value }))
      .sort((left, right) => right.count - left.count),
    dailyTrend: createDailyTrend(history),
    providerPerformance: createProviderPerformance(history),
    attentionOrders: dashboardOrders.filter(
      (order) => order.alertReasons.length > 0,
    ),
    orders: dashboardOrders,
  };
}
