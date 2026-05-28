import fs from "fs/promises";
import path from "path";

const auditLogPath = path.resolve(process.cwd(), "audit.log");

export async function appendAuditLog(
  action: string,
  details: Record<string, unknown> = {},
) {
  const entry = {
    timestamp: new Date().toISOString(),
    action,
    ...details,
  };

  await fs.appendFile(auditLogPath, JSON.stringify(entry) + "\n");
}
