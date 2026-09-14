// lib/utils.ts
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, parseISO } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateToken(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from({ length: 32 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join("");
}

export function formatDate(date: string) {
  try { return format(parseISO(date), "dd MMM yyyy"); } catch { return date; }
}

export function formatTime(time: string) {
  try {
    const [h, m] = time.split(":").map(Number);
    const d = new Date(); d.setHours(h, m);
    return format(d, "h:mm a");
  } catch { return time; }
}

export function formatDateTime(dt: string) {
  try { return format(parseISO(dt), "dd MMM yyyy, h:mm a"); } catch { return dt; }
}

export function statusLabel(status: string): string {
  switch (status) {
    case "active": return "ongoing";
    case "ended":
    case "archived": return "completed";
    default: return status;
  }
}

// Presence: online if a heartbeat was received within the last 5 minutes
export const PRESENCE_WINDOW_MS = 5 * 60 * 1000;

export function isOnline(lastSeenAt?: string | null): boolean {
  if (!lastSeenAt) return false;
  return Date.now() - new Date(lastSeenAt).getTime() < PRESENCE_WINDOW_MS;
}

// Validation
export function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isValidGovEmail(email: string) {
  // Accept .gov.sl, gmail.com, yahoo.com, hotmail, outlook, and other real domains
  return /^[^\s@]+@([^\s@]+\.(gov\.sl|com|net|org|edu|ac\.sl))$/.test(email);
}

export function isValidPhone(phone: string) {
  const cleaned = phone.replace(/[\s\-\(\)]/g, "");
  return cleaned.length >= 7 && cleaned.length <= 15 && /^[\+\d]+$/.test(cleaned);
}

// Device fingerprint (stored in localStorage)
export function getOrCreateDeviceId(): string {
  if (typeof window === "undefined") return "server";
  let id = localStorage.getItem("sa_device_id");
  if (!id) {
    id = `dev_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    localStorage.setItem("sa_device_id", id);
  }
  return id;
}

export function hasSubmittedForScope(scopeId: string): boolean {
  if (typeof window === "undefined") return false;
  const submitted = JSON.parse(localStorage.getItem("sa_submitted") || "[]");
  return submitted.includes(scopeId);
}

export function markSubmitted(scopeId: string) {
  if (typeof window === "undefined") return;
  const submitted = JSON.parse(localStorage.getItem("sa_submitted") || "[]");
  if (!submitted.includes(scopeId)) {
    submitted.push(scopeId);
    localStorage.setItem("sa_submitted", JSON.stringify(submitted));
  }
}

export interface CachedAttendee {
  full_name: string; phone: string; email: string;
  institution: string; mda: string; designation: string;
}

export function getCachedAttendee(): CachedAttendee | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("sa_last_attendee");
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function setCachedAttendee(data: CachedAttendee) {
  if (typeof window === "undefined") return;
  localStorage.setItem("sa_last_attendee", JSON.stringify(data));
}

// Haversine distance in meters
export function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Find the plurality cluster of attendees
export function clusterAttendees(
  attendees: Array<{ lat: number | null; lng: number | null; id: string }>,
  radiusMeters = 500
) {
  const valid = attendees.filter((a) => a.lat != null && a.lng != null) as Array<
    { lat: number; lng: number; id: string }
  >;

  if (valid.length === 0) return { green: new Set<string>(), red: new Set<string>() };

  // Group by proximity — find largest cluster
  let bestCluster: string[] = [];
  for (const anchor of valid) {
    const cluster = valid.filter(
      (a) => haversineDistance(anchor.lat, anchor.lng, a.lat, a.lng) <= radiusMeters
    ).map((a) => a.id);
    if (cluster.length > bestCluster.length) bestCluster = cluster;
  }

  const green = new Set(bestCluster);
  const red = new Set(valid.filter((a) => !green.has(a.id)).map((a) => a.id));
  return { green, red };
}