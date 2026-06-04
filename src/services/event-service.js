import { pool } from "../db/pool.js";

export async function logChatEvent({
  visitorDbId,
  conversationId = null,
  eventType,
  payload = {}
}) {
  const query = `
    INSERT INTO chat_events (visitor_id, conversation_id, event_type, payload_json)
    VALUES ($1, $2, $3, $4::jsonb)
  `;

  await pool.query(query, [
    visitorDbId,
    conversationId,
    eventType,
    JSON.stringify(payload)
  ]);
}
