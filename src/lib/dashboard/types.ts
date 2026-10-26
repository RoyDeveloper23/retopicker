import type { AssignmentAttempt, Order, TrackingRecord } from "@/lib/data";

export interface HistoricalOrder {
  order_id: number;
  creado_at: string;
  pais: string;
  proveedor: string;
  estado_final: string;
}

export interface OrderOperations {
  order: Order;
  slaMinutes: number | null;
  attempts: AssignmentAttempt[];
  tracking: TrackingRecord[];
}

export interface DashboardOrder {
  orderId: number;
  status: string;
  merchant: string;
  provider: string | null;
  city: string;
  createdAt: string;
  eta: string | null;
  deliveredAt: string | null;
  customer: string;
  incident: string | null;
  slaMinutes: number | null;
  deliveryMinutes: number | null;
  assignmentMinutes: number | null;
  alertReasons: string[];
}

export interface DailyTrend {
  date: string;
  created: number;
  delivered: number;
  failed: number;
}

export interface ProviderPerformance {
  country: string;
  provider: string;
  completed: number;
  delivered: number;
  deliveryRate: number;
}

export interface DashboardMetrics {
  totalOrders: number;
  delivered: number;
  inTransit: number;
  searching: number;
  failed: number;
  cancelled: number;
  active: number;
  incidentOrders: number;
  activeOrIncident: number;
  deliveryRate: number | null;
  averageDeliveryMinutes: number | null;
  averageAssignmentMinutes: number | null;
  outsideSla: number | null;
  outsideSlaSampleSize: number;
}

export interface DashboardData {
  asOf: string | null;
  metrics: DashboardMetrics;
  stateDistribution: Array<{ status: string; count: number }>;
  dailyTrend: DailyTrend[];
  providerPerformance: ProviderPerformance[];
  attentionOrders: DashboardOrder[];
  orders: DashboardOrder[];
}
