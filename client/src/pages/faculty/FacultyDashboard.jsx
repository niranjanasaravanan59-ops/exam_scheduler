import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../utils/api';
import KPICard from '../../components/shared/KPICard';
import toast from 'react-hot-toast';

export default function FacultyDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard')
      .then((r) => setData(r.data.dashboard))
      .catch(() => toast.error('Failed to load dashboard'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">Loading...</div>;
  if (!data) return null;

  const { kpis } = data;
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900">Faculty Dashboard</h1>
        <Link to="/faculty/import" className="btn-primary text-sm">Bulk Import Results</Link>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard label="Subjects Pending Evaluation" value={kpis.subjectsPendingEvaluation} icon="📝" color="orange" />
        <KPICard label="Average Marks" value={kpis.averageMarks} icon="📊" color="blue" />
        <KPICard label="Upcoming Assigned Exams" value={kpis.upcomingAssignedExams} icon="📅" color="purple" />
        <KPICard label="Completed Exams" value={kpis.totalCompletedExams} icon="✅" color="green" />
      </div>
    </div>
  );
}
