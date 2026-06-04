import fs from "node:fs/promises";
import path from "node:path";
import { Pool } from "pg";
import { env } from "../config/env.js";

export const pool = new Pool({
  connectionString: env.databaseUrl
});

export async function initDatabase() {
  if (!env.dbAutoMigrate) {
    return;
  }

  const schemaPath = path.resolve(env.projectRoot, "db", "schema.sql");
  const schemaSql = await fs.readFile(schemaPath, "utf8");
  await pool.query(schemaSql);
}
