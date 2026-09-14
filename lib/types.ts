export type EventStatus    = "upcoming" | "active" | "ended" | "archived";
export type SessionStatus  = "pending"  | "active" | "ended" | "archived";

// ── PROFILE ─────────────────────────────────────────────────
export interface Profile {
  id:             string;
  email:          string;
  full_name:      string | null;
  phone:          string | null;
  institution:    string | null;
  designation:    string | null;
  district:       string | null;
  avatar_url:     string | null;
  is_super_admin: boolean;
  is_active:      boolean;
  is_first_login: boolean;
  mda_id:         string | null;
  // joined
  mda?:           { name: string } | { name: string }[] | null;
  last_seen_at?:  string | null;
  created_at:     string;
  updated_at:     string;
}

// ── MDA (MINISTRY / DEPARTMENT / AGENCY) ─────────────────────
export interface Mda {
  id:         string;
  name:       string;
  is_active:  boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// ── EVENT ────────────────────────────────────────────────────
export interface Event {
  id:           string;
  created_by:   string | null;
  name:         string;
  location:     string;
  description:  string | null;
  event_date:   string;          // "YYYY-MM-DD"
  start_time:   string;          // "HH:MM"
  end_time:     string | null;
  has_sessions: boolean;
  status:       EventStatus;
  qr_token:     string | null;
  lat:          number | null;
  lng:          number | null;
  archived_at:  string | null;
  created_at:   string;
  updated_at:   string;
  // joined
  sessions?:    Session[];
  _attendee_count?: number;
  revival_notes?:    RevivalNote[];        // ← add

}

// ── SESSION ──────────────────────────────────────────────────
export interface Session {
  id:          string;
  event_id:    string;
  name:        string;
  status:      SessionStatus;
  qr_token:    string | null;
  started_at:  string | null;
  ended_at:    string | null;
  archived_at: string | null;
  created_at:  string;
  updated_at:  string;
  // joined
  event?:      Pick<Event, "id" | "name" | "location" | "lat" | "lng">;
  _attendee_count?: number;
  revival_notes?:     RevivalNote[];       // ← add

}

// ── ATTENDEE ─────────────────────────────────────────────────
export interface Attendee {
  id:                 string;
  event_id:           string;
  session_id:         string | null;
  full_name:          string;
  phone:              string;
  email:              string | null;
  institution:        string | null;
  mda:                string | null;
  designation:        string | null;
  device_fingerprint: string;
  qr_token_used:      string | null;
  method:             string;
  lat:                number | null;
  lng:                number | null;
  location_label:     string | null;
  created_at:         string;
  checked_in_after_revival: boolean;       // ← add

}

// ── QR TOKEN ─────────────────────────────────────────────────
export interface QrToken {
  token:      string;
  token_type: "event" | "session";
  event_id:   string | null;
  session_id: string | null;
  is_active:  boolean;
  created_at: string;
}

// ── REVIVAL NOTE ─────────────────────────────────────────────
export interface RevivalNote {
  id:         string;
  scope_type: "event" | "session";
  scope_id:   string;
  note:       string;
  revived_by: string;
  created_at: string;
}

// ── ATTENDANCE FORM (public) ─────────────────────────────────
export interface AttendanceFormData {
  full_name:   string;
  phone:       string;
  email:       string;
  institution: string;
  mda:         string;
  designation: string;
}

// ── TOKEN VALIDATION RESPONSE ────────────────────────────────
export interface TokenPayload {
  session_id: string;
  _token_type:    "event" | "session";
  id:             string;
  name:           string;
  status:         EventStatus | SessionStatus;
  event_id?:      string;
  event_name?:    string;
  event_location: string;
  event_lat:      number | null;
  event_lng:      number | null;
  location:       string;
  lat:            number | null;
  lng:            number | null;
}

// ── DASHBOARD STATS ──────────────────────────────────────────
export interface DashboardStats {
  total_events:    number;
  active_sessions: number;
  total_checkins:  number;
  past_events:     number;
}

// ── CLUSTERED ATTENDEE (for heatmap) ────────────────────────
export interface AttendeeWithCluster extends Attendee {
  cluster: "green" | "red";
  distance_from_cluster?: number;
}