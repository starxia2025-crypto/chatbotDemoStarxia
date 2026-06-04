import { pool } from "../db/pool.js";

export async function upsertVisitor({
  visitorId,
  origin,
  userAgent,
  ipHash
}) {
  const query = `
    INSERT INTO visitors (visitor_id, origin, user_agent, ip_hash)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (visitor_id)
    DO UPDATE SET
      last_seen_at = NOW(),
      origin = COALESCE(EXCLUDED.origin, visitors.origin),
      user_agent = COALESCE(EXCLUDED.user_agent, visitors.user_agent),
      ip_hash = COALESCE(EXCLUDED.ip_hash, visitors.ip_hash)
    RETURNING *;
  `;

  const { rows } = await pool.query(query, [visitorId, origin, userAgent, ipHash]);
  return rows[0];
}
