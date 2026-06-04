import fs from "node:fs/promises";
import { env } from "../config/env.js";

let cachedContent = null;
let cachedAt = 0;

export async function loadRawKnowledge() {
  const now = Date.now();
  if (cachedContent && now - cachedAt < 60_000) {
    return cachedContent;
  }

  const markdown = await fs.readFile(env.rawContentPath, "utf8");
  cachedContent = markdown;
  cachedAt = now;
  return markdown;
}
