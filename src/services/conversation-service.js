import { pool } from "../db/pool.js";
import { env } from "../config/env.js";

function inactivityCutoffDate() {
  const date = new Date();
  date.setMinutes(date.getMinutes() - env.chatInactivityMinutes);
  return date;
}

export async function getActiveConversation(visitorDbId) {
  const query = `
    SELECT *
    FROM conversations
    WHERE visitor_id = $1
      AND status = 'active'
      AND started_at >= $2
    ORDER BY started_at DESC
    LIMIT 1;
  `;

  const { rows } = await pool.query(query, [visitorDbId, inactivityCutoffDate()]);
  return rows[0] || null;
}

export async function createConversation(visitorDbId, intent = "general") {
  const query = `
    INSERT INTO conversations (visitor_id, intent)
    VALUES ($1, $2)
    RETURNING *;
  `;
  const { rows } = await pool.query(query, [visitorDbId, intent]);
  return rows[0];
}

export async function closeActiveConversations(visitorDbId) {
  await pool.query(
    `
      UPDATE conversations
      SET status = 'ended',
          ended_at = COALESCE(ended_at, NOW())
      WHERE visitor_id = $1
        AND status = 'active'
    `,
    [visitorDbId]
  );
}

export async function getOrCreateConversation(visitorDbId, intent = "general") {
  const existing = await getActiveConversation(visitorDbId);
  if (existing) {
    if (intent !== "general" && existing.intent !== intent) {
      await updateConversationIntent(existing.id, intent);
      existing.intent = intent;
    }
    return existing;
  }

  return createConversation(visitorDbId, intent);
}

export async function getConversationById(conversationId) {
  const { rows } = await pool.query("SELECT * FROM conversations WHERE id = $1 LIMIT 1", [conversationId]);
  return rows[0] || null;
}

export async function updateConversationIntent(conversationId, intent) {
  await pool.query(
    "UPDATE conversations SET intent = $2 WHERE id = $1",
    [conversationId, intent]
  );
}

export async function getConversationHistory(conversationId, limit = env.maxHistoryMessages) {
  const query = `
    SELECT id, role, content, model, created_at
    FROM messages
    WHERE conversation_id = $1
    ORDER BY created_at DESC
    LIMIT $2;
  `;
  const { rows } = await pool.query(query, [conversationId, limit]);
  return rows.reverse();
}

export async function appendMessage({
  conversationId,
  role,
  content,
  model = null,
  tokensIn = null,
  tokensOut = null
}) {
  const query = `
    INSERT INTO messages (conversation_id, role, content, model, tokens_in, tokens_out)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *;
  `;

  const { rows } = await pool.query(query, [
    conversationId,
    role,
    content,
    model,
    tokensIn,
    tokensOut
  ]);
  return rows[0];
}
