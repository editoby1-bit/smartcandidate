// ============================================================
// SmartCandidate — TypeScript Types
// ============================================================

export type Channel = 'whatsapp' | 'sms' | 'voice'
export type Language = 'english' | 'yoruba' | 'hausa' | 'igbo' | 'pidgin'
export type Sentiment = 'positive' | 'neutral' | 'negative'
export type CampaignStatus = 'draft' | 'scheduled' | 'running' | 'paused' | 'completed' | 'failed'
export type ReportSeverity = 'low' | 'medium' | 'high' | 'critical'
export type ReportType = 'intimidation' | 'ballot_box_issue' | 'bvas_fault' | 'violence' | 'late_opening' | 'low_turnout' | 'high_turnout' | 'result_capture' | 'general' | 'positive'
export type UserRole = 'admin' | 'analyst' | 'field_coordinator' | 'social_manager'
export type Platform = 'twitter' | 'facebook' | 'instagram' | 'youtube' | 'whatsapp'

// ── Database row types ──────────────────────────────────────

export interface Candidate {
  id: string
  name: string
  party: string | null
  position: string
  state: string
  lga: string | null
  election_date: string | null
  election_type: string
  logo_url: string | null
  color: string
  active: boolean
  created_at: string
}

export interface User {
  id: string
  candidate_id: string
  email: string
  full_name: string
  role: UserRole
  active: boolean
  created_at: string
}

export interface Recipient {
  id: string
  candidate_id: string
  phone: string
  name: string | null
  state: string | null
  lga: string | null
  ward: string | null
  community: string | null
  language: Language
  group_tag: string | null
  opted_out: boolean
  opted_out_at: string | null
  created_at: string
}

export interface Sender {
  id: string
  candidate_id: string
  label: string
  channel: Channel
  phone_number: string | null
  status: 'active' | 'paused' | 'banned' | 'setup'
  daily_limit: number
  sent_today: number
  created_at: string
}

export interface Template {
  id: string
  candidate_id: string
  name: string
  channel: Channel
  language: Language
  body: string
  media_url: string | null
  at_template_id: string | null
  approved: boolean
  created_at: string
}

export interface Campaign {
  id: string
  candidate_id: string
  name: string
  channel: Channel
  template_id: string | null
  message_body: string
  language: Language
  target_state: string | null
  target_lga: string | null
  target_ward: string | null
  target_language: string | null
  target_group: string | null
  status: CampaignStatus
  total_targets: number
  sent_count: number
  delivered_count: number
  failed_count: number
  response_count: number
  optout_count: number
  scheduled_at: string | null
  launched_at: string | null
  completed_at: string | null
  estimated_finish: string | null
  created_by: string | null
  created_at: string
}

export interface Send {
  id: string
  campaign_id: string
  recipient_id: string
  sender_id: string | null
  state: string | null
  lga: string | null
  ward: string | null
  status: 'queued' | 'sending' | 'sent' | 'delivered' | 'failed' | 'opted_out'
  message_id: string | null
  attempted_at: string | null
  delivered_at: string | null
  error_code: string | null
  error_message: string | null
  created_at: string
}

export interface Response {
  id: string
  campaign_id: string | null
  recipient_id: string | null
  candidate_id: string
  state: string | null
  lga: string | null
  ward: string | null
  channel: Channel
  response_text: string | null
  dtmf_key: string | null
  sentiment: Sentiment | null
  sentiment_score: number | null
  topic: string | null
  received_at: string
}

export interface Poll {
  id: string
  candidate_id: string
  campaign_id: string | null
  question: string
  options: PollOption[]
  status: 'draft' | 'active' | 'closed'
  created_at: string
  closed_at: string | null
}

export interface PollOption {
  key: string
  label: string
}

export interface PollResponse {
  id: string
  poll_id: string
  recipient_id: string
  selected_key: string
  state: string | null
  lga: string | null
  ward: string | null
  received_at: string
}

export interface FieldAgent {
  id: string
  candidate_id: string
  name: string
  phone: string
  agent_code: string
  assigned_state: string | null
  assigned_lga: string | null
  assigned_ward: string | null
  status: 'active' | 'inactive'
  last_checkin_at: string | null
  created_at: string
}

