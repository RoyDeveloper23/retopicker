import "server-only";
import {
  GoogleGenAI,
  Type,
  type Content,
  type FunctionDeclaration,
  type GenerateContentParameters,
  type FunctionCall,
  type Part,
} from "@google/genai";

import {
  getAssignmentAttempts,
  getMerchant,
  getOrderById,
  getProviderTariffs,
  getTrackingForOrder,
  searchOrders,
} from "@/lib/data";
import type {
  Order,
  OrderSearchFilters,
  ProviderTariffFilters,
} from "@/lib/data";
import type { OrderCardData } from "@/lib/chat/types";

const DEFAULT_MODEL = "gemini-3.5-flash-lite";
const MAX_TOOL_ROUNDS = 5;
const MAX_MESSAGE_LENGTH = 8_000;

export type GeminiServiceErrorCode =
  | "CONFIGURATION_ERROR"
  | "INVALID_REQUEST"
  | "INVALID_ARGUMENTS"
  | "UNAUTHORIZED_TOOL"
  | "ITERATION_LIMIT"
  | "API_ERROR"
  | "EMPTY_RESPONSE";

export class GeminiServiceError extends Error {
  public readonly code: GeminiServiceErrorCode;

  constructor(
    code: GeminiServiceErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "GeminiServiceError";
    this.code = code;
  }
}

interface GeminiResponse {
  text?: string;
  functionCalls?: FunctionCall[];
  candidates?: Array<{ content?: Content }>;
}

export interface GeminiClient {
  models: {
    generateContent(
      parameters: GenerateContentParameters,
    ): Promise<GeminiResponse>;
  };
}

const functionDeclarations: FunctionDeclaration[] = [
  {
    name: "get_order_by_id",
    description: "Get a Picker order using its numeric order_id.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        order_id: { type: Type.INTEGER, description: "Picker order ID." },
      },
      required: ["order_id"],
    },
  },
  {
    name: "search_orders",
    description: "Search Picker orders by exact state, city, and/or merchant.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        estado_actual: { type: Type.STRING },
        ciudad: { type: Type.STRING },
        comercio: { type: Type.STRING },
      },
    },
  },
  {
    name: "get_tracking_for_order",
    description: "Get GPS tracking records for a Picker order.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        order_id: { type: Type.INTEGER, description: "Picker order ID." },
      },
      required: ["order_id"],
    },
  },
  {
    name: "get_assignment_attempts",
    description: "Get provider assignment attempts for a Picker order.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        order_id: { type: Type.INTEGER, description: "Picker order ID." },
      },
      required: ["order_id"],
    },
  },
  {
    name: "get_merchant",
    description: "Get merchant contract information by exact merchant name.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        merchant_name: { type: Type.STRING },
      },
      required: ["merchant_name"],
    },
  },
  {
    name: "get_provider_tariffs",
    description: "Find provider tariffs by exact country, provider, and/or currency.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        pais: { type: Type.STRING },
        proveedor: { type: Type.STRING },
        moneda: { type: Type.STRING },
      },
    },
  },
];

type ToolName =
  | "get_order_by_id"
  | "search_orders"
  | "get_tracking_for_order"
  | "get_assignment_attempts"
  | "get_merchant"
  | "get_provider_tariffs";

type ToolResult = Awaited<
  | ReturnType<typeof getOrderById>
  | ReturnType<typeof searchOrders>
  | ReturnType<typeof getTrackingForOrder>
  | ReturnType<typeof getAssignmentAttempts>
  | ReturnType<typeof getMerchant>
  | ReturnType<typeof getProviderTariffs>
>;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(
  value: Record<string, unknown>,
  allowedKeys: readonly string[],
): boolean {
  return Object.keys(value).every((key) => allowedKeys.includes(key));
}

function isOptionalStringFilter(
  args: Record<string, unknown>,
  key: string,
): boolean {
  return args[key] === undefined || typeof args[key] === "string";
}

function validateOrderIdArguments(
  args: unknown,
): { order_id: number } | null {
  if (
    !isObject(args) ||
    !hasOnlyKeys(args, ["order_id"]) ||
    !Number.isSafeInteger(args.order_id)
  ) {
    return null;
  }

  return { order_id: args.order_id as number };
}

