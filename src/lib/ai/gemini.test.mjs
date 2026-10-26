import assert from "node:assert/strict";
import test from "node:test";

import {
  askPickerAssistant,
  createPickerAssistant,
  createPickerAssistantWithDetails,
  GeminiServiceError,
} from "./gemini.ts";

function createFakeClient(responses) {
  const requests = [];

  return {
    requests,
    client: {
      models: {
        async generateContent(request) {
          requests.push(request);
          const nextResponse = responses.shift();
          if (nextResponse instanceof Error) throw nextResponse;
          return nextResponse;
        },
      },
    },
  };
}

function functionCallResponse(name, args, id = "call-1") {
  const functionCall = { name, args, id };
  return {
    functionCalls: [functionCall],
    candidates: [
      { content: { role: "model", parts: [{ functionCall }] } },
    ],
  };
}

test("runs an allowlisted data function and returns Gemini's Spanish answer", async () => {
  const { client, requests } = createFakeClient([
    functionCallResponse("get_order_by_id", { order_id: 12340 }),
    { text: "El pedido 12340 está en camino." },
  ]);
  const ask = createPickerAssistant(client);

  const answer = await ask("¿Dónde está el pedido 12340?");

  assert.equal(answer, "El pedido 12340 está en camino.");
  assert.equal(requests.length, 2);
  assert.equal(requests[0].model, "gemini-3.5-flash-lite");
  assert.equal(requests[0].config.systemInstruction.includes("español"), true);
  const toolResponse =
    requests[1].contents[2].parts[0].functionResponse;
  assert.equal(toolResponse.name, "get_order_by_id");
  assert.equal(toolResponse.id, "call-1");
  assert.equal(toolResponse.response.output.order_id, 12340);
});

test("returns a safe order summary only when the order lookup tool succeeds", async () => {
  const { client } = createFakeClient([
    functionCallResponse("get_order_by_id", { order_id: 12340 }),
    { text: "El pedido 12340 está en camino." },
  ]);
  const result = await createPickerAssistantWithDetails(client)(
    "Busca el pedido 12340.",
  );

  assert.equal(result.response, "El pedido 12340 está en camino.");
  assert.equal(result.orders.length, 1);
  assert.equal(result.orders[0].orderId, 12340);
  assert.equal(result.orders[0].status, "ON_THE_WAY");
  assert.ok(Array.isArray(result.orders[0].tracking));
  assert.equal("direccion_entrega" in result.orders[0], false);
  assert.equal("telefono_repartidor" in result.orders[0], false);
});

test("returns invalid tool arguments to the model without executing a tool", async () => {
  const { client, requests } = createFakeClient([
    functionCallResponse("get_order_by_id", { order_id: "12340" }),
    { text: "No pude consultar el pedido porque faltó un identificador válido." },
  ]);
  const ask = createPickerAssistant(client);

  const answer = await ask("Consulta el pedido.");

  assert.match(answer, /no pude consultar/i);
  assert.deepEqual(
    requests[1].contents[2].parts[0].functionResponse.response,
    { error: "Argumentos inválidos: se requiere order_id entero." },
  );
});

test("connects search, tracking, attempts, merchant, and tariff tools to data functions", async () => {
  const calls = [
    ["search_orders", { estado_actual: "DELIVERED" }],
    ["get_tracking_for_order", { order_id: 12340 }],
    ["get_assignment_attempts", { order_id: 12340 }],
    ["get_merchant", { merchant_name: "Sushi Kaze" }],
    ["get_provider_tariffs", { pais: "CO", proveedor: "Rappi" }],
  ];
  const { client, requests } = createFakeClient([
    ...calls.map(([name, args], index) =>
      functionCallResponse(name, args, `call-${index + 1}`),
    ),
    { text: "Consulté la información solicitada." },
  ]);

  const answer = await createPickerAssistant(client)("Consulta la operación.");

  assert.equal(answer, "Consulté la información solicitada.");
  const toolResults = requests
    .at(-1)
    .contents.flatMap((content) => content.parts ?? [])
    .filter((part) => part.functionResponse)
    .map((part) => part.functionResponse.response.output);
  assert.ok(toolResults[0].length > 0);
  assert.equal(toolResults[1].length, 35);
  assert.equal(toolResults[2].length, 2);
  assert.equal(toolResults[3].comercio, "Sushi Kaze");
  assert.equal(toolResults[4].length, 1);
});

test("rejects unapproved tools and caps tool rounds", async () => {
  const unknownToolClient = createFakeClient([
    functionCallResponse("read_local_file", { path: ".env" }),
  ]);
  await assert.rejects(
    createPickerAssistant(unknownToolClient.client)("Lee un archivo"),
    (error) =>
      error instanceof GeminiServiceError &&
      error.code === "UNAUTHORIZED_TOOL",
  );

  const repeatedCalls = Array.from({ length: 6 }, () =>
    functionCallResponse("search_orders", {}),
  );
  const cappedClient = createFakeClient(repeatedCalls);
  await assert.rejects(
    createPickerAssistant(cappedClient.client)("Busca pedidos"),
    (error) =>
      error instanceof GeminiServiceError &&
      error.code === "ITERATION_LIMIT",
  );
  assert.equal(cappedClient.requests.length, 6);
});

test("wraps API failures and rejects empty requests", async () => {
  const failedClient = createFakeClient([new Error("private API details")]);
  await assert.rejects(
    createPickerAssistant(failedClient.client)("Hola"),
    (error) =>
      error instanceof GeminiServiceError && error.code === "API_ERROR",
  );

  const unusedClient = createFakeClient([]);
  await assert.rejects(
    createPickerAssistant(unusedClient.client)(" "),
    (error) =>
      error instanceof GeminiServiceError && error.code === "INVALID_REQUEST",
  );
  assert.equal(unusedClient.requests.length, 0);
});

test("reports missing server API key without making a request", async () => {
  const previousKey = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;

  try {
    await assert.rejects(
      askPickerAssistant("Hola"),
      (error) =>
        error instanceof GeminiServiceError &&
        error.code === "CONFIGURATION_ERROR",
    );
  } finally {
    if (previousKey === undefined) {
      delete process.env.GEMINI_API_KEY;
    } else {
      process.env.GEMINI_API_KEY = previousKey;
    }
  }
});
