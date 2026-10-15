"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import type { MonthlyAttendees } from "@/lib/types";

const MonthlyAttendeesChartClient = dynamic(
  () => import("./MonthlyAttendeesChartClient"),
  {
    ssr: false,
    loading: () => <div className="h-64 animate-pulse rounded-lg bg-gray-100 dark:bg-slate-800" />,
  }
);

interface Props {
  /** Pre-computed points (filtered dashboard). When omitted, the current year is fetched. */
  data?: MonthlyAttendees[];
  /** Chart heading. Defaults to the monthly view's heading. */
  title?: string;
  /** Describes the period shown, e.g. "October 2026". */
  periodLabel?: string;
}

export default function MonthlyAttendeesChart({ data: providedData, title, periodLabel }: Props) {
  const [fetchedData, setFetchedData] = useState<MonthlyAttendees[]>([]);
  const [loading, setLoading] = useState(!providedData);

  useEffect(() => {
    if (providedData) return;
    fetch("/api/analytics/monthly-attendees")
      .then((r) => r.json())
      .then((d) => {
        setFetchedData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [providedData]);

  if (loading) {
    return (
      <div className="card p-6">
        <div className="h-64 animate-pulse rounded-lg bg-gray-100 dark:bg-slate-800" />
      </div>
    );
  }

  const data = providedData ?? fetchedData;
  const total = data.reduce((s, d) => s + d.count, 0);

  return (
    <div className="card p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-gray-900 dark:text-white">{title ?? "Attendees per month"}</h2>
          <p className="text-xs text-gray-400 dark:text-slate-400">
            {periodLabel ?? `January to December ${new Date().getFullYear()}`} &middot; {total} total attendees
          </p>
        </div>
      </div>
      <MonthlyAttendeesChartClient data={data} />
    </div>
  );
}
