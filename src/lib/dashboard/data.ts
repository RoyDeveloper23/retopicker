import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  getAssignmentAttempts,
  getMerchant,
  searchOrders,
  getTrackingForOrder,
} from "@/lib/data";
import type { HistoricalOrder, OrderOperations } from "./types";
import { calculateDashboard } from "./metrics";

const historyHeaders = [
  "order_id",
  "creado_at",
  "pais",
  "proveedor",
  "estado_final",
] as const;

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let field = "";
  let insideQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      if (insideQuotes && line[index + 1] === '"') {
        field += '"';
        index += 1;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (character === "," && !insideQuotes) {
      fields.push(field);
      field = "";
    } else {
      field += character;
    }
  }
  if (insideQuotes) throw new Error("CSV histórico inválido.");
  fields.push(field);
  return fields;
}

async function loadHistoricalOrders(): Promise<HistoricalOrder[]> {
  let contents: string;
  try {
    contents = await readFile(
      join(process.cwd(), "data", "history", "historico_60_dias.csv"),
      "utf8",
    );
  } catch {
    throw new Error("No se pudo cargar el histórico operativo.");
  }

  const lines = contents.replace(/^\uFEFF/, "").trimEnd().split(/\r?\n/);
  const headers = parseCsvLine(lines[0] ?? "");
  const indexes = new Map(headers.map((header, index) => [header, index]));
  if (historyHeaders.some((header) => !indexes.has(header))) {
    throw new Error("El histórico operativo no tiene la estructura esperada.");
  }

  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const value = (header: (typeof historyHeaders)[number]) =>
      values[indexes.get(header) ?? -1] ?? "";
    const orderId = Number(value("order_id"));
    const createdAt = value("creado_at");
    const country = value("pais");
    const provider = value("proveedor");
    const status = value("estado_final");

    if (
      !Number.isSafeInteger(orderId) ||
      !createdAt ||
      !country ||
      !status
    ) {
      throw new Error("El histórico operativo contiene registros inválidos.");
    }

    return {
      order_id: orderId,
      creado_at: createdAt,
      pais: country,
      proveedor: provider,
      estado_final: status,
    };
  });
}

export async function getDashboardData() {
  const [orders, history] = await Promise.all([
    searchOrders(),
    loadHistoricalOrders(),
  ]);
  const merchants = await Promise.all(
    [...new Set(orders.map((order) => order.comercio))].map((name) =>
      getMerchant(name),
    ),
  );
  const merchantSlas = new Map(
    merchants
      .filter((merchant) => merchant !== null)
      .map((merchant) => [merchant.comercio, merchant.sla_entrega_min]),
  );
  const operations: OrderOperations[] = await Promise.all(
    orders.map(async (order) => {
      const [attempts, tracking] = await Promise.all([
        getAssignmentAttempts(order.order_id),
        getTrackingForOrder(order.order_id),
      ]);
      return {
        order,
        slaMinutes: merchantSlas.get(order.comercio) ?? null,
        attempts,
        tracking,
      };
    }),
  );

  return calculateDashboard(operations, history);
}
