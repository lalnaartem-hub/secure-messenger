# Деплой мессенджера на Railway (публичный URL для всех)

Один сервис отдаёт **сайт + API + WebSocket** по одному адресу. Рядом плагины
**Postgres** и **Redis**. Локальная сеть/провайдер больше не мешают — всё крутится в облаке.

---

## 0. Подготовка репозитория
1. Залей проект на GitHub (новый приватный репозиторий):
   ```bash
   cd secure-messenger
   git init
   git add .
   git commit -m "secure messenger"
   git branch -M main
   git remote add origin https://github.com/<ты>/<repo>.git
   git push -u origin main
   ```
   > `.gitignore` уже исключает `node_modules`, `dist`, `.env`. Секреты не утекут.

## 1. Создай проект на Railway
1. Зайди на https://railway.app → **New Project** → **Deploy from GitHub repo** → выбери репозиторий.
2. Railway увидит `Dockerfile` и `railway.json` и соберёт образ сам.

## 2. Добавь базы (в том же проекте)
1. **+ New** → **Database** → **Add PostgreSQL**.
2. **+ New** → **Database** → **Add Redis**.
   > Они доступны сервису по внутренней сети — никаких блокировок и TLS-плясок.

## 3. Переменные окружения сервиса
Открой сервис приложения → вкладка **Variables** → добавь:

| Переменная | Значение |
|---|---|
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` |
| `REDIS_URL` | `${{Redis.REDIS_URL}}` |
| `JWT_SECRET` | длинная случайная строка |
| `PUBLIC_URL` | публичный URL сервиса (см. шаг 4), напр. `https://secure-messenger-production.up.railway.app` |
| `CORS_ORIGIN` | тот же публичный URL |
| `NODE_ENV` | `production` |

OAuth (можно добавить после первого деплоя — см. шаг 5):
| `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` | из GitHub OAuth App |
| `GITHUB_CALLBACK_URL` | `https://<твой-домен>/auth/github/callback` |

> `${{Postgres.DATABASE_URL}}` и `${{Redis.REDIS_URL}}` — это ссылки Railway на
> переменные плагинов. Вводи их буквально в таком виде.

## 4. Получи публичный домен
Сервис → **Settings** → **Networking** → **Generate Domain**.
Получишь адрес вида `https://...up.railway.app`. Впиши его в `PUBLIC_URL` и `CORS_ORIGIN`,
после чего сервис передеплоится.

Схема БД накатывается автоматически при старте (idempotent). В логах увидишь:
```
[migrate] schema applied from ...
[redis] connected
[backend] listening on :PORT
```

Открой публичный URL — это и есть мессенджер для всех. 🎉

## 5. Вход через GitHub OAuth
1. https://github.com/settings/developers → **New OAuth App**.
2. **Homepage URL**: твой публичный URL.
3. **Authorization callback URL**: `https://<твой-домен>/auth/github/callback`.
4. Сгенерируй client secret, впиши `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` /
   `GITHUB_CALLBACK_URL` в Variables. (Аналогично для Google, если нужно.)

## 6. Десктопный .exe (обёртка над сайтом)
Десктоп — это окно Electron, открывающее тот же публичный адрес.
1. В `packages/desktop/main.js` замени `YOUR-APP-NAME.up.railway.app` на свой домен
   (или задай переменную `APP_URL` при сборке).
2. Собери установщик (на Windows):
   ```bash
   npm install
   npm run dist:win
   ```
   Готовый `SecureMessenger-Setup-*.exe` появится в `packages/desktop/release/`.

---

## Локальный запуск (по желанию, нужен Docker)
```bash
npm install
npm run infra:up        # Postgres + Redis в Docker
cp packages/backend/.env.example packages/backend/.env   # заполни значения
npm run dev:backend     # :3001
npm run dev:frontend    # :5173
```

## Безопасность
- Смени все секреты (`JWT_SECRET`, OAuth) на новые случайные.
- Если раньше где-то светились пароли БД/Redis — **обнови их**.
