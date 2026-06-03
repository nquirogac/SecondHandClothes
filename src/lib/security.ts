const HTML_ESCAPE_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
  "/": "&#47;",
};

export function stripControlCharacters(value: string): string {
  return value.replace(/[\u0000-\u001F\u007F-\u009F]/g, "").replace(/[\u200B-\u200D\uFEFF]/g, "");
}

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"'/]/g, (character) => HTML_ESCAPE_MAP[character] ?? character);
}

export function sanitizeTextInput(
  value: unknown,
  options: { maxLength: number; allowNewLines?: boolean }
): string {
  if (typeof value !== "string") {
    return "";
  }

  const stripped = stripControlCharacters(value).trim();
  const normalised = options.allowNewLines ? stripped : stripped.replace(/\s+/g, " ");
  return escapeHtml(normalised).slice(0, options.maxLength);
}

export function sanitizeSlug(value: unknown, maxLength = 40): string {
  if (typeof value !== "string") {
    return "";
  }

  return stripControlCharacters(value)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_-]/g, "")
    .slice(0, maxLength);
}

export function sanitizeEmail(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }

  return stripControlCharacters(value).trim().toLowerCase().slice(0, 254);
}

export function sanitizeImageUrl(value: unknown, fallback: string): string {
  if (typeof value !== "string") {
    return fallback;
  }

  const candidate = stripControlCharacters(value).trim();

  try {
    const parsed = new URL(candidate);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return parsed.toString();
    }
  } catch {
    return fallback;
  }

  return fallback;
}

export function sanitizeStylePreferences(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => sanitizeTextInput(entry, { maxLength: 30 }))
    .filter(Boolean)
    .slice(0, 8);
}

export function validateStrongPassword(value: unknown): { valid: boolean; message?: string } {
  if (typeof value !== "string") {
    return { valid: false, message: "La contraseña es obligatoria." };
  }

  const password = value.trim();

  if (password.length < 12) {
    return { valid: false, message: "La contraseña debe tener al menos 12 caracteres." };
  }

  if (!/[a-z]/.test(password)) {
    return { valid: false, message: "La contraseña debe incluir una letra minúscula." };
  }

  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: "La contraseña debe incluir una letra mayúscula." };
  }

  if (!/\d/.test(password)) {
    return { valid: false, message: "La contraseña debe incluir un número." };
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    return { valid: false, message: "La contraseña debe incluir un carácter especial." };
  }

  return { valid: true };
}
