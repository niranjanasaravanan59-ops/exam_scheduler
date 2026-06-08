import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import KPICard from '../../components/shared/KPICard';
import api from '../../utils/api';
import toast from 'react-hot-toast';

export default function StudentDashboard() {
  const [data, setData] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/dashboard').then((r) => setData(r.data.dashboard)).catch(() => toast.error('Failed to load'));
  }, []);

  if (!data) return <div className="flex items-center justify-center h-64 text-gray-400">Loading...</div>;
  const { kpis } = data;

  const cards = [
    {
      label: 'Total Exams',
      value: kpis.totalExams,
      icon: '📚',
      color: 'blue',
      onClick: () => navigate('/student/schedule'),
      subtitle: 'View all scheduled exams',
    },
    {
      label: 'Upcoming Exams',
      value: kpis.upcomingExams,
      icon: '📅',
      color: 'green',
      onClick: () => navigate('/student/schedule?tab=upcoming'),
      subtitle: 'See your upcoming exam schedule',
    },
    {
      label: 'Completed Exams',
      value: kpis.completedExams,
      icon: '✅',
      color: 'purple',
      onClick: () => navigate('/student/schedule?tab=completed'),
      subtitle: 'View your completed exams',
    },
    {
      label: 'Average Marks',
      value: kpis.averageMarks,
      icon: '📊',
      color: 'teal',
      onClick: () => navigate('/student/results'),
      subtitle: 'See your result details',
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">My Dashboard</h1>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <button
            key={card.label}
            type="button"
            onClick={card.onClick}
            className="group text-left rounded-lg transition duration-150 ease-in-out hover:-translate-y-0.5 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            title={card.subtitle}
          >
            <KPICard
              label={card.label}
              value={card.value}
              icon={card.icon}
              color={card.color}
              sub={card.subtitle}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
