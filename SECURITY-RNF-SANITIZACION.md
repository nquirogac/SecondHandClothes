# RNF de Seguridad: Sanitización de Entradas para SQL Injection y XSS

## 1. Riesgo breve

### ¿Qué es SQL Injection?
SQL Injection es un ataque en el que un atacante envía datos maliciosos que se mezclan con una consulta SQL. Si el backend construye consultas concatenando texto y valores sin parámetros, el atacante puede alterar la lógica de la consulta y ejecutar comandos no autorizados.

### ¿Qué es XSS?
Cross-Site Scripting (XSS) ocurre cuando contenido malicioso (por ejemplo `<script>`) se almacena o refleja desde el servidor y luego se ejecuta en el navegador de otro usuario. Esto puede robar tokens, secuestrar sesiones o modificar la interfaz de usuario.

### Cómo afectan a tu aplicación marketplace
- **SQL Injection** podría permitir a un atacante acceder a usuarios, cambiar precios, marcar productos como vendidos o robar información sensible.
- **XSS** podría permitir a un atacante inyectar scripts en comentarios, descripciones de publicaciones o chat, comprometiendo la sesión de otro usuario o mostrando contenido malicioso.

---

## 2. Implementación completa paso a paso

### 2.1 Validación de entradas
- Usa `express-validator` en backend.
- Verifica tipos, formatos y longitud.
- No confíes en el frontend.

### 2.2 Sanitización de inputs
- Usa `sanitize-html` para eliminar tags y atributos peligrosos.
- Usa `validator.escape` para escapar caracteres especiales.
- Sanitiza antes de almacenar en la base de datos.

### 2.3 Escape de HTML
- Escapa cualquier texto que luego se renderice en el cliente.
- En HTML, usa siempre `textContent` o plantillas seguras.

### 2.4 Queries parametrizadas / prepared statements
- Usa `pg` con consultas parametrizadas.
- Nunca construyas SQL con concatenación de strings.
- Ejemplo: `pool.query('SELECT * FROM users WHERE username = $1', [username])`.

### 2.5 Validación de longitud y tipos
- `username`: 3-30 caracteres alfanuméricos y `_-.`
- `email`: email válido con `normalizeEmail()`.
- `title`: 3-150 caracteres.
- `description`: máximo 2000 caracteres.
- `price`: número mayor que 0.
- `text` de chat/comentario: 1-1000 caracteres.

### 2.6 Prevención de scripts en publicaciones y chat
- En endpoints como `POST /api/items` y `POST /api/chats`, sanitiza y escapa el contenido.
- No permitas scripts o eventos inline (`onmouseover`, `onclick`, `style`, etc.).

---

## 3. Código completo listo para usar

### Archivos clave añadidos
- `src/middleware/inputValidation.ts`
- `src/middleware/sanitizer.ts`
- `src/services/db.ts`
- `scripts/security-tests.js`

### `src/middleware/inputValidation.ts`

```ts
import { body, param, validationResult } from "express-validator";
import { Request, Response, NextFunction } from "express";

function handleValidationResult(req: Request, res: Response, next: NextFunction) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  next();
}

export const validateLogin = [
  body("userId").optional().isString().trim().isLength({ min: 1, max: 64 }),
  body("username")
    .optional()
    .isString()
    .trim()
    .isLength({ min: 3, max: 30 })
    .matches(/^[a-zA-Z0-9_\-\.]+$/),
  body("email").optional().isEmail().normalizeEmail(),
  handleValidationResult,
];

export const validateRegister = [
  body("username")
    .isString()
    .trim()
    .isLength({ min: 3, max: 30 })
    .matches(/^[a-zA-Z0-9_\-\.]+$/),
  body("email").isEmail().normalizeEmail(),
  body("bio").optional().isString().isLength({ max: 1000 }),
  handleValidationResult,
];

export const validateCreateItem = [
  body("title").isString().trim().isLength({ min: 3, max: 150 }),
  body("description").optional().isString().isLength({ max: 2000 }),
  body("category").isString().trim().isLength({ min: 1, max: 50 }),
  body("size").isString().trim().isLength({ min: 1, max: 10 }),
  body("condition").isString().trim().isLength({ min: 1, max: 40 }),
  body("price").isFloat({ gt: 0 }),
  handleValidationResult,
];

export const validateComment = [
  param("id").isString().trim().isLength({ min: 1 }),
  body("text").isString().trim().isLength({ min: 1, max: 1000 }),
  handleValidationResult,
];

export const validateChat = [
  body("itemId").isString().trim().isLength({ min: 1, max: 64 }),
  body("receiverId").isString().trim().isLength({ min: 1, max: 64 }),
  body("text").isString().trim().isLength({ min: 1, max: 1000 }),
  handleValidationResult,
];
```

