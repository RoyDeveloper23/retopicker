"use client";

import Link from "next/link";
import {
  type PointerEvent as ReactPointerEvent,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { ChatInterface } from "@/components/chat/chat-interface";
import type { DashboardData } from "@/lib/dashboard/types";
import {
  DEFAULT_DASHBOARD_WIDTH,
  isSplitViewAvailable,
  resizeDashboardPane,
} from "@/lib/dashboard/split-view";
import {
  formatMinutes,
  formatOperationalTimestamp,
  formatPercent,
  getStatusClasses,
  getStatusLabel,
} from "./dashboard-format";
import { DashboardCharts } from "./dashboard-charts";
import { OrdersTable } from "./orders-table";

interface DashboardClientProps {
  data: DashboardData;
}

const desktopMediaQuery = "(min-width: 1024px)";

function subscribeToDesktopViewport(onChange: () => void): () => void {
  const mediaQuery = window.matchMedia(desktopMediaQuery);
  mediaQuery.addEventListener("change", onChange);
  return () => mediaQuery.removeEventListener("change", onChange);
}

function getDesktopViewportSnapshot(): boolean {
  return isSplitViewAvailable(window.innerWidth);
}

function getServerDesktopViewportSnapshot(): boolean {
  return false;
}

const kpiCards = [
  {
    key: "totalOrders",
    label: "Total de pedidos",
    color: "text-slate-900",
  },
  { key: "delivered", label: "Entregados", color: "text-emerald-800" },
  { key: "inTransit", label: "En tránsito", color: "text-emerald-800" },
  {
    key: "searching",
    label: "Buscando repartidor",
    color: "text-zinc-700",
  },
  { key: "failed", label: "Fallidos", color: "text-rose-800" },
  { key: "cancelled", label: "Cancelados", color: "text-rose-800" },
] as const;

function MetricCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="text-sm font-medium text-slate-600">{label}</h3>
      <p className="mt-2 font-mono text-2xl font-semibold tabular-nums tracking-tight text-slate-900">
        {value}
      </p>
      {detail && <p className="mt-1 text-xs text-slate-500">{detail}</p>}
    </article>
  );
}

