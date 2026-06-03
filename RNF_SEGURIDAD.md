# RNF de seguridad — SecondHandClothes

## 1) Objeto de estudio

El objeto de estudio es la aplicación **SecondHandClothes**, un marketplace de ropa de segunda mano construido con **React + Vite** en el frontend y **Express + TypeScript** en el backend.

El sistema permite:

- iniciar sesión y registrarse,
- publicar prendas,
- comentar y dar like,
- abrir chats entre usuarios.

## 1.1) Estado actual de seguridad

El flujo de autenticación ya no usa login heredado en el backend. La autenticación operativa es:

- Firebase Auth en el frontend.
- Firebase Admin en el backend para validar el ID token.
- Cloudflare Turnstile en login y registro.
- Rechazo explícito si el Bearer de Firebase es inválido o inexistente.
- Sanitización/allowlist server-side para texto, emails, URLs y slugs.
- Política de contraseña fuerte en registro.

## 2) RNF de seguridad propuestos

### RNF-S1. Autenticación externa
El sistema debe usar un proveedor OAuth externo, en este caso **Firebase Auth**, para autenticar usuarios.

### RNF-S2. Verificación anti-bot
El sistema debe incluir **Cloudflare Turnstile** en los formularios de login y registro para reducir bots y abuso automatizado.

### RNF-S3. Validación del captcha en servidor
El token de Turnstile debe verificarse en el backend antes de aceptar login o registro.

### RNF-S4. Verificación de identidad en backend
El backend debe validar el **ID token** de Firebase antes de ejecutar acciones sensibles.

### RNF-S5. Control de abuso
El sistema debe aplicar **rate limiting** en endpoints públicos y críticos para mitigar fuerza bruta y DoS ligero.

### RNF-S6. Protección de secretos
Las claves privadas deben mantenerse fuera del repositorio y cargarse como variables de entorno o secretos del host.

### RNF-S7. Trazabilidad mínima
Los errores de autenticación y captcha deben quedar visibles en consola o respuesta controlada, sin exponer secretos.

### RNF-S8. Sanitización de entradas
El sistema debe limpiar y normalizar entradas de usuario antes de persistirlas o reutilizarlas, especialmente campos de texto, URLs, emails y slugs, para reducir riesgo de Injection y XSS reflejado o almacenado.

### RNF-S9. Política de contraseña fuerte
El registro debe exigir contraseñas de al menos 12 caracteres con mayúsculas, minúsculas, números y caracteres especiales.

## 3) Casos de prueba de seguridad

| ID | Caso | Entrada | Resultado esperado |
|---|---|---|---|
| ST-01 | Login válido con Firebase | Usuario autenticado + token Firebase válido + Turnstile válido | Acceso permitido |
| ST-02 | Login sin captcha | Request sin `turnstileToken` | Rechazo con error de captcha |
| ST-03 | Captcha inválido | Token Turnstile falso o expirado | Rechazo con error de verificación |
| ST-04 | Token Firebase falso | `Authorization: Bearer` inválido | El backend no debe confiar en el token |
| ST-05 | Exceso de intentos | Muchas solicitudes a login/register | Bloqueo temporal por rate limit |
| ST-06 | Variables secretas ausentes | Backend sin `TURNSTILE_SECRET_KEY` o sin credenciales | El sistema debe fallar de forma controlada |
| ST-07 | Acceso a rutas protegidas | Petición a acciones sensibles sin identidad válida | Rechazo con `401` |
| ST-08 | Texto con payload XSS | Descripción, comentario o bio con HTML/JS | El backend guarda el texto saneado y no ejecuta scripts |
| ST-09 | Contraseña débil | Contraseña de menos de 12 caracteres o sin complejidad mínima | El registro se rechaza antes de crear la cuenta |

## 4) Implementación de los RNF

En este proyecto, los RNF ya están implementados de esta forma:

- **Firebase Auth** en el cliente para login y registro.
- **Firebase Admin** en el backend para verificar el ID token.
- **Cloudflare Turnstile** en el formulario y validación server-side.
- **Rate limiting** para `/api/register` y `/api/security/turnstile/verify`.
- **Login Firebase-only**: `/api/login` rechaza el flujo heredado y exige Bearer válido.
- **Sanitización server-side** de campos de usuario antes de persistir datos.
- **Contraseña fuerte** obligatoria en registro.
- **Variables de entorno** para secretos y configuración pública.

Archivos relevantes:

- `server.ts`
- `src/App.tsx`
- `src/components/LoginModal.tsx`
- `src/lib/firebase.ts`
- `src/lib/auth.ts`
- `.env.local.example`
- `DEPLOY.md`

## 5) Ejecución de pruebas de seguridad

Pruebas que se pueden ejecutar manualmente:

1. Abrir la app.
2. Intentar login con Turnstile válido.
3. Intentar login sin Bearer de Firebase en el backend.
4. Intentar login con token Firebase inválido.
5. Intentar registro con contraseña débil.
6. Intentar guardar comentario, bio o descripción con payload HTML/JS.
7. Repetir solicitudes hasta disparar rate limit.
8. Revisar que el backend no acepte acciones sensibles sin identidad válida.

Pruebas automatizadas recomendadas:

- `npm run lint`
- `npm run build`
- `npm test -- tests/backend/rnf_seguridad.test.ts`
- peticiones con `curl` o `Invoke-WebRequest` a `/api/currentUser`, `/api/login` y `/api/register`

## 6) Laboratorio de hacking ético

El laboratorio debe hacerse **solo en local o en un entorno controlado**.

### Sistema operativo

- Revisar procesos activos.
- Verificar puertos expuestos.
- Confirmar que secretos no están en el repositorio.

### Red

- Probar acceso a `localhost` y a la IP local.
- Validar que no haya puertos innecesarios abiertos.
- Simular abuso con múltiples requests para comprobar el rate limit.

### Base de datos

Este proyecto no usa una base de datos real; mantiene datos en memoria en el backend.
Por eso, el laboratorio de base de datos se enfoca en:

- validar que no se expongan datos sensibles,
- revisar el control de acceso a endpoints,
- comprobar que solo usuarios autenticados puedan ejecutar acciones críticas.

## 7) Conclusión

El sistema propuesto cumple el objetivo del trabajo porque integra dos controles de seguridad principales:

- **Captcha** para reducir automatización maliciosa,
- **OAuth externo** con Firebase para autenticación segura.

Además, se complementa con validación backend, sanitización de entradas, rate limiting y manejo de secretos, lo que permite definir casos de prueba y realizar un laboratorio ético sobre la superficie de ataque del sistema.