### `src/middleware/sanitizer.ts`

```ts
import sanitizeHtml from "sanitize-html";
import validator from "validator";
import { Request, Response, NextFunction } from "express";

const defaultOptions = {
  allowedTags: [] as string[],
  allowedAttributes: {} as Record<string, string[]>,
};

function sanitizeValue(value: unknown, allowedTags: string[]): unknown {
  if (typeof value === "string") {
    const cleaned = sanitizeHtml(value, {
      allowedTags,
      allowedAttributes: defaultOptions.allowedAttributes,
      allowedSchemes: ["http", "https", "mailto", "data"],
    });
    return validator.escape(cleaned);
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item, allowedTags));
  }

  if (value && typeof value === "object") {
    const output: Record<string, unknown> = {};
    for (const [key, rawValue] of Object.entries(value as Record<string, unknown>)) {
      output[key] = sanitizeValue(rawValue, allowedTags);
    }
    return output;
  }

  return value;
}

export function sanitizeBody(opts: { allowRichText?: boolean } = {}) {
  const allowedTags = opts.allowRichText
    ? ["b", "i", "em", "strong", "p", "ul", "ol", "li", "br"]
    : [];

  return (req: Request, _res: Response, next: NextFunction) => {
    req.body = sanitizeValue(req.body, allowedTags);
    next();
  };
}
```

### `src/services/db.ts`

```ts
import { Pool } from "pg";

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://user:pass@localhost:5432/marketplace",
});

export async function insertComment(
  itemId: string,
  userId: string,
  username: string,
  text: string,
) {
  const query = `
    INSERT INTO comments (id, item_id, user_id, username, text, created_at)
    VALUES ($1, $2, $3, $4, $5, NOW())
    RETURNING *;
  `;
  const id = "com_" + Date.now();
  const result = await pool.query(query, [id, itemId, userId, username, text]);
  return result.rows[0];
}
```

### Ejemplo de endpoint seguro en `server.ts`

```ts
app.post("/api/items", validateCreateItem, sanitizeBody({ allowRichText: true }), (req, res) => {
  const { title, description, imageUrl, category, size, brand, condition, price } = req.body;
  const newItem: ClothingItem = {
    id: "c_" + Date.now(),
    sellerId: currentUser.id,
    sellerName: currentUser.username,
    sellerAvatar: currentUser.avatar,
    title,
    description: description || "Gorgeous pre-loved fashion piece.",
    imageUrl: imageUrl || "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&q=80&w=800",
    category,
    size,
    brand: brand || "Unbranded / Vintage",
    condition,
    price: Number(price),
    likesCount: 0,
    likedByUserIds: [],
    comments: [],
    status: "available",
    createdAt: new Date().toISOString(),
  };

  clothingItems.unshift(newItem);
  res.json({ success: true, item: newItem });
});
```

---

## 4. Librerías recomendadas

- `express-validator`
- `validator`
- `sanitize-html`
- `helmet`
- `pg`

Instalación recomendada:

```bash
npm install express-validator validator sanitize-html helmet pg
```

---

## 5. Casos de prueba de seguridad

### 5.1 SQL Injection

#### Entrada maliciosa
```json
{ "username": "' OR 1=1 --" }
```

#### Endpoint vulnerable si se concatena SQL
```sql
SELECT * FROM users WHERE username = '' OR 1=1 --'
```

#### Comportamiento vulnerable
- Devuelve un usuario incorrecto
- Bypass de autenticación

#### Comportamiento corregido
- `express-validator` rechaza el valor
- o `pg` lo trata como valor literal en `WHERE username = $1`

#### Respuesta HTTP esperada
- `400 Bad Request`
- `{