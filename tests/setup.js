import { afterAll } from 'vitest';
import { pool } from '../db/pool.js';

// После файла тестов закрываем подключения, иначе процесс «зависнет»
afterAll(async () => {
  await pool.end();
});