function validateOrderSearchFilters(args: unknown): OrderSearchFilters | null {
  if (
    !isObject(args) ||
    !hasOnlyKeys(args, ["estado_actual", "ciudad", "comercio"]) ||
    !isOptionalStringFilter(args, "estado_actual") ||
    !isOptionalStringFilter(args, "ciudad") ||
    !isOptionalStringFilter(args, "comercio")
  ) {
    return null;
  }

  return {
    ...(typeof args.estado_actual === "string"
      ? { estado_actual: args.estado_actual }
      : {}),
    ...(typeof args.ciudad === "string" ? { ciudad: args.ciudad } : {}),
    ...(typeof args.comercio === "string" ? { comercio: args.comercio } : {}),
  };
}

function validateMerchantArguments(
  args: unknown,
): { merchant_name: string } | null {
  if (
    !isObject(args) ||
    !hasOnlyKeys(args, ["merchant_name"]) ||
    typeof args.merchant_name !== "string" ||
    args.merchant_name.trim().length === 0
  ) {
    return null;
  }

  return { merchant_name: args.merchant_name };
}

function validateProviderFilters(args: unknown): ProviderTariffFilters | null {
  if (
    !isObject(args) ||
    !hasOnlyKeys(args, ["pais", "proveedor", "moneda"]) ||
    !isOptionalStringFilter(args, "pais") ||
    !isOptionalStringFilter(args, "proveedor") ||
    !isOptionalStringFilter(args, "moneda")
  ) {
    return null;
  }

  return {
    ...(typeof args.pais === "string" ? { pais: args.pais } : {}),
    ...(typeof args.proveedor === "string"
      ? { proveedor: args.proveedor }
      : {}),
    ...(typeof args.moneda === "string" ? { moneda: args.moneda } : {}),
  };
}

async function executeTool(
  name: string,
  args: unknown,
): Promise<{ result?: ToolResult; error?: string; order?: Order }> {
  switch (name as ToolName) {
    case "get_order_by_id":
    case "get_tracking_for_order":
    case "get_assignment_attempts": {
      const validArgs = validateOrderIdArguments(args);
      if (!validArgs) return { error: "Argumentos inválidos: se requiere order_id entero." };

      if (name === "get_order_by_id") {
        const order = await getOrderById(validArgs.order_id);
        return { result: order, ...(order ? { order } : {}) };
      }
      if (name === "get_tracking_for_order") {
        return { result: await getTrackingForOrder(validArgs.order_id) };
      }
      return { result: await getAssignmentAttempts(validArgs.order_id) };
    }
    case "search_orders": {
      const filters = validateOrderSearchFilters(args);
      if (!filters) return { error: "Argumentos inválidos para buscar pedidos." };
      return { result: await searchOrders(filters) };
    }
    case "get_merchant": {
      const validArgs = validateMerchantArguments(args);
      if (!validArgs) return { error: "Argumentos inválidos: se requiere merchant_name." };
      return { result: await getMerchant(validArgs.merchant_name) };
    }
    case "get_provider_tariffs": {
      const filters = validateProviderFilters(args);
      if (!filters) return { error: "Argumentos inválidos para consultar tarifas." };
      return { result: await getProviderTariffs(filters) };
    }
    default:
      throw new GeminiServiceError(
        "UNAUTHORIZED_TOOL",
        "Gemini solicitó una herramienta no autorizada.",
      );
  }
}

function getModelContent(
  response: GeminiResponse,
  functionCalls: FunctionCall[],
): Content {
  return (
    response.candidates?.[0]?.content ?? {
      role: "model",
      parts: functionCalls.map((functionCall) => ({ functionCall })),
    }
  );
}

export interface PickerAssistantResult {
  response: string;
  orders: OrderCardData[];
}

function toOrderCardData(
  order: Order,
  tracking: Awaited<ReturnType<typeof getTrackingForOrder>>,
): OrderCardData {
  return {
    orderId: order.order_id,
    merchant: order.comercio,
    branch: order.sucursal,
    customer: order.cliente,
    city: order.ciudad,
    status: order.estado_actual,
    provider: order.proveedor_asignado,
    courier: order.repartidor,
    eta: order.eta_entrega,
    deliveredAt: order.entregado_at,
    incident: order.motivo_falla,
    tracking: [...tracking]
      .sort((left, right) => left.secuencia - right.secuencia)
      .map(({ fase, timestamp }) => ({ phase: fase, timestamp })),
  };
}

