 # Desarrollo local — SecondHandClothes

Esta guía describe cómo ejecutar y probar TODO el flujo en local: frontend (Vite), backend (Express), Firebase Auth y Cloudflare Turnstile. Incluye comandos concretos para PowerShell en Windows.

IMPORTANTE: nunca subas `service-account.json`, `TURNSTILE_SECRET_KEY` ni otras credenciales a git.

---

## Requisitos previos

- Node.js 16+ y npm
- Cuenta Firebase (Auth)
- Cuenta Cloudflare (para Turnstile) — opcional si solo pruebas local
- (Opcional) `cloudflared` si quieres exponer tu localhost públicamente

## Resumen del flujo que probaremos localmente

1. El usuario resuelve el widget Turnstile en el navegador (site key cliente).
2. El cliente envía el token al backend `/api/security/turnstile/verify`.
3. El backend valida el token con Cloudflare usando `TURNSTILE_SECRET_KEY`.
4. Si OK, el cliente procede a iniciar sesión con Firebase y obtiene un ID token.
5. El cliente envía el ID token en `Authorization: Bearer <idToken>` al backend para acciones autenticadas.

---

## 1) Clonar e instalar

```bash
git clone https://github.com/nquirogac/SecondHandClothes.git
cd SecondHandClothes
npm install
```

## 2) Crear proyecto Firebase y configurar Auth

1. En Firebase Console crea un proyecto (p. ej. `SecondHandClothes`).
2. Ve a `Build > Authentication` y habilita `Email/Password`. Activa `Google` si quieres botón Google.
3. En `Authentication > Authorized domains` añade `localhost` y `127.0.0.1`.
4. Crea una Web App en Firebase y copia la configuración (apiKey, authDomain, projectId, appId, etc.).
   - Estos valores van al archivo `.env` como `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_APP_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`.

## 3) Crear credenciales para backend (Service Account)

1. En Firebase Console → Project Settings → Service Accounts → Generate new private key.
2. Guarda el archivo descargado como `service-account.json` localmente (no lo subas a git).

Opciones para usar estas credenciales en local (PowerShell):

- Cargar en la sesión (temporal) y arrancar el servidor:

```powershell
$env:FIREBASE_SERVICE_ACCOUNT_JSON = Get-Content .\service-account.json -Raw
npm run dev
```

- Alternativa: exportar a `.env` (requiere escapar comillas). Para evitar errores simples, la forma más segura para pruebas inmediatas es usar la variable de entorno de sesión como arriba.

## 4) Configurar Cloudflare Turnstile (modo local)

1. En Cloudflare → Turnstile crea un sitio nuevo.
2. En *Allowed domains / Domains* añade `localhost` y `127.0.0.1`.
3. Copia el `Site key` y ponlo en `.env` como `VITE_TURNSTILE_SITE_KEY`.
4. Copia el `Secret key` y añádelo a la variable de entorno del servidor `TURNSTILE_SECRET_KEY` (nunca en cliente).

PowerShell ejemplo (temporal):

```powershell
$env:TURNSTILE_SECRET_KEY = "tu_secret_aqui"
$env:VITE_TURNSTILE_SITE_KEY = "tu_sitekey_aqui"
npm run dev
```

## 5) Preparar `.env` mínimo para desarrollo

Crea `.env` desde `.env.example` y rellena al menos:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_TURNSTILE_SITE_KEY`
- `TURNSTILE_SECRET_KEY` (opcional si vas a usar verificación server-side; puedes también exportarla en la sesión)
- `FIREBASE_SERVICE_ACCOUNT_JSON` **(opcional)** — preferible usar `$env:` en PowerShell

Ejemplo mínimo (`.env`):

```text
VITE_FIREBASE_API_KEY="ABCD..."
VITE_FIREBASE_AUTH_DOMAIN="your-app.firebaseapp.com"
VITE_FIREBASE_PROJECT_ID="your-app"
VITE_FIREBASE_APP_ID="1:...:web:..."
VITE_TURNSTILE_SITE_KEY="TU_SITE_KEY"
TURNSTILE_SECRET_KEY="TU_SECRET_KEY"
# FIREBASE_SERVICE_ACCOUNT_JSON can be set in session instead of in .env
```

## 6) Arrancar todo en local

1. Si usas PowerShell y prefieres no editar `.env` para `FIREBASE_SERVICE_ACCOUNT_JSON`:

```powershell
$env:FIREBASE_SERVICE_ACCOUNT_JSON = Get-Content .\service-account.json -Raw
$env:TURNSTILE_SECRET_KEY = "tu_secret_aqui"
$env:VITE_TURNSTILE_SITE_KEY = "tu_sitekey_aqui"
npm run dev
```

2. Alternativamente, si colocaste todo en `.env`, simplemente:

```bash
npm run dev
```

Notas:
- Frontend Vite: `http://localhost:5173` (puede variar)
- Backend Express: `http://localhost:3000`

## 7) Flujo de prueba (qué verificar)

1. Abre el modal de login en la app en `http://localhost:5173`.
2. Resuelve el widget Turnstile (debería cargarse si `VITE_TURNSTILE_SITE_KEY` está configurado).
3. En la pestaña Network del DevTools, observa la petición POST a `/api/security/turnstile/verify`.
   - Debe devolver `200` y `{ success: true }`.
4. Después, procede al login con Firebase (email/password o Google).
5. Observa que el cliente envía `Authorization: Bearer <idToken>` en peticiones autenticadas (por ejemplo `/api/currentUser`).
6. En el backend, la verificación de token debería resolverse y devolver el usuario activo.

## 8) Probar Cloudflare Tunnel (opcional, para simular edge)

Si quieres exponer `localhost` públicamente para probar la integración en un dominio público:

1. Instala `cloudflared` desde las instrucciones oficiales.
2. Ejecuta:

```bash
cloudflared tunnel --url http://localhost:3000
```

3. Obtendrás una URL pública `https://xxxx.trycloudflare.com`. Añádela a Firebase Authorized domains y a Turnstile domains si la usas.

## 9) Comprobaciones rápidas y comandos de ayuda

- Ver tipos (TypeScript): `npx tsc --noEmit`
- Build producción: `npm run build`
- Ejecutar bundle de servidor (archivo generado): `node dist/server.cjs`

## 10) Problemas comunes y soluciones

- Turnstile no carga: revisa `VITE_TURNSTILE_SITE_KEY` y que el script se cargue en la página; revisa la consola del navegador.
- `FIREBASE_SERVICE_ACCOUNT_JSON` no parsea: asegúrate de usar `Get-Content -Raw` o de que la variable contenga JSON válido.
- Firebase rechaza login desde localhost: añade `localhost` y `127.0.0.1` a `Authorized domains`.
- Errores CORS: si aparecen, revisa que las URLs y puertos sean correctos y que no estés bloqueando los endpoints.

---

Si quieres, puedo:

- convertir estos comandos en un `scripts/setup-local.ps1` ejecutable, o
- añadir al repositorio un ejemplo `.env.local.example` con placeholders más claros.

Fin del archivo.
