"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { DashboardOrder } from "@/lib/dashboard/types";
import {
  formatMinutes,
  formatOperationalTimestamp,
  getStatusClasses,
  getStatusLabel,
} from "./dashboard-format";

interface OrdersTableProps {
  orders: DashboardOrder[];
}

function getAssistantUrl(orderId: number): string {
  const message = `Consulta el pedido ${orderId}, su estado, tracking e intentos de asignación.`;
  return `/?message=${encodeURIComponent(message)}`;
}

export function OrdersTable({ orders }: OrdersTableProps) {
  const [statusFilter, setStatusFilter] = useState("");
  const [orderQuery, setOrderQuery] = useState("");
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const filteredOrders = useMemo(
    () =>
      orders.filter(
        (order) =>
          (!statusFilter || order.status === statusFilter) &&
          (!orderQuery ||
            String(order.orderId).includes(orderQuery.replace(/^#/, "").trim())),
      ),
    [orders, orderQuery, statusFilter],
  );
  const allStatuses = useMemo(
    () => [...new Set(orders.map((order) => order.status))].sort(),
    [orders],
  );
  const selectedOrder = orders.find(
    (order) => order.orderId === selectedOrderId,
  );

  return (
    <section className="rounded-xl border border-slate-200 bg-white">
      <div className="flex flex-col gap-4 border-b border-slate-200 p-4 sm:flex-row sm:items-end sm:justify-between sm:p-5">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            Pedidos recientes
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Filtra y selecciona un pedido para revisar los datos disponibles
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label
              htmlFor="order-search"
              className="mb-1 block text-xs font-medium text-slate-600"
            >
              Buscar por ID
            </label>
            <input
              id="order-search"
              type="search"
              inputMode="numeric"
              value={orderQuery}
              onChange={(event) =>
                setOrderQuery(event.target.value.replace(/[^\d#]/g, ""))
              }
              placeholder="Ej. 12350"
              className="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15"
            />
          </div>
          <div>
            <label
              htmlFor="status-filter"
              className="mb-1 block text-xs font-medium text-slate-600"
            >
              Estado
            </label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15"
            >
              <option value="">Todos los estados</option>
              {allStatuses.map((status) => (
                <option key={status} value={status}>
                  {getStatusLabel(status)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th scope="col" className="px-4 py-3 font-medium">
                Pedido
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Estado
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Comercio
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Proveedor
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Motivo de alerta
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredOrders.map((order) => (
              <tr
                key={order.orderId}
                className={
                  selectedOrderId === order.orderId ? "bg-teal-50/60" : ""
                }
              >
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => setSelectedOrderId(order.orderId)}
                    className="font-mono font-semibold tabular-nums text-teal-800 underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
                    aria-pressed={selectedOrderId === order.orderId}
                  >
                    #{order.orderId}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex whitespace-nowrap rounded-full px-2 py-1 text-xs font-semibold ${getStatusClasses(order.status)}`}
                  >
                    {getStatusLabel(order.status)}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-700">{order.merchant}</td>
                <td className="px-4 py-3 text-slate-600">
                  {order.provider || "No disponible"}
                </td>
                <td className="max-w-sm px-4 py-3 text-slate-600">
                  {order.alertReasons.length > 0
                    ? order.alertReasons.join(" · ")
                    : "Sin alerta registrada"}
                </td>
              </tr>
            ))}
            {filteredOrders.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-8 text-center text-sm text-slate-500"
                >
                  No hay pedidos que coincidan con los filtros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedOrder && (
        <section
          aria-label={`Detalle del pedido ${selectedOrder.orderId}`}
          className="border-t border-slate-200 bg-slate-50/70 p-4 sm:p-5"
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-mono text-base font-semibold tabular-nums text-slate-900">
                  Pedido #{selectedOrder.orderId}
                </h3>
                <span
                  className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getStatusClasses(selectedOrder.status)}`}
                >
                  {getStatusLabel(selectedOrder.status)}
                </span>
              </div>
              <dl className="mt-3 grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <dt className="text-xs text-slate-500">Comercio</dt>
                  <dd className="mt-0.5 font-medium text-slate-800">
                    {selectedOrder.merchant}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Cliente</dt>
                  <dd className="mt-0.5 font-medium text-slate-800">
                    {selectedOrder.customer}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Ciudad</dt>
                  <dd className="mt-0.5 font-medium text-slate-800">
                    {selectedOrder.city}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Proveedor</dt>
                  <dd className="mt-0.5 font-medium text-slate-800">
                    {selectedOrder.provider || "No disponible"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Creado</dt>
                  <dd className="mt-0.5 font-medium text-slate-800">
                    {formatOperationalTimestamp(selectedOrder.createdAt)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">ETA</dt>
                  <dd className="mt-0.5 font-medium text-slate-800">
                    {formatOperationalTimestamp(selectedOrder.eta)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Entregado</dt>
                  <dd className="mt-0.5 font-medium text-slate-800">
                    {formatOperationalTimestamp(selectedOrder.deliveredAt)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Duración real</dt>
                  <dd className="mt-0.5 font-medium text-slate-800">
                    {formatMinutes(selectedOrder.deliveryMinutes)}
                  </dd>
                </div>
                <div className="sm:col-span-2 lg:col-span-4">
                  <dt className="text-xs text-slate-500">Alertas</dt>
                  <dd className="mt-0.5 font-medium text-slate-800">
                    {selectedOrder.alertReasons.length
                      ? selectedOrder.alertReasons.join(" · ")
                      : "Sin alerta registrada"}
                  </dd>
                </div>
              </dl>
            </div>
            <Link
              href={getAssistantUrl(selectedOrder.orderId)}
              className="inline-flex min-h-9 shrink-0 items-center justify-center gap-2 rounded-lg bg-teal-700 px-3 text-sm font-medium text-white transition-colors hover:bg-teal-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
            >
              Investigar en el asistente
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </section>
      )}
    </section>
  );
}
