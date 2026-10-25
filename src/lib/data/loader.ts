import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import type {
  AssignmentAttempt,
  Merchant,
  Order,
  ProviderTariff,
  TrackingRecord,
} from "./types";
import type { DataAccessErrorCode } from "./types";

export class DataAccessError extends Error {
  public readonly code: DataAccessErrorCode;

  constructor(code: DataAccessErrorCode, message: string) {
    super(message);
    this.name = "DataAccessError";
    this.code = code;
  }
}

type DatasetName =
  | "pedidos"
  | "tracking"
  | "intentos"
  | "comercios"
  | "tarifas_proveedores";

const datasetFiles: Record<DatasetName, string> = {
  pedidos: "pedidos.json",
  tracking: "Tracking.json",
  intentos: "intentos.json",
  comercios: "comercios.json",
  tarifas_proveedores: "tarifas_proveedores.json",
};

const datasetCache = new Map<DatasetName, Promise<unknown[]>>();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isNullableString(value: unknown): value is string | null {
  return value === null || isString(value);
}

function isNullableNumber(value: unknown): value is number | null {
  return value === null || isNumber(value);
}

function isOrder(value: unknown): value is Order {
  if (!isRecord(value)) return false;

  return (
    isNumber(value.order_id) &&
    isString(value.referencia_comercio) &&
    isString(value.comercio) &&
    isString(value.sucursal) &&
    isString(value.ciudad) &&
    isString(value.pais) &&
    isString(value.cliente) &&
    isString(value.direccion_entrega) &&
    isString(value.creado_at) &&
    isString(value.estado_actual) &&
    isNullableString(value.proveedor_asignado) &&
    isNullableString(value.repartidor) &&
    isNullableString(value.telefono_repartidor) &&
    isNumber(value.distancia_km) &&
    isNullableString(value.eta_entrega) &&
    isNullableString(value.entregado_at) &&
    isString(value.metodo_pago) &&
    isNumber(value.monto_pedido) &&
    isString(value.moneda) &&
    isNumber(value.costo_envio) &&
    isNumber(value.intentos_asignacion) &&
    isNullableString(value.motivo_falla) &&
    isNumber(value.lat_origen) &&
    isNumber(value.lng_origen) &&
    isNullableNumber(value.lat_destino) &&
    isNullableNumber(value.lng_destino)
  );
}

function isTrackingRecord(value: unknown): value is TrackingRecord {
  return (
    isRecord(value) &&
    isNumber(value.order_id) &&
    isString(value.repartidor) &&
    isString(value.proveedor) &&
    isNumber(value.secuencia) &&
    isString(value.timestamp) &&
    isNumber(value.lat) &&
    isNumber(value.lng) &&
    isNumber(value.velocidad_kmh) &&
    isString(value.fase)
  );
}

function isAssignmentAttempt(value: unknown): value is AssignmentAttempt {
  return (
    isRecord(value) &&
    isNumber(value.order_id) &&
    isNumber(value.intento) &&
    isString(value.proveedor) &&
    isString(value.enviado_at) &&
    isString(value.respuesta) &&
    isNullableString(value.detalle)
  );
}

function isMerchant(value: unknown): value is Merchant {
  return (
    isRecord(value) &&
    isString(value.comercio) &&
    isString(value.plan) &&
    isNumber(value.sla_entrega_min) &&
    isString(value.prioridad) &&
    isNumber(value.penalidad_pct_envio_si_tarde) &&
    isNullableString(value.nota)
  );
}

function isProviderTariff(value: unknown): value is ProviderTariff {
  return (
    isRecord(value) &&
    isString(value.proveedor) &&
    isString(value.pais) &&
    isString(value.moneda) &&
    isNumber(value.tarifa_base) &&
    isNumber(value.tarifa_por_km) &&
    isNumber(value.max_km) &&
    isNumber(value.limite_efectivo) &&
    isNumber(value.timeout_respuesta_s)
  );
}

function hasErrorCode(error: unknown, code: string): boolean {
  return isRecord(error) && "code" in error && error.code === code;
}

async function readDataset(
  name: DatasetName,
  isDatasetRecord: (value: unknown) => boolean,
): Promise<unknown[]> {
  const filePath = join(process.cwd(), "data", "processed", datasetFiles[name]);
  let contents: string;

  try {
    contents = await readFile(filePath, "utf8");
  } catch (error) {
    if (hasErrorCode(error, "ENOENT")) {
      throw new DataAccessError(
        "MISSING_DATASET",
        `No se encontró el conjunto de datos "${name}".`,
      );
    }

    throw new DataAccessError(
      "UNREADABLE_DATASET",
      `No se pudo leer el conjunto de datos "${name}".`,
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(contents);
  } catch {
    throw new DataAccessError(
      "INVALID_JSON",
      `El archivo del conjunto de datos "${name}" no contiene JSON válido.`,
    );
  }

  if (!Array.isArray(parsed) || !parsed.every(isDatasetRecord)) {
    throw new DataAccessError(
      "INVALID_DATASET",
      `El conjunto de datos "${name}" no tiene la estructura esperada.`,
    );
  }

  return parsed;
}

function loadDataset<T>(
  name: DatasetName,
  isDatasetRecord: (value: unknown) => value is T,
): Promise<T[]> {
  const cached = datasetCache.get(name);
  if (cached) return cached as Promise<T[]>;

  const pending = readDataset(name, isDatasetRecord);
  datasetCache.set(name, pending);
  void pending.catch(() => {
    if (datasetCache.get(name) === pending) datasetCache.delete(name);
  });

  return pending as Promise<T[]>;
}

export function loadOrders(): Promise<Order[]> {
  return loadDataset("pedidos", isOrder);
}

export function loadTracking(): Promise<TrackingRecord[]> {
  return loadDataset("tracking", isTrackingRecord);
}

export function loadAssignmentAttempts(): Promise<AssignmentAttempt[]> {
  return loadDataset("intentos", isAssignmentAttempt);
}

export function loadMerchants(): Promise<Merchant[]> {
  return loadDataset("comercios", isMerchant);
}

export function loadProviderTariffs(): Promise<ProviderTariff[]> {
  return loadDataset("tarifas_proveedores", isProviderTariff);
}
