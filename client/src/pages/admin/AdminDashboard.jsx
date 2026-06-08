import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import KPICard from '../../components/shared/KPICard';
import api from '../../utils/api';
import { formatDisplayDate, formatDisplayTime, isExamEnded } from '../../utils/dateTime';

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard')
      .then((r) => setData(r.data.dashboard))
      .catch(() => toast.error('Failed to load dashboard'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex h-64 items-center justify-center text-gray-400">Loading dashboard...</div>;
  if (!data) return null;

  const { kpis } = data;
  const exams = data.exams || [];
  const publicationRecordCount = Number(kpis.resultsPendingPublication || 0) + Number(kpis.finishedPublications || 0);
  const examCount = exams.length;
  const countedExamTotal = Number(kpis.upcomingExams || 0) + Number(kpis.examsCompleted || 0);
  const totalExamCount = Number(kpis.totalExams ?? (countedExamTotal || examCount));
  const cards = [
    { label: 'Upcoming Exams', value: kpis.upcomingExams, icon: '\u{1F4C5}', color: 'blue' },
    { label: 'Exams Completed', value: kpis.examsCompleted, icon: '\u2705', color: 'green' },
    {
      label: 'Publication Overview',
      value: publicationRecordCount,
      icon: '\u{1F4CA}',
      color: 'indigo',
      sub: 'Result records',
      to: '/admin/publication-overview',
    },
    { label: 'Students', value: kpis.totalStudents, icon: '\u{1F393}', color: 'purple' },
    { label: 'Faculty', value: kpis.totalFaculty, icon: '\u{1F3EB}', color: 'red' },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {cards.map((card) => {
          const content = <KPICard {...card} />;

          if (card.to) {
            return (
              <Link
                key={card.label}
                to={card.to}
                aria-label="Open exam publication overview"
                className="block rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                {content}
              </Link>
            );
          }

          return <KPICard key={card.label} {...card} />;
        })}
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div className="card">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="font-semibold text-gray-800">All Exams</h2>
            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
              {totalExamCount} total
            </span>
          </div>

          {exams.length ? (
            <div className="overflow-hidden rounded-lg border border-gray-100">
              {exams.map((exam) => {
                const completed = isExamEnded(exam.examDate, exam.endTime);
                return (
                  <div
                    key={exam.id}
                    className="grid grid-cols-1 gap-3 border-b border-gray-100 bg-white p-3 text-sm transition-colors last:border-b-0 hover:bg-blue-50/40 md:grid-cols-[1fr_auto_auto] md:items-center"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-gray-900">{exam.subject}</p>
                      <p className="text-xs text-gray-500">{exam.department} - Sem {exam.semester}</p>
                    </div>
                    <div className="text-left md:text-right">
                      <p className="text-gray-700" title={exam.examDate}>{formatDisplayDate(exam.examDate)}</p>
                      <p className="text-xs text-gray-500">
                        {formatDisplayTime(exam.startTime)} - {formatDisplayTime(exam.endTime)} - Hall {exam.hall}
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
      </div>
    </div>
  );
}
