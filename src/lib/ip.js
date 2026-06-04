import crypto from "node:crypto";

export function hashIp(ip) {
  if (!ip) {
    return null;
  }

  return crypto.createHash("sha256").update(ip).digest("hex");
}
