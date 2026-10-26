import assert from "node:assert/strict";
import test from "node:test";

import { calculateDashboard } from "./metrics.ts";

function createOrder(orderId, status, createdAt, overrides = {}) {
  return {
    order_id: orderId,
    referencia_comercio: `REF-${orderId}`,
    comercio: "Comercio de prueba",
    sucursal: "Centro",
    ciudad: "Ciudad de México",
    pais: "MX",
    cliente: "Cliente",
    direccion_entrega: "Dirección privada",
    creado_at: createdAt,
    estado_actual: status,
    proveedor_asignado: null,
    repartidor: null,
    telefono_repartidor: null,
    distancia_km: 1,
    eta_entrega: null,
    entregado_at: null,
    metodo_pago: "Tarjeta",
    monto_pedido: 100,
    moneda: "MXN",
    costo_envio: 10,
    intentos_asignacion: 0,
    motivo_falla: null,
    lat_origen: 19,
    lng_origen: -99,
    lat_destino: 19,
    lng_destino: -99,
    ...overrides,
  };
}

function operation(order, { slaMinutes = null, attempts = [], tracking = [] } = {}) {
  return { order, slaMinutes, attempts, tracking };
}

test("calculates current KPIs, SLA, rates, and status distribution from orders", () => {
  const operations = [
    operation(
      createOrder(1, "DELIVERED", "2026-10-20 10:00", {
        proveedor_asignado: "Proveedor A",
        entregado_at: "2026-10-20 10:50",
      }),
      {
        slaMinutes: 40,
        attempts: [
          {
            order_id: 1,
            intento: 1,
            proveedor: "Proveedor A",
            enviado_at: "2026-10-20 10:05",
            respuesta: "ACCEPTED",
            detalle: null,
          },
        ],
      },
    ),
    operation(
      createOrder(2, "ON_THE_WAY", "2026-10-20 10:30", {
        eta_entrega: "2026-10-20 11:00",
      }),
      { slaMinutes: 40 },
    ),
    operation(createOrder(3, "SEARCHING", "2026-10-20 11:15"), {
      slaMinutes: 30,
    }),
    operation(createOrder(4, "ASSIGNED", "2026-10-20 11:00"), {
      slaMinutes: 40,
    }),
    operation(
      createOrder(5, "FAILED", "2026-10-20 10:00", {
        motivo_falla: "Sin proveedor",
      }),
    ),
    operation(
      createOrder(6, "CANCELLED", "2026-10-20 10:00", {
        motivo_falla: "Cancelado por comercio",
      }),
    ),
  ];
  const history = [
    {
      order_id: 100,
      creado_at: "2026-10-01 09:00",
      pais: "MX",
      proveedor: "Proveedor A",
      estado_final: "DELIVERED",
    },
    {
      order_id: 101,
      creado_at: "2026-10-01 10:00",
      pais: "MX",
      proveedor: "Proveedor A",
      estado_final: "FAILED",
    },
    {
      order_id: 102,
      creado_at: "2026-10-02 10:00",
      pais: "MX",
      proveedor: "Proveedor A",
      estado_final: "CANCELLED",
    },
    {
      order_id: 103,
      creado_at: "2026-10-02 10:00",
      pais: "MX",
      proveedor: "Proveedor A",
      estado_final: "ON_THE_WAY",
    },
  ];

  const result = calculateDashboard(operations, history);

  assert.deepEqual(
    {
      total: result.metrics.totalOrders,
      delivered: result.metrics.delivered,
      inTransit: result.metrics.inTransit,
      searching: result.metrics.searching,
      failed: result.metrics.failed,
      cancelled: result.metrics.cancelled,
      active: result.metrics.active,
      rate: result.metrics.deliveryRate,
      deliveryAverage: result.metrics.averageDeliveryMinutes,
      assignmentAverage: result.metrics.averageAssignmentMinutes,
      outsideSla: result.metrics.outsideSla,
      outsideSlaSample: result.metrics.outsideSlaSampleSize,
    },
    {
      total: 6,
      delivered: 1,
      inTransit: 1,
      searching: 1,
      failed: 1,
      cancelled: 1,
      active: 3,
      rate: 0.25,
      deliveryAverage: 50,
      assignmentAverage: 5,
      outsideSla: 2,
      outsideSlaSample: 4,
    },
  );
  assert.equal(result.metrics.activeOrIncident, 6);
  assert.deepEqual(
    Object.fromEntries(
      result.stateDistribution.map(({ status, count }) => [status, count]),
    ),
    {
      DELIVERED: 1,
      ON_THE_WAY: 1,
      SEARCHING: 1,
      ASSIGNED: 1,
      FAILED: 1,
      CANCELLED: 1,
    },
  );
  assert.equal(result.providerPerformance[0].completed, 3);
  assert.equal(result.providerPerformance[0].delivered, 1);
  assert.equal(result.providerPerformance[0].deliveryRate, 1 / 3);
  assert.equal(result.providerPerformance[0].country, "MX");
  assert.equal(result.dailyTrend.length, 2);
  assert.deepEqual(result.dailyTrend[0], {
    date: "2026-10-01",
    created: 2,
    delivered: 1,
    failed: 1,
  });
  assert.ok(
    result.orders.every(
      (order) => !("direccion_entrega" in order) && !("telefono_repartidor" in order),
    ),
  );
});

