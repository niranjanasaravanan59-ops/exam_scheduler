import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchResults } from '../../features/results/resultSlice';
import { GradeBadge } from '../../components/shared/Badges';
import { formatDisplayDate } from '../../utils/dateTime';

export default function StudentResults() {
  const dispatch = useDispatch();
  const { items: results, loading } = useSelector((s) => s.results);
  const [search, setSearch] = useState('');

  useEffect(() => { dispatch(fetchResults()); }, [dispatch]);

  const filtered = results.filter((r) =>
    r.exam?.subject?.toLowerCase().includes(search.toLowerCase())
  );

  const avg = filtered.length
    ? (filtered.reduce((s, r) => s + parseFloat(r.marks), 0) / filtered.length).toFixed(1)
    : '—';

  return (
    <div className="space-y-5 max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-900">My Results</h1>

      {/* Summary bar */}
      {results.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="card text-center py-4">
            <p className="text-2xl font-bold text-blue-600">{results.length}</p>
            <p className="text-xs text-gray-500 mt-1">Total Results</p>
          </div>
          <div className="card text-center py-4">
            <p className="text-2xl font-bold text-green-600">{avg}</p>
            <p className="text-xs text-gray-500 mt-1">Average Marks</p>
          </div>
          <div className="card text-center py-4">
            <p className="text-2xl font-bold text-purple-600">
              {results.filter((r) => r.grade !== 'F').length}
            </p>
            <p className="text-xs text-gray-500 mt-1">Passed</p>
          </div>
        </div>
      )}

      <input
        className="input"
        placeholder="Search by subject..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading results...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            {results.length === 0
              ? 'No published results yet. Check back after exams are graded.'
              : 'No results match your search.'}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                {['Subject', 'Department', 'Semester', 'Exam Date', 'Marks', 'Grade'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{r.exam?.subject}</td>
                  <td className="px-4 py-3 text-gray-500">{r.exam?.department}</td>
                  <td className="px-4 py-3 text-gray-500">Sem {r.exam?.semester}</td>
                  <td className="px-4 py-3 text-gray-500" title={r.exam?.examDate}>{formatDisplayDate(r.exam?.examDate)}</td>
                  <td className="px-4 py-3 font-semibold text-gray-900">{r.marks}</td>
                  <td className="px-4 py-3"><GradeBadge grade={r.grade} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
