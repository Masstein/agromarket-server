# АгроМаркет — лабораторная работа №9

## Локальный запуск

Требуются Node.js 22.12+ и PostgreSQL. Скопируйте `.env.example` в `.env`, задайте локальную `DATABASE_URL` и секреты. Для тестов скопируйте `.env.test.example` в `.env.test` и укажите отдельную локальную базу `agromarket_test`. Файлы `.env*` не коммитятся.

```bash
npm ci
npm run db:init       # только локальная/тестовая база; пересоздаёт таблицы
npm run db:migrate    # безопасно создаёт отсутствующие таблицы; данные не удаляет
cp .env.test.example .env.test  # Windows PowerShell: Copy-Item .env.test.example .env.test
npm test
npm run dev
```

`db:init` намеренно отказывается работать с не-локальной базой без `--force`. Флаг `--force` применяйте только один раз к заведомо пустой облачной базе. Никогда не запускайте его на базе с реальными данными. Для production Render использует `npm run db:migrate && npm start`.

## Продакшен

- Сайт: `https://agromarket-YOUR-GITHUB-LOGIN.vercel.app`
- API: `https://agromarket-api-YOUR-GITHUB-LOGIN.onrender.com/api/health`
- Схема: React (Vercel) → Express (Render, Frankfurt) → PostgreSQL (Neon, Frankfurt)

Замените `YOUR-GITHUB-LOGIN` на свой GitHub-логин после настройки сервисов.

### Переменные окружения

| Переменная | Где задаётся | Секрет? |
|---|---|---|
| `DATABASE_URL` | Render | Да |
| `JWT_SECRET` | Render | Да, минимум 32 символа |
| `CORS_ORIGIN` | Render | Нет; Vercel origin и `http://localhost:5173`, через запятую |
| `VITE_API_URL` | Vercel | Нет; адрес API, встраивается при сборке |
| `RENDER_DEPLOY_HOOK_URL` | GitHub Actions Secrets | Да |
| `API_URL` | GitHub Actions Variables | Нет; например `https://agromarket-api-LOGIN.onrender.com/api` |
| `FRONTEND_URL` | GitHub Actions Variables | Нет; например `https://agromarket-LOGIN.vercel.app` |

### Деплой

1. Создайте PostgreSQL-проект в Neon (регион Frankfurt) и скопируйте полную строку подключения с `sslmode=require`. Не публикуйте её.
2. Один раз заполните пустую Neon-базу из локального терминала: создайте личный `.env.neon` с `DATABASE_URL`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, затем выполните `node --env-file=.env.neon db/seed.js --force` и `node --env-file=.env.neon db/migrate.js`. `.env.neon` не коммитить.
3. Создайте Render Web Service из `agromarket-server`, регион Frankfurt, Build Command `npm ci --omit=dev`, Start Command `npm run db:migrate && npm start`, Health Check Path `/api/health`, Auto-Deploy Off. Добавьте `NODE_ENV=production`, `DATABASE_URL`, `JWT_SECRET` (случайный, не короче 32 символов), `JWT_EXPIRES_IN=2h`, `CORS_ORIGIN`. `PORT` задаёт Render.
4. Создайте Vercel Project из `agromarket-react`: Build Command `npm run build`, Output Directory `dist`, переменная `VITE_API_URL=https://agromarket-api-LOGIN.onrender.com/api`.
5. После первого деплоя добавьте в Render `CORS_ORIGIN=https://agromarket-LOGIN.vercel.app,http://localhost:5173` без слэша в конце.
6. В GitHub → Settings → Secrets and variables → Actions добавьте secret `RENDER_DEPLOY_HOOK_URL` и variables `API_URL`, `FRONTEND_URL`. У Render отключите Auto-Deploy, чтобы деплоем управлял GitHub Actions.
7. Настройте защиту `main`: PR обязателен, требуется успешная проверка `test` (и для фронтенда `build` в его репозитории). Для production deploy выполняется только после тестов на push в `main`; smoke ждёт именно SHA проверенного коммита.

## Smoke-тест

```bash
cp .env.smoke.example .env.smoke
# замените значения в .env.smoke на реальные публичные адреса
node --env-file=.env.smoke scripts/smoke.js
```

Smoke проверяет `/api/health`, непустой каталог, запрет создания товара без токена (401), CORS, 404 для несуществующего товара и совпадение суммарного числа товаров в категориях. Он не создаёт и не удаляет данные. В GitHub Actions ожидаемая версия передаётся через `EXPECTED_VERSION`.

## Как работает доставка

1. Изменения идут в отдельной ветке и PR: CI-тесты и code review.
2. После merge в `main` GitHub Actions выполняет `test`.
3. Job `deploy` запускается только при push в `main`, вызывает Render Deploy Hook с `ref` равным SHA проверенного коммита.
4. Smoke-тест ждёт `/api/health` с той же версией, затем проверяет ключевые read-only сценарии.
5. React Vercel автоматически собирает из `main`; PR получает отдельный Preview. Preview может блокироваться CORS, пока его Origin не разрешён на Render.

## Лабораторная 9 — ответы и наблюдения

