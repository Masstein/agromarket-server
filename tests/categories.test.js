import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../app.js';

describe('GET /api/categories', () => {
  it('возвращает категории с числовым количеством товаров', async () => {
    const res = await request(app).get('/api/categories');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    expect(typeof res.body[0].count).toBe('number');
  });

  it('сумма товаров по категориям равна размеру каталога', async () => {
    const [categoriesRes, productsRes] = await Promise.all([
      request(app).get('/api/categories'),
      request(app).get('/api/products'),
    ]);
    const total = categoriesRes.body.reduce((sum, category) => sum + category.count, 0);
    expect(categoriesRes.status).toBe(200);
    expect(productsRes.status).toBe(200);
    expect(total).toBe(productsRes.body.length);
  });
});
