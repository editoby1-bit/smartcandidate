// lib/db/database.types.ts
// Placeholder Database type — Supabase CLI can generate the full version
// from your actual schema using: npx supabase gen types typescript --local
// For now this allows TypeScript to compile without errors.

export type Database = {
  public: {
    Tables: {
      candidates:        { Row: any; Insert: any; Update: any }
      users:             { Row: any; Insert: any; Update: any }
      recipients:        { Row: any; Insert: any; Update: any }
      senders:           { Row: any; Insert: any; Update: any }
      templates:         { Row: any; Insert: any; Update: any }
      campaigns:         { Row: any; Insert: any; Update: any }
      sends:             { Row: any; Insert: any; Update: any }
      responses:         { Row: any; Insert: any; Update: any }
      polls:             { Row: any; Insert: any; Update: any }
      poll_responses:    { Row: any; Insert: any; Update: any }
      field_agents:      { Row: any; Insert: any; Update: any }
      field_reports:     { Row: any; Insert: any; Update: any }
      result_captures:   { Row: any; Insert: any; Update: any }
      ward_snapshots:    { Row: any; Insert: any; Update: any }
      channel_snapshots: { Row: any; Insert: any; Update: any }
      social_mentions:   { Row: any; Insert: any; Update: any }
      sponsored_posts:   { Row: any; Insert: any; Update: any }
      audit_log:         { Row: any; Insert: any; Update: any }
    }
    Views:   {}
    Functions: {
      auth_candidate_id:          { Args: {}; Returns: string }
      auth_role:                  { Args: {}; Returns: string }
      increment_campaign_sent:     { Args: { campaign_id_arg: string }; Returns: void }
      increment_campaign_delivered:{ Args: { campaign_id_arg: string }; Returns: void }
      increment_campaign_failed:   { Args: { campaign_id_arg: string }; Returns: void }
      increment_campaign_responses:{ Args: { campaign_id_arg: string }; Returns: void }
    }
    Enums: {}
  }
}
