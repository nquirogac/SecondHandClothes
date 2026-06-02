import assert from "node:assert";
import argon2 from "argon2";

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:3000";

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

async function request(path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => null);
  return { status: res.status, body: json };
}

async function runCase(name, path, payload, assertions) {
  console.log(`\nCaso: ${name}`);
  console.log(`  URL: ${BASE_URL}${path}`);
  console.log(`  Payload: ${formatPayload(payload)}`);

  const res = await request(path, payload);
  console.log(`  Response status: ${res.status}`);
  console.log(`  Response body: ${safeJson(res.body)}`);

  for (const assertion of assertions) {
    assertion(res);
  }

  console.log(`  ✅ Caso '${name}' pasado`);
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

function expectBodyNotContain(keyPath, substring, message) {
  return (res) => {
    const value = keyPath.split(".").reduce((acc, key) => (acc ? acc[key] : undefined), res.body);
    assert.strictEqual(typeof value, "string", `${keyPath} debe ser un string`);
    assert(!value.includes(substring), message);
  };
}

function expectBodyError(message) {
  return (res) => {
    assert(res.body?.error || res.body?.errors, message);
  };
}

function expectPasswordHashAbsent(message) {
  return (res) => {
    assert(!res.body?.user?.passwordHash && !res.body?.passwordHash, message);
  };
}

async function hashArgon2(password) {
  return await argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });
}

async function verifyArgon2(hash, password) {
  return await argon2.verify(hash, password);
}

