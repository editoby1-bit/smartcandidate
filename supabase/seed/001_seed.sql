-- ============================================================
-- SmartCandidate — Seed Data
-- Run after migrations to populate demo data
-- ============================================================

-- Sample candidate
INSERT INTO candidates (id, name, party, position, state, election_date, election_type)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'Gov. Babajide Adeyemi',
  'APC',
  'Governor',
  'Lagos',
  '2027-03-15',
  'gubernatorial'
);

-- Nigeria geographic data used for targeting dropdowns
-- This lives in the app config (lib/utils/geography.ts) not the DB
-- The DB stores the actual values on recipient/send rows

-- Sample senders
INSERT INTO senders (candidate_id, label, channel, phone_number, status, daily_limit)
VALUES
  ('a0000000-0000-0000-0000-000000000001', 'WhatsApp Line 1', 'whatsapp', '+2348100000001', 'active', 500),
  ('a0000000-0000-0000-0000-000000000001', 'WhatsApp Line 2', 'whatsapp', '+2348100000002', 'active', 500),
  ('a0000000-0000-0000-0000-000000000001', 'SMS Main',        'sms',       null,             'active', 10000),
  ('a0000000-0000-0000-0000-000000000001', 'Voice Dialler',   'voice',     null,             'active', 2000);

-- Sample templates
INSERT INTO templates (candidate_id, name, channel, language, body, approved)
VALUES
  (
    'a0000000-0000-0000-0000-000000000001',
    'Infrastructure Update - English',
    'whatsapp', 'english',
    'Dear {name},

Governor Adeyemi has completed 127km of roads and 40 bridges across Lagos this term — including in {lga}.

Your community''s progress continues with your support. 

Reply 1 to confirm your vote
Reply 2 for more information  
Reply 3 for a community meeting near you

Reply STOP to unsubscribe.',
    true
  ),
  (
    'a0000000-0000-0000-0000-000000000001',
    'Infrastructure Update - Yoruba',
    'whatsapp', 'yoruba',
    'Ẹ káàbọ̀, {name},

Gómìnà Adeyemi ti kọ 127km ti ọ̀nà àti àwọn àfárá 40 kárọ̀ Lagos...

Ẹ tẹ 1 láti jẹrisi ibo yín
Ẹ tẹ 2 fún àlàyé síi
Ẹ tẹ STOP láti jade',
    true
  ),
  (
    'a0000000-0000-0000-0000-000000000001',
    'GOTV Reminder - English',
    'sms', 'english',
    'Dear {name}, Election day is near. Your vote matters for Lagos. Vote Gov. Adeyemi for continued progress. Text STOP to opt out.',
    true
  ),
  (
    'a0000000-0000-0000-0000-000000000001',
    'Election Day Voice - English',
    'voice', 'english',
    'Hello {name}. This is an important message from the Governor Adeyemi campaign. Today is election day. Please go to your polling unit and cast your vote. Your voice matters for Lagos. Thank you.',
    true
  );
