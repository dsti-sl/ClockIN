// lib/period.ts
// Daily / weekly / monthly / yearly / custom period maths shared by the
// dashboard and every filterable list. Client and server safe. Dates are
// "YYYY-MM-DD" strings handled in UTC, which is also Sierra Leone local time.

export type Period = "day" | "week" | "month" | "year" | "custom";
export type SteppedPeriod = Exclude<Period, "custom">;
export type PeriodGranularity = "hour" | "day" | "month";

export const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: "day",    label: "Daily" },
  { value: "week",   label: "Weekly" },
  { value: "month",  label: "Monthly" },
  { value: "year",   label: "Yearly" },
  { value: "custom", label: "Custom" },
];

/** A chosen period. `period: null` means no date filter. */
export interface PeriodSelection {
  period: Period | null;
  /** First day of the selected day, week (Monday), month or year. Null for custom. */
  date:   string | null;
  /** Inclusive custom range. Null unless period is "custom". */
  from:   string | null;
  to:     string | null;
}

export interface PeriodRange {
  period:       Period;
  /** Inclusive first day. */
  start:        string;
  /** Exclusive end day. */
  endExclusive: string;
  /** Chart bucket size for this range. */
  granularity:  PeriodGranularity;
  /** Human-readable period, e.g. "October 2026". */
  label:        string;
}

export const NO_PERIOD: PeriodSelection = { period: null, date: null, from: null, to: null };

export const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTH_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// Custom ranges up to this many days are charted per day, longer ones per month.
const MAX_DAILY_BUCKETS = 92;
// Earliest date the date pickers accept, so half-typed years (e.g. 0002) are ignored.
export const MIN_PICKABLE_DAY = "2000-01-01";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// ── Date helpers ─────────────────────────────────────────────

function toUtcDate(day: string): Date {
  return new Date(`${day}T00:00:00Z`);
}

function toDayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Today's date in UTC (Sierra Leone time). */
export function todayUtc(): string {
  return toDayKey(new Date());
}

/** The UTC day of an ISO timestamp, e.g. an attendee's created_at. */
export function dayOfTimestamp(timestamp: string): string {
  return toDayKey(new Date(timestamp));
}

/** Valid "YYYY-MM-DD" between 1900 and 2999, or null. Rejects rollovers like 2026-02-31. */
export function parseDay(value: string | undefined | null): string | null {
  if (!value || !DATE_RE.test(value)) return null;
  const year = Number(value.slice(0, 4));
  if (year < 1900 || year > 2999) return null;
  const date = toUtcDate(value);
  return !Number.isNaN(date.getTime()) && toDayKey(date) === value ? value : null;
}

export function addDays(day: string, days: number): string {
  const date = toUtcDate(day);
  date.setUTCDate(date.getUTCDate() + days);
  return toDayKey(date);
}

function addMonths(monthStart: string, months: number): string {
  const date = toUtcDate(monthStart);
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + months);
  return toDayKey(date);
}

function daysBetween(start: string, endExclusive: string): number {
  return Math.round((toUtcDate(endExclusive).getTime() - toUtcDate(start).getTime()) / 86_400_000);
}

/** "2026-10-05" → "05 Oct 2026", the same format as formatDate in lib/utils. */
export function formatDay(day: string): string {
  return `${day.slice(8, 10)} ${MONTH_SHORT[Number(day.slice(5, 7)) - 1]} ${day.slice(0, 4)}`;
}

/** First day of the day, week (Monday), month or year containing `day`. */
export function startOfPeriod(period: SteppedPeriod, day: string): string {
  switch (period) {
    case "day":
      return day;
    case "week": {
      const daysSinceMonday = (toUtcDate(day).getUTCDay() + 6) % 7;
      return addDays(day, -daysSinceMonday);
    }
    case "month":
      return `${day.slice(0, 7)}-01`;
    case "year":
      return `${day.slice(0, 4)}-01-01`;
  }
}

/** Moves a period start one period back (-1) or forward (+1). */
export function shiftPeriod(period: SteppedPeriod, start: string, step: 1 | -1): string {
  switch (period) {
    case "day":
      return addDays(start, step);
    case "week":
      return addDays(start, 7 * step);
    case "month":
      return addMonths(start, step);
    case "year":
      return addMonths(start, 12 * step);
  }
}

// ── Ranges ───────────────────────────────────────────────────

/** Concrete date range, chart granularity and label. Null when no period is chosen. */
export function resolvePeriodRange(selection: PeriodSelection): PeriodRange | null {
  const { period } = selection;
  if (!period) return null;

  if (period === "custom") {
    if (!selection.from || !selection.to) return null;
    const endExclusive = addDays(selection.to, 1);
    const days = daysBetween(selection.from, endExclusive);
    return {
      period,
      start: selection.from,
      endExclusive,
      granularity: days === 1 ? "hour" : days <= MAX_DAILY_BUCKETS ? "day" : "month",
      label: days === 1
        ? formatDay(selection.from)
        : `${formatDay(selection.from)} to ${formatDay(selection.to)}`,
    };
  }

  if (!selection.date) return null;
  const start = selection.date;
  const endExclusive = shiftPeriod(period, start, 1);

  switch (period) {
    case "day":
      return { period, start, endExclusive, granularity: "hour", label: formatDay(start) };
    case "week":
      return {
        period, start, endExclusive, granularity: "day",
        label: `${formatDay(start)} to ${formatDay(addDays(endExclusive, -1))}`,
      };
    case "month":
      return {
        period, start, endExclusive, granularity: "day",
        label: `${MONTH_LONG[Number(start.slice(5, 7)) - 1]} ${start.slice(0, 4)}`,
      };
    case "year":
      return { period, start, endExclusive, granularity: "month", label: start.slice(0, 4) };
  }
}

/** True when `day` (YYYY-MM-DD) falls in the range, or when there is no range. */
export function isDayInRange(day: string | null | undefined, range: PeriodRange | null): boolean {
  if (!range) return true;
  if (!day) return false;
  return range.start <= day && day < range.endExclusive;
}

/**
 * The selection after switching to `next`. Stepped periods stay on today when
 * the current range includes it, otherwise on the range being viewed. Custom
 * starts from the current range.
 */
export function switchPeriod(
  current: PeriodSelection,
  next: Period | null,
  today: string,
): PeriodSelection {
  if (next === null) return NO_PERIOD;
  const range = resolvePeriodRange(current);

  if (next === "custom") {
    return {
      period: "custom",
      date: null,
      from: range?.start ?? today,
      to: range ? addDays(range.endExclusive, -1) : today,
    };
  }

  const containsToday = range !== null && range.start <= today && today < range.endExclusive;
  const anchor = containsToday || !range ? today : range.start;
  return { period: next, date: startOfPeriod(next, anchor), from: null, to: null };
}
