import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../app.js';

describe('GET /api/health', () => {
  it('отвечает 200, подтверждает базу и показывает версию', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.db).toBe('ok');
    expect(res.body.version).toBe('local');
  });

  it('разрешённый Origin получает CORS-заголовок', async () => {
    const res = await request(app)
      .get('/api/products')
      .set('Origin', 'http://localhost:5173');
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
  });

  it('чужой Origin не получает CORS-заголовок', async () => {
    const res = await request(app)
      .get('/api/products')
      .set('Origin', 'https://evil.example');
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });
});
