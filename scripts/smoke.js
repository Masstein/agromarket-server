// Read-only smoke test for the live production deployment. Requires Node.js 22+.
const API_URL = process.env.API_URL;
const FRONTEND_URL = process.env.FRONTEND_URL;
const EXPECTED = (process.env.EXPECTED_VERSION || '').slice(0, 7);

if (!API_URL) {
  console.error('Не задан API_URL');
  process.exit(1);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForVersion() {
  for (let attempt = 1; attempt <= 40; attempt++) {
    try {
      const res = await fetch(`${API_URL}/health`, { signal: AbortSignal.timeout(20_000) });
      const body = await res.json();
      console.log(`#${attempt}: HTTP ${res.status}, версия ${body.version}`);
      if (res.ok && body.db === 'ok' && (!EXPECTED || body.version === EXPECTED)) return body;
    } catch (err) {
      console.log(`#${attempt}: сервер пока не отвечает (${err.message})`);
    }
    await sleep(15_000);
  }
  throw new Error(`Не дождались версии ${EXPECTED || '(любой)'} за ~10 минут`);
}

const checks = [];
const check = (name, fn) => checks.push({ name, fn });
const assert = (condition, message) => { if (!condition) throw new Error(message); };

check('каталог отдаёт непустой список', async () => {
  const res = await fetch(`${API_URL}/products`);
  const list = await res.json();
  assert(res.status === 200, `статус ${res.status}`);
  assert(Array.isArray(list) && list.length > 0, 'список пуст');
});

check('без токена товар не создать (401)', async () => {
  const res = await fetch(`${API_URL}/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'smoke', price: 1 }),
  });
  assert(res.status === 401, `ожидали 401, получили ${res.status}`);
});

check('CORS: фронтенд допущен', async () => {
  assert(FRONTEND_URL, 'не задан FRONTEND_URL');
  const res = await fetch(`${API_URL}/products`, { headers: { Origin: FRONTEND_URL } });
  const allowedOrigin = res.headers.get('access-control-allow-origin');
  assert(allowedOrigin === FRONTEND_URL, `ожидали ${FRONTEND_URL}, получили ${allowedOrigin}`);
});

check('несуществующий товар — 404', async () => {
  const res = await fetch(`${API_URL}/products/999999`);
  assert(res.status === 404, `ожидали 404, получили ${res.status}`);
});

check('категории возвращают количество товаров', async () => {
  const [categoriesRes, productsRes] = await Promise.all([
    fetch(`${API_URL}/categories`),
    fetch(`${API_URL}/products`),
  ]);
  const categories = await categoriesRes.json();
  const products = await productsRes.json();
  assert(categoriesRes.status === 200, `категории: статус ${categoriesRes.status}`);
  assert(Array.isArray(categories), 'ответ категорий не массив');
  const total = categories.reduce((sum, category) => sum + category.count, 0);
  assert(total === products.length, `сумма категорий ${total}, товаров ${products.length}`);
});

async function main() {
  const health = await waitForVersion();
  console.log(`API работает: версия ${health.version}, база ${health.db}`);
  let failed = 0;
  for (const { name, fn } of checks) {
    try { await fn(); console.log(`✓ ${name}`); }
    catch (err) { failed++; console.log(`✗ ${name}: ${err.message}`); }
  }
  if (failed > 0) {
    console.error(`Провалено проверок: ${failed}`);
    process.exit(1);
  }
  console.log('Smoke-тест пройден');
}

main().catch((err) => { console.error(err.message); process.exit(1); });
