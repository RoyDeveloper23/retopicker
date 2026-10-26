import "server-only";

import {
  askPickerAssistantWithDetails,
  GeminiServiceError,
} from "@/lib/ai/gemini";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function POST(request: Request): Promise<Response> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "El cuerpo debe contener JSON válido." }, { status: 400 });
  }

  if (!isRecord(body) || typeof body.message !== "string") {
    return Response.json(
      { error: "El campo message debe ser un texto." },
      { status: 400 },
    );
  }

  if (body.message.trim().length === 0) {
    return Response.json(
      { error: "El mensaje no puede estar vacío." },
      { status: 400 },
    );
  }

  if (body.message.length > 2_000) {
    return Response.json(
      { error: "El mensaje no puede superar los 2000 caracteres." },
      { status: 413 },
    );
  }

  try {
    const result = await askPickerAssistantWithDetails(body.message);
    return Response.json({
      response: result.response,
      ...(result.orders.length > 0 ? { orders: result.orders } : {}),
    });
  } catch (error) {
    if (error instanceof GeminiServiceError) {
      const status = error.code === "CONFIGURATION_ERROR" ? 503 : 502;
      return Response.json(
        { error: "No se pudo procesar el mensaje en este momento." },
        { status },
      );
    }

    return Response.json(
      { error: "Ocurrió un error interno al procesar el mensaje." },
      { status: 500 },
    );
  }
}
