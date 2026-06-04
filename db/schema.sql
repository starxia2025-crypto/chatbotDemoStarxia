CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS visitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id TEXT NOT NULL UNIQUE,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  origin TEXT,
  user_agent TEXT,
  ip_hash TEXT
);

CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id UUID NOT NULL REFERENCES visitors(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active',
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  summary TEXT,
  intent TEXT
);

CREATE INDEX IF NOT EXISTS idx_conversations_visitor_id ON conversations(visitor_id);
CREATE INDEX IF NOT EXISTS idx_conversations_started_at ON conversations(started_at DESC);

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('system', 'user', 'assistant')),
  content TEXT NOT NULL,
  model TEXT,
  tokens_in INTEGER,
  tokens_out INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id, created_at);

CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  business_name TEXT,
  business_type TEXT,
  location TEXT,
  service_interest TEXT,
  has_website BOOLEAN,
  problem_to_solve TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  preferred_contact_time TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leads_conversation_id ON leads(conversation_id);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);

CREATE TABLE IF NOT EXISTS lead_capture_states (
  conversation_id UUID PRIMARY KEY REFERENCES conversations(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active',
  current_field_key TEXT NOT NULL,
  draft_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_lead_capture_states_status ON lead_capture_states(status, updated_at DESC);

CREATE TABLE IF NOT EXISTS chat_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id UUID REFERENCES visitors(id) ON DELETE SET NULL,
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_events_visitor_id ON chat_events(visitor_id);
CREATE INDEX IF NOT EXISTS idx_chat_events_type ON chat_events(event_type, created_at DESC);

CREATE OR REPLACE VIEW metabase_chat_overview AS
SELECT
  c.id AS conversation_id,
  v.visitor_id,
  c.status,
  c.intent,
  c.started_at,
  c.ended_at,
  COUNT(m.id) FILTER (WHERE m.role = 'user') AS user_messages,
  COUNT(m.id) FILTER (WHERE m.role = 'assistant') AS assistant_messages,
  MAX(l.created_at) AS latest_lead_at
FROM conversations c
JOIN visitors v ON v.id = c.visitor_id
LEFT JOIN messages m ON m.conversation_id = c.id
LEFT JOIN leads l ON l.conversation_id = c.id
GROUP BY c.id, v.visitor_id, c.status, c.intent, c.started_at, c.ended_at;

CREATE OR REPLACE VIEW metabase_lead_summary AS
SELECT
  l.id AS lead_id,
  l.created_at,
  l.name,
  l.business_name,
  l.business_type,
  l.location,
  l.service_interest,
  l.has_website,
  l.contact_email,
  l.contact_phone,
  c.intent,
  v.visitor_id
FROM leads l
LEFT JOIN conversations c ON c.id = l.conversation_id
LEFT JOIN visitors v ON v.id = c.visitor_id;
