import assert from "node:assert";

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:3000";

type E2EResponse = {
  status: number;
  headers: Headers;
  body: any;
};

const DEFAULT_USER_HEADERS = {
  "x-user-id": "image_security_user_id",
  "x-user-name": "image_security_user",
  "x-user-email": "image_security_user@example.com",
  "x-user-avatar": "https://example.com/avatar.png",
};

function safeJson(value: unknown) {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

async function requestJson(path: string, body: unknown): Promise<E2EResponse> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...DEFAULT_USER_HEADERS,
    },
    body: JSON.stringify(body),
  });

  const json = await res.json().catch(() => null);
  return { status: res.status, headers: res.headers, body: json };
}

async function requestGet(path: string): Promise<E2EResponse> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "GET",
    headers: DEFAULT_USER_HEADERS,
  });

  const json = await res.json().catch(() => null);
  return { status: res.status, headers: res.headers, body: json };
}

async function uploadImage(filename: string, mimeType: string, bytes: Uint8Array): Promise<E2EResponse> {
  const formData = new FormData();
  const arrayBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  formData.append("image", new Blob([arrayBuffer], { type: mimeType }), filename);

  const res = await fetch(`${BASE_URL}/api/images/upload`, {
    method: "POST",
    headers: DEFAULT_USER_HEADERS,
    body: formData,
  });

  const json = await res.json().catch(() => null);
  return { status: res.status, headers: res.headers, body: json };
}

async function runCase(name: string, test: () => Promise<void>) {
  console.log(`\nCaso: ${name}`);
  await test();
  console.log(`  ✅ Caso '${name}' pasado`);
}

function expectStatus(res: E2EResponse, expected: number, message: string) {
  console.log(`  Response status: ${res.status}`);
  console.log(`  Response body: ${safeJson(res.body)}`);
  assert.strictEqual(res.status, expected, message);
}

function expectErrorBody(res: E2EResponse, message: string) {
  assert(res.body?.error || res.body?.errors, message);
}

function getRequiredHeader(headers: Headers, name: string) {
  const value = headers.get(name);
  assert(value, `El header ${name} debe estar presente.`);
  return value;
}

function makeTinyPng() {
  // PNG 1x1 transparente valido. Permite probar la firma binaria real sin depender de archivos externos.
  return Uint8Array.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
    0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41,
    0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
    0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00,
    0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
    0x42, 0x60, 0x82,
  ]);
}

