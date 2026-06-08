import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { GradeBadge } from '../../components/shared/Badges';
import api from '../../utils/api';
import { formatDisplayDate, formatDisplayTime } from '../../utils/dateTime';

const formatNumber = (value) => new Intl.NumberFormat().format(Number(value || 0));

const formatMarks = (value) => {
  if (value === null || value === undefined || value === '') return '-';
  const number = Number(value || 0);
  return Number.isInteger(number) ? String(number) : number.toFixed(2);
};

function SummaryTile({ label, value, tone = 'slate' }) {
  const tones = {
    slate: {
      wrap: 'border-slate-200 bg-white',
      accent: 'bg-slate-400',
      label: 'text-slate-500',
      value: 'text-slate-900',
    },
    yellow: {
      wrap: 'border-amber-200 bg-amber-50/70',
      accent: 'bg-amber-400',
      label: 'text-amber-700',
      value: 'text-amber-900',
    },
    purple: {
      wrap: 'border-violet-200 bg-violet-50/70',
      accent: 'bg-violet-400',
      label: 'text-violet-700',
      value: 'text-violet-900',
    },
    green: {
      wrap: 'border-emerald-200 bg-emerald-50/70',
      accent: 'bg-emerald-400',
      label: 'text-emerald-700',
      value: 'text-emerald-900',
    },
  };
  const cfg = tones[tone] || tones.slate;

  return (
    <div className={`relative min-h-[108px] overflow-hidden rounded-lg border p-5 shadow-sm ${cfg.wrap}`}>
      <span className={`absolute inset-x-0 top-0 h-1 ${cfg.accent}`} />
      <div className="flex h-full flex-col justify-between gap-4">
        <p className={`text-xs font-semibold uppercase ${cfg.label}`}>{label}</p>
        <p className={`text-3xl font-bold tabular-nums ${cfg.value}`}>{formatNumber(value)}</p>
      </div>
    </div>
  );
}

