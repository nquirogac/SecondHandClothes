# Docker — Build, Run and Test

Este archivo resume cómo levantar la aplicación y ejecutar las pruebas usando Docker y Docker Compose.

Requisitos:

- Docker y Docker Compose instalados en el host.
- Opcional: un fichero `.env` si quieres activar Firebase/Turnstile con tus claves.

1) Construir y levantar los servicios

PowerShell / Linux / macOS:

```bash
docker compose up --build -d
```

Esto construye la imagen y levanta el servicio `app` en el puerto `3000`.

2) Verificar que la app responde

```bash
curl http://localhost:3000/api/currentUser
```

3) Ejecutar las pruebas dentro de Docker

La composición incluye un servicio `test` que ejecuta `npm test`. Para lanzar solo las pruebas:

```bash
docker compose run --rm test
```

Si quieres que las pruebas se ejecuten automáticamente en el `up`, puedes usar:

```bash
docker compose up --build
```

pero observa que `test` lanza `npm test` y terminará cuando acabe, mientras que `app` queda en ejecución.

4) Variables de entorno

- La app arranca sin `.env` para pruebas base.
- Si quieres autenticación real, crea un `.env` desde `.env.local.example` y rellena los valores necesarios.
- Para pruebas locales puedes omitir `FIREBASE_SERVICE_ACCOUNT_JSON` (usa fallback), pero para tests de integración reales necesitas proveerlo.

5) Parar y eliminar contenedores

```bash
docker compose down --volumes --remove-orphans
```

Notas:

- Si Docker no está instalado en tu máquina, sigue la guía oficial: https://docs.docker.com/get-docker/
- En Windows, ejecuta PowerShell como administrador si encuentras errores de permisos.