async function runTests() {
  console.log("🛡️ Iniciando pruebas E2E de subida segura de imagenes y headers HTTP...");
  console.log(`Base URL: ${BASE_URL}`);

  let uploadedImageUrl = "";

  await runCase("Headers HTTP de seguridad presentes en endpoint API", async () => {
    const res = await requestGet("/api/items");
    expectStatus(res, 200, "GET /api/items debe responder correctamente.");

    const csp = getRequiredHeader(res.headers, "content-security-policy");
    assert(csp.includes("default-src"), "CSP debe definir default-src.");
    assert(csp.includes("object-src 'none'"), "CSP debe bloquear object-src.");
    assert(csp.includes("frame-ancestors 'none'"), "CSP debe bloquear iframes con frame-ancestors.");

    assert.strictEqual(
      getRequiredHeader(res.headers, "x-content-type-options").toLowerCase(),
      "nosniff",
      "X-Content-Type-Options debe ser nosniff.",
    );
    assert.strictEqual(
      getRequiredHeader(res.headers, "x-frame-options").toUpperCase(),
      "DENY",
      "X-Frame-Options debe ser DENY.",
    );
    assert.strictEqual(
      getRequiredHeader(res.headers, "referrer-policy").toLowerCase(),
      "no-referrer",
      "Referrer-Policy debe ser no-referrer.",
    );

    if (process.env.EXPECT_HSTS === "true") {
      const hsts = getRequiredHeader(res.headers, "strict-transport-security");
      assert(hsts.includes("max-age="), "HSTS debe definir max-age.");
    }
  });

  await runCase("Subida valida de PNG con firma binaria real", async () => {
    const res = await uploadImage("valid-tiny.png", "image/png", makeTinyPng());
    expectStatus(res, 201, "La API debe aceptar un PNG valido.");

    assert.strictEqual(res.body?.success, true, "La respuesta debe indicar success=true.");
    assert.strictEqual(typeof res.body?.imageUrl, "string", "La respuesta debe incluir imageUrl.");
    assert(res.body.imageUrl.startsWith("/uploads/"), "La imagen debe guardarse bajo /uploads/.");
    assert(res.body.imageUrl.endsWith(".png"), "La extension final debe ser .png.");
    assert(!res.body.imageUrl.includes("valid-tiny"), "No debe conservar el nombre original del archivo.");

    uploadedImageUrl = res.body.imageUrl;
  });

  await runCase("Imagen subida se sirve con headers anti-sniffing", async () => {
    assert(uploadedImageUrl, "Debe existir una imagen subida desde el caso anterior.");

    const res = await fetch(`${BASE_URL}${uploadedImageUrl}`, { headers: DEFAULT_USER_HEADERS });
    console.log(`  Response status: ${res.status}`);
    assert.strictEqual(res.status, 200, "La imagen subida debe estar disponible por URL local.");
    assert.strictEqual(
      res.headers.get("x-content-type-options")?.toLowerCase(),
      "nosniff",
      "Las imagenes subidas deben servirse con nosniff.",
    );
    assert(
      res.headers.get("content-security-policy")?.includes("sandbox"),
      "Las imagenes subidas deben servirse con una CSP sandbox.",
    );
  });

  await runCase("Rechaza archivo con MIME de imagen pero firma falsa", async () => {
    const fakePng = new TextEncoder().encode("<script>alert('xss')</script>");
    const res = await uploadImage("fake.png", "image/png", fakePng);
    expectStatus(res, 400, "La API debe rechazar archivos renombrados como imagen.");
    expectErrorBody(res, "Debe devolver error para firma binaria invalida.");
  });

  await runCase("Rechaza formato no permitido como SVG", async () => {
    const svg = new TextEncoder().encode("<svg><script>alert('xss')</script></svg>");
    const res = await uploadImage("attack.svg", "image/svg+xml", svg);
    expectStatus(res, 400, "La API debe rechazar SVG por riesgo de JavaScript embebido.");
    expectErrorBody(res, "Debe devolver error para MIME type no permitido.");
  });

  await runCase("Rechaza imagen mayor a 2 MB", async () => {
    const oversized = new Uint8Array(2 * 1024 * 1024 + 1);
    oversized.set(makeTinyPng().slice(0, 32), 0);

    const res = await uploadImage("too-large.png", "image/png", oversized);
    expectStatus(res, 400, "La API debe rechazar imagenes demasiado grandes.");
    expectErrorBody(res, "Debe devolver error de tamano maximo.");
  });

  await runCase("Rechaza URL externa sin HTTPS al crear producto", async () => {
    const res = await requestJson("/api/items", {
      title: "HTTP image should fail",
      description: "Product with insecure image URL",
      imageUrl: "http://example.com/insecure.jpg",
      category: "Vintage",
      size: "M",
      brand: "Security Test",
      condition: "Excellent",
      price: 42,
    });

    expectStatus(res, 400, "La creacion de producto debe rechazar URLs http://.");
    expectErrorBody(res, "Debe devolver error de validacion para imageUrl insegura.");
  });

  await runCase("Crea producto usando URL local generada por subida segura", async () => {
    assert(uploadedImageUrl, "Debe existir una imageUrl local segura.");

    const res = await requestJson("/api/items", {
      title: "Secure uploaded image listing",
      description: "Product created with a local secure upload",
      imageUrl: uploadedImageUrl,
      category: "Vintage",
      size: "M",
      brand: "Security Test",
      condition: "Excellent",
      price: 55,
    });

    expectStatus(res, 200, "La creacion de producto debe aceptar /uploads/ generado por el servidor.");
    assert.strictEqual(res.body?.success, true, "La respuesta debe indicar success=true.");
    assert.strictEqual(res.body?.item?.imageUrl, uploadedImageUrl, "El item debe conservar la URL local segura.");
  });

  console.log("\n✅ Todas las pruebas E2E de imagenes y headers pasaron correctamente.");
}

runTests().catch((err) => {
  console.error("❌ Error en las pruebas E2E de imagenes y headers:", err);
  process.exit(1);
});