function AttentionQueue({ data }: { data: DashboardData }) {
  return (
    <section className="rounded-xl border border-amber-200 bg-white">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-amber-100 px-4 py-4 sm:px-5">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            Atención operativa
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Alertas derivadas de estados, tiempos, tracking y políticas
            disponibles. No se ejecutan reasignaciones ni reembolsos.
          </p>
        </div>
        <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">
          {data.attentionOrders.length} pedidos
        </span>
      </div>
      {data.attentionOrders.length === 0 ? (
        <p className="px-4 py-5 text-sm text-slate-600 sm:px-5">
          No se detectaron alertas con los datos disponibles.
        </p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {data.attentionOrders.map((order) => (
            <li
              key={order.orderId}
              className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-start sm:justify-between sm:px-5"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-sm font-semibold tabular-nums text-slate-900">
                    #{order.orderId}
                  </span>
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${getStatusClasses(order.status)}`}
                  >
                    {getStatusLabel(order.status)}
                  </span>
                  <span className="text-sm text-slate-600">
                    {order.merchant}
                  </span>
                </div>
                <ul className="mt-1 space-y-1 text-sm text-amber-900">
                  {order.alertReasons.map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
              </div>
              <Link
                href={`/?message=${encodeURIComponent(`Revisa la incidencia del pedido ${order.orderId} y dime qué información operativa hay disponible.`)}`}
                className="inline-flex min-h-8 shrink-0 items-center text-sm font-medium text-teal-800 underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
              >
                Investigar
                <span className="ml-1" aria-hidden="true">
                  →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function DashboardClient({ data }: DashboardClientProps) {
  const { metrics } = data;
  const completedAndActive = metrics.delivered + metrics.active;
  const isDesktop = useSyncExternalStore(
    subscribeToDesktopViewport,
    getDesktopViewportSnapshot,
    getServerDesktopViewportSnapshot,
  );
  const [isSplitOpen, setIsSplitOpen] = useState(false);
  const [dashboardWidth, setDashboardWidth] = useState(DEFAULT_DASHBOARD_WIDTH);
  const [showMobileNotice, setShowMobileNotice] = useState(false);
  const workspaceRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startX: number; startWidth: number } | null>(null);
  const showSplitView = isDesktop && isSplitOpen;

  function updateDashboardWidth(deltaX: number, startWidth = dashboardWidth) {
    const containerWidth = workspaceRef.current?.getBoundingClientRect().width ?? 0;
    setDashboardWidth(
      resizeDashboardPane(startWidth, deltaX, containerWidth),
    );
  }

  function handleSplitPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    const containerWidth = workspaceRef.current?.getBoundingClientRect().width;
    if (!containerWidth) return;
    dragRef.current = { startX: event.clientX, startWidth: dashboardWidth };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleSplitPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!dragRef.current) return;
    updateDashboardWidth(
      event.clientX - dragRef.current.startX,
      dragRef.current.startWidth,
    );
  }

  function handleSplitPointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  return (
    <div
      ref={workspaceRef}
      className={showSplitView ? "flex h-dvh overflow-hidden" : ""}
    >
    <main
      className={`bg-slate-50 text-slate-800 ${
        showSplitView
          ? "flex h-dvh min-w-0 flex-col overflow-hidden"
          : "min-h-dvh"
      }`}
      style={
        showSplitView
          ? { flex: `0 0 ${dashboardWidth}%` }
          : undefined
      }
    >
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex min-h-[72px] w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-teal-800">
              Picker Copilot
            </p>
            <h1 className="truncate text-lg font-semibold text-slate-900 sm:text-xl">
              Dashboard operativo
            </h1>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (!isDesktop) {
                  setShowMobileNotice(true);
                  return;
                }
                setShowMobileNotice(false);
                setIsSplitOpen((open) => !open);
              }}
              aria-label={
                !isDesktop
                  ? "Vista dividida no disponible en celular"
                  : showSplitView
                    ? "Cerrar vista dividida"
                    : "Abrir vista dividida"
              }
              aria-controls="assistant-panel"
              aria-pressed={showSplitView}
              aria-expanded={showSplitView}
              title={
                isDesktop
                  ? showSplitView
                    ? "Cerrar vista dividida"
                    : "Abrir vista dividida"
                  : "La vista dividida no está disponible en celular"
              }
              className={`inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg border border-teal-700 bg-teal-700 px-3 text-sm font-medium text-white transition-colors hover:bg-teal-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 ${
                showSplitView ? "border-teal-800 bg-teal-800" : ""
              }`}
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 20 20"
                fill="none"
                className="size-4"
              >
                <rect
                  x="2.5"
                  y="3"
                  width="15"
                  height="14"
                  rx="1.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
                <path
                  d="M10 3v14"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
              </svg>
              <span className="hidden sm:inline">Vista dividida</span>
            </button>
            <Link
              href="/"
              className="inline-flex min-h-9 shrink-0 items-center gap-2 rounded-lg bg-teal-700 px-3 text-sm font-medium text-white transition-colors hover:bg-teal-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 20 20"
                fill="none"
                className="size-4"
              >
                <path
                  d="M16 10H4m5 5-5-5 5-5"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span className="hidden sm:inline">Volver al Asistente</span>
              <span className="sm:hidden">Asistente</span>
            </Link>
          </div>
        </div>
      </header>

      {showMobileNotice && !isDesktop && (
        <p
          className="mx-auto w-full max-w-7xl px-4 py-2 text-sm text-slate-700 sm:px-6 lg:px-8"
          role="status"
          aria-live="polite"
        >
          La vista dividida no está disponible en celular.
        </p>
      )}
      <div
        className={`mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-5 sm:px-6 sm:py-6 lg:px-8 ${
          showSplitView ? "min-h-0 flex-1 overflow-y-auto" : ""
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-slate-600">
            Vista general del conjunto de pedidos y del histórico operativo.
          </p>
          <p className="text-xs text-slate-500">
            Datos disponibles hasta{" "}
            <span className="font-mono tabular-nums text-slate-700">
              {formatOperationalTimestamp(data.asOf)}
            </span>
          </p>
        </div>

        <section aria-label="Indicadores principales">
          <h2 className="sr-only">Indicadores principales</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
            {kpiCards.map(({ key, label, color }) => (
              <article
                key={key}
                className="rounded-xl border border-slate-200 bg-white p-3.5 sm:p-4"
              >
                <h3 className="min-h-10 text-sm font-medium leading-5 text-slate-600">
                  {label}
                </h3>
                <p
                  className={`mt-1 font-mono text-2xl font-semibold tabular-nums ${color}`}
                >
                  {metrics[key]}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section aria-label="Métricas complementarias">
          <h2 className="sr-only">Métricas complementarias</h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <MetricCard
              label="Tasa de entrega"
              value={formatPercent(metrics.deliveryRate)}
              detail={`${metrics.delivered} entregados / ${completedAndActive} entregados o activos`}
            />
            <MetricCard
              label="Activos o con alerta"
              value={String(metrics.activeOrIncident)}
              detail={`${metrics.active} activos · ${metrics.incidentOrders} con alerta (unión sin duplicados)`}
            />
            <MetricCard
              label="Tiempo medio de entrega"
              value={formatMinutes(metrics.averageDeliveryMinutes)}
              detail="Pedidos entregados con ambas fechas"
            />
            <MetricCard
              label="Tiempo medio de asignación"
              value={formatMinutes(metrics.averageAssignmentMinutes)}
              detail="Desde creación hasta primer ACCEPTED"
            />
            <MetricCard
              label="Fuera del SLA"
              value={
                metrics.outsideSla === null
                  ? "No disponible"
                  : String(metrics.outsideSla)
              }
              detail={
                metrics.outsideSla === null
                  ? "No hay registros comparables"
                  : `De ${metrics.outsideSlaSampleSize} pedidos evaluables`
              }
            />
          </div>
        </section>

        <DashboardCharts
          stateDistribution={data.stateDistribution}
          dailyTrend={data.dailyTrend}
          providerPerformance={data.providerPerformance}
        />

        <AttentionQueue data={data} />

        <OrdersTable orders={data.orders} />
      </div>
    </main>
    {showSplitView && (
      <div
        role="separator"
        aria-label="Redimensionar paneles"
        aria-orientation="vertical"
        aria-valuemin={50}
        aria-valuemax={67}
        aria-valuenow={Math.round(dashboardWidth)}
        aria-valuetext={`${Math.round(dashboardWidth)}% del ancho para el dashboard`}
        tabIndex={0}
        onPointerDown={handleSplitPointerDown}
        onPointerMove={handleSplitPointerMove}
        onPointerUp={handleSplitPointerUp}
        onPointerCancel={handleSplitPointerUp}
        onLostPointerCapture={() => {
          dragRef.current = null;
        }}
        onKeyDown={(event) => {
          if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
          event.preventDefault();
          updateDashboardWidth(event.key === "ArrowRight" ? 20 : -20);
        }}
        className="z-10 flex w-2 shrink-0 cursor-col-resize touch-none items-center justify-center bg-slate-200 hover:bg-teal-500 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-teal-700"
      >
        <span className="h-10 w-0.5 rounded-full bg-slate-500" />
      </div>
    )}
    <div
      className={
        showSplitView
          ? "min-h-0 min-w-0 flex-1 border-l border-slate-200"
          : "hidden"
      }
      id="assistant-panel"
    >
      <ChatInterface
        compact
        onClosePanel={() => setIsSplitOpen(false)}
      />
    </div>
    </div>
  );
}
