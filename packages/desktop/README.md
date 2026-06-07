# Desktop (Electron wrapper)

Wraps the React frontend into a native desktop app and builds a Windows `.exe`.

## Dev
```bash
# terminal 1: backend infra + server
npm run infra:up
npm run dev:backend
# terminal 2: frontend
npm run dev:frontend
# terminal 3: electron shell pointing at http://localhost:5173
npm run dev:desktop
```

## Build the .exe (run on Windows or with wine)
```bash
# 1) build shared + frontend, then copy the static build into desktop/renderer
npm run build
cp -r packages/frontend/dist packages/desktop/renderer
# 2) produce the installer (release/SecureMessenger-Setup-*.exe)
npm run dist:win
```

> electron-builder cross-compiles a Windows installer most reliably **on Windows**.
> On Linux/macOS you can target Windows via wine, but native Windows is recommended.