test("marks missing and invalid timestamps, SLAs, and empty histories unavailable", () => {
  const operations = [
    operation(
      createOrder(1, "DELIVERED", "invalid-date", {
        entregado_at: "2026-10-20 10:00",
      }),
    ),
    operation(createOrder(2, "SEARCHING", "2026-10-20 11:00")),
  ];

  const result = calculateDashboard(operations, []);

  assert.equal(result.asOf, "2026-10-20 11:00");
  assert.equal(result.metrics.averageDeliveryMinutes, null);
  assert.equal(result.metrics.averageAssignmentMinutes, null);
  assert.equal(result.metrics.outsideSla, null);
  assert.equal(result.metrics.outsideSlaSampleSize, 0);
  assert.equal(result.metrics.deliveryRate, 0.5);
  assert.deepEqual(result.dailyTrend, []);
  assert.deepEqual(result.providerPerformance, []);
  assert.equal(result.attentionOrders.length, 0);
});

test("uses operational alerts and preserves pharmacy reassignment guidance", () => {
  const operations = [
    operation(
      createOrder(1, "FAILED", "2026-10-20 10:00", {
        comercio: "Farmacia Salud",
        motivo_falla: "Proveedores rechazaron",
      }),
    ),
    operation(
      createOrder(2, "ON_THE_WAY", "2026-10-20 10:30", {
        eta_entrega: "2026-10-20 11:00",
      }),
      {
        slaMinutes: 120,
        tracking: [
          {
            order_id: 2,
            repartidor: "Courier",
            proveedor: "Proveedor",
            secuencia: 1,
            timestamp: "2026-10-20 10:45",
            lat: 19,
            lng: -99,
            velocidad_kmh: 0,
            fase: "HACIA_CLIENTE",
          },
          {
            order_id: 2,
            repartidor: "Courier",
            proveedor: "Proveedor",
            secuencia: 2,
            timestamp: "2026-10-20 11:11",
            lat: 19,
            lng: -99,
            velocidad_kmh: 0,
            fase: "HACIA_CLIENTE",
          },
        ],
      },
    ),
  ];
  const result = calculateDashboard(operations, []);
  const pharmacy = result.orders.find(({ orderId }) => orderId === 1);
  const delayed = result.orders.find(({ orderId }) => orderId === 2);

  assert.ok(
    pharmacy.alertReasons.some((reason) => reason.includes("avisar a la sucursal")),
  );
  assert.ok(delayed.alertReasons.includes("ETA vencida"));
  assert.ok(
    delayed.alertReasons.includes("Sin movimiento registrado por más de 10 minutos"),
  );
});