async function runTests() {
  console.log("🔐 Iniciando pruebas de contraseñas seguras (Argon2)...");

  const uniqueSuffix = `${Date.now().toString().slice(-4)}${Math.floor(Math.random() * 900 + 100)}`;
  const unique = (value) => {
    if (value.includes("@")) {
      const [local, domain] = value.split("@");
      return `${local}_${uniqueSuffix}@${domain}`;
    }
    const maxBaseLength = 22;
    const base = value.length > maxBaseLength ? value.slice(0, maxBaseLength) : value;
    return `${base}_${uniqueSuffix}`;
  };

  // Caso 1: Contraseña válida
  const validUserPayload = {
    username: unique("secure_user"),
    email: unique("secure@example.com"),
    password: "SecurePass123!",
    bio: "Prueba de contraseña segura",
  };

  await runCase("Contraseña válida (8+ caracteres, mayúscula, número, símbolo)", "/api/register", validUserPayload, [
    expectStatus(200, "El registro debe aceptar una contraseña válida."),
    expectBodyContains("success", true, "La respuesta debe indicar éxito."),
    expectBodyContains("user.username", validUserPayload.username, "El usuario debe tener el username correcto."),
    expectPasswordHashAbsent("El hash de contraseña NUNCA debe exponerse al cliente."),
  ]);

  // Caso 2: Contraseña demasiado corta
  await runCase("Contraseña demasiado corta (menos de 8 caracteres)", "/api/register", {
    username: unique("short_pass_user"),
    email: unique("short@example.com"),
    password: "Short1!",
  }, [
    expectStatus(400, "El registro debe rechazar contraseña demasiado corta."),
    expectBodyError("Debe devolver error de validación de contraseña."),
  ]);

  // Caso 3: Sin mayúscula
  await runCase("Contraseña sin mayúscula", "/api/register", {
    username: unique("no_upper_user"),
    email: unique("noupper@example.com"),
    password: "password123!",
  }, [
    expectStatus(400, "El registro debe rechazar contraseña sin mayúscula."),
    expectBodyError("Debe indicar el error de validación."),
  ]);

  // Caso 4: Sin número
  await runCase("Contraseña sin número", "/api/register", {
    username: unique("no_number_user"),
    email: unique("nonumber@example.com"),
    password: "PasswordWithout!",
  }, [
    expectStatus(400, "El registro debe rechazar contraseña sin número."),
    expectBodyError("Debe indicar el error de validación."),
  ]);

  // Caso 5: Sin símbolo especial
  await runCase("Contraseña sin símbolo especial", "/api/register", {
    username: unique("no_symbol_user"),
    email: unique("nosymbol@example.com"),
    password: "Password123",
  }, [
    expectStatus(400, "El registro debe rechazar contraseña sin símbolo especial."),
    expectBodyError("Debe indicar el error de validación."),
  ]);

  // Caso 6: Email inválido
  await runCase("Email inválido", "/api/register", {
    username: unique("bad_email_user"),
    email: "not-an-email",
    password: "ValidPassword123!",
  }, [
    expectStatus(400, "El registro debe rechazar email inválido."),
    expectBodyError("Debe devolver error de validación de email."),
  ]);

  // Caso 7: Usuario duplicado (intentar registrar el mismo usuario dos veces)
  const uniqueUserPayload = {
    username: unique("unique_user_123"),
    email: unique("unique123@example.com"),
    password: "UniquePass456!",
  };

  await runCase("Primer registro de usuario único", "/api/register", uniqueUserPayload, [
    expectStatus(200, "El primer registro debe ser exitoso."),
    expectBodyContains("success", true, "Debe indicar éxito."),
  ]);

  await runCase("Intento de registrar usuario duplicado (mismo email)", "/api/register", {
    username: unique("different_username"),
    email: uniqueUserPayload.email,
    password: "DifferentPass789!",
  }, [
    expectStatus(400, "El registro debe rechazar email duplicado."),
    expectBodyError("Debe indicar que el email ya está registrado."),
  ]);

  // Caso 8: Contraseña con caracteres especiales válidos
  await runCase("Contraseña con símbolos especiales variados", "/api/register", {
    username: unique("special_chars_user"),
    email: unique("special@example.com"),
    password: "Secure@Password#2026",
  }, [
    expectStatus(200, "El registro debe aceptar contraseña con variedad de símbolos."),
    expectBodyContains("success", true, "La respuesta debe indicar éxito."),
    expectPasswordHashAbsent("El hash de contraseña NUNCA debe exponerse."),
  ]);

  // Caso 9: Username con caracteres no permitidos
  await runCase("Username con caracteres especiales no permitidos", "/api/register", {
    username: "invalid@username",
    email: unique("valid@example.com"),
    password: "ValidPassword123!",
  }, [
    expectStatus(400, "El registro debe rechazar username con caracteres no permitidos."),
    expectBodyError("Debe indicar error de validación de username."),
  ]);

  // Caso 10: Contraseña muy larga (pero válida)
  await runCase("Contraseña válida pero larga", "/api/register", {
    username: unique("long_pass_user"),
    email: unique("longpass@example.com"),
    password: "ThisIsAVeryLongButValidPassword123!WithManyCharacters",
  }, [
    expectStatus(200, "El registro debe aceptar contraseña larga pero válida."),
    expectBodyContains("success", true, "La respuesta debe indicar éxito."),
  ]);

  // Pruebas directas de hash Argon2
  const argonPassword = "Argon2Secure123!";
  const argonHash = await hashArgon2(argonPassword);

  console.log("\nEjecutando pruebas de Argon2 hash...");
  assert(typeof argonHash === "string" && argonHash.startsWith("$argon2id$"), "El hash Argon2 debe ser una cadena y empezar con $argon2id$");
  assert(await verifyArgon2(argonHash, argonPassword), "verifyArgon2 debe validar la contraseña correcta");
  assert(!(await verifyArgon2(argonHash, "WrongPassword123!")), "verifyArgon2 debe rechazar una contraseña incorrecta");

  const secondHash = await hashArgon2(argonPassword);
  assert(secondHash !== argonHash, "Dos hashes de la misma contraseña deben ser diferentes por el salt");

  console.log("  ✅ Pruebas directas de Argon2 pasaron correctamente.");
  console.log("\n✅ Todas las pruebas de contraseña segura pasaron correctamente.");
}

runTests().catch((err) => {
  console.error("❌ Error en las pruebas de seguridad de contraseña:", err);
  process.exit(1);
});
