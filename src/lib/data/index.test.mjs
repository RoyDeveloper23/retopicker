import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";

import {
  DataAccessError,
  getAssignmentAttempts,
  getMerchant,
  getOrderById,
  getProviderTariffs,
  getTrackingForOrder,
  searchOrders,
} from "./index.ts";

test("obtiene pedidos por order_id y retorna null si no existe", async () => {
  const order = await getOrderById(12340);

  assert.equal(order?.order_id, 12340);
  assert.equal(order?.referencia_comercio, "SUS-82672");
  assert.equal(await getOrderById(-1), null);
  assert.equal(typeof DataAccessError, "function");
});

test("consulta tracking e intentos asociados por order_id", async () => {
  const tracking = await getTrackingForOrder(12340);
  const attempts = await getAssignmentAttempts(12340);

  assert.equal(tracking.length, 35);
  assert.ok(tracking.every((record) => record.order_id === 12340));
  assert.equal(attempts.length, 2);
  assert.ok(attempts.every((attempt) => attempt.order_id === 12340));
  assert.deepEqual(await getTrackingForOrder(-1), []);
  assert.deepEqual(await getAssignmentAttempts(-1), []);
});

test("busca comercios y filtra pedidos por campos reales", async () => {
  const merchant = await getMerchant("Sushi Kaze");
  const matchingOrders = await searchOrders({
    estado_actual: "ON_THE_WAY",
    comercio: "Sushi Kaze",
  });

  assert.equal(merchant?.comercio, "Sushi Kaze");
  assert.equal(await getMerchant("Comercio inexistente"), null);
  assert.ok(matchingOrders.length > 0);
  assert.ok(
    matchingOrders.every(
      (order) =>
        order.estado_actual === "ON_THE_WAY" &&
        order.comercio === "Sushi Kaze",
    ),
  );
  assert.deepEqual(await searchOrders({ ciudad: "Ciudad inexistente" }), []);
});

test("filtra tarifas por país, proveedor y moneda", async () => {
  const tariffs = await getProviderTariffs({
    pais: "CO",
    proveedor: "Rappi",
    moneda: "COP",
  });

  assert.equal(tariffs.length, 1);
  assert.equal(tariffs[0].proveedor, "Rappi");
  assert.equal(tariffs[0].pais, "CO");
  assert.equal(tariffs[0].moneda, "COP");
});

test("reporta de forma controlada conjuntos ausentes, JSON inválido y estructura incorrecta", async () => {
  const temporaryRoot = await mkdtemp(join(tmpdir(), "picker-data-test-"));
  const entrypoint = pathToFileURL(
    resolve("src/lib/data/index.ts"),
  ).href;
  const testLoader = pathToFileURL(
    resolve("src/lib/data/test-loader.mjs"),
  ).href;

  const runQuery = () =>
    spawnSync(
      process.execPath,
      [
        "--experimental-strip-types",
        "--experimental-default-type=module",
        `--experimental-loader=${testLoader}`,
        "--input-type=module",
        "-e",
        `import { DataAccessError, getOrderById } from ${JSON.stringify(entrypoint)}; try { await getOrderById(1); console.log("NO_ERROR"); } catch (error) { console.log(error instanceof DataAccessError ? error.code : "UNKNOWN_ERROR"); }`,
      ],
      { cwd: temporaryRoot, encoding: "utf8" },
    );

  const assertQueryResult = (expected) => {
    const result = runQuery();
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout.trim(), expected);
  };

  try {
    const processedDirectory = join(temporaryRoot, "data", "processed");
    await mkdir(processedDirectory, { recursive: true });

    assertQueryResult("MISSING_DATASET");

    await writeFile(join(processedDirectory, "pedidos.json"), "[", "utf8");
    assertQueryResult("INVALID_JSON");

    await writeFile(join(processedDirectory, "pedidos.json"), "{}", "utf8");
    assertQueryResult("INVALID_DATASET");
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});

test("reutiliza el conjunto cargado en memoria", async () => {
  const temporaryRoot = await mkdtemp(join(tmpdir(), "picker-data-cache-test-"));
  const entrypoint = pathToFileURL(resolve("src/lib/data/index.ts")).href;
  const testLoader = pathToFileURL(
    resolve("src/lib/data/test-loader.mjs"),
  ).href;

  try {
    const processedDirectory = join(temporaryRoot, "data", "processed");
    await mkdir(processedDirectory, { recursive: true });
    await writeFile(
      join(processedDirectory, "pedidos.json"),
      await readFile(resolve("data/processed/pedidos.json"), "utf8"),
      "utf8",
    );

    const result = spawnSync(
      process.execPath,
      [
        "--experimental-strip-types",
        "--experimental-default-type=module",
        `--experimental-loader=${testLoader}`,
        "--input-type=module",
        "-e",
        `import { writeFile } from "node:fs/promises"; import { join } from "node:path"; import { getOrderById } from ${JSON.stringify(entrypoint)}; const first = await getOrderById(12340); await writeFile(join(process.cwd(), "data", "processed", "pedidos.json"), "[]"); const second = await getOrderById(12340); console.log(first === second && second?.order_id === 12340);`,
      ],
      { cwd: temporaryRoot, encoding: "utf8" },
    );

    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout.trim(), "true");
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});
