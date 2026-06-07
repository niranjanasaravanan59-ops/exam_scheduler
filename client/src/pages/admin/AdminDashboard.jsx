import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import toast from 'react-hot-toast';
import KPICard from '../../components/shared/KPICard';
import api from '../../utils/api';
import { formatDisplayDate, formatDisplayTime, isExamEnded } from '../../utils/dateTime';

const GRADE_COLORS = { O: '#7c3aed', 'A+': '#2563eb', A: '#0891b2', B: '#16a34a', C: '#ca8a04', F: '#dc2626' };

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard')
      .then((r) => setData(r.data.dashboard))
      .catch(() => toast.error('Failed to load dashboard'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">Loading dashboard...</div>;
  if (!data) return null;

  const { kpis, recentExams } = data;
  const gradeData = Object.entries(kpis.gradeDistribution || {}).map(([grade, count]) => ({ grade, count }));
  const cards = [
    { label: 'Upcoming Exams', value: kpis.upcomingExams, icon: '📅', color: 'blue' },
    { label: 'Exams Completed', value: kpis.examsCompleted, icon: '✅', color: 'green' },
    { label: 'Pending Publication', value: kpis.resultsPendingPublication, icon: '⏳', color: 'orange' },
    { label: 'Finished Publication', value: kpis.finishedPublications ?? 0, icon: '📢', color: 'indigo' },
    { label: 'Pass %', value: `${kpis.overallPassPercentage}%`, icon: '📈', color: 'teal' },
    { label: 'Students', value: kpis.totalStudents, icon: '👨‍🎓', color: 'purple' },
    { label: 'Faculty', value: kpis.totalFaculty, icon: '👨‍🏫', color: 'red' },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        {cards.map((card) => (
          <KPICard key={card.label} {...card} />
        ))}
      </div>

      <div className={`grid grid-cols-1 gap-6 ${gradeData.length > 0 ? 'xl:grid-cols-5' : ''}`}>
        <div className={`card ${gradeData.length > 0 ? 'xl:col-span-3' : ''}`}>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="font-semibold text-gray-800">Recent Exams</h2>
            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
              {recentExams?.length || 0} total
            </span>
          </div>

          {recentExams?.length ? (
            <div className="overflow-hidden rounded-lg border border-gray-100">
              {recentExams.map((exam) => {
                const completed = isExamEnded(exam.examDate, exam.endTime);
                return (
                  <div
                    key={exam.id}
                    className="grid grid-cols-1 gap-3 border-b border-gray-100 bg-white p-3 text-sm transition-colors last:border-b-0 hover:bg-blue-50/40 md:grid-cols-[1fr_auto_auto] md:items-center"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-gray-900">{exam.subject}</p>
                      <p className="text-xs text-gray-500">{exam.department} · Sem {exam.semester}</p>
                    </div>
                    <div className="text-left md:text-right">
                      <p className="text-gray-700" title={exam.examDate}>{formatDisplayDate(exam.examDate)}</p>
                      <p className="text-xs text-gray-500">
                        {formatDisplayTime(exam.startTime)} - {formatDisplayTime(exam.endTime)} · Hall {exam.hall}
                      </p>
                    </div>
                    <span className={`inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${completed ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                      {completed ? 'Completed' : 'Upcoming'}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-gray-200 p-8 text-center text-sm text-gray-400">No exams yet</div>
          )}
        </div>

        {gradeData.length > 0 && (
          <div className="card xl:col-span-2">
            <h2 className="font-semibold text-gray-800 mb-4">Grade Distribution</h2>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={gradeData}>
                <XAxis dataKey="grade" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {gradeData.map((entry) => (
                    <Cell key={entry.grade} fill={GRADE_COLORS[entry.grade] || '#6b7280'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
