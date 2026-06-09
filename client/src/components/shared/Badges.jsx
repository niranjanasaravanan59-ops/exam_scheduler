import React from 'react';

const statusConfig = {
  draft:     { label: 'Draft',     cls: 'bg-slate-100 text-slate-700' },
  ready:     { label: 'Ready',     cls: 'bg-yellow-100 text-yellow-800' },
  published: { label: 'Published', cls: 'bg-emerald-100 text-emerald-800' },
};

const gradeConfig = {
  'O':  { cls: 'bg-purple-100 text-purple-800' },
  'A+': { cls: 'bg-blue-100 text-blue-800' },
  'A':  { cls: 'bg-cyan-100 text-cyan-800' },
  'B':  { cls: 'bg-emerald-100 text-emerald-800' },
  'C':  { cls: 'bg-yellow-100 text-yellow-800' },
  'F':  { cls: 'bg-red-100 text-red-800' },
};

export function StatusBadge({ status }) {
  const cfg = statusConfig[status] || { label: status, cls: 'bg-slate-100 text-slate-700' };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

export function GradeBadge({ grade }) {
  const cfg = gradeConfig[grade] || { cls: 'bg-slate-100 text-slate-700' };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ${cfg.cls}`}>
      {grade || '-'}
    </span>
  );
}

export function RoleBadge({ role }) {
  const map = {
    admin:   'bg-red-100 text-red-800',
    faculty: 'bg-blue-100 text-blue-800',
    student: 'bg-emerald-100 text-emerald-800',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold capitalize ${map[role] || 'bg-slate-100 text-slate-700'}`}>
      {role}
    </span>
  );
}
