# Despliegue paso a paso — SecondHandClothes

Este documento describe cómo desplegar la aplicación (frontend + backend) y cómo integrar Cloudflare (Turnstile, WAF, TLS). Incluye opciones rápidas para entornos Windows (PowerShell).

## Resumen rápido
- Local: puedes probar TODO (Firebase Auth + Turnstile + backend) en `localhost` si añades `localhost`/`127.0.0.1` en Firebase y Turnstile, y configuras las variables de entorno.
- Producción: despliega frontend y backend en hosts públicos y apunta tu dominio a Cloudflare para protección en el edge.

---

## Requisitos
- Node.js (16+)
- Cuenta Firebase (Auth + Service Account)
- Cuenta Cloudflare (Turnstile + DNS)
- Git, CLI del host elegido (opcional)

## Preparar el repositorio
1. Clona y entra en el proyecto:

```bash
git clone https://github.com/nquirogac/SecondHandClothes.git
cd SecondHandClothes
npm install
```

2. Crea un `.env` desde `.env.example` y rellena las variables necesarias:

- Variables `VITE_*` para el frontend (Firebase web config)
- `FIREBASE_SERVICE_ACCOUNT_JSON` (contenido JSON del service account)
- `TURNSTILE_SECRET_KEY` (server) y `VITE_TURNSTILE_SITE_KEY` (cliente)

Puedes editar `.env` con tu editor o cargar variables en PowerShell (temporal):

```powershell
# $env:FIREBASE_SERVICE_ACCOUNT_JSON = Get-Content .\service-account.json -Raw
# npm run dev
```

---

## Build local (prueba rápida)

```bash
npm run build
npm run dev     # para desarrollo (Vite) si quieres probar sin build
```

Front-end por defecto en `http://localhost:5173` y backend Express en `http://localhost:3000`.

---

## Despliegue: opciones recomendadas

El despliegue se divide en dos partes: frontend (sitio estático) y backend (Express). A continuación opciones recomendadas y comandos básicos.

### Opción A — Frontend en Vercel / Netlify, backend en Cloud Run

- Frontend (Vercel): conectar el repo en Vercel y dejar que haga build (`npm run build`). Mejor para desplegar rápido desde GitHub.
- Backend (Cloud Run): empaqueta en un contenedor o sube el `dist/server.cjs` y configura `ENTRYPOINT` para ejecutar Node. Añade variables de entorno secretas:
  - `TURNSTILE_SECRET_KEY`
  - `FIREBASE_SERVICE_ACCOUNT_JSON` (o monta secret manager)

Pasos (Cloud Run, resumen):

1. Build Docker y push a Container Registry (GCP):

```bash
# En local (ejemplo)
docker build -t gcr.io/PROJECT_ID/secondhand-backend:latest .
docker push gcr.io/PROJECT_ID/secondhand-backend:latest

# Deploy
gcloud run deploy secondhand-backend --image gcr.io/PROJECT_ID/secondhand-backend:latest --platform managed --region YOUR_REGION --allow-unauthenticated --set-env-vars TURNSTILE_SECRET_KEY="<secret>",FIREBASE_SERVICE_ACCOUNT_JSON="<json>"
```

2. Configura el dominio y Cloudflare (ver más abajo).

### Opción B — Frontend en Firebase Hosting, backend en Cloud Run

- Build frontend y `firebase deploy --only hosting`.
- Backend en Cloud Run como en Opción A.

### Opción C — Frontend + Backend en Render / Heroku / Fly

- Subir frontend como sitio estático o como servicio que sirva `dist`.
- Backend como servicio Node; añade variables de entorno desde la UI del proveedor.

---

## Cloudflare: pasos mínimos para producción

1. Añadir tu dominio a Cloudflare.
2. DNS: crea un registro A/CNAME hacia tu host y activa el proxy (orange cloud) si usas Cloudflare como WAF.
3. Ajusta SSL/TLS a `Full (strict)` y configura certificado en el origen (Cloud Run o servidor con TLS).
4. Turnstile:
   - Crea un sitio Turnstile en el panel de Cloudflare.
   - Copia `site key` → ponlo en `VITE_TURNSTILE_SITE_KEY` (frontend env).
   - Copia `secret key` → ponlo en `TURNSTILE_SECRET_KEY` en el backend (env en el host).
5. Opcional: activa reglas WAF y rate-limiting en Cloudflare (complementa los limitadores del servidor).

---

## Pruebas y verificación

1. En local, abre la consola del navegador y prueba el flujo de login. Verifica POST a `/api/security/turnstile/verify` y luego a las rutas de login.
2. En producción prueba con dominios reales y verifica que:
   - El widget Turnstile carga desde el dominio (no desde localhost)
   - El backend responde correctamente a la verificación Turnstile
   - Los tokens de Firebase se verifican (backend)

---

## Cloudflare Tunnel (probar Cloudflare sin desplegar)

Si quieres probar Cloudflare/Túnel sin desplegar, usa `cloudflared`:

```bash
# Instala cloudflared según tu OS: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation
cloudflared tunnel --url http://localhost:3000
# Te dará una URL pública tipo https://xxxx.trycloudflare.com
# Añade esa URL a Turnstile y Firebase Authorized domains para pruebas.
```

---

## Variables de entorno (recordatorio)

- Cliente (Vite): variables que empiezan con `VITE_` deben estar disponibles en el build o hosting (Vercel/Firebase).
- Servidor: `TURNSTILE_SECRET_KEY`, `FIREBASE_SERVICE_ACCOUNT_JSON` — deben configurarse en el panel de tu host como variables seguras.

---

## Buenas prácticas finales

- No subas `service-account.json` ni `TURNSTILE_SECRET_KEY` a git.
- Usa Secret Manager del proveedor para la `FIREBASE_SERVICE_ACCOUNT_JSON` en producción.
- Ajusta rate-limits en servidor y en Cloudflare.
- Habilita `Full (strict)` SSL y certificados de origen cuando uses Cloudflare.

---

## Siguientes pasos (opciones)

Si quieres, puedo:
- generar un `README.dev.md` con los comandos exactos para PowerShell, o
- añadir una sección con comandos `gcloud`/`firebase` detallados para desplegar a Cloud Run y Firebase Hosting.

Archivo generado: `DEPLOY.md`
