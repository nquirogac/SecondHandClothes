import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import multer from "multer";

const MAX_IMAGE_SIZE_BYTES = 2 * 1024 * 1024;
const UPLOAD_DIR = path.join(process.cwd(), "uploads");

const allowedImageTypes = {
  "image/jpeg": {
    extension: ".jpg",
    hasValidSignature: (buffer: Buffer) =>
      buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff,
  },
  "image/png": {
    extension: ".png",
    hasValidSignature: (buffer: Buffer) =>
      buffer.length >= 8 &&
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a,
  },
  "image/webp": {
    extension: ".webp",
    hasValidSignature: (buffer: Buffer) =>
      buffer.length >= 12 &&
      buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
      buffer.subarray(8, 12).toString("ascii") === "WEBP",
  },
} as const;

type AllowedImageMimeType = keyof typeof allowedImageTypes;

function isAllowedImageMimeType(mimetype: string): mimetype is AllowedImageMimeType {
  return Object.prototype.hasOwnProperty.call(allowedImageTypes, mimetype);
}

function assertValidImageFile(file: Express.Multer.File) {
  if (!isAllowedImageMimeType(file.mimetype)) {
    throw new Error("Only JPEG, PNG, and WEBP images are allowed.");
  }

  if (!allowedImageTypes[file.mimetype].hasValidSignature(file.buffer)) {
    throw new Error("The uploaded file content does not match a real image signature.");
  }
}

export const secureImageUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_IMAGE_SIZE_BYTES,
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    // Validacion temprana: no confiamos en el nombre del archivo, pero rechazamos MIME types peligrosos antes de usar memoria.
    if (!isAllowedImageMimeType(file.mimetype)) {
      cb(new Error("Only JPEG, PNG, and WEBP images are allowed."));
      return;
    }

    cb(null, true);
  },
});

export async function saveSecureUploadedImage(file: Express.Multer.File) {
  assertValidImageFile(file);
  await fs.mkdir(UPLOAD_DIR, { recursive: true });

  const typeConfig = allowedImageTypes[file.mimetype];
  const randomSalt = crypto.randomUUID();
  const safeName = crypto
    .createHash("sha256")
    .update(file.buffer)
    .update(randomSalt)
    .digest("hex")
    .slice(0, 32);
  const filename = `${safeName}${typeConfig.extension}`;
  const fullPath = path.join(UPLOAD_DIR, filename);

  // Nombre generado por hash: evita path traversal y no expone el nombre original que puede contener datos sensibles.
  await fs.writeFile(fullPath, file.buffer, { flag: "wx" });

  return `/uploads/${filename}`;
}
