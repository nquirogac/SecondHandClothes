import argon2 from "argon2";

/**
 * Valida que la contraseña cumple los requisitos de seguridad:
 * - Mínimo 8 caracteres
 * - Al menos una mayúscula
 * - Al menos un número
 * - Al menos un símbolo especial
 */
export function validatePasswordStrength(password: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push("La contraseña debe tener al menos 8 caracteres.");
  }

  if (!/[A-Z]/.test(password)) {
    errors.push("La contraseña debe contener al menos una mayúscula.");
  }

  if (!/[0-9]/.test(password)) {
    errors.push("La contraseña debe contener al menos un número.");
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push("La contraseña debe contener al menos un símbolo especial (!@#$%^&*...).");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Hashea una contraseña usando Argon2.
 * Argon2 es uno de los algoritmos más seguros recomendados por OWASP.
 */
export async function hashPassword(password: string): Promise<string> {
  try {
    const hash = await argon2.hash(password, {
      type: argon2.argon2id, // Resistente a ataques de GPU y ASIC
      memoryCost: 19456, // 19 MiB
      timeCost: 2, // número de iteraciones
      parallelism: 1, // paralelismo
    });
    return hash;
  } catch (err) {
    throw new Error(`Error al hashear la contraseña: ${err instanceof Error ? err.message : String(err)}`);
  }
}

/**
 * Verifica si una contraseña coincide con su hash.
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
}
