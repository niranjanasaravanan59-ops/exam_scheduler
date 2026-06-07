import React, { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import KPICard from '../../components/shared/KPICard';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const COLORS = { O: '#7c3aed', 'A+': '#2563eb', A: '#0891b2', B: '#16a34a', C: '#ca8a04', F: '#dc2626' };

export default function StudentDashboard() {
  const [data, setData] = useState(null);
  useEffect(() => {
    api.get('/dashboard').then((r) => setData(r.data.dashboard)).catch(() => toast.error('Failed to load'));
  }, []);

  if (!data) return <div className="flex items-center justify-center h-64 text-gray-400">Loading...</div>;
  const { kpis } = data;
  const gradeData = Object.entries(kpis.gradeDistribution || {}).map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">My Dashboard</h1>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard label="Upcoming Exams" value={kpis.upcomingExams} icon="📅" color="blue" />
        <KPICard label="Published Results" value={kpis.publishedResults} icon="📋" color="green" />
        <KPICard label="Average Marks" value={kpis.averageMarks} icon="📊" color="purple" />
        <KPICard label="Pass %" value={`${kpis.passPercentage}%`} icon="🏆" color="teal" />
      </div>
      {gradeData.length > 0 && (
        <div className="card max-w-sm">
          <h2 className="font-semibold text-gray-800 mb-3">Grade Distribution</h2>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={gradeData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label>
                {gradeData.map((entry) => <Cell key={entry.name} fill={COLORS[entry.name] || '#6b7280'} />)}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
