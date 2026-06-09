import React from 'react';
import { MetricCard } from './DashboardUI';

const toneByLegacyColor = {
  blue: 'blue',
  green: 'emerald',
  orange: 'amber',
  red: 'rose',
  purple: 'violet',
  teal: 'cyan',
  indigo: 'violet',
};

export default function KPICard({ label, value, icon, color = 'blue', sub }) {
  return (
    <MetricCard
      label={label}
      value={value}
      icon={icon}
      tone={toneByLegacyColor[color] || color}
      sub={sub}
    />
  );
}
