export interface Order {
  order_id: number;
  referencia_comercio: string;
  comercio: string;
  sucursal: string;
  ciudad: string;
  pais: string;
  cliente: string;
  direccion_entrega: string;
  creado_at: string;
  estado_actual: string;
  proveedor_asignado: string | null;
  repartidor: string | null;
  telefono_repartidor: string | null;
  distancia_km: number;
  eta_entrega: string | null;
  entregado_at: string | null;
  metodo_pago: string;
  monto_pedido: number;
  moneda: string;
  costo_envio: number;
  intentos_asignacion: number;
  motivo_falla: string | null;
  lat_origen: number;
  lng_origen: number;
  lat_destino: number | null;
  lng_destino: number | null;
}

export interface TrackingRecord {
  order_id: number;
  repartidor: string;
  proveedor: string;
  secuencia: number;
  timestamp: string;
  lat: number;
  lng: number;
  velocidad_kmh: number;
  fase: string;
}

export interface AssignmentAttempt {
  order_id: number;
  intento: number;
  proveedor: string;
  enviado_at: string;
  respuesta: string;
  detalle: string | null;
}

export interface Merchant {
  comercio: string;
  plan: string;
  sla_entrega_min: number;
  prioridad: string;
  penalidad_pct_envio_si_tarde: number;
  nota: string | null;
}

export interface ProviderTariff {
  proveedor: string;
  pais: string;
  moneda: string;
  tarifa_base: number;
  tarifa_por_km: number;
  max_km: number;
  limite_efectivo: number;
  timeout_respuesta_s: number;
}

export type OrderSearchFilters = Partial<
  Pick<Order, "estado_actual" | "ciudad" | "comercio">
>;

export type ProviderTariffFilters = Partial<
  Pick<ProviderTariff, "pais" | "proveedor" | "moneda">
>;

export type DataAccessErrorCode =
  | "MISSING_DATASET"
  | "UNREADABLE_DATASET"
  | "INVALID_JSON"
  | "INVALID_DATASET";
