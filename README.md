# Secure Messenger

Десктопный мессенджер с **сквозным шифрованием (E2E)**. Сервер видит только шифртекст и никогда не получает приватные ключи.

## Стек
- **Backend:** NestJS (TypeScript) + Socket.IO + Redis-adapter (горизонтальное масштабирование)
- **БД:** PostgreSQL (пользователи, чаты, сообщения, prekeys) + Redis (presence, typing, кэш)
- **Аутентификация:** OAuth (Google / GitHub) → JWT
- **Frontend:** React 19 + Vite + TailwindCSS + Zustand + TanStack Query
- **Desktop:** Electron + electron-builder (Windows `.exe`)
- **E2E:** libsodium (X25519 + AEAD), раздача ключей в стиле X3DH
- **Чаты:** direct / group / channel

## Структура
```
secure-messenger/
├─ docker-compose.yml          # Postgres + Redis
├─ packages/
│  ├─ shared/                  # общие типы + E2E-крипто (libsodium)
│  ├─ backend/                 # NestJS API + WebSocket gateway
│  │  └─ src/
│  │     ├─ auth/  users/  chats/  messages/  crypto/  realtime/  presence/
│  │     └─ database/schema.sql
│  ├─ frontend/                # React-клиент (шифрует/расшифровывает на устройстве)
│  └─ desktop/                 # Electron-обёртка → .exe
```

## Быстрый старт
```bash
npm install                 # установить все workspaces
cp packages/backend/.env.example packages/backend/.env   # вписать OAuth-ключи
npm run infra:up            # поднять Postgres + Redis (schema.sql загрузится автоматически)
npm run dev:backend         # http://localhost:3001
npm run dev:frontend        # http://localhost:5173
npm run dev:desktop         # окно Electron
```

## Сборка .exe
```bash
npm run build
cp -r packages/frontend/dist packages/desktop/renderer
npm --workspace @msg/desktop run dist:win   # лучше всего на Windows
# → packages/desktop/release/SecureMessenger-Setup-*.exe
```

## Как работает E2E (кратко)
1. При первом входе клиент генерирует identity-ключевую пару; на сервер уходит только публичный ключ + пачка one-time prekeys.
2. Чтобы написать собеседнику, клиент запрашивает его key bundle и выводит общий секрет.
3. Сообщение шифруется на устройстве; сервер лишь роутит шифртекст и хранит его в `messages.content`.
4. Получатель расшифровывает локально своим приватным ключом.

## Безопасность
- JWT проверяется на WebSocket handshake — анонимные сокеты разрываются.
- Идемпотентность: `UNIQUE (chat_id, sender_id, client_msg_id)`.
- Electron: `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, CSP в `index.html`.
- Приватный ключ никогда не покидает клиент.

> Репо — production-ready скелет с рабочей логикой. Перед боем добавьте Double Ratchet для forward secrecy, ротацию refresh-токенов и rate limiting.
