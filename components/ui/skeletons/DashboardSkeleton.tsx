export default function DashboardSkeleton() {
  return (
    <div className="space-y-6 p-4 lg:p-6 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="h-7 w-40 rounded-md bg-gray-200" />
          <div className="mt-2 h-4 w-56 rounded-md bg-gray-100" />
        </div>

        <div className="h-10 w-36 rounded-xl bg-gray-200" />
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="h-3 w-24 rounded bg-gray-200" />
                <div className="mt-4 h-8 w-14 rounded bg-gray-300" />
              </div>

              <div className="h-10 w-10 rounded-xl bg-gray-200" />
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="mb-3 h-4 w-20 rounded bg-gray-200" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index}>
              <div className="mb-1.5 h-3 w-24 rounded bg-gray-100" />
              <div className="h-9 rounded-lg bg-gray-100" />
            </div>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="mb-5 h-5 w-44 rounded bg-gray-200" />

        <div className="flex h-72 items-end justify-between gap-2">
          {Array.from({ length: 12 }).map((_, index) => (
            <div
              key={index}
              className="flex-1 rounded-t bg-gray-200"
              style={{
                height: `${35 + ((index * 17) % 50)}%`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Recent Events */}
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div className="h-5 w-36 rounded bg-gray-200" />
          <div className="h-4 w-16 rounded bg-gray-100" />
        </div>

        {Array.from({ length: 5 }).map((_, index) => (
          <div
            key={index}
            className="flex items-center justify-between border-b border-gray-50 px-5 py-4 last:border-b-0"
          >
            <div>
              <div className="h-4 w-40 rounded bg-gray-200" />
              <div className="mt-2 h-3 w-24 rounded bg-gray-100" />
            </div>

            <div className="h-6 w-20 rounded-full bg-gray-200" />
          </div>
        ))}
      </div>
    </div>
  );
}