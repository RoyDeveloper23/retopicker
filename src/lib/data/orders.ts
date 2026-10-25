import { loadOrders } from "./loader";
import type { Order, OrderSearchFilters } from "./types";

export async function getOrderById(orderId: number): Promise<Order | null> {
  const orders = await loadOrders();
  return orders.find((order) => order.order_id === orderId) ?? null;
}

export async function searchOrders(
  filters: OrderSearchFilters = {},
): Promise<Order[]> {
  const orders = await loadOrders();

  return orders.filter(
    (order) =>
      (filters.estado_actual === undefined ||
        order.estado_actual === filters.estado_actual) &&
      (filters.ciudad === undefined || order.ciudad === filters.ciudad) &&
      (filters.comercio === undefined || order.comercio === filters.comercio),
  );
}