function ResultStatusBadge({ status }) {
  const config = {
    draft: { label: 'Draft', cls: 'bg-gray-100 text-gray-700' },
    ready: { label: 'Ready', cls: 'bg-yellow-100 text-yellow-800' },
    published: { label: 'Published', cls: 'bg-green-100 text-green-800' },
    not_entered: { label: 'Not entered', cls: 'bg-slate-100 text-slate-500' },
    blocked: { label: 'Blocked', cls: 'bg-red-100 text-red-700' },
  };
  const cfg = config[status] || { label: status, cls: 'bg-slate-100 text-slate-600' };

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

export default function AdminResultDetail() {
  const { examId } = useParams();
  const [detail, setDetail] = useState(null);
  const [filters, setFilters] = useState({ status: '', studentName: '' });
  const [loading, setLoading] = useState(true);

  const loadDetail = () => {
    setLoading(true);
    api.get(`/results/exams/${examId}`, {
      params: {
        status: filters.status || undefined,
        studentName: filters.studentName || undefined,
      },
    })
      .then((r) => setDetail(r.data))
      .catch(() => toast.error('Failed to load exam results'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadDetail();
  }, [examId, filters.status, filters.studentName]);

  const handleTransition = async (id, action) => {
    try {
      await api.patch(`/results/${id}/transition`, { action });
      toast.success(`Result moved to ${action}`);
      loadDetail();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Transition failed');
    }
  };

  const handleBulkPublish = async () => {
    if (!confirm('Publish all ready results for this exam?')) return;

    try {
      const { data } = await api.post(`/results/exam/${examId}/publish`);
      toast.success(`${data.count} results published`);
      loadDetail();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to publish ready results');
    }
  };

  const exam = detail?.exam;
  const results = detail?.results || [];

  if (loading && !detail) {
    return <div className="flex h-64 items-center justify-center text-gray-400">Loading exam results...</div>;
  }

  if (!exam) {
    return (
      <div className="mx-auto w-full max-w-7xl space-y-4">
        <Link to="/admin/results" className="btn-secondary inline-flex text-sm">Back to Results</Link>
        <div className="card py-12 text-center text-gray-400">Exam not found.</div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h1 className="break-words text-2xl font-bold text-gray-950">{exam.subject}</h1>
          <div className="mt-3 flex flex-wrap gap-2 text-xs font-medium text-gray-600">
            <span className="rounded-full border border-gray-200 bg-white px-3 py-1">{exam.department}</span>
            <span className="rounded-full border border-gray-200 bg-white px-3 py-1">Sem {exam.semester}</span>
            <span className="rounded-full border border-gray-200 bg-white px-3 py-1">{formatDisplayDate(exam.examDate)}</span>
            <span className="rounded-full border border-gray-200 bg-white px-3 py-1">
              {formatDisplayTime(exam.startTime)} - {formatDisplayTime(exam.endTime)}
            </span>
            <span className="rounded-full border border-gray-200 bg-white px-3 py-1">Hall {exam.hall}</span>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2 lg:justify-end">
          <Link to="/admin/results" className="btn-secondary whitespace-nowrap text-sm">Back to Results</Link>
          {Number(exam.readyCount || 0) > 0 && (
            <button type="button" onClick={handleBulkPublish} className="btn-success whitespace-nowrap text-sm">
              Publish All Ready
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryTile label="Attended" value={exam.attendedCount} />
        <SummaryTile label="Not Ready" value={exam.notReadyCount} tone="yellow" />
        <SummaryTile label="Ready" value={exam.readyCount} tone="purple" />
        <SummaryTile label="Published" value={exam.publishedCount} tone="green" />
      </div>

      <div className="card p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[220px_minmax(0,1fr)]">
          <label className="sr-only" htmlFor="result-status-filter">Filter by status</label>
          <select
            id="result-status-filter"
            className="input w-full"
            value={filters.status}
            onChange={(e) => setFilters((current) => ({ ...current, status: e.target.value }))}
          >
            <option value="">All Statuses</option>
            <option value="draft">Not Ready</option>
            <option value="ready">Ready</option>
            <option value="published">Published</option>
            <option value="blocked">Blocked</option>
          </select>
          <label className="sr-only" htmlFor="student-name-filter">Search student name</label>
          <input
            id="student-name-filter"
            className="input w-full"
            placeholder="Student name..."
            value={filters.studentName}
            onChange={(e) => setFilters((current) => ({ ...current, studentName: e.target.value }))}
          />
        </div>
      </div>

      <div className="card overflow-hidden p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-gray-900">Students</h2>
          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
            {formatNumber(results.length)} shown
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] table-fixed text-sm">
            <colgroup>
              <col className="w-[30%]" />
              <col className="w-[15%]" />
              <col className="w-[11%]" />
              <col className="w-[11%]" />
              <col className="w-[16%]" />
              <col className="w-[17%]" />
            </colgroup>
            <thead className="bg-gray-50">
              <tr className="border-b border-gray-100 text-left text-xs font-semibold uppercase text-gray-500">
                <th className="px-5 py-3">Student</th>
                <th className="px-4 py-3">Roll No</th>
                <th className="px-4 py-3 text-center">Marks</th>
                <th className="px-4 py-3 text-center">Grade</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {results.map((result) => {
                const absent = result.attendanceStatus === 'absent' || result.status === 'blocked';

                return (
                  <tr key={result.id} className={absent ? 'bg-red-50/40 hover:bg-red-50' : 'hover:bg-blue-50/40'}>
                    <td className="px-5 py-4">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-gray-900">{result.student?.name}</p>
                        <p className="mt-1 truncate text-xs text-gray-500">{result.student?.email}</p>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-gray-600">{result.student?.rollNo || '-'}</td>
                    <td className="px-4 py-4 text-center font-semibold tabular-nums text-gray-900">{formatMarks(result.marks)}</td>
                    <td className="px-4 py-4 text-center">
                      {result.grade ? <GradeBadge grade={result.grade} /> : <span className="text-gray-300">-</span>}
                    </td>
                    <td className="px-4 py-4">
                      <ResultStatusBadge status={result.status} />
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap justify-end gap-2">
                        {result.status === 'draft' && (
                          <button
                            type="button"
                            onClick={() => handleTransition(result.id, 'ready')}
                            className="rounded-md bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-100"
                          >
                            Ready
                          </button>
                        )}
                        {result.status === 'ready' && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleTransition(result.id, 'published')}
                              className="rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                            >
                              Publish
                            </button>
                            <button
                              type="button"
                              onClick={() => handleTransition(result.id, 'draft')}
                              className="rounded-md bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-200"
                            >
                              Back to Draft
                            </button>
                          </>
                        )}
                        {result.status === 'published' && (
                          <span className="text-xs font-medium text-gray-400">Published</span>
                        )}
                        {result.status === 'not_entered' && (
                          <span className="text-xs font-medium text-gray-400">No marks</span>
                        )}
                        {absent && (
                          <span className="text-xs font-medium text-red-500">Absent</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {!loading && results.length === 0 && (
          <div className="py-12 text-center text-sm text-gray-400">No student results found.</div>
        )}

        {loading && detail && (
          <div className="border-t border-gray-100 py-3 text-center text-xs text-gray-400">Refreshing...</div>
        )}
      </div>
    </div>
  );
}
