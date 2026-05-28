# Auditoría de Cambios y Dependencias

## Qué cambió

Se agregó un mecanismo simple de auditoría para registrar acciones importantes en el backend.

### Archivos modificados

- `src/services/auditLog.ts`
  - Nuevo servicio que escribe entradas de auditoría en `audit.log` como JSON líneas.
  - Cada entrada incluye:
    - `timestamp`
    - `action`
    - detalles relevantes del evento

- `server.ts`
  - Se importó `appendAuditLog` desde `src/services/auditLog.ts`.
  - Se añadieron llamados a auditoría en estos eventos:
    - `login.success`
    - `login.auto-created`
    - `login.failed`
    - `register.success`
    - `item.created`
    - `item.comment`
    - `item.purchased`
    - `chat.sent`

## Por qué

La auditoría permite conservar un registro de eventos críticos del sistema sin necesidad de un sistema complejo. Esto ayuda a:

- detectar intentos de acceso y registros
- revisar cambios en la creación de anuncios
- inspeccionar comentarios y compras
- trazar conversaciones de chat entre usuarios

## Cómo instalar las dependencias

### 1. Asegúrate de tener `package.json`

Todas las dependencias del proyecto deben estar listadas en `package.json`.
En este proyecto ya estaban incluidas las dependencias necesarias, por ejemplo:

- `express`
- `express-validator`
- `sanitize-html`
- `validator`
- `pg`
- `argon2`

### 2. Instala las dependencias

Ejecuta en la raíz del proyecto:

```bash
npm install
```

Esto descarga e instala las dependencias listadas en `package.json`.

### 3. Verifica la compilación

Después de instalar, verifica que TypeScript compile sin errores:

```bash
npm run lint
```

## Si necesitas agregar nuevas dependencias

Añade el paquete al `package.json` y usa uno de estos comandos:

- Dependencia normal:
  ```bash
  npm install nombre-del-paquete
  ```
- Dependencia de desarrollo (tipos, linting, tests):
  ```bash
  npm install --save-dev @types/nombre-del-paquete
  ```

## Nota final

El archivo `audit.log` se crea automáticamente en la raíz del proyecto cuando el servidor registra la primera entrada.

Si decides desplegar en producción, también puedes cambiar el servicio de auditoría para usar una base de datos o un almacenamiento centralizado en lugar de un archivo local.

## Protección contra fuerza bruta

Se añadió una capa básica de defensa en el endpoint de login para limitar intentos repetidos.

### Archivos modificados

- `src/services/bruteForceProtection.ts`
  - Nuevo servicio que gestiona intentos fallidos en memoria.
  - Limita a 5 intentos fallidos en una ventana de 15 minutos.
  - Bloquea el origen 15 minutos si se excede el límite.
  - Usa una clave basada en `username`, `email`, `userId` o la dirección IP.

- `server.ts`
  - Se importaron `getLoginKey`, `isLoginBlocked`, `recordLoginFailure` y `recordLoginSuccess`.
  - Antes de procesar un login, se comprueba si hay bloqueo activo.
  - Si el bloqueo está activo, el endpoint responde con `429 Too Many Requests`.
  - Si el login tiene éxito, se borra el conteo de fallos.
  - Si el login falla, se incrementa el contador de fallos y se actualiza el estado de bloqueo.

### Por qué

La protección contra fuerza bruta reduce el riesgo de que un atacante pruebe muchas combinaciones de credenciales rápidamente. Esta implementación es una defensa básica y útil para entornos de desarrollo o demostración.

### Qué registra la auditoría

Además de las entradas de inicio de sesión habituales, ahora también se registran:

- `login.rate-limited`
- `login.failed` con conteo de intentos y tiempo de reintento recomendado

Esto facilita revisar cuándo se activó el límite y qué usuarios o IPs lo generaron.

## Casos de prueba

### Objetivos de las pruebas

1. Verificar que se generan entradas de auditoría para login exitoso, login auto-creado y login fallido.
2. Verificar que la protección de fuerza bruta bloquea el acceso después de varios intentos fallidos.
3. Confirmar que el bloqueo devuelve `429 Too Many Requests` y un campo `retryAfter`.
4. Revisar que `audit.log` contiene los eventos `login.failed` y `login.rate-limited`.

### Casos de prueba diseñados

- Caso 1: login exitoso con usuario existente
  - Endpoint: `POST /api/login`
  - Payload: `{ username: "retro_lucia" }`
  - Resultado esperado: status `200`, `success: true`, entrada de auditoría `login.success`.

- Caso 2: login con usuario nuevo auto-creado
  - Endpoint: `POST /api/login`
  - Payload: `{ username: "audit_test_user", email: "audit_test_user@example.com" }`
  - Resultado esperado: status `200`, `success: true`, entrada de auditoría `login.auto-created`.

- Caso 3: intentos fallidos de login por email desconocido
  - Endpoint: `POST /api/login`
  - Payload: `{ email: "bruteforce_test@example.com" }`
  - Resultado esperado: status `400` para los primeros intentos fallidos.

- Caso 4: activación de la protección contra fuerza bruta
  - Repetir el caso 3 cinco veces con el mismo email.
  - Resultado esperado: los primeros 4 intentos devuelven `400`, el quinto devuelve `429` con `retryAfter` positivo.
  - Nota: el quinto intento activa el bloqueo y se registra como `login.failed` con `blocked: true`.

- Caso 5: verificación de auditoría posterior
  - Leer `audit.log` y buscar las entradas:
    - `login.success`
    - `login.auto-created`
    - al menos 5 `login.failed` (siendo el último con `blocked: true`)

## Cómo ejecutar las pruebas

### Ejecución manual

1. Arranca el servidor en la raíz del proyecto:

```bash
npm run dev
```

2. En otra terminal, ejecuta los siguientes comandos `curl`:

```bash
curl -X POST http://127.0.0.1:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"retro_lucia"}'

curl -X POST http://127.0.0.1:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"audit_test_user","email":"audit_test_user@example.com"}'

for i in {1..5}; do
  curl -X POST http://127.0.0.1:3000/api/login \
    -H "Content-Type: application/json" \
    -d '{"email":"bruteforce_test@example.com"}'
  echo "\n--- intento $i ---\n"
done
```

3. Revisa el contenido de `audit.log`:

```bash
tail -n 20 audit.log
```

### Ejecución automática

1. Arranca el servidor en la raíz del proyecto:

```bash
npm run dev
```

2. En otra terminal, ejecuta el script automático:

```bash
npm run test:audit
```

3. El script validará la respuesta de cada endpoint y también comprobará los eventos en `audit.log`.

### Resultado esperado

- `npm run test:audit` debe terminar sin errores.
- `audit.log` debe incluir líneas JSON separadas por saltos de línea.
- El script valida que exista `login.success`, `login.auto-created`, y al menos 5 `login.failed` (el último con `blocked: true`).