- **Что напечатал предохранитель `seed.js` на облачной базе и зачем он нужен:** `Отказ: db:init запущен НЕ на локальной базе — все данные будут удалены.` Он защищает данные от случайного запуска скрипта, который делает `DROP TABLE`.
- **Почему на Vercel сначала не загрузился каталог и как исправили:** браузер отправлял запрос с Origin Vercel, а `CORS_ORIGIN` на Render разрешал только localhost. Добавили точный URL сайта в `CORS_ORIGIN` и повторно развернули API.
- **Почему в PR job deploy — skipped:** deploy зависит от `test` и имеет условие `push` в `refs/heads/main`; событие `pull_request` не должно выкладывать непроверенный код в production.
- **Почему каталог не работает на Preview Vercel:** Preview имеет другой Origin, которого нет в `CORS_ORIGIN`, и запрос блокируется CORS. Для демонстрации временно добавьте точный Preview Origin и после теста удалите его.
- **Время конвейера от Merge до зелёного smoke:** заполнить по фактическому времени в GitHub Actions: `_____ мин`.
- **Работал ли сайт во время неудачного деплоя с `JWT_SECRET=123`:** ожидается, что новая версия завершается до запуска из-за короткого секрета, а Render продолжает отдавать трафик предыдущей здоровой версии. Проверить по Events/Logs и `/api/health`; после эксперимента обязательно вернуть настоящий секрет.
- **Rollback или git revert:** ночью при аварии — быстрый Rollback на последнюю рабочую версию, чтобы восстановить сервис. Затем утром — `git revert` через PR, чтобы `main` и production снова совпадали и откат прошёл проверки.
- **Аудит production, пункты 1–7:** записать реальные результаты проверки: 1) поиск секретов в истории Git; 2) ошибки 500 не раскрывают детали; 3) Helmet добавляет security headers, `X-Powered-By` отсутствует; 4) HTTP перенаправляется на HTTPS; 5) неверный пароль `Admin12345` не даёт войти (401); 6) шестая попытка неверного входа получает 429; 7) в Neon проверить доступное окно восстановления в Backup & Restore.
- **Холодный старт:** заполнить по фактическим измерениям: первый ответ `_____ с`, повторный `_____ с`. Render Free может усыплять сервер после простоя; первый запрос тратится на запуск, повторный обычно быстрее.
- **Использовал(а) ли ИИ и для чего:** «Использовал ИИ для анализа требований лабораторной, подготовки конфигураций деплоя, тестов и документации; код проверил(а) локально и результат проверок указал(а) отдельно».

## Вопросы для защиты — краткие ответы

1. **Архитектура:** React — статические файлы на Vercel; Express API — Render; PostgreSQL — Neon. Render и Neon в одном регионе уменьшают задержку между API и БД.
2. **Переменные:** `VITE_*` подставляются Vite при сборке и видны в клиентском JS, поэтому там нельзя хранить секреты. Переменные Render читаются сервером при запуске и не отправляются браузеру.
3. **`db:init`, миграция, идемпотентность:** `db:init` пересоздаёт таблицы и удаляет данные, поэтому не подходит для production. `db:migrate` создаёт отсутствующие таблицы, не удаляя данные. Идемпотентная операция при повторе даёт тот же результат.
4. **CORS:** браузерная политика, ограничивающая запросы к API с других Origin. Каталог не загрузился, потому что адрес Vercel не был разрешён; исправление — добавить точный Origin в `CORS_ORIGIN`.
5. **`trust proxy`:** позволяет Express учитывать forwarded IP за прокси Render; иначе rate limiter мог бы видеть один IP прокси для всех посетителей.
6. **Конвейер:** merge → CI-тесты → deploy → smoke. `needs` задаёт зависимость, `if` ограничивает деплой push-событием в main, `ref=SHA` фиксирует проверенную версию. Deploy Hook — секрет, потому что его обладатель может запускать деплой.
7. **Smoke:** короткая проверка живого production после деплоя; в отличие от интеграционных тестов, не создаёт и не удаляет данные.
8. **Ошибки:** в production 500 скрывает внутренние детали, а 400 сообщает безопасную причину ошибки клиентских данных. Полный объект ошибки остаётся в логах.
9. **SIGTERM:** сервер прекращает принимать новые запросы, ждёт завершения текущих, закрывает пул БД. При неверной конфигурации нужно падать сразу, чтобы не обслуживать запросы в некорректном состоянии.
10. **Холодный старт:** после простоя Render Free может усыпить сервер; первый запрос запускает его и может занять до минуты, повторный обычно быстрее.
11. **Rollback и revert:** Rollback на хостинге быстро возвращает предыдущий deploy, но Git не меняет. `git revert` создаёт коммит-отмену через PR, сохраняя историю и синхронизируя main с production.
12. **Смена `JWT_SECRET`:** токены, подписанные старым секретом, перестанут проходить проверку и пользователям придётся войти заново.

## Важные ограничения сдачи

Облачные URL, GitHub Secrets, branch protection, реальный статус Actions, результаты аудита и измерения холодного старта зависят от ваших аккаунтов. Эти пункты нельзя достоверно заполнить до фактического деплоя. Не добавляйте реальные `.env`, `.env.neon` или `.env.smoke` в Git.
