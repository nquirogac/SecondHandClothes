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
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  test("POST /api/security/turnstile/verify acepta token cuando Cloudflare responde success=true", async () => {
    const { app, server } = await startServer(0);
    const res = await request(app).post("/api/security/turnstile/verify").send({ token: "ok" });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("success", true);
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });
});

describe("RNF-S2/RNF-S3: captcha requerido en login/registro cuando TURNSTILE_SECRET_KEY está configurado", () => {
  test("POST /api/login rechaza si falta turnstileToken", async () => {
    const { app, server } = await startServer(0);
    const res = await request(app).post("/api/login").send({ username: "demo" });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error", "Turnstile token is required.");
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  test("POST /api/register rechaza si falta turnstileToken", async () => {
    const { app, server } = await startServer(0);
    const res = await request(app).post("/api/register").send({ username: "demo", email: "demo@example.com" });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error", "Turnstile token is required.");
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
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });
});

describe("RNF-S5: Control de abuso (rate limiting)", () => {
  test("POST /api/login aplica rate limit (10 por ventana)", async () => {
    const { app, server } = await startServer(0);

    for (let i = 0; i < 10; i += 1) {
      const res = await request(app)
        .post("/api/login")
        .send({ username: `user_${i}`, turnstileToken: "ok" });
      expect([200, 400]).toContain(res.status);
    }

    const blocked = await request(app)
      .post("/api/login")
      .send({ username: "user_blocked", turnstileToken: "ok" });
    expect(blocked.status).toBe(429);

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

    await new Promise<void>((resolve) => server.close(() => resolve()));
  });
});

