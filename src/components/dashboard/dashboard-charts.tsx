import type {
  DailyTrend,
  ProviderPerformance,
} from "@/lib/dashboard/types";
import { getStatusLabel } from "./dashboard-format";

interface DashboardChartsProps {
  stateDistribution: Array<{ status: string; count: number }>;
  dailyTrend: DailyTrend[];
  providerPerformance: ProviderPerformance[];
}

const lineColors = {
  created: "#0f766e",
  delivered: "#2563eb",
  failed: "#e11d48",
} as const;

function buildPoints(
  data: DailyTrend[],
  key: keyof Pick<DailyTrend, "created" | "delivered" | "failed">,
  maximum: number,
): string {
  if (data.length === 1) {
    return `400,${220 - (data[0][key] / maximum) * 190}`;
  }
  return data
    .map((item, index) => {
      const x = (index / (data.length - 1)) * 760 + 20;
      const y = 220 - (item[key] / maximum) * 190;
      return `${x},${y}`;
    })
    .join(" ");
}

export function DashboardCharts({
  stateDistribution,
  dailyTrend,
  providerPerformance,
}: DashboardChartsProps) {
  const maximumStateCount = Math.max(
    1,
    ...stateDistribution.map(({ count }) => count),
  );
  const maximumDailyCount = Math.max(
    1,
    ...dailyTrend.flatMap(({ created, delivered, failed }) => [
      created,
      delivered,
      failed,
    ]),
  );

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            Pedidos por estado
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Distribución del conjunto actual
          </p>
        </div>
        {stateDistribution.length === 0 ? (
          <p className="mt-6 text-sm text-slate-500">No disponible</p>
        ) : (
          <ul className="mt-5 space-y-3">
            {stateDistribution.map(({ status, count }) => (
              <li key={status}>
                <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                  <span className="text-slate-700">
                    {getStatusLabel(status)}
                  </span>
                  <span className="font-mono tabular-nums text-slate-600">
                    {count}
                  </span>
                </div>
                <div
                  className="h-2 overflow-hidden rounded-full bg-slate-100"
                  role="img"
                  aria-label={`${count} pedidos: ${getStatusLabel(status)}`}
                >
                  <div
                    className="h-full rounded-full bg-teal-700"
                    style={{
                      width: `${(count / maximumStateCount) * 100}%`,
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
        <h2 className="text-base font-semibold text-slate-900">
          Cohortes de 60 días
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Resultados agrupados por fecha de creación; el histórico no incluye
          fechas de resolución
        </p>
        {dailyTrend.length === 0 ? (
          <p className="mt-6 text-sm text-slate-500">No disponible</p>
        ) : (
          <>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-600">
              {(
                [
                  ["created", "Creados"],
                  ["delivered", "Entregados"],
                  ["failed", "Fallidos"],
                ] as const
              ).map(([key, label]) => (
                <span key={key} className="inline-flex items-center gap-1.5">
                  <span
                    aria-hidden="true"
                    className="size-2 rounded-full"
                    style={{ backgroundColor: lineColors[key] }}
                  />
                  {label}
                </span>
              ))}
            </div>
            <svg
              role="img"
              aria-label="Gráfico diario de pedidos creados, entregados y fallidos durante los 60 días históricos"
              viewBox="0 0 800 250"
              className="mt-3 h-auto w-full overflow-visible"
            >
              <title>
                Pedidos diarios creados, entregados y fallidos en 60 días
              </title>
              {[30, 125, 220].map((y) => (
                <line
                  key={y}
                  x1="20"
                  x2="780"
                  y1={y}
                  y2={y}
                  stroke="#e2e8f0"
                  strokeDasharray={y === 220 ? undefined : "4 5"}
                />
              ))}
              <polyline
                points={buildPoints(dailyTrend, "created", maximumDailyCount)}
                fill="none"
                stroke={lineColors.created}
                strokeWidth="2.5"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              <polyline
                points={buildPoints(dailyTrend, "delivered", maximumDailyCount)}
                fill="none"
                stroke={lineColors.delivered}
                strokeWidth="2.5"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              <polyline
                points={buildPoints(dailyTrend, "failed", maximumDailyCount)}
                fill="none"
                stroke={lineColors.failed}
                strokeWidth="2"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            </svg>
            <div className="flex justify-between text-xs text-slate-500">
              <span>{dailyTrend[0].date}</span>
              <span>{dailyTrend.at(-1)?.date}</span>
            </div>
          </>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 xl:col-span-2">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            Rendimiento por proveedor
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Entregados sobre pedidos con resultado final, sin comparar importes
            entre monedas
          </p>
        </div>
        {providerPerformance.length === 0 ? (
          <p className="mt-6 text-sm text-slate-500">No disponible</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th scope="col" className="pb-2 font-medium">
                    País
                  </th>
                  <th scope="col" className="pb-2 font-medium">
                    Proveedor
                  </th>
                  <th scope="col" className="pb-2 text-right font-medium">
                    Resultado final
                  </th>
                  <th scope="col" className="pb-2 text-right font-medium">
                    Entregados
                  </th>
                  <th scope="col" className="pb-2 pl-4 font-medium">
                    Tasa de entrega
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {providerPerformance.map((provider) => (
                  <tr key={`${provider.country}-${provider.provider}`}>
                    <td className="py-3 font-mono text-xs text-slate-600">
                      {provider.country}
                    </td>
                    <th
                      scope="row"
                      className="py-3 font-medium text-slate-800"
                    >
                      {provider.provider}
                    </th>
                    <td className="py-3 text-right font-mono tabular-nums text-slate-600">
                      {provider.completed}
                    </td>
                    <td className="py-3 text-right font-mono tabular-nums text-slate-600">
                      {provider.delivered}
                    </td>
                    <td className="py-3 pl-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="h-2 min-w-16 flex-1 overflow-hidden rounded-full bg-slate-100"
                          role="img"
                          aria-label={`${(provider.deliveryRate * 100).toFixed(1)} por ciento de entregas`}
                        >
                          <div
                            className="h-full rounded-full bg-emerald-600"
                            style={{
                              width: `${provider.deliveryRate * 100}%`,
                            }}
                          />
                        </div>
                        <span className="w-14 text-right font-mono tabular-nums text-slate-700">
                          {(provider.deliveryRate * 100).toFixed(1)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
