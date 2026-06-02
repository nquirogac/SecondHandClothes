import request from "supertest";

jest.mock("firebase-admin/app", () => {
  return {
    applicationDefault: () => ({ mocked: "applicationDefault" }),
    cert: (value: unknown) => value,
    getApps: () => [],
    initializeApp: () => ({ mocked: "firebaseApp" }),
  };
});

const verifyIdTokenMock = jest.fn();

jest.mock("firebase-admin/auth", () => {
  return {
    getAuth: () => ({
      verifyIdToken: verifyIdTokenMock,
    }),
  };
});

type StartServerResult = {
  app: any;
  server: any;
};

let startServer: (port?: number) => Promise<StartServerResult>;

beforeAll(async () => {
  process.env.TURNSTILE_SECRET_KEY = "test_turnstile_secret";
  const mod = await import("../../server");
  startServer = mod.startServer;
});

beforeEach(() => {
  verifyIdTokenMock.mockReset();
  (global as any).fetch = jest.fn(async () => ({
    json: async () => ({ success: true }),
  }));
});

afterEach(() => {
  delete (global as any).fetch;
});

describe("RNF-S3: Validación del captcha en servidor (Turnstile)", () => {
  test("POST /api/security/turnstile/verify rechaza sin token", async () => {
    const { app, server } = await startServer(0);
    const res = await request(app).post("/api/security/turnstile/verify").send({});
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("success", false);
    expect((global as any).fetch).not.toHaveBeenCalled();

    console.log(
      [
        "[RNF-S3] Evidencia verificación Turnstile (/api/security/turnstile/verify)",
        "- caso: sin token",
        `- status=${res.status}`,
        `- body=${JSON.stringify(res.body)}`,
        "- fetch=NO llamado (no debe llamar a Cloudflare sin token)",
      ].join("\n")
    );
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  test("POST /api/security/turnstile/verify acepta token cuando Cloudflare responde success=true", async () => {
    const { app, server } = await startServer(0);
    const res = await request(app).post("/api/security/turnstile/verify").send({ token: "ok" });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("success", true);
    expect((global as any).fetch).toHaveBeenCalledTimes(1);

    const fetchCall = (global as any).fetch.mock.calls[0] as [string, any];
    console.log(
      [
        "[RNF-S3] Evidencia verificación Turnstile (/api/security/turnstile/verify)",
        "- caso: token ok + Cloudflare success=true (mock)",
        `- status=${res.status}`,
        `- body=${JSON.stringify(res.body)}`,
        `- fetch.url=${fetchCall?.[0] ?? "?"}`,
        `- fetch.method=${fetchCall?.[1]?.method ?? "?"}`,
      ].join("\n")
    );
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });
});

describe("RNF-S2/RNF-S3: captcha requerido en login/registro cuando TURNSTILE_SECRET_KEY está configurado", () => {
  test("POST /api/login rechaza si falta turnstileToken", async () => {
    const { app, server } = await startServer(0);
    const res = await request(app).post("/api/login").send({ username: "demo" });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error", "Turnstile token is required.");
    expect((global as any).fetch).not.toHaveBeenCalled();

    console.log(
      [
        "[RNF-S2/RNF-S3] Evidencia captcha requerido (/api/login)",
        "- caso: falta turnstileToken",
        `- status=${res.status}`,
        `- body=${JSON.stringify(res.body)}`,
        "- fetch=NO llamado (se rechaza antes de verificar en Cloudflare)",
      ].join("\n")
    );
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  test("POST /api/register rechaza si falta turnstileToken", async () => {
    const { app, server } = await startServer(0);
    const res = await request(app).post("/api/register").send({ username: "demo", email: "demo@example.com" });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error", "Turnstile token is required.");
    expect((global as any).fetch).not.toHaveBeenCalled();

    console.log(
      [
        "[RNF-S2/RNF-S3] Evidencia captcha requerido (/api/register)",
        "- caso: falta turnstileToken",
        `- status=${res.status}`,
        `- body=${JSON.stringify(res.body)}`,
        "- fetch=NO llamado (se rechaza antes de verificar en Cloudflare)",
      ].join("\n")
    );
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  test("POST /api/register acepta con turnstileToken válido (mock)", async () => {
    const { app, server } = await startServer(0);
    const res = await request(app)
      .post("/api/register")
      .send({ username: "demo", email: "demo@example.com", turnstileToken: "ok" });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("success", true);
    expect(res.body.user).toHaveProperty("id");
    expect((global as any).fetch).toHaveBeenCalledTimes(1);

    const fetchCall = (global as any).fetch.mock.calls[0] as [string, any];
    console.log(
      [
        "[RNF-S2/RNF-S3] Evidencia captcha validado (/api/register)",
        "- caso: con turnstileToken + Cloudflare success=true (mock)",
        `- status=${res.status}`,
        `- user.id=${res.body?.user?.id ?? "?"}`,
        `- fetch.url=${fetchCall?.[0] ?? "?"}`,
        `- fetch.method=${fetchCall?.[1]?.method ?? "?"}`,
      ].join("\n")
    );
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });
});

describe("RNF-S5: Control de abuso (rate limiting)", () => {
  test("POST /api/login: después de 10 requests en la ventana, el 11° debe responder 429 (rate limit activo)", async () => {
    const { app, server } = await startServer(0);

    const report: Array<{ attempt: number; status: number; limit?: string; remaining?: string; reset?: string }> = [];

    for (let i = 0; i < 10; i += 1) {
      const res = await request(app)
        .post("/api/login")
        .send({ username: `user_${i}`, turnstileToken: "ok" });
      expect([200, 400]).toContain(res.status);
      report.push({
        attempt: i + 1,
        status: res.status,
        limit: res.headers["ratelimit-limit"],
        remaining: res.headers["ratelimit-remaining"],
        reset: res.headers["ratelimit-reset"],
      });
    }

    const blocked = await request(app)
      .post("/api/login")
      .send({ username: "user_blocked", turnstileToken: "ok" });
    expect(blocked.status).toBe(429);
    report.push({
      attempt: 11,
      status: blocked.status,
      limit: blocked.headers["ratelimit-limit"],
      remaining: blocked.headers["ratelimit-remaining"],
      reset: blocked.headers["ratelimit-reset"],
    });

    const limitHeader = blocked.headers["ratelimit-limit"] || report[0]?.limit;
    const remainingHeader = blocked.headers["ratelimit-remaining"];

    expect(limitHeader).toBeDefined();
    expect(Number(limitHeader)).toBe(10);

    if (remainingHeader !== undefined) {
      expect(Number(remainingHeader)).toBe(0);
    }

    expect(blocked.body).toHaveProperty("error");

    console.log(
      [
        "[RNF-S5] Evidencia rate limiting (/api/login)",
        ...report.map((row) => `- intento ${row.attempt}: status=${row.status} limit=${row.limit ?? "?"} remaining=${row.remaining ?? "?"} reset=${row.reset ?? "?"}`),
      ].join("\n")
    );

    await new Promise<void>((resolve) => server.close(() => resolve()));
  });
});

describe("RNF-S1/RNF-S4: Firebase Auth + verificación de identidad en backend", () => {
  test("GET /api/currentUser usa Bearer token cuando verifyIdToken valida", async () => {
    verifyIdTokenMock.mockResolvedValueOnce({
      uid: "firebase_uid_1",
      email: "user@example.com",
      name: "User Example",
      picture: "https://example.com/avatar.png",
    });

    const { app, server } = await startServer(0);
    const res = await request(app).get("/api/currentUser").set("Authorization", "Bearer valid_token");

    expect(verifyIdTokenMock).toHaveBeenCalledWith("valid_token");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("id", "firebase_uid_1");

    console.log(
      [
        "[RNF-S1/RNF-S4] Evidencia verificación ID token (Firebase Admin)",
        "- caso: Bearer válido (mock verifyIdToken ok)",
        `- verifyIdToken.calls=${verifyIdTokenMock.mock.calls.length}`,
        `- status=${res.status}`,
        `- currentUser.id=${res.body?.id ?? "?"}`,
      ].join("\n")
    );
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  test("GET /api/currentUser NO confía en Bearer inválido y cae al fallback de headers", async () => {
    verifyIdTokenMock.mockRejectedValueOnce(new Error("Invalid token"));

    const { app, server } = await startServer(0);
    const res = await request(app)
      .get("/api/currentUser")
      .set("Authorization", "Bearer invalid_token")
      .set("x-user-id", "u_header")
      .set("x-user-name", "header_user")
      .set("x-user-email", "header@example.com")
      .set("x-user-avatar", "https://example.com/a.png");

    expect(verifyIdTokenMock).toHaveBeenCalledWith("invalid_token");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("id", "u_header");
    expect(res.body).toHaveProperty("username", "header_user");

    console.log(
      [
        "[RNF-S4] Evidencia rechazo de token inválido + fallback controlado",
        "- caso: Bearer inválido (mock verifyIdToken falla) + headers x-user-*",
        `- verifyIdToken.calls=${verifyIdTokenMock.mock.calls.length}`,
        `- status=${res.status}`,
        `- fallbackUser.id=${res.body?.id ?? "?"}`,
        `- fallbackUser.username=${res.body?.username ?? "?"}`,
      ].join("\n")
    );
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });
});

