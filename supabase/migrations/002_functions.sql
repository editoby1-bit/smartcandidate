-- ============================================================
-- SmartCandidate — Helper Functions
-- Run this after 001_initial_schema.sql
-- ============================================================

-- Increment campaign counters atomically
CREATE OR REPLACE FUNCTION increment_campaign_sent(campaign_id_arg UUID)
RETURNS void AS $$
  UPDATE campaigns SET sent_count = sent_count + 1 WHERE id = campaign_id_arg;
$$ LANGUAGE SQL SECURITY DEFINER;

CREATE OR REPLACE FUNCTION increment_campaign_delivered(campaign_id_arg UUID)
RETURNS void AS $$
  UPDATE campaigns SET delivered_count = delivered_count + 1 WHERE id = campaign_id_arg;
$$ LANGUAGE SQL SECURITY DEFINER;

CREATE OR REPLACE FUNCTION increment_campaign_failed(campaign_id_arg UUID)
RETURNS void AS $$
  UPDATE campaigns SET failed_count = failed_count + 1 WHERE id = campaign_id_arg;
$$ LANGUAGE SQL SECURITY DEFINER;

CREATE OR REPLACE FUNCTION increment_campaign_responses(campaign_id_arg UUID)
RETURNS void AS $$
  UPDATE campaigns SET response_count = response_count + 1 WHERE id = campaign_id_arg;
$$ LANGUAGE SQL SECURITY DEFINER;

-- Mark campaign completed when all sends are done
CREATE OR REPLACE FUNCTION check_campaign_completion(campaign_id_arg UUID)
RETURNS void AS $$
DECLARE
  c campaigns%ROWTYPE;
BEGIN
  SELECT * INTO c FROM campaigns WHERE id = campaign_id_arg;
  IF c.sent_count + c.failed_count >= c.total_targets AND c.total_targets > 0 THEN
    UPDATE campaigns
    SET status = 'completed', completed_at = NOW()
    WHERE id = campaign_id_arg AND status = 'running';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
