import React from 'react';

export default function KPICard({ label, value, icon, color = 'blue', sub }) {
  const colors = {
    blue:   'from-blue-500 to-blue-600',
    green:  'from-green-500 to-green-600',
    orange: 'from-orange-500 to-orange-600',
    red:    'from-red-500 to-red-600',
    purple: 'from-purple-500 to-purple-600',
    teal:   'from-teal-500 to-teal-600',
    indigo: 'from-indigo-500 to-indigo-600',
  };
  return (
    <div className={`group min-h-[104px] rounded-lg text-white p-4 bg-gradient-to-br ${colors[color] || colors.blue} shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/18 text-xl transition-transform duration-200 group-hover:scale-105">{icon}</span>
        <span className="text-3xl font-bold leading-none tabular-nums">{value}</span>
      </div>
      <p className="text-sm font-semibold leading-tight opacity-95">{label}</p>
      {sub && <p className="text-xs opacity-75 mt-1">{sub}</p>}
    </div>
  );
}
