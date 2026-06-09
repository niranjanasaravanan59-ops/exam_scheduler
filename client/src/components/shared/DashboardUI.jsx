import React from 'react';
import { Link } from 'react-router-dom';

const iconPaths = {
  activity: (
    <>
      <path d="M3 12h4l3-7 4 14 3-7h4" />
    </>
  ),
  alert: (
    <>
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
      <path d="M10.3 4.2 2.8 17.4A2 2 0 0 0 4.5 20h15a2 2 0 0 0 1.7-2.6L13.7 4.2a2 2 0 0 0-3.4 0Z" />
    </>
  ),
  award: (
    <>
      <circle cx="12" cy="8" r="5" />
      <path d="m8.8 12.1-.9 7 4.1-2.4 4.1 2.4-.9-7" />
    </>
  ),
  bell: (
    <>
      <path d="M15 17H9" />
      <path d="M18 15V9a6 6 0 0 0-12 0v6l-2 2h16l-2-2Z" />
      <path d="M10 20a2 2 0 0 0 4 0" />
    </>
  ),
  book: (
    <>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5Z" />
    </>
  ),
  building: (
    <>
      <path d="M3 21h18" />
      <path d="M5 21V5a2 2 0 0 1 2-2h7v18" />
      <path d="M14 9h3a2 2 0 0 1 2 2v10" />
      <path d="M8 7h2M8 11h2M8 15h2" />
    </>
  ),
  calendar: (
    <>
      <path d="M8 2v4M16 2v4" />
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M3 10h18" />
    </>
  ),
  chart: (
    <>
      <path d="M3 3v18h18" />
      <rect x="7" y="12" width="3" height="5" rx="1" />
      <rect x="12" y="8" width="3" height="9" rx="1" />
      <rect x="17" y="5" width="3" height="12" rx="1" />
    </>
  ),
  check: (
    <>
      <path d="m5 12 4 4L19 6" />
    </>
  ),
  chevronRight: (
    <>
      <path d="m9 18 6-6-6-6" />
    </>
  ),
  clipboard: (
    <>
      <rect x="8" y="2" width="8" height="4" rx="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="M8 12h8M8 16h5" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  download: (
    <>
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M5 21h14" />
    </>
  ),
  edit: (
    <>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </>
  ),
  file: (
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
      <path d="M14 2v6h6M8 13h8M8 17h5" />
    </>
  ),
  filter: (
    <>
      <path d="M4 5h16M7 12h10M10 19h4" />
    </>
  ),
  graduation: (
    <>
      <path d="m22 10-10-5-10 5 10 5 10-5Z" />
      <path d="M6 12v5c3 3 9 3 12 0v-5" />
    </>
  ),
  grid: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </>
  ),
  import: (
    <>
      <path d="M12 3v10" />
      <path d="m8 9 4 4 4-4" />
      <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </>
  ),
  logOut: (
    <>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="m16 17 5-5-5-5" />
      <path d="M21 12H9" />
    </>
  ),
  menu: (
    <>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </>
  ),
  publish: (
    <>
      <path d="M12 3v12" />
      <path d="m7 8 5-5 5 5" />
      <path d="M5 21h14" />
    </>
  ),
  result: (
    <>
      <path d="M8 7h8M8 11h8M8 15h4" />
      <rect x="5" y="3" width="14" height="18" rx="2" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </>
  ),
  shield: (
    <>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
      <path d="m9 12 2 2 4-5" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1" />
    </>
  ),
  upload: (
    <>
      <path d="M12 21V9" />
      <path d="m7 14 5-5 5 5" />
      <path d="M5 3h14" />
    </>
  ),
  userPlus: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M19 8v6M22 11h-6" />
    </>
  ),
  users: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="8.5" cy="7" r="4" />
      <path d="M20 8v6M23 11h-6" />
    </>
  ),
  workflow: (
    <>
      <rect x="3" y="4" width="6" height="6" rx="1" />
      <rect x="15" y="4" width="6" height="6" rx="1" />
      <rect x="9" y="15" width="6" height="6" rx="1" />
      <path d="M9 7h6M18 10v2a3 3 0 0 1-3 3M6 10v2a3 3 0 0 0 3 3" />
    </>
  ),
};

