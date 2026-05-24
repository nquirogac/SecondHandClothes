import request from 'supertest';
import { startServer } from '../../server';

let server: any;
let app: any;

beforeAll(async () => {
  const result = await startServer(0);
  server = result.server;
  app = result.app;
});

afterAll(async () => {
  if (server && server.close) {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

test('GET /api/currentUser should return a user object', async () => {
  const res = await request(app).get('/api/currentUser');
  expect(res.status).toBe(200);
  expect(res.body).toHaveProperty('id');
});
