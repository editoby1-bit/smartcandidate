-- ============================================================
-- SmartCandidate — Master Database Migration
-- Run this in your Supabase SQL editor once to set up
-- the entire schema.
-- ============================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- for text search

-- ============================================================
-- CORE TABLES
-- ============================================================

-- Candidates (one row per political campaign/client)
CREATE TABLE candidates (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT NOT NULL,
  party         TEXT,
  position      TEXT NOT NULL, -- e.g. "Governor", "Senator", "House of Reps"
  state         TEXT NOT NULL,
  lga           TEXT,
  election_date DATE,
  election_type TEXT NOT NULL DEFAULT 'gubernatorial',
  logo_url      TEXT,
  color         TEXT DEFAULT '#C9A84C',
  active        BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Users (campaign staff)
CREATE TABLE users (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  candidate_id  UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  email         TEXT NOT NULL,
  full_name     TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'analyst'
                  CHECK (role IN ('admin', 'analyst', 'field_coordinator', 'social_manager')),
  active        BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- RECIPIENTS (the voter database)
-- ============================================================

CREATE TABLE recipients (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  candidate_id  UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  phone         TEXT NOT NULL,              -- normalised to +234XXXXXXXXXX
  name          TEXT,
  state         TEXT,
  lga           TEXT,
  ward          TEXT,
  community     TEXT,
  language      TEXT DEFAULT 'english'
                  CHECK (language IN ('english', 'yoruba', 'hausa', 'igbo', 'pidgin')),
  group_tag     TEXT,                       -- custom grouping e.g. "women", "youth", "traders"
  opted_out     BOOLEAN NOT NULL DEFAULT false,
  opted_out_at  TIMESTAMPTZ,
  opted_out_via TEXT,                       -- 'whatsapp_stop', 'sms_stop', 'voice_dtmf'
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (candidate_id, phone)
);

CREATE INDEX idx_recipients_candidate ON recipients(candidate_id);
CREATE INDEX idx_recipients_geo ON recipients(candidate_id, state, lga, ward);
CREATE INDEX idx_recipients_language ON recipients(candidate_id, language);
CREATE INDEX idx_recipients_group ON recipients(candidate_id, group_tag);
CREATE INDEX idx_recipients_opted_out ON recipients(candidate_id, opted_out);
CREATE INDEX idx_recipients_phone ON recipients(phone);

-- ============================================================
-- SENDERS (WhatsApp / SMS sender accounts)
-- ============================================================

CREATE TABLE senders (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  candidate_id  UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  label         TEXT NOT NULL,             -- "line_01", "wa_main", etc.
  channel       TEXT NOT NULL CHECK (channel IN ('whatsapp', 'sms', 'voice')),
  phone_number  TEXT,
  status        TEXT NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active', 'paused', 'banned', 'setup')),
  daily_limit   INTEGER NOT NULL DEFAULT 500,
  sent_today    INTEGER NOT NULL DEFAULT 0,
  reset_at      TIMESTAMPTZ,              -- when sent_today was last reset
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- MESSAGE TEMPLATES
-- ============================================================

CREATE TABLE templates (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  candidate_id  UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  channel       TEXT NOT NULL CHECK (channel IN ('whatsapp', 'sms', 'voice')),
  language      TEXT NOT NULL DEFAULT 'english',
  body          TEXT NOT NULL,            -- supports {name}, {lga}, {ward}, {candidate_name}
  media_url     TEXT,                     -- optional image/audio attachment
  at_template_id TEXT,                   -- Africa's Talking template approval ID
  approved      BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- CAMPAIGNS
-- ============================================================

CREATE TABLE campaigns (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  candidate_id    UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  channel         TEXT NOT NULL CHECK (channel IN ('whatsapp', 'sms', 'voice')),
  template_id     UUID REFERENCES templates(id),
  message_body    TEXT NOT NULL,           -- resolved template or custom message
  language        TEXT NOT NULL DEFAULT 'english',

  -- Targeting (denormalised for query speed)
  target_state    TEXT,
  target_lga      TEXT,
  target_ward     TEXT,
  target_language TEXT,
  target_group    TEXT,

  -- Status lifecycle: draft → scheduled → running → paused → completed | failed
  status          TEXT NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft','scheduled','running','paused','completed','failed')),

  -- Counts (updated by worker as it runs)
  total_targets   INTEGER NOT NULL DEFAULT 0,
  sent_count      INTEGER NOT NULL DEFAULT 0,
  delivered_count INTEGER NOT NULL DEFAULT 0,
  failed_count    INTEGER NOT NULL DEFAULT 0,
  response_count  INTEGER NOT NULL DEFAULT 0,
  optout_count    INTEGER NOT NULL DEFAULT 0,

  -- Scheduling
  scheduled_at    TIMESTAMPTZ,
  launched_at     TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  estimated_finish TIMESTAMPTZ,

  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_campaigns_candidate ON campaigns(candidate_id);
CREATE INDEX idx_campaigns_status ON campaigns(candidate_id, status);

-- ============================================================
-- SENDS (one row per recipient per campaign attempt)
-- ============================================================

CREATE TABLE sends (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id   UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  recipient_id  UUID NOT NULL REFERENCES recipients(id) ON DELETE CASCADE,
  sender_id     UUID REFERENCES senders(id),

  -- Denormalised geo (snapshot at send time — recipient may move later)
  state         TEXT,
  lga           TEXT,
  ward          TEXT,

  status        TEXT NOT NULL DEFAULT 'queued'
                  CHECK (status IN ('queued','sending','sent','delivered','failed','opted_out')),
  message_id    TEXT,                     -- AT message ID for delivery tracking
  attempted_at  TIMESTAMPTZ,
  delivered_at  TIMESTAMPTZ,
  error_code    TEXT,
  error_message TEXT,

  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sends_campaign ON sends(campaign_id);
CREATE INDEX idx_sends_status ON sends(campaign_id, status);
CREATE INDEX idx_sends_recipient ON sends(recipient_id);
CREATE INDEX idx_sends_geo ON sends(campaign_id, state, lga, ward);
CREATE INDEX idx_sends_attempted ON sends(campaign_id, attempted_at);

-- ============================================================
-- RESPONSES (inbound messages from recipients)
-- ============================================================

CREATE TABLE responses (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id     UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  recipient_id    UUID REFERENCES recipients(id) ON DELETE SET NULL,
  candidate_id    UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,

  -- Denormalised geo
  state           TEXT,
  lga             TEXT,
  ward            TEXT,

  channel         TEXT NOT NULL CHECK (channel IN ('whatsapp', 'sms', 'voice')),
  response_text   TEXT,
  dtmf_key        TEXT,                   -- for voice: which key was pressed

  -- Sentiment (set by sentiment worker)
  sentiment       TEXT CHECK (sentiment IN ('positive', 'neutral', 'negative')),
  sentiment_score NUMERIC(4,3),           -- 0.000 to 1.000
  topic           TEXT,                   -- 'infrastructure', 'security', 'economy', etc.

  raw_payload     JSONB,                  -- original AT webhook payload
  received_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_responses_candidate ON responses(candidate_id);
CREATE INDEX idx_responses_campaign ON responses(campaign_id);
CREATE INDEX idx_responses_sentiment ON responses(candidate_id, sentiment, received_at);
CREATE INDEX idx_responses_topic ON responses(candidate_id, topic);
CREATE INDEX idx_responses_geo ON responses(candidate_id, state, lga, ward);

-- ============================================================
-- POLLS
-- ============================================================

CREATE TABLE polls (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  candidate_id  UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  campaign_id   UUID REFERENCES campaigns(id),
  question      TEXT NOT NULL,
  options       JSONB NOT NULL,           -- [{"key":"1","label":"Strongly support"},...]
  status        TEXT NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft','active','closed')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at     TIMESTAMPTZ
);

CREATE TABLE poll_responses (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  poll_id       UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  recipient_id  UUID NOT NULL REFERENCES recipients(id) ON DELETE CASCADE,
  selected_key  TEXT NOT NULL,            -- "1", "2", "3", "4"
  state         TEXT,
  lga           TEXT,
  ward          TEXT,
  received_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (poll_id, recipient_id)          -- one vote per recipient
);

CREATE INDEX idx_poll_responses_poll ON poll_responses(poll_id);
CREATE INDEX idx_poll_responses_geo ON poll_responses(poll_id, state, lga, ward);

-- ============================================================
-- FIELD AGENTS & REPORTS
-- ============================================================

CREATE TABLE field_agents (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  candidate_id    UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  phone           TEXT NOT NULL,
  agent_code      TEXT NOT NULL UNIQUE,   -- short code for mobile login
  assigned_state  TEXT,
  assigned_lga    TEXT,
  assigned_ward   TEXT,
  status          TEXT NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'inactive')),
  last_checkin_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_agents_candidate ON field_agents(candidate_id);
CREATE INDEX idx_agents_geo ON field_agents(candidate_id, assigned_lga, assigned_ward);

CREATE TABLE field_reports (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  candidate_id  UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  agent_id      UUID NOT NULL REFERENCES field_agents(id) ON DELETE CASCADE,
  ward          TEXT NOT NULL,
  lga           TEXT NOT NULL,
  state         TEXT NOT NULL,
  polling_unit  TEXT,
  report_type   TEXT NOT NULL
                  CHECK (report_type IN (
                    'intimidation','ballot_box_issue','bvas_fault',
                    'violence','late_opening','low_turnout',
                    'high_turnout','result_capture','general','positive'
                  )),
  severity      TEXT NOT NULL DEFAULT 'low'
                  CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  description   TEXT NOT NULL,
  photo_url     TEXT,
  latitude      NUMERIC(10,7),
  longitude     NUMERIC(10,7),
  status        TEXT NOT NULL DEFAULT 'open'
                  CHECK (status IN ('open', 'acknowledged', 'escalated', 'resolved')),
  resolved_at   TIMESTAMPTZ,
  resolved_by   UUID REFERENCES users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reports_candidate ON field_reports(candidate_id);
CREATE INDEX idx_reports_severity ON field_reports(candidate_id, severity, created_at DESC);
CREATE INDEX idx_reports_status ON field_reports(candidate_id, status);
CREATE INDEX idx_reports_geo ON field_reports(candidate_id, lga, ward);

-- Election day result capture
CREATE TABLE result_captures (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  candidate_id    UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  agent_id        UUID NOT NULL REFERENCES field_agents(id),
  polling_unit    TEXT NOT NULL,
  ward            TEXT NOT NULL,
  lga             TEXT NOT NULL,
  state           TEXT NOT NULL,
  candidate_votes INTEGER NOT NULL DEFAULT 0,
  opponent_votes  INTEGER,
  void_votes      INTEGER DEFAULT 0,
  total_accredited INTEGER,
  result_sheet_url TEXT,
  witness_name    TEXT,
  submitted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  verified        BOOLEAN NOT NULL DEFAULT false,
  UNIQUE (candidate_id, polling_unit)
);

CREATE INDEX idx_results_candidate ON result_captures(candidate_id);
CREATE INDEX idx_results_geo ON result_captures(candidate_id, lga, ward);

-- ============================================================
-- ANALYTICS SNAPSHOTS (pre-computed, refreshed every 15 min)
-- ============================================================

-- Ward-level reach and sentiment summary
CREATE TABLE ward_snapshots (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  candidate_id  UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  state         TEXT NOT NULL,
  lga           TEXT NOT NULL,
  ward          TEXT NOT NULL,
  snapshot_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Reach
  recipients_total   INTEGER NOT NULL DEFAULT 0,
  recipients_reached INTEGER NOT NULL DEFAULT 0,
  reach_pct          NUMERIC(5,2),

  -- Delivery
  sent_total         INTEGER NOT NULL DEFAULT 0,
  delivered_total    INTEGER NOT NULL DEFAULT 0,
  delivery_rate      NUMERIC(5,2),

  -- Responses
  response_count     INTEGER NOT NULL DEFAULT 0,
  response_rate      NUMERIC(5,2),
  positive_count     INTEGER NOT NULL DEFAULT 0,
  neutral_count      INTEGER NOT NULL DEFAULT 0,
  negative_count     INTEGER NOT NULL DEFAULT 0,
  sentiment_score    NUMERIC(5,2),         -- % positive

  UNIQUE (candidate_id, state, lga, ward)
);

CREATE INDEX idx_snapshots_candidate ON ward_snapshots(candidate_id);

-- Channel performance over time
CREATE TABLE channel_snapshots (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  candidate_id  UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  channel       TEXT NOT NULL,
  snapshot_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent          INTEGER NOT NULL DEFAULT 0,
  delivered     INTEGER NOT NULL DEFAULT 0,
  delivery_rate NUMERIC(5,2),
  responses     INTEGER NOT NULL DEFAULT 0
);

-- ============================================================
-- SOCIAL MEDIA
-- ============================================================

CREATE TABLE social_mentions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  candidate_id    UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  platform        TEXT NOT NULL CHECK (platform IN ('twitter','facebook','instagram','youtube','whatsapp')),
  external_id     TEXT,                   -- platform's post/tweet ID
  author_handle   TEXT,
  author_followers INTEGER,
  content         TEXT NOT NULL,
  url             TEXT,
  sentiment       TEXT CHECK (sentiment IN ('positive', 'neutral', 'negative')),
  sentiment_score NUMERIC(4,3),
  topic           TEXT,
  likes           INTEGER DEFAULT 0,
  shares          INTEGER DEFAULT 0,
  impressions     INTEGER DEFAULT 0,
  requires_response BOOLEAN DEFAULT false,
  responded       BOOLEAN DEFAULT false,
  posted_at       TIMESTAMPTZ,
  captured_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_mentions_candidate ON social_mentions(candidate_id);
CREATE INDEX idx_mentions_sentiment ON social_mentions(candidate_id, sentiment, captured_at DESC);
CREATE INDEX idx_mentions_platform ON social_mentions(candidate_id, platform);

CREATE TABLE sponsored_posts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  candidate_id    UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  platforms       TEXT[] NOT NULL,        -- ['facebook','instagram','twitter']
  narrative_theme TEXT,
  content         TEXT NOT NULL,
  target_state    TEXT,
  target_lga      TEXT,
  daily_budget    NUMERIC(10,2),
  status          TEXT NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft','scheduled','live','paused','completed')),
  scheduled_at    TIMESTAMPTZ,
  launched_at     TIMESTAMPTZ,

  -- Performance (pulled from platform APIs)
  total_impressions INTEGER DEFAULT 0,
  total_reach       INTEGER DEFAULT 0,
  total_engagement  INTEGER DEFAULT 0,
  total_spend       NUMERIC(10,2) DEFAULT 0,

  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- AUDIT LOG (immutable — rows are never updated or deleted)
-- ============================================================

CREATE TABLE audit_log (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  candidate_id  UUID REFERENCES candidates(id),
  user_id       UUID REFERENCES users(id),
  action        TEXT NOT NULL,            -- 'campaign.launch', 'recipient.import', etc.
  entity_type   TEXT,                    -- 'campaign', 'recipient', 'template'
  entity_id     UUID,
  detail        JSONB,                   -- whatever extra context is useful
  ip_address    INET,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_candidate ON audit_log(candidate_id, created_at DESC);
CREATE INDEX idx_audit_user ON audit_log(user_id, created_at DESC);

-- ============================================================
-- ROW LEVEL SECURITY
-- Every table is protected: users only see their candidate's data
-- ============================================================

ALTER TABLE candidates       ENABLE ROW LEVEL SECURITY;
ALTER TABLE users            ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipients       ENABLE ROW LEVEL SECURITY;
ALTER TABLE senders          ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates        ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns        ENABLE ROW LEVEL SECURITY;
ALTER TABLE sends            ENABLE ROW LEVEL SECURITY;
ALTER TABLE responses        ENABLE ROW LEVEL SECURITY;
ALTER TABLE polls            ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_responses   ENABLE ROW LEVEL SECURITY;
ALTER TABLE field_agents     ENABLE ROW LEVEL SECURITY;
ALTER TABLE field_reports    ENABLE ROW LEVEL SECURITY;
ALTER TABLE result_captures  ENABLE ROW LEVEL SECURITY;
ALTER TABLE ward_snapshots   ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_mentions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE sponsored_posts  ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log        ENABLE ROW LEVEL SECURITY;

-- Helper function: get current user's candidate_id
CREATE OR REPLACE FUNCTION auth_candidate_id()
RETURNS UUID AS $$
  SELECT candidate_id FROM users WHERE id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Helper function: get current user's role
CREATE OR REPLACE FUNCTION auth_role()
RETURNS TEXT AS $$
  SELECT role FROM users WHERE id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- RLS policies: read own candidate's data
CREATE POLICY "own_candidate" ON candidates
  FOR ALL USING (id = auth_candidate_id());

CREATE POLICY "own_candidate" ON recipients
  FOR ALL USING (candidate_id = auth_candidate_id());

CREATE POLICY "own_candidate" ON senders
  FOR ALL USING (candidate_id = auth_candidate_id());

CREATE POLICY "own_candidate" ON templates
  FOR ALL USING (candidate_id = auth_candidate_id());

CREATE POLICY "own_candidate" ON campaigns
  FOR ALL USING (candidate_id = auth_candidate_id());

CREATE POLICY "own_candidate" ON sends
  FOR SELECT USING (
    campaign_id IN (SELECT id FROM campaigns WHERE candidate_id = auth_candidate_id())
  );

CREATE POLICY "own_candidate" ON responses
  FOR ALL USING (candidate_id = auth_candidate_id());

CREATE POLICY "own_candidate" ON polls
  FOR ALL USING (candidate_id = auth_candidate_id());

CREATE POLICY "own_candidate" ON poll_responses
  FOR ALL USING (
    poll_id IN (SELECT id FROM polls WHERE candidate_id = auth_candidate_id())
  );

CREATE POLICY "own_candidate" ON field_agents
  FOR ALL USING (candidate_id = auth_candidate_id());

CREATE POLICY "own_candidate" ON field_reports
  FOR ALL USING (candidate_id = auth_candidate_id());

CREATE POLICY "own_candidate" ON result_captures
  FOR ALL USING (candidate_id = auth_candidate_id());

CREATE POLICY "own_candidate" ON ward_snapshots
  FOR ALL USING (candidate_id = auth_candidate_id());

CREATE POLICY "own_candidate" ON channel_snapshots
  FOR ALL USING (candidate_id = auth_candidate_id());

CREATE POLICY "own_candidate" ON social_mentions
  FOR ALL USING (candidate_id = auth_candidate_id());

CREATE POLICY "own_candidate" ON sponsored_posts
  FOR ALL USING (candidate_id = auth_candidate_id());

CREATE POLICY "own_candidate" ON audit_log
  FOR SELECT USING (candidate_id = auth_candidate_id());

-- Users can see their own user record
CREATE POLICY "own_user" ON users
  FOR ALL USING (id = auth.uid() OR candidate_id = auth_candidate_id());

-- ============================================================
-- REALTIME (enable for live dashboard updates)
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE campaigns;
ALTER PUBLICATION supabase_realtime ADD TABLE sends;
ALTER PUBLICATION supabase_realtime ADD TABLE responses;
ALTER PUBLICATION supabase_realtime ADD TABLE field_reports;
ALTER PUBLICATION supabase_realtime ADD TABLE social_mentions;
ALTER PUBLICATION supabase_realtime ADD TABLE ward_snapshots;
