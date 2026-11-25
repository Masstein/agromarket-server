import { describe, it, expect, vi, afterEach } from 'vitest';
import { errorHandler } from '../middleware/errorHandler.js';

function mockRes() {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

describe('errorHandler', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('в продакшене скрывает текст ошибки 500', () => {
    vi.stubEnv('NODE_ENV', 'production');
    const res = mockRes();
    const err = new Error('connect ECONNREFUSED 10.0.0.5:5432');
    errorHandler(err, { method: 'GET', originalUrl: '/x' }, res, vi.fn());
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json.mock.calls[0][0].error).toBe('Внутренняя ошибка сервера');
  });

  it('ошибка со статусом 400 отдаёт клиенту свой текст даже в production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    const res = mockRes();
    const err = new Error('Некорректные данные');
    err.status = 400;
    errorHandler(err, { method: 'GET', originalUrl: '/x' }, res, vi.fn());
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0].error).toBe('Некорректные данные');
  });
});