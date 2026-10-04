

const base = 'skeleton-shimmer rounded-md bg-gray-200 motion-reduce:animate-none';

export const Skeleton = ({ className = '', width, height, circle = false, style }) => (
  <div
    aria-hidden="true"
    className={`${base} ${circle ? 'rounded-full' : ''} ${className}`}
    style={{ width, height, ...style }}
  />
);

export const SkeletonAvatar = ({ size = 40, className = '' }) => (
  <Skeleton circle width={size} height={size} className={`shrink-0 ${className}`} />
);

export const SkeletonText = ({ lines = 3, widths, className = '', lineHeight = 12, gap = 8 }) => {
  const ws = widths || Array.from({ length: lines }, (_, i) => (i === lines - 1 ? '60%' : '100%'));
  return (
    <div className={`w-full ${className}`} aria-hidden="true">
      {ws.map((w, i) => (
        <Skeleton key={i} style={{ width: w, height: lineHeight, marginTop: i === 0 ? 0 : gap }} />
      ))}
    </div>
  );
};

const Shell = ({ label = 'Loading content', className = '', children, busy = true }) => (
  <div role="status" aria-label={label} aria-busy={busy} className={className}>
    {children}
  </div>
);

/** Header card: title bar + subtitle + trailing action pill. */
export const SkeletonHeaderCard = ({ className = '' }) => (
  <Shell className={`bg-white p-5 rounded-2xl shadow-sm border border-gray-50 ${className}`}>
    <div className="flex flex-col md:flex-row justify-between gap-4">
      <div className="flex items-center gap-4">
        <Skeleton width={36} height={36} style={{ borderRadius: 8 }} />
        <div className="space-y-2">
          <Skeleton style={{ width: 180, height: 12 }} />
          <Skeleton style={{ width: 240, height: 16 }} />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Skeleton style={{ width: 220, height: 36, borderRadius: 8 }} />
        <Skeleton style={{ width: 130, height: 36, borderRadius: 8 }} />
      </div>
    </div>
  </Shell>
);

/** KPI stat cards (e.g. Avg Final Grade row). */
export const SkeletonMetricCards = ({ count = 4, className = '' }) => (
  <Shell
    className={`grid grid-cols-2 lg:grid-cols-4 gap-4 ${className}`}
    label="Loading summary cards"
  >
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-50 space-y-3">
        <Skeleton style={{ width: '55%', height: 10 }} />
        <Skeleton style={{ width: '40%', height: 28, borderRadius: 8 }} />
      </div>
    ))}
  </Shell>
);

/** Table inside the app's standard rounded card shell. */
export const SkeletonTable = ({ cols = 5, rows = 8, className = '' }) => (
  <Shell
    className={`bg-white rounded-2xl shadow-sm border border-gray-50 overflow-hidden ${className}`}
    label="Loading table data"
  >
    <div className="overflow-x-auto">
      <div className="min-w-max w-full p-4 space-y-3">
        <div className="flex gap-3">
          {Array.from({ length: cols }).map((_, i) => (
            <Skeleton key={i} style={{ width: i === 0 ? 180 : 110, height: 14 }} />
          ))}
        </div>
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex gap-3 items-center">
            {Array.from({ length: cols }).map((_, c) => (
              <Skeleton
                key={c}
                style={{
                  width: c === 0 ? 180 : 110,
                  height: c === 0 ? 14 : 22,
                  borderRadius: c === 0 ? 4 : 11,
                }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  </Shell>
);

/** Generic stacked list rows (users, departments, courses, activity feed). */
export const SkeletonList = ({ rows = 5, avatar = false, className = '' }) => (
  <Shell className={`space-y-3 ${className}`} label="Loading list">
    {Array.from({ length: rows }).map((_, i) => (
      <div
        key={i}
        className="bg-white rounded-xl p-4 border border-gray-50 shadow-sm flex items-center gap-3"
      >
        {avatar && <SkeletonAvatar />}
        <div className="flex-1 space-y-2">
          <Skeleton style={{ width: `${70 - (i % 3) * 12}%`, height: 14 }} />
          <Skeleton style={{ width: `${45 - (i % 2) * 10}%`, height: 10 }} />
        </div>
        <Skeleton style={{ width: 64, height: 28, borderRadius: 8 }} />
      </div>
    ))}
  </Shell>
);

/** Assignment/class card grid (teacher dashboard). */
export const SkeletonClassGrid = ({ count = 4, className = '' }) => (
  <Shell className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${className}`} label="Loading classes">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="bg-white rounded-xl p-5 shadow-sm border border-gray-50 space-y-3">
        <Skeleton style={{ width: '35%', height: 10 }} />
        <div className="space-y-2">
          {[0, 1, 2].map((r) => (
            <div key={r} className="flex items-center justify-between px-3 py-2 rounded-lg bg-gray-50 border border-gray-100">
              <div className="space-y-1.5 flex-1">
                <Skeleton style={{ width: '70%', height: 13 }} />
                <Skeleton style={{ width: '45%', height: 10 }} />
              </div>
              <Skeleton style={{ width: 52, height: 20, borderRadius: 10 }} />
            </div>
          ))}
        </div>
      </div>
    ))}
  </Shell>
);

/** Simple settings/profile card. */
export const SkeletonSettingsCard = ({ className = '' }) => (
  <Shell className={`bg-white rounded-2xl shadow-sm border border-gray-50 p-6 max-w-3xl space-y-5 ${className}`} label="Loading settings">
    <div className="flex items-center gap-4">
      <SkeletonAvatar size={56} />
      <div className="space-y-2 flex-1">
        <Skeleton style={{ width: '40%', height: 16 }} />
        <Skeleton style={{ width: '60%', height: 11 }} />
      </div>
    </div>
    {[0, 1, 2].map((i) => (
      <div key={i} className="space-y-2">
        <Skeleton style={{ width: 120, height: 10 }} />
        <Skeleton style={{ width: '100%', height: 38, borderRadius: 8 }} />
      </div>
    ))}
    <Skeleton style={{ width: 140, height: 38, borderRadius: 8 }} />
  </Shell>
);

/** Facebook-style feed post (avatar + name + meta + text lines + media + actions). */
export const SkeletonPost = ({ className = '' }) => (
  <div className={`bg-white rounded-2xl shadow-sm border border-gray-50 p-5 space-y-4 ${className}`} aria-hidden="true">
    <div className="flex items-center gap-3">
      <SkeletonAvatar />
      <div className="space-y-1.5 flex-1">
        <Skeleton style={{ width: '35%', height: 13 }} />
        <Skeleton style={{ width: '22%', height: 10 }} />
      </div>
    </div>
    <SkeletonText lines={3} />
    <Skeleton className="w-full" style={{ height: 180, borderRadius: 12 }} />
    <div className="flex gap-3 pt-1">
      <Skeleton style={{ width: 90, height: 30, borderRadius: 8 }} />
      <Skeleton style={{ width: 90, height: 30, borderRadius: 8 }} />
      <Skeleton style={{ width: 90, height: 30, borderRadius: 8 }} />
    </div>
  </div>
);

/** Stack of feed posts. */
export const SkeletonFeed = ({ count = 3, className = '' }) => (
  <Shell className={`space-y-4 ${className}`} label="Loading feed">
    {Array.from({ length: count }).map((_, i) => (
      <SkeletonPost key={i} />
    ))}
  </Shell>
);

export default Skeleton;
