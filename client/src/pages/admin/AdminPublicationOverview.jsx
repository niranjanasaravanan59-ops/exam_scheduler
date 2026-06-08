import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import { formatDisplayDate, formatDisplayTime } from '../../utils/dateTime';

const numberFormatter = new Intl.NumberFormat();

const formatNumber = (value) => numberFormatter.format(Number(value || 0));

const formatMetric = (value) => {
  const number = Number(value || 0);
  return Number.isInteger(number) ? String(number) : number.toFixed(2);
};

const formatPercent = (value) => `${formatMetric(value)}%`;

function SummaryTile({ label, value, tone = 'blue' }) {
  const tones = {
    blue: 'border-blue-100 bg-blue-50 text-blue-700',
    green: 'border-green-100 bg-green-50 text-green-700',
    yellow: 'border-yellow-100 bg-yellow-50 text-yellow-700',
    purple: 'border-purple-100 bg-purple-50 text-purple-700',
    red: 'border-red-100 bg-red-50 text-red-700',
    slate: 'border-slate-100 bg-slate-50 text-slate-700',
  };

  return (
    <div className={`rounded-lg border p-4 ${tones[tone] || tones.blue}`}>
      <p className="text-xs font-semibold uppercase opacity-80">{label}</p>
      <p className="mt-2 text-2xl font-bold tabular-nums">{value}</p>
    </div>
  );
}

function CountPill({ label, value, className }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${className}`}>
      {label}
      <span className="tabular-nums">{formatNumber(value)}</span>
    </span>
  );
}

export default function AdminPublicationOverview() {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard/publication-overview')
      .then((r) => setOverview(r.data.overview))
      .catch(() => toast.error('Failed to load publication overview'))
      .finally(() => setLoading(false));
  }, []);

  const subjects = overview?.subjects || [];
  const summary = overview?.summary || {};

  const derivedSummary = useMemo(() => {
    const totalStudents = Number(summary.totalStudents || 0);
    const totalMarks = subjects.reduce(
      (sum, subject) => sum + Number(subject.averageMarks || 0) * Number(subject.totalStudents || 0),
      0
    );
    const averageMarks = summary.averageMarks ?? (totalStudents > 0 ? totalMarks / totalStudents : 0);
    const passRate = summary.passRate ?? (
      totalStudents > 0 ? ((totalStudents - Number(summary.failCount || 0)) / totalStudents) * 100 : 0
    );

    return {
      ...summary,
      averageMarks,
      passRate,
    };
  }, [summary, subjects]);

  if (loading) {
    return <div className="flex h-64 items-center justify-center text-gray-400">Loading publication overview...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Exam Publication Overview</h1>
        </div>
        <Link to="/admin/dashboard" className="btn-secondary text-sm">Back to Dashboard</Link>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <SummaryTile label="Completed Exams" value={formatNumber(derivedSummary.completedExams)} tone="blue" />
        <SummaryTile label="Students Attended" value={formatNumber(derivedSummary.totalStudents)} tone="slate" />
        <SummaryTile label="Draft Marks" value={formatNumber(derivedSummary.draftCount)} tone="yellow" />
        <SummaryTile label="Ready Marks" value={formatNumber(derivedSummary.readyCount)} tone="purple" />
        <SummaryTile label="Published Marks" value={formatNumber(derivedSummary.publishedCount)} tone="green" />
        <SummaryTile label="Fail Count" value={formatNumber(derivedSummary.failCount)} tone="red" />
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <SummaryTile label="Pass Rate" value={formatPercent(derivedSummary.passRate)} tone="green" />
        <SummaryTile label="Average Marks" value={formatMetric(derivedSummary.averageMarks)} tone="blue" />
      </div>

      {subjects.length === 0 ? (
        <div className="card py-12 text-center text-gray-400">
          No completed exams found.
        </div>
      ) : (
        <div className="space-y-5">
          {subjects.map((subject) => (
            <section key={subject.subject} className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-100 bg-gray-50 px-5 py-4">
                <div>
                  <h2 className="font-semibold text-gray-900">{subject.subject}</h2>
                  <p className="mt-1 text-xs text-gray-500">
                    {formatNumber(subject.completedExams)} completed exams - {formatNumber(subject.totalStudents)} students attended
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <CountPill label="Draft" value={subject.draftCount} className="bg-gray-100 text-gray-700" />
                  <CountPill label="Ready" value={subject.readyCount} className="bg-yellow-100 text-yellow-800" />
                  <CountPill label="Published" value={subject.publishedCount} className="bg-green-100 text-green-800" />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-white">
                    <tr className="border-b border-gray-100 text-left text-xs font-semibold uppercase text-gray-500">
                      <th className="px-5 py-3">Exam Name</th>
                      <th className="px-4 py-3">Attended</th>
                      <th className="px-4 py-3">Draft</th>
                      <th className="px-4 py-3">Ready</th>
                      <th className="px-4 py-3">Published</th>
                      <th className="px-4 py-3">Pass Rate</th>
                      <th className="px-4 py-3">Average</th>
                      <th className="px-4 py-3">Fail</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(subject.exams || []).map((exam) => (
                      <tr key={exam.id} className="hover:bg-blue-50/40">
                        <td className="px-5 py-4">
                          <p className="font-medium text-gray-900">{exam.subject}</p>
                          <p className="mt-1 text-xs text-gray-500">
                            {exam.department} - Sem {exam.semester} - {formatDisplayDate(exam.examDate)}
                            {' '}
                            {formatDisplayTime(exam.startTime)}-{formatDisplayTime(exam.endTime)} - Hall {exam.hall}
                          </p>
                        </td>
                        <td className="px-4 py-4 font-semibold tabular-nums text-gray-900">{formatNumber(exam.totalStudents)}</td>
                        <td className="px-4 py-4 tabular-nums text-gray-600">{formatNumber(exam.draftCount)}</td>
                        <td className="px-4 py-4 tabular-nums text-yellow-700">{formatNumber(exam.readyCount)}</td>
                        <td className="px-4 py-4 tabular-nums text-green-700">{formatNumber(exam.publishedCount)}</td>
                        <td className="px-4 py-4 font-medium tabular-nums text-gray-900">{formatPercent(exam.passRate)}</td>
                        <td className="px-4 py-4 font-medium tabular-nums text-gray-900">{formatMetric(exam.averageMarks)}</td>
                        <td className="px-4 py-4 font-semibold tabular-nums text-red-600">{formatNumber(exam.failCount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
