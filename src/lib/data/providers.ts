import { loadProviderTariffs } from "./loader";
import type { ProviderTariff, ProviderTariffFilters } from "./types";

export async function getProviderTariffs(
  filters: ProviderTariffFilters = {},
): Promise<ProviderTariff[]> {
  const tariffs = await loadProviderTariffs();

  return tariffs.filter(
    (tariff) =>
      (filters.pais === undefined || tariff.pais === filters.pais) &&
      (filters.proveedor === undefined ||
        tariff.proveedor === filters.proveedor) &&
      (filters.moneda === undefined || tariff.moneda === filters.moneda),
  );
}
