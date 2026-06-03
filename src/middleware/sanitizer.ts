import sanitizeHtml from "sanitize-html";
import validator from "validator";
import { Request, Response, NextFunction } from "express";

const defaultOptions = {
  allowedTags: [] as string[],
  allowedAttributes: {} as Record<string, string[]>,
};

function sanitizeValue(value: unknown, allowedTags: string[], preserveFields: Set<string>, fieldName?: string): unknown {
  if (typeof value === "string") {
    const cleaned = sanitizeHtml(value, {
      allowedTags,
      allowedAttributes: defaultOptions.allowedAttributes,
      allowedSchemes: ["http", "https", "mailto", "data"],
    });

    if (fieldName && preserveFields.has(fieldName)) {
      // Algunos campos, como imageUrl, ya tienen validacion estricta y no deben escapar "/" o "&" porque romperian la URL.
      return cleaned.trim();
    }

    return validator.escape(cleaned);
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item, allowedTags, preserveFields, fieldName));
  }

  if (value && typeof value === "object") {
    const output: Record<string, unknown> = {};
    for (const [key, rawValue] of Object.entries(value as Record<string, unknown>)) {
      output[key] = sanitizeValue(rawValue, allowedTags, preserveFields, key);
    }
    return output;
  }

  return value;
}

export function sanitizeBody(opts: { allowRichText?: boolean; preserveFields?: string[] } = {}) {
  const allowedTags = opts.allowRichText
    ? ["b", "i", "em", "strong", "p", "ul", "ol", "li", "br"]
    : [];
  const preserveFields = new Set(opts.preserveFields ?? []);

  return (req: Request, _res: Response, next: NextFunction) => {
    req.body = sanitizeValue(req.body, allowedTags, preserveFields);
    next();
  };
}
