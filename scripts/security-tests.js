import assert from "node:assert";

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

  console.log(`Caso '${name}' final;izado correctamente ✅ `);
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

function expectBodyString(keyPath, message) {
  return (res) => {
    const value = keyPath.split(".").reduce((acc, key) => (acc ? acc[key] : undefined), res.body);
    assert.strictEqual(typeof value, "string", message);
  };
}

function expectBodyError(message) {
  return (res) => {
    assert(res.body?.errors?.length > 0 || res.body?.error, message);
  };
}

async function runTests() {
  console.log("🔐 Iniciando pruebas de seguridad...");

  await runCase("SQL Injection en login", "/api/login", { username: "' OR 1=1 --" }, [
    expectStatus(400, "El endpoint debe rechazar un payload SQLi en login."),
    expectBodyError("El backend debe devolver un error de validación para login SQLi."),
  ]);

  await runCase("Usuario inválido con caracteres especiales", "/api/login", { username: "admin'--" }, [
    expectStatus(400, "El login debe rechazar nombres de usuario con caracteres no permitidos."),
    expectBodyError("Debe retornar un error explicando la falla de validación."),
  ]);

  await runCase("Registro con email inválido", "/api/register", { username: "user_test", email: "bad-email", bio: "test" }, [
    expectStatus(400, "El registro debe rechazar un email inválido."),
    expectBodyError("Debe devolver un error de validación para email inválido."),
  ]);

  await runCase("Registro con XSS en bio", "/api/register", { username: "safe_user", email: "safe@example.com", bio: "<script>alert('xss')</script>" }, [
    expectStatus(200, "El registro debe aceptar bio sanitizado."),
    expectBodyString("user.bio", "La bio debe ser un string sanitizado."),
    expectBodyNotContain("user.bio", "<script>", "La bio no debe contener etiquetas <script>."),
  ]);

  await runCase("XSS en comentario con script tag", "/api/items/c1/comment", { text: "<script>alert('hack')</script>" }, [
    expectStatus(200, "El comentario malicioso debe ser aceptado y sanitizado."),
    expectBodyString("comment.text", "El texto del comentario debe ser un string sanitizado."),
    expectBodyNotContain("comment.text", "<script>", "El campo text no debe contener script tags."),
    expectBodyNotContain("comment.text", "alert(", "El comentario no debe contener código JS ejecutable."),
  ]);

  await runCase("XSS en comentario con img onerror", "/api/items/c1/comment", { text: "<img src=x onerror=alert(1)>" }, [
    expectStatus(200, "El comentario con onerror debe ser sanitizado."),
    expectBodyString("comment.text", "El texto del comentario debe ser un string sanitizado."),
    expectBodyNotContain("comment.text", "onerror", "No debe contener atributos onerror."),
    expectBodyNotContain("comment.text", "alert(", "No debe contener código JS ejecutable."),
  ]);

  await runCase("XSS en descripción del item", "/api/items", {
    title: "Test XSS Shirt",
    description: "<script>alert('hack')</script>",
    category: "Streetwear",
    size: "M",
    condition: "Excellent",
    price: 55,
  }, [
    expectStatus(200, "La creación de item debe aceptar la petición y sanitizar la descripción."),
    expectBodyString("item.description", "La descripción debe ser un string sanitizado."),
    expectBodyNotContain("item.description", "<script>", "La descripción no debe contener etiquetas <script>."),
    expectBodyNotContain("item.description", "alert(", "La descripción no debe contener JS ejecutable."),
  ]);

  await runCase("XSS en chat con svg onload", "/api/chats", { itemId: "c1", receiverId: "u1", text: "<svg onload=alert(1)>" }, [
    expectStatus(200, "El chat debe aceptar mensajes sanitizados."),
    expectBodyString("chat.text", "El texto del chat debe ser un string sanitizado."),
    expectBodyNotContain("chat.text", "onload", "No debe contener atributos onload."),
    expectBodyNotContain("chat.text", "alert(", "No debe contener código JS ejecutable."),
  ]);

  console.log("\nTodas las pruebas de seguridad pasaron correctamente ✅ ");
}

runTests().catch((err) => {
  console.error("Error en las pruebas de seguridad:", err);
  process.exit(1);
});
