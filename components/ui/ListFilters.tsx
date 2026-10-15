"use client";

import { useState } from "react";
import { ChevronDown, SlidersHorizontal } from "lucide-react";

import { cn } from "@/lib/utils";
import { NO_PERIOD, resolvePeriodRange, type PeriodSelection } from "@/lib/period";
import PeriodFilter from "@/components/ui/PeriodFilter";

type Props = {
  period: PeriodSelection;
  onPeriodChange: (next: PeriodSelection) => void;
  /** What the period applies to, e.g. "Event date". */
  dateLabel: string;
};

/** Collapsible "Filters" button that opens a period filter for a list. */
export default function ListFilters({ period, onPeriodChange, dateLabel }: Props) {
  const [open, setOpen] = useState(false);
  const range = resolvePeriodRange(period);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Filters
          {range && (
            <span className="rounded-full bg-indigo-600 px-1.5 text-[10px] font-semibold leading-4 text-white">
              1
            </span>
          )}
          <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
        </button>

        {range && (
          <>
            <span className="text-xs text-gray-500 dark:text-slate-400">
              {dateLabel}: <span className="font-medium text-gray-700 dark:text-slate-200">{range.label}</span>
            </span>
            <button
              type="button"
              onClick={() => onPeriodChange(NO_PERIOD)}
              className="text-xs font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-300 dark:hover:text-indigo-200"
            >
              Clear filters
            </button>
          </>
        )}
      </div>

      {open && (
        <div className="mt-3 pb-2">
          <PeriodFilter
            value={period}
            onChange={onPeriodChange}
            dateLabel={dateLabel}
            compact
          />
        </div>
      )}
    </div>
  );
}