export const dashboardTones = {
  blue: {
    accent: 'bg-blue-600',
    border: 'border-blue-200',
    chip: 'bg-blue-50 text-blue-700 ring-blue-100',
    icon: 'bg-blue-50 text-blue-700',
    line: 'bg-blue-600',
    soft: 'bg-blue-50',
    text: 'text-blue-700',
  },
  emerald: {
    accent: 'bg-emerald-600',
    border: 'border-emerald-200',
    chip: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    icon: 'bg-emerald-50 text-emerald-700',
    line: 'bg-emerald-600',
    soft: 'bg-emerald-50',
    text: 'text-emerald-700',
  },
  amber: {
    accent: 'bg-amber-500',
    border: 'border-amber-200',
    chip: 'bg-amber-50 text-amber-800 ring-amber-100',
    icon: 'bg-amber-50 text-amber-700',
    line: 'bg-amber-500',
    soft: 'bg-amber-50',
    text: 'text-amber-700',
  },
  rose: {
    accent: 'bg-rose-600',
    border: 'border-rose-200',
    chip: 'bg-rose-50 text-rose-700 ring-rose-100',
    icon: 'bg-rose-50 text-rose-700',
    line: 'bg-rose-600',
    soft: 'bg-rose-50',
    text: 'text-rose-700',
  },
  violet: {
    accent: 'bg-violet-600',
    border: 'border-violet-200',
    chip: 'bg-violet-50 text-violet-700 ring-violet-100',
    icon: 'bg-violet-50 text-violet-700',
    line: 'bg-violet-600',
    soft: 'bg-violet-50',
    text: 'text-violet-700',
  },
  cyan: {
    accent: 'bg-cyan-600',
    border: 'border-cyan-200',
    chip: 'bg-cyan-50 text-cyan-700 ring-cyan-100',
    icon: 'bg-cyan-50 text-cyan-700',
    line: 'bg-cyan-600',
    soft: 'bg-cyan-50',
    text: 'text-cyan-700',
  },
  slate: {
    accent: 'bg-slate-700',
    border: 'border-slate-200',
    chip: 'bg-slate-100 text-slate-700 ring-slate-200',
    icon: 'bg-slate-100 text-slate-700',
    line: 'bg-slate-700',
    soft: 'bg-slate-50',
    text: 'text-slate-700',
  },
};

export const formatCompactNumber = (value) =>
  new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(Number(value || 0));

export function Icon({ name = 'activity', className = 'h-5 w-5' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      aria-hidden="true"
      className={className}
    >
      {iconPaths[name] || iconPaths.activity}
    </svg>
  );
}

export function MetricCard({ label, value, icon = 'activity', tone = 'blue', sub, footer }) {
  const styles = dashboardTones[tone] || dashboardTones.blue;
  const iconContent = iconPaths[icon] ? (
    <Icon name={icon} className="h-5 w-5" />
  ) : (
    <span className="text-sm font-bold">{String(icon || label || '').slice(0, 2).toUpperCase()}</span>
  );

  return (
    <div className={`relative min-h-[132px] overflow-hidden rounded-lg border bg-white p-4 shadow-sm ${styles.border}`}>
      <div className={`absolute inset-x-0 top-0 h-1 ${styles.accent}`} />
      <div className="flex items-start justify-between gap-4">
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${styles.icon}`}>
          {iconContent}
        </span>
        <span className="text-3xl font-bold leading-none tracking-normal text-slate-950 tabular-nums">
          {formatCompactNumber(value)}
        </span>
      </div>
      <p className="mt-4 text-sm font-semibold leading-tight text-slate-700">{label}</p>
      {sub && <p className="mt-1 text-xs leading-5 text-slate-500">{sub}</p>}
      {footer && <div className="mt-3 text-xs font-medium text-slate-500">{footer}</div>}
    </div>
  );
}

export function ActionTile({ title, description, icon = 'activity', tone = 'blue', to, meta, children }) {
  const styles = dashboardTones[tone] || dashboardTones.blue;
  const content = (
    <div className={`group flex h-full min-h-[154px] flex-col rounded-lg border bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${styles.border}`}>
      <div className="flex items-start justify-between gap-3">
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${styles.icon}`}>
          <Icon name={icon} className="h-5 w-5" />
        </span>
        {to && (
          <span className={`grid h-8 w-8 place-items-center rounded-lg ${styles.chip}`}>
            <Icon name="chevronRight" className="h-4 w-4" />
          </span>
        )}
      </div>
      <div className="mt-4 flex-1">
        <h3 className="text-sm font-bold text-slate-950">{title}</h3>
        {description && <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>}
      </div>
      {meta && (
        <span className={`mt-4 inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${styles.chip}`}>
          {meta}
        </span>
      )}
      {children}
    </div>
  );

  if (!to) return content;

  return (
    <Link to={to} className="block h-full rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
      {content}
    </Link>
  );
}

export function StatusPill({ children, tone = 'slate' }) {
  const styles = dashboardTones[tone] || dashboardTones.slate;
  return (
    <span className={`inline-flex w-fit items-center rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${styles.chip}`}>
      {children}
    </span>
  );
}

export function ProgressBar({ value, max = 100, tone = 'blue', label, rightLabel }) {
  const styles = dashboardTones[tone] || dashboardTones.blue;
  const numericMax = Math.max(1, Number(max || 0));
  const percent = Math.max(0, Math.min(100, (Number(value || 0) / numericMax) * 100));

  return (
    <div>
      {(label || rightLabel) && (
        <div className="mb-2 flex items-center justify-between gap-3 text-xs font-semibold text-slate-600">
          <span>{label}</span>
          <span className="tabular-nums">{rightLabel ?? `${Math.round(percent)}%`}</span>
        </div>
      )}
      <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${styles.line}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

export function EmptyState({ title, description }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
      <p className="text-sm font-semibold text-slate-700">{title}</p>
      {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
    </div>
  );
}
