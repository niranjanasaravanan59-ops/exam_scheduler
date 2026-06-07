import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { fetchResults, transitionResult, bulkPublish } from '../../features/results/resultSlice';
import { StatusBadge, GradeBadge } from '../../components/shared/Badges';
import { formatDisplayDate } from '../../utils/dateTime';

export default function AdminResults() {
  const dispatch = useDispatch();
  const { items: results, loading } = useSelector((s) => s.results);
  const [filters, setFilters] = useState({ status: '' });

  useEffect(() => {
    dispatch(fetchResults(filters));
  }, [dispatch, filters]);

  const handleTransition = async (id, action) => {
    const r = await dispatch(transitionResult({ id, action }));
    if (!r.error) toast.success(`Result moved to ${action}`);
    else toast.error(r.payload?.message || 'Transition failed');
  };

  const handleBulkPublish = async (examId) => {
    if (!confirm('Publish all ready results for this exam?')) return;
    const r = await dispatch(bulkPublish(examId));
    if (!r.error) toast.success(`${r.payload.count} results published`);
    else toast.error(r.payload?.message || 'Failed');
  };

  // Group by exam for bulk publish button
  const examGroups = results.reduce((acc, r) => {
    const key = r.examId;
    if (!acc[key]) acc[key] = { exam: r.exam, results: [] };
    acc[key].results.push(r);
    return acc;
  }, {});

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Results Management</h1>
      </div>

      {/* Filters */}
      <div className="card flex gap-3 flex-wrap p-4">
        <select className="input w-40" value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}>
          <option value="">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="ready">Ready</option>
          <option value="published">Published</option>
        </select>
        <input className="input w-40" placeholder="Department..." onChange={(e) => setFilters((f) => ({ ...f, department: e.target.value }))} />
        <input className="input w-40" placeholder="Student name..." onChange={(e) => setFilters((f) => ({ ...f, studentName: e.target.value }))} />
      </div>

      {/* Exam Groups with Bulk Publish */}
      {Object.values(examGroups).map(({ exam, results: gr }) => {
        const hasReady = gr.some((r) => r.status === 'ready');
        return (
          <div key={exam?.id} className="card p-0 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b">
              <div>
                <span className="font-semibold text-gray-900">{exam?.subject}</span>
                <span className="text-xs text-gray-500 ml-2" title={exam?.examDate}>{exam?.department} · Sem {exam?.semester} · {formatDisplayDate(exam?.examDate)}</span>
              </div>
              {hasReady && (
                <button onClick={() => handleBulkPublish(exam?.id)} className="btn-success text-xs py-1.5 px-3">
                  📢 Publish All Ready
                </button>
              )}
            </div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {['Student', 'Roll No', 'Marks', 'Grade', 'Status', 'Actions'].map((h) => (
                    <th key={h} className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {gr.map((result) => (
                  <tr key={result.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">{result.student?.name}</td>
                    <td className="px-4 py-3 text-gray-500">{result.student?.rollNo}</td>
                    <td className="px-4 py-3 font-medium">{result.marks}</td>
                    <td className="px-4 py-3"><GradeBadge grade={result.grade} /></td>
                    <td className="px-4 py-3"><StatusBadge status={result.status} /></td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2 flex-wrap">
                        {result.status === 'draft' && (
                          <button onClick={() => handleTransition(result.id, 'ready')} className="text-xs text-yellow-600 hover:underline">→ Ready</button>
                        )}
                        {result.status === 'ready' && (
                          <>
                            <button onClick={() => handleTransition(result.id, 'published')} className="text-xs text-green-600 hover:underline">→ Publish</button>
                            <button onClick={() => handleTransition(result.id, 'draft')} className="text-xs text-gray-500 hover:underline">← Draft</button>
                          </>
                        )}
                        {result.status === 'published' && <span className="text-xs text-gray-400">Published</span>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}

      {!loading && results.length === 0 && (
        <div className="card text-center py-12 text-gray-400">No results found.</div>
      )}
    </div>
  );
}
