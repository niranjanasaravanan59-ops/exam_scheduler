import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchResults } from '../../features/results/resultSlice';
import { GradeBadge } from '../../components/shared/Badges';
import { EmptyState, Icon, MetricCard } from '../../components/shared/DashboardUI';
import { formatDisplayDate } from '../../utils/dateTime';

export default function StudentResults() {
  const dispatch = useDispatch();
  const { items: results, loading } = useSelector((s) => s.results);
  const [search, setSearch] = useState('');

  useEffect(() => { dispatch(fetchResults()); }, [dispatch]);

  const filtered = results.filter((result) =>
    result.exam?.subject?.toLowerCase().includes(search.toLowerCase())
  );

  const summary = useMemo(() => {
    const visible = filtered.length ? filtered : results;
    const totalMarks = visible.reduce((sum, result) => sum + Number(result.marks || 0), 0);
    const average = visible.length ? (totalMarks / visible.length).toFixed(1) : '0';
    const passed = visible.filter((result) => result.grade !== 'F').length;
    const top = [...visible].sort((a, b) => Number(b.marks || 0) - Number(a.marks || 0))[0];
    return { average, passed, top };
  }, [filtered, results]);

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-cyan-700">Student results</p>
            <h1 className="mt-2 text-2xl font-bold text-slate-950">My Results</h1>
            <p className="mt-2 text-sm text-slate-500">Published marks and grades released by admin</p>
          </div>
          <label className="relative block w-full lg:w-80">
            <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="input pl-9"
              placeholder="Search by subject"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total Results" value={filtered.length} icon="result" tone="blue" sub="Matching published records" />
        <MetricCard label="Average Marks" value={summary.average} icon="chart" tone="emerald" sub="Across visible results" />
        <MetricCard label="Passed" value={summary.passed} icon="check" tone="amber" sub="Grades except F" />
        <MetricCard label="Top Marks" value={summary.top?.marks || 0} icon="award" tone="violet" sub={summary.top?.exam?.subject || 'No result yet'} />
      </div>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="font-bold text-slate-950">Result Records</h2>
          <p className="mt-1 text-sm text-slate-500">{filtered.length} result{filtered.length === 1 ? '' : 's'} shown</p>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-400">Loading results...</div>
        ) : filtered.length === 0 ? (
          <div className="p-5">
            <EmptyState
              title={results.length === 0 ? 'No published results yet' : 'No results match your search'}
              description={results.length === 0 ? 'Check back after exams are graded and published.' : 'Try another subject name.'}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50">
                <tr className="border-b border-slate-100 text-left text-xs font-bold uppercase text-slate-500">
                  {['Subject', 'Department', 'Semester', 'Exam Date', 'Marks', 'Grade'].map((heading) => (
                    <th key={heading} className="px-5 py-3">{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((result) => (
                  <tr key={result.id} className="hover:bg-blue-50/40">
                    <td className="px-5 py-4 font-bold text-slate-950">{result.exam?.subject}</td>
                    <td className="px-5 py-4 text-slate-600">{result.exam?.department}</td>
                    <td className="px-5 py-4 text-slate-600">Sem {result.exam?.semester}</td>
                    <td className="px-5 py-4 text-slate-600" title={result.exam?.examDate}>{formatDisplayDate(result.exam?.examDate)}</td>
                    <td className="px-5 py-4 font-bold tabular-nums text-slate-950">{result.marks}</td>
                    <td className="px-5 py-4"><GradeBadge grade={result.grade} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