export function createPickerAssistantWithDetails(
  client: GeminiClient,
  model = DEFAULT_MODEL,
): (message: string) => Promise<PickerAssistantResult> {
  return async (message) => {
    if (typeof message !== "string" || message.trim().length === 0) {
      throw new GeminiServiceError(
        "INVALID_REQUEST",
        "El mensaje no puede estar vacío.",
      );
    }
    if (message.length > MAX_MESSAGE_LENGTH) {
      throw new GeminiServiceError(
        "INVALID_REQUEST",
        `El mensaje supera el límite de ${MAX_MESSAGE_LENGTH} caracteres.`,
      );
    }

    const contents: Content[] = [{ role: "user", parts: [{ text: message }] }];
    const orders = new Map<number, Order>();
    let response: GeminiResponse;
    let toolRounds = 0;

    while (true) {
      try {
        response = await client.models.generateContent({
          model,
          contents,
          config: {
            systemInstruction:
              "Eres Picker, un asistente de soporte operativo. Responde siempre en español, con claridad y basándote en los datos obtenidos mediante las herramientas disponibles. No afirmes haber realizado acciones que las herramientas no ofrecen.",
            tools: [{ functionDeclarations }],
          },
        });
      } catch {
        throw new GeminiServiceError(
          "API_ERROR",
          "No se pudo completar la solicitud a Gemini.",
        );
      }

      const functionCalls = response.functionCalls ?? [];
      if (functionCalls.length === 0) {
        const text = response.text?.trim();
        if (!text) {
          throw new GeminiServiceError(
            "EMPTY_RESPONSE",
            "Gemini devolvió una respuesta vacía.",
          );
        }
        const orderCards = await Promise.all(
          [...orders.values()].map(async (order) =>
            toOrderCardData(
              order,
              await getTrackingForOrder(order.order_id),
            ),
          ),
        );
        return { response: text, orders: orderCards };
      }

      if (toolRounds >= MAX_TOOL_ROUNDS) {
        throw new GeminiServiceError(
          "ITERATION_LIMIT",
          "Gemini superó el límite de consultas a herramientas.",
        );
      }
      toolRounds += 1;
      contents.push(getModelContent(response, functionCalls));

      const functionResponseParts: Part[] = [];
      for (const functionCall of functionCalls) {
        if (!functionCall.name) {
          throw new GeminiServiceError(
            "UNAUTHORIZED_TOOL",
            "Gemini devolvió una llamada sin nombre de herramienta.",
          );
        }

        const toolResult = await executeTool(
          functionCall.name,
          functionCall.args,
        );
        if (toolResult.order) {
          orders.set(toolResult.order.order_id, toolResult.order);
        }
        functionResponseParts.push({
          functionResponse: {
            name: functionCall.name,
            ...(functionCall.id ? { id: functionCall.id } : {}),
            response: toolResult.error
              ? { error: toolResult.error }
              : { output: toolResult.result },
          },
        });
      }
      contents.push({ role: "user", parts: functionResponseParts });
    }
  };
}

export function createPickerAssistant(
  client: GeminiClient,
  model = DEFAULT_MODEL,
): (message: string) => Promise<string> {
  const assistant = createPickerAssistantWithDetails(client, model);
  return async (message) => (await assistant(message)).response;
}

let geminiClient: GoogleGenAI | undefined;

export async function askPickerAssistant(message: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new GeminiServiceError(
      "CONFIGURATION_ERROR",
      "Falta configurar GEMINI_API_KEY en el entorno del servidor.",
    );
  }

  const model = process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL;
  geminiClient ??= new GoogleGenAI({ apiKey });

  return createPickerAssistant(geminiClient, model)(message);
}

export async function askPickerAssistantWithDetails(
  message: string,
): Promise<PickerAssistantResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new GeminiServiceError(
      "CONFIGURATION_ERROR",
      "Falta configurar GEMINI_API_KEY en el entorno del servidor.",
    );
  }

  const model = process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL;
  geminiClient ??= new GoogleGenAI({ apiKey });

  return createPickerAssistantWithDetails(geminiClient, model)(message);
}
