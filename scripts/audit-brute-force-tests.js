import assert from "node:assert";
import fs from "node:fs/promises";
import path from "node:path";

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:3000";
const AUDIT_LOG = path.resolve(process.cwd(), "audit.log");

function formatPayload(payload) {
  return JSON.stringify(payload, null, 2);
}

function safeJson(value) {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

async function request(pathUrl, body) {
  const res = await fetch(`${BASE_URL}${pathUrl}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => null);
  return { status: res.status, body: json };
}

async function runCase(name, pathUrl, payload, assertions) {
  console.log(`\nCaso: ${name}`);
  console.log(`  URL: ${BASE_URL}${pathUrl}`);
  console.log(`  Payload: ${formatPayload(payload)}`);

  const res = await request(pathUrl, payload);
  console.log(`  Response status: ${res.status}`);
  console.log(`  Response body: ${safeJson(res.body)}`);

  for (const assertion of assertions) {
    assertion(res);
  }

  console.log(`Caso '${name}' completado ✅`);
}

function expectStatus(expected, message) {
  return (res) => {
    assert.strictEqual(res.status, expected, message);
  };
}

function expectBodyContains(keyPath, expected, message) {
  return (res) => {
    const value = keyPath.split(".").reduce((acc, key) => (acc ? acc[key] : undefined), res.body);
    assert.strictEqual(value, expected, message);
  };
}

function expectBodyHasKey(keyPath, message) {
  return (res) => {
    const value = keyPath.split(".").reduce((acc, key) => (acc ? acc[key] : undefined), res.body);
    assert(value !== undefined, message);
  };
}

async function readAuditLines() {
  try {
    const raw = await fs.readFile(AUDIT_LOG, "utf8");
    return raw.split(/\r?\n/).filter(Boolean);
  } catch (err) {
    if (err.code === "ENOENT") return [];
    throw err;
  }
}

function parseAuditEntries(lines) {
  return lines
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

function findEntry(entries, action) {
  return entries.find((entry) => entry.action === action);
}

async function runTests() {
  console.log("🔎 Iniciando pruebas de auditoría y fuerza bruta...");

  const beforeLines = await readAuditLines();
  const baselineCount = beforeLines.length;

  await runCase("Login exitoso existente", "/api/login", { username: "retro_lucia" }, [
    expectStatus(200, "El login existente debe devolver 200."),
    expectBodyContains("success", true, "La respuesta debe indicar éxito."),
  ]);

  await runCase("Login auto-creado", "/api/login", { username: `audit_test_user_${Date.now()}`, email: `audit_test_user_${Date.now()}@example.com` }, [
    expectStatus(200, "El login con nuevo usuario debe auto-crear y devolver 200."),
    expectBodyContains("success", true, "La respuesta debe indicar éxito."),
  ]);

  const bruteForceEmail = `bruteforce_test_${Date.now()}@example.com`;
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    const expectedStatus = attempt < 5 ? 400 : 429;
    await runCase(`Intento de fuerza bruta ${attempt}`, "/api/login", { email: bruteForceEmail }, [
      expectStatus(expectedStatus, `El intento ${attempt} debe devolver ${expectedStatus}.`),
      expectedStatus === 429
        ? expectBodyHasKey("retryAfter", "Debe devolver retryAfter cuando está rate-limited.")
        : () => {},
    ]);
  }

  const afterLines = await readAuditLines();
  const newLines = afterLines.slice(baselineCount);
  const newEntries = parseAuditEntries(newLines);

  const loginSuccess = findEntry(newEntries, "login.success");
  const loginAutoCreated = findEntry(newEntries, "login.auto-created");
  const loginFailedEntries = newEntries.filter((entry) => entry.action === "login.failed");
  const blockedFailedEntry = loginFailedEntries.find((entry) => entry.blocked === true);

  assert(loginSuccess, "Debe existir un registro de auditoría para login.success.");
  assert(loginAutoCreated, "Debe existir un registro de auditoría para login.auto-created.");
  assert(loginFailedEntries.length >= 5, "Debe haber al menos 5 eventos login.failed.");
  assert(blockedFailedEntry, "Debe existir un evento login.failed con blocked: true.");
  assert(blockedFailedEntry.retryAfter > 0, "El evento login.failed bloqueado debe incluir retryAfter positivo.");

  console.log("\n✅ Todas las pruebas de auditoría y fuerza bruta pasaron.");
}

runTests().catch((err) => {
  console.error("Error en las pruebas:", err);
  process.exit(1);
});
