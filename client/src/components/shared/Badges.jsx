import React from 'react';

const statusConfig = {
  draft:     { label: 'Draft',     cls: 'bg-gray-100 text-gray-700' },
  ready:     { label: 'Ready',     cls: 'bg-yellow-100 text-yellow-800' },
  published: { label: 'Published', cls: 'bg-green-100 text-green-800' },
};

const gradeConfig = {
  'O':  { cls: 'bg-purple-100 text-purple-800' },
  'A+': { cls: 'bg-blue-100 text-blue-800' },
  'A':  { cls: 'bg-cyan-100 text-cyan-800' },
  'B':  { cls: 'bg-green-100 text-green-800' },
  'C':  { cls: 'bg-yellow-100 text-yellow-800' },
  'F':  { cls: 'bg-red-100 text-red-800' },
};

export function StatusBadge({ status }) {
  const cfg = statusConfig[status] || { label: status, cls: 'bg-gray-100 text-gray-700' };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

export function GradeBadge({ grade }) {
  const cfg = gradeConfig[grade] || { cls: 'bg-gray-100 text-gray-700' };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${cfg.cls}`}>
      {grade}
    </span>
  );
}

export function RoleBadge({ role }) {
  const map = {
    admin:   'bg-red-100 text-red-800',
    faculty: 'bg-blue-100 text-blue-800',
    student: 'bg-green-100 text-green-800',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${map[role] || 'bg-gray-100 text-gray-700'}`}>
      {role}
    </span>
  );
}
