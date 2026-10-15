"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  MIN_PICKABLE_DAY,
  PERIOD_OPTIONS,
  parseDay,
  resolvePeriodRange,
  shiftPeriod,
  startOfPeriod,
  switchPeriod,
  todayUtc,
  type Period,
  type PeriodSelection,
  type SteppedPeriod,
} from "@/lib/period";

type Props = {
  value: PeriodSelection;
  onChange: (next: PeriodSelection) => void;
  /** Label of the "no period" button, e.g. "All time" or "Overview". */
  allLabel?: string;
  /** What the dates refer to, e.g. "Check-in date". Shown above the period controls. */
  dateLabel?: string;
  /** Server date (YYYY-MM-DD) when the caller has one. Defaults to today in UTC. */
  today?: string;
  disabled?: boolean;
  /** Smaller buttons for table toolbars. */
  compact?: boolean;
};

const STEP_NAMES: Record<SteppedPeriod, string> = {
  day: "day",
  week: "week",
  month: "month",
  year: "year",
};

export const filterFieldClass =
  "w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 transition-colors focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-white";

export const filterLabelClass =
  "mb-1 block text-xs font-medium text-gray-500 dark:text-slate-300";

const iconButtonClass =
  "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:opacity-40 dark:text-slate-300 dark:hover:bg-slate-700";

/**
 * Date field that keeps half-typed values locally and only reports complete
 * dates from MIN_PICKABLE_DAY on, so typing a year digit by digit works.
 */
function DayInput({
  value,
  onCommit,
  className,
  ...rest
}: {
  value: string | null;
  onCommit: (day: string) => void;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type">) {
  const [draft, setDraft] = useState(value ?? "");
  const [committed, setCommitted] = useState(value);
  // Follow outside changes (arrows, Today, browser back) without an effect.
  if (value !== committed) {
    setCommitted(value);
    setDraft(value ?? "");
  }

  return (
    <input
      {...rest}
      type="date"
      value={draft}
      onChange={(e) => {
        setDraft(e.target.value);
        const day = parseDay(e.target.value);
        if (day && day >= MIN_PICKABLE_DAY && day !== value) onCommit(day);
      }}
      className={className}
    />
  );
}

export default function PeriodFilter({
  value,
  onChange,
  allLabel = "All time",
  dateLabel = "Period",
  today: todayProp,
  disabled = false,
  compact = false,
}: Props) {
  const [fallbackToday] = useState(todayUtc);
  const today = todayProp ?? fallbackToday;

  const range = resolvePeriodRange(value);
  const anchor = value.date;
  const stepped: SteppedPeriod | null =
    value.period && value.period !== "custom" ? value.period : null;
  const containsToday =
    range !== null && range.start <= today && today < range.endExclusive;

  const tabs: { value: Period | null; label: string }[] = [
    { value: null, label: allLabel },
    ...PERIOD_OPTIONS,
  ];

  function select(next: Period | null) {
    if (next !== value.period) onChange(switchPeriod(value, next, today));
  }

  function setCustom(field: "from" | "to", day: string) {
    let from = field === "from" ? day : value.from ?? day;
    let to = field === "to" ? day : value.to ?? day;
    // Keep the range valid by moving the other end.
    if (from > to) {
      if (field === "from") to = from;
      else from = to;
    }
    onChange({ period: "custom", date: null, from, to });
  }

  return (
    <div className="space-y-2">
      <div role="group" aria-label="Period" className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.value ?? "all"}
            type="button"
            aria-pressed={value.period === tab.value}
            onClick={() => select(tab.value)}
            disabled={disabled}
            className={cn(
              "rounded-full font-medium transition disabled:cursor-wait",
              compact ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-xs",
              value.period === tab.value
                ? "bg-indigo-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-700/80",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {stepped && range && anchor && (
        <div>
          <span className={filterLabelClass}>{dateLabel}</span>
          <div className="flex flex-wrap items-center gap-2">
            {/* min-w keeps the longest label ("12 Oct 2026 to 18 Oct 2026") readable; narrow screens wrap the date field below. */}
            <div className="flex min-w-[17rem] flex-1 items-center rounded-lg border border-gray-200 bg-gray-50 dark:border-slate-700 dark:bg-slate-800">
              <button
                type="button"
                onClick={() => onChange({ ...value, date: shiftPeriod(stepped, anchor, -1) })}
                disabled={disabled}
                aria-label={`Previous ${STEP_NAMES[stepped]}`}
                className={iconButtonClass}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="min-w-0 flex-1 truncate text-center text-sm font-medium text-gray-900 dark:text-white">
                {range.label}
              </span>
              <button
                type="button"
                onClick={() => onChange({ ...value, date: shiftPeriod(stepped, anchor, 1) })}
                disabled={disabled}
                aria-label={`Next ${STEP_NAMES[stepped]}`}
                className={iconButtonClass}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <DayInput
              aria-label="Go to date"
              title="Go to date"
              value={anchor}
              onCommit={(day) => {
                const date = startOfPeriod(stepped, day);
                if (date !== anchor) onChange({ ...value, date });
              }}
              disabled={disabled}
              className={cn(filterFieldClass, "w-auto")}
            />
            <button
              type="button"
              onClick={() => onChange({ ...value, date: startOfPeriod(stepped, today) })}
              disabled={disabled || containsToday}
              className="btn-secondary px-3 py-2 text-xs"
            >
              Today
            </button>
          </div>
        </div>
      )}

      {value.period === "custom" && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <span className={filterLabelClass}>{dateLabel} from</span>
            <DayInput
              aria-label={`${dateLabel} from`}
              value={value.from}
              onCommit={(day) => setCustom("from", day)}
              disabled={disabled}
              className={filterFieldClass}
            />
          </div>
          <div>
            <span className={filterLabelClass}>{dateLabel} to</span>
            <DayInput
              aria-label={`${dateLabel} to`}
              value={value.to}
              onCommit={(day) => setCustom("to", day)}
              disabled={disabled}
              className={filterFieldClass}
            />
          </div>
        </div>
      )}
    </div>
  );
}