export interface FieldReport {
  id: string
  candidate_id: string
  agent_id: string
  ward: string
  lga: string
  state: string
  polling_unit: string | null
  report_type: ReportType
  severity: ReportSeverity
  description: string
  photo_url: string | null
  latitude: number | null
  longitude: number | null
  status: 'open' | 'acknowledged' | 'escalated' | 'resolved'
  resolved_at: string | null
  resolved_by: string | null
  created_at: string
  // Joined
  agent?: FieldAgent
}

export interface ResultCapture {
  id: string
  candidate_id: string
  agent_id: string
  polling_unit: string
  ward: string
  lga: string
  state: string
  candidate_votes: number
  opponent_votes: number | null
  void_votes: number
  total_accredited: number | null
  result_sheet_url: string | null
  witness_name: string | null
  submitted_at: string
  verified: boolean
}

export interface WardSnapshot {
  id: string
  candidate_id: string
  state: string
  lga: string
  ward: string
  snapshot_at: string
  recipients_total: number
  recipients_reached: number
  reach_pct: number | null
  sent_total: number
  delivered_total: number
  delivery_rate: number | null
  response_count: number
  response_rate: number | null
  positive_count: number
  neutral_count: number
  negative_count: number
  sentiment_score: number | null
}

export interface SocialMention {
  id: string
  candidate_id: string
  platform: Platform
  external_id: string | null
  author_handle: string | null
  author_followers: number | null
  content: string
  url: string | null
  sentiment: Sentiment | null
  sentiment_score: number | null
  topic: string | null
  likes: number
  shares: number
  impressions: number
  requires_response: boolean
  responded: boolean
  posted_at: string | null
  captured_at: string
}

export interface SponsoredPost {
  id: string
  candidate_id: string
  platforms: Platform[]
  narrative_theme: string | null
  content: string
  target_state: string | null
  target_lga: string | null
  daily_budget: number | null
  status: 'draft' | 'scheduled' | 'live' | 'paused' | 'completed'
  scheduled_at: string | null
  launched_at: string | null
  total_impressions: number
  total_reach: number
  total_engagement: number
  total_spend: number
  created_by: string | null
  created_at: string
}

// ── API response shapes ───────────────────────────────────────

export interface DashboardStats {
  totalReached: number
  totalSent: number
  deliveryRate: number
  openRate: number
  responseRate: number
  sentimentScore: number
  activeAlerts: number
  activeCampaigns: number
  todayReach: number
  channelBreakdown: {
    whatsapp: { sent: number; delivered: number; rate: number }
    sms: { sent: number; delivered: number; rate: number }
    voice: { sent: number; delivered: number; rate: number }
  }
}

export interface SentimentBreakdown {
  positive: number
  neutral: number
  negative: number
  total: number
  score: number // percentage positive
  byTopic: { topic: string; positive: number; neutral: number; negative: number }[]
  byLGA: { lga: string; score: number; total: number }[]
}

export interface PollResults {
  poll: Poll
  totalResponses: number
  options: {
    key: string
    label: string
    count: number
    pct: number
  }[]
  byLGA: {
    lga: string
    breakdown: { key: string; count: number }[]
  }[]
}

export interface CampaignProgress {
  campaign: Campaign
  pct: number
  estimatedMinutesRemaining: number | null
  recentSends: Send[]
}

// ── Form input types ──────────────────────────────────────────

export interface CreateCampaignInput {
  name: string
  channel: Channel
  template_id?: string
  message_body: string
  language: Language
  target_state?: string
  target_lga?: string
  target_ward?: string
  target_language?: string
  target_group?: string
  scheduled_at?: string
  poll_id?: string
}

export interface ImportRecipientsInput {
  candidate_id: string
  file: File
}

export interface CreatePollInput {
  question: string
  options: PollOption[]
  campaign_id?: string
}

export interface CreateFieldReportInput {
  ward: string
  lga: string
  state: string
  polling_unit?: string
  report_type: ReportType
  severity: ReportSeverity
  description: string
  latitude?: number
  longitude?: number
}
