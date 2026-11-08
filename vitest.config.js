import { defineConfig } from 'vitest/config';
import dotenv from 'dotenv';

// Читаем .env.test и перекрываем им то, что могло быть загружено раньше.
// В CI файла нет, там переменные задаёт сам workflow.
const { parsed } = dotenv.config({ path: '.env.test', override: true, quiet: true });

export default defineConfig({
  test: {
    env: parsed,
    globalSetup: './tests/globalSetup.js',
    setupFiles: ['./tests/setup.js'],
    fileParallelism: false, // файлы по очереди: база одна на всех
    coverage: {
      include: ['app.js', 'routes/**', 'middleware/**'],
    },
  },
});