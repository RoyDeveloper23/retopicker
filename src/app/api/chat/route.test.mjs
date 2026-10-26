import assert from "node:assert/strict";
import test from "node:test";

import { POST } from "./route.ts";

async function post(body, headers = { "content-type": "application/json" }) {
  const requestBody = typeof body === "string" ? body : JSON.stringify(body);
  return POST(
    new Request("http://localhost/api/chat", {
      method: "POST",
      headers,
      body: requestBody,
    }),
  );
}

test("returns 400 for invalid JSON", async () => {
  const response = await post("{");

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    error: "El cuerpo debe contener JSON válido.",
  });
});

test("requires a non-empty string message", async () => {
  for (const body of [{}, { message: 12 }, { message: " \n " }]) {
    const response = await post(body);

    assert.equal(response.status, 400);
    assert.equal(typeof (await response.json()).error, "string");
  }
});

test("rejects messages longer than 2000 characters without calling Gemini", async () => {
  const response = await post({ message: "a".repeat(2_001) });

  assert.equal(response.status, 413);
  assert.deepEqual(await response.json(), {
    error: "El mensaje no puede superar los 2000 caracteres.",
  });
});

test("does not invoke Gemini for invalid requests", async () => {
  const previousKey = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;

  try {
    const response = await post({ message: "" });
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), {
      error: "El mensaje no puede estar vacío.",
    });
  } finally {
    if (previousKey === undefined) {
      delete process.env.GEMINI_API_KEY;
    } else {
      process.env.GEMINI_API_KEY = previousKey;
    }
  }
});
