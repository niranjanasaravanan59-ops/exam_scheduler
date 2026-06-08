import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import { formatDisplayDate, formatDisplayTime } from '../../utils/dateTime';

const formatNumber = (value) => new Intl.NumberFormat().format(Number(value || 0));

function CountCell({ value, tone = 'gray' }) {
  const tones = {
    gray: 'bg-gray-100 text-gray-700',
    yellow: 'bg-yellow-100 text-yellow-800',
    purple: 'bg-purple-100 text-purple-800',
    green: 'bg-green-100 text-green-800',
  };

  return (
    <span className={`inline-flex min-w-12 justify-center rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums ${tones[tone] || tones.gray}`}>
      {formatNumber(value)}
    </span>
  );
}

export default function AdminResults() {
  const [overview, setOverview] = useState({ departments: [], exams: [] });
  const [department, setDepartment] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get('/results/exams', { params: department ? { department } : {} })
      .then((r) => setOverview(r.data))
      .catch(() => toast.error('Failed to load result management'))
      .finally(() => setLoading(false));
  }, [department]);

  const exams = overview.exams || [];
  const departments = overview.departments || [];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900">Results Management</h1>
        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
          {formatNumber(exams.length)} exams
        </span>
      </div>

      <div className="card flex flex-wrap items-center gap-3 p-4">
        <label className="text-sm font-medium text-gray-700" htmlFor="department-filter">Department</label>
        <select
          id="department-filter"
          className="input min-w-56"
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
        >
          <option value="">All Departments</option>
          {departments.map((dept) => (
            <option key={dept} value={dept}>{dept}</option>
          ))}
        </select>
      </div>

      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="border-b border-gray-100 text-left text-xs font-semibold uppercase text-gray-500">
                <th className="px-5 py-3">Exam Name</th>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3 text-center">Attended</th>
                <th className="px-4 py-3 text-center">Not Ready</th>
                <th className="px-4 py-3 text-center">Ready</th>
                <th className="px-4 py-3 text-center">Published</th>
                <th className="px-4 py-3 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {exams.map((exam) => (
                <tr key={exam.id} className="hover:bg-blue-50/40">
                  <td className="px-5 py-4">
                    <p className="font-medium text-gray-900">{exam.subject}</p>
                    <p className="mt-1 text-xs text-gray-500">Sem {exam.semester} - Hall {exam.hall}</p>
                  </td>
                  <td className="px-4 py-4 text-gray-700">{exam.department}</td>
                  <td className="px-4 py-4 text-gray-600">
                    <p title={exam.examDate}>{formatDisplayDate(exam.examDate)}</p>
                    <p className="text-xs text-gray-500">
                      {formatDisplayTime(exam.startTime)} - {formatDisplayTime(exam.endTime)}
                    </p>
                  </td>
                  <td className="px-4 py-4 text-center"><CountCell value={exam.attendedCount} /></td>
                  <td className="px-4 py-4 text-center"><CountCell value={exam.notReadyCount} tone="yellow" /></td>
                  <td className="px-4 py-4 text-center"><CountCell value={exam.readyCount} tone="purple" /></td>
                  <td className="px-4 py-4 text-center"><CountCell value={exam.publishedCount} tone="green" /></td>
                  <td className="px-4 py-4 text-right">
                    <Link to={`/admin/results/${exam.id}`} className="btn-secondary inline-flex px-3 py-1.5 text-xs">
                      Details
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!loading && exams.length === 0 && (
          <div className="py-12 text-center text-sm text-gray-400">No exams found.</div>
        )}

        {loading && (
          <div className="py-12 text-center text-sm text-gray-400">Loading result management...</div>
        )}
      </div>
    </div>
  );
}
