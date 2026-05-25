# RNF 2: Contraseñas Seguras con Argon2

## Descripción

Este RNF implementa el almacenamiento seguro de contraseñas usando:
- **Hashing con Argon2**: Algoritmo recomendado por OWASP, resistente a ataques GPU/ASIC
- **Validación de fortaleza**: Requisitos mínimos (8 caracteres, mayúscula, número, símbolo)
- **NUNCA almacenar contraseñas planas**: Solo se guarda el hash

---

## Implementación

### 1. Servicio de contraseñas (`src/services/passwordService.ts`)

```ts
export function validatePasswordStrength(password: string): {
  isValid: boolean;
  errors: string[];
}

export async function hashPassword(password: string): Promise<string>

export async function verifyPassword(password: string, hash: string): Promise<boolean>
```

**Requisitos de fortaleza:**
- Mínimo 8 caracteres
- Al menos una mayúscula
- Al menos un número
- Al menos un símbolo especial (`!@#$%^&*...`)

### 2. Endpoint `POST /api/register`

```
POST /api/register
Content-Type: application/json

{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "SecurePass123!",
  "bio": "Optional bio",
  "stylePreference": ["Casual"]
}
```

**Validaciones:**
- username: 3-30 caracteres alfanuméricos + `_`, `-`, `.`
- email: Válido con `normalizeEmail()`
- password: Mínimo 8 caracteres + mayúscula + número + símbolo

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "message": "Usuario registrado exitosamente",
  "user": {
    "id": "u_1779642565927",
    "username": "john_doe",
    "email": "john@example.com",
    "avatar": "...",
    "bio": "Optional bio",
    "stylePreference": ["Casual"],
    "joinedDate": "2026-05-24T17:09:01.656Z",
    "rating": 5.0
  }
}
```

**Nota:** El `passwordHash` NUNCA se devuelve al cliente.

---

## Casos de Prueba

### Caso 1: Contraseña válida

**Payload:**
```json
{
  "username": "secure_user",
  "email": "secure@example.com",
  "password": "MyPassword123!",
  "bio": "Seguridad primero"
}
```

**Resultado esperado:** `200 OK` con usuario creado.

---

### Caso 2: Contraseña demasiado corta

**Payload:**
```json
{
  "username": "weak_user",
  "email": "weak@example.com",
  "password": "Short1!"
}
```

**Resultado esperado:**
```json
{
  "success": false,
  "error": "Contraseña débil",
  "passwordErrors": [
    "La contraseña debe tener al menos 8 caracteres."
  ]
}
```

**Status:** `400 Bad Request`

---

### Caso 3: Sin mayúsculas

**Payload:**
```json
{
  "username": "lowercase_user",
  "email": "lower@example.com",
  "password": "password123!"
}
```

**Resultado esperado:**
```json
{
  "success": false,
  "error": "Contraseña débil",
  "passwordErrors": [
    "La contraseña debe contener al menos una mayúscula."
  ]
}
```

**Status:** `400 Bad Request`

---

### Caso 4: Sin números

**Payload:**
```json
{
  "username": "nonumber_user",
  "email": "nonumber@example.com",
  "password": "PasswordWithout!"
}
```

**Resultado esperado:**
```json
{
  "success": false,
  "error": "Contraseña débil",
  "passwordErrors": [
    "La contraseña debe contener al menos un número."
  ]
}
```

**Status:** `400 Bad Request`

---

### Caso 5: Sin símbolos especiales

**Payload:**
```json
{
  "username": "nosymbol_user",
  "email": "nosymbol@example.com",
  "password": "Password123"
}
```

**Resultado esperado:**
```json
{
  "success": false,
  "error": "Contraseña débil",
  "passwordErrors": [
    "La contraseña debe contener al menos un símbolo especial (!@#$%^&*...)."
  ]
}
```

**Status:** `400 Bad Request`

---

### Caso 6: Email inválido

**Payload:**
```json
{
  "username": "bademail_user",
  "email": "not-an-email",
  "password": "ValidPassword123!"
}
```

**Resultado esperado:**
```json
{
  "success": false,
  "errors": [
    {
      "type": "field",
      "value": "not-an-email",
      "msg": "Invalid value",
      "path": "email",
      "location": "body"
    }
  ]
}
```

**Status:** `400 Bad Request`

---

### Caso 7: Usuario duplicado

**Primer request:**
```json
{
  "username": "duplicate_user",
  "email": "dup@example.com",
  "password": "SecurePass123!"
}
```

**Respuesta:** `200 OK` - Usuario creado

**Segundo request (mismo email o username):**
```json
{
  "username": "duplicate_user",
  "email": "dup@example.com",
  "password": "NewPassword456!"
}
```

**Resultado esperado:**
```json
{
  "success": false,
  "error": "El usuario o email ya está registrado"
}
```

**Status:** `400 Bad Request`

---

## Cómo probar en Postman

### 1. Crear una Nueva Request

- **Método:** POST
- **URL:** `http://localhost:3000/api/register`

### 2. Headers

- `Content-Type: application/json`

### 3. Body (tab "raw", JSON)

```json
{
  "username": "secure_user_123",
  "email": "secure123@example.com",
  "password": "MySecurePass123!",
  "bio": "Marketplace enthusiast",
  "stylePreference": ["Vintage", "Casual"]
}
```

### 4. Click "Send"

Observa:
- **Status:** 200 si es válido
- **Body:** JSON con el usuario creado (sin `passwordHash`)

---

## Cómo probar con curl

### Caso exitoso

```bash
curl -X POST http://localhost:3000/api/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "secure_user",
    "email": "secure@example.com",
    "password": "MyPassword123!"
  }'
```

### Contraseña débil

```bash
curl -X POST http://localhost:3000/api/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "weak_user",
    "email": "weak@example.com",
    "password": "weak"
  }'
```

### Sin mayúscula

```bash
curl -X POST http://localhost:3000/api/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "lowercase",
    "email": "lower@example.com",
    "password": "password123!"
  }'
```

---

## Seguridad en profundidad

### ¿Por qué Argon2?

- **Resistente a GPU/ASIC attacks:** A diferencia de bcrypt o PBKDF2, Argon2 consume mucha memoria.
- **Recomendado por OWASP:** Es el estándar actual de la industria.
- **Configurable:** `memoryCost`, `timeCost`, `parallelism` se pueden ajustar según recursos disponibles.

### Configuración actual

```ts
{
  type: argon2.argon2id, // Tipo más seguro
  memoryCost: 19456,      // 19 MiB de memoria
  timeCost: 2,            // 2 iteraciones
  parallelism: 1          // Procesamiento secuencial
}
```

### ¿Por qué no devolver el hash?

- El `passwordHash` nunca debe exponerse al cliente.
- Solo el servidor debe conocer el hash.
- La respuesta solo incluye datos públicos del usuario.

---

## Próximos pasos recomendados

1. **Endpoint de login con contraseña:** Reemplazar el login simple por uno que verifique `password` contra `passwordHash`.
2. **Rate limiting:** Añadir límite de intentos fallidos en login/registro.
3. **Reseteo de contraseña:** Implementar flujo seguro con token de reseteo temporal.
4. **JWT tokens:** Guardar sesión con tokens JWT firmados en lugar de usuario simple.

---

## Referencias

- [Argon2 - OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
- [npm argon2](https://www.npmjs.com/package/argon2)
- [Password validation best practices](https://owasp.org/www-community/controls/Password_strong_requirements)
