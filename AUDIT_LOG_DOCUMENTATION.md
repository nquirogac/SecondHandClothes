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
