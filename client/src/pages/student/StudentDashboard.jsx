import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ActionTile,
  EmptyState,
  Icon,
  MetricCard,
  ProgressBar,
  StatusPill,
  formatCompactNumber,
} from '../../components/shared/DashboardUI';
import { GradeBadge } from '../../components/shared/Badges';
import api from '../../utils/api';
import { formatDisplayDate, formatDisplayTime, isExamEnded } from '../../utils/dateTime';

const getMarks = (result) => Number(result.marks || 0);

export default function StudentDashboard() {
  const [data, setData] = useState(null);
  const [exams, setExams] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/dashboard'),
      api.get('/exams', { params: { limit: 100 } }),
      api.get('/results', { params: { limit: 100 } }),
    ])
      .then(([dashboardResponse, examsResponse, resultsResponse]) => {
        setData(dashboardResponse.data.dashboard);
        setExams(examsResponse.data.exams || []);
        setResults(resultsResponse.data.results || []);
      })
      .catch(() => toast.error('Failed to load student dashboard'))
      .finally(() => setLoading(false));
  }, []);

  const now = useMemo(() => new Date(), []);
  const model = useMemo(() => {
    const decorated = [...exams]
      .sort((a, b) => {
        const left = new Date(`${String(a.examDate || '').slice(0, 10)}T${formatDisplayTime(a.startTime)}`).getTime();
        const right = new Date(`${String(b.examDate || '').slice(0, 10)}T${formatDisplayTime(b.startTime)}`).getTime();
        return (Number.isNaN(left) ? 0 : left) - (Number.isNaN(right) ? 0 : right);
      })
      .map((exam) => ({ ...exam, completed: isExamEnded(String(exam.examDate || '').slice(0, 10), exam.endTime, now) }));

    const upcoming = decorated.filter((exam) => !exam.completed);
    const completed = decorated.filter((exam) => exam.completed);
    const publishedResults = [...results].sort((a, b) => getMarks(b) - getMarks(a));
    const passCount = publishedResults.filter((result) => result.grade !== 'F').length;
    const bestResult = publishedResults[0];
    const average = publishedResults.length
      ? publishedResults.reduce((sum, result) => sum + getMarks(result), 0) / publishedResults.length
      : 0;
    const gradeCounts = publishedResults.reduce((acc, result) => {
      const grade = result.grade || 'NA';
      acc[grade] = (acc[grade] || 0) + 1;
      return acc;
    }, {});

    return {
      decorated,
      upcoming,
      completed,
      publishedResults,
      passCount,
      bestResult,
      average,
      gradeCounts,
    };
  }, [exams, results, now]);

  if (loading) return <div className="flex h-64 items-center justify-center text-slate-400">Loading dashboard...</div>;
  if (!data) return null;

  const { kpis } = data;
  const totalExams = Number(kpis.totalExams || model.decorated.length);
  const averageMarks = Number(kpis.averageMarks ?? model.average);
  const passRate = model.publishedResults.length ? Math.round((model.passCount / model.publishedResults.length) * 100) : 0;
  const nextExam = model.upcoming[0];
  const recentCompleted = model.completed.slice(-3).reverse();
  const gradeOrder = ['O', 'A+', 'A', 'B', 'C', 'F', 'NA'];

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="grid gap-5 p-5 lg:grid-cols-[1.25fr_0.75fr] lg:items-center">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-cyan-700">Student portal</p>
            <h1 className="mt-2 text-3xl font-bold tracking-normal text-slate-950">My Exam Dashboard</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
              Timetable, upcoming exams, completed exams, published results, and grade progress are visible here.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {['Personal schedule', 'Upcoming exams', 'Completed exams', 'Published results', 'Grade summary'].map((item) => (
                <span key={item} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700 ring-1 ring-slate-200">
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-cyan-100 bg-cyan-50 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-cyan-800">Next Exam</p>
                {nextExam ? (
                  <>
                    <p className="mt-2 text-lg font-bold text-slate-950">{nextExam.subject}</p>
                    <p className="mt-2 text-sm text-slate-600">
                      {formatDisplayDate(nextExam.examDate)}, {formatDisplayTime(nextExam.startTime)} - {formatDisplayTime(nextExam.endTime)}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">Hall {nextExam.hall}</p>
                  </>
                ) : (
                  <p className="mt-2 text-sm text-slate-600">No upcoming exam is scheduled.</p>
                )}
              </div>
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-white text-cyan-700 ring-1 ring-cyan-100">
                <Icon name="clock" className="h-5 w-5" />
              </span>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Total Exams" value={totalExams} icon="book" tone="blue" sub="Department schedule coverage" />
        <MetricCard label="Upcoming Exams" value={kpis.upcomingExams} icon="calendar" tone="cyan" sub="Planned exam sessions" />
        <MetricCard label="Completed Exams" value={kpis.completedExams} icon="check" tone="emerald" sub="Finished sessions" />
        <MetricCard label="Published Results" value={model.publishedResults.length} icon="award" tone="amber" sub="Visible grade records" />
        <MetricCard label="Average Marks" value={averageMarks} icon="chart" tone="violet" sub={`${passRate}% pass rate`} />
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <ActionTile
          to="/student/schedule"
          title="Full Schedule"
          description={`${formatCompactNumber(totalExams)} exams with subject, date, time, semester, and hall details.`}
          icon="calendar"
          tone="blue"
          meta="All exams"
        />
        <ActionTile
          to="/student/schedule?tab=upcoming"
          title="Upcoming View"
          description={`${formatCompactNumber(model.upcoming.length)} upcoming exam${model.upcoming.length === 1 ? '' : 's'} ready for planning.`}
          icon="clock"
          tone="cyan"
          meta={`${formatCompactNumber(model.upcoming.length)} upcoming`}
        />
        <ActionTile
          to="/student/schedule?tab=completed"
          title="Completed View"
          description={`${formatCompactNumber(model.completed.length)} completed exam${model.completed.length === 1 ? '' : 's'} kept for review.`}
          icon="check"
          tone="emerald"
          meta={`${formatCompactNumber(model.completed.length)} completed`}
        />
        <ActionTile
          to="/student/results"
          title="Results and Grades"
          description={`${formatCompactNumber(model.publishedResults.length)} published result record${model.publishedResults.length === 1 ? '' : 's'} with marks and grades.`}
          icon="award"
          tone="amber"
          meta={`${passRate}% pass`}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="font-bold text-slate-950">My Exam Roadmap</h2>
              <p className="mt-1 text-sm text-slate-500">Upcoming sessions first, completed sessions below</p>
            </div>
            <Link to="/student/schedule" className="btn-secondary px-3 py-1.5 text-xs">Open Schedule</Link>
          </div>

          <div className="grid grid-cols-1 divide-y divide-slate-100 lg:grid-cols-2 lg:divide-x lg:divide-y-0">
            <div>
              <div className="bg-slate-50 px-5 py-3 text-xs font-bold uppercase text-slate-500">Upcoming</div>
              {model.upcoming.length ? (
                <div className="divide-y divide-slate-100">
                  {model.upcoming.slice(0, 5).map((exam) => (
                    <div key={exam.id} className="px-5 py-4 text-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-bold text-slate-950">{exam.subject}</p>
                          <p className="mt-1 text-xs text-slate-500">{exam.department} - Sem {exam.semester}</p>
                        </div>
                        <StatusPill tone="blue">Upcoming</StatusPill>
                      </div>
                      <p className="mt-3 text-sm font-semibold text-slate-700">{formatDisplayDate(exam.examDate)}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {formatDisplayTime(exam.startTime)} - {formatDisplayTime(exam.endTime)} - Hall {exam.hall}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-5">
                  <EmptyState title="No upcoming exams" description="New schedule entries will appear here." />
                </div>
              )}
            </div>

            <div>
              <div className="bg-slate-50 px-5 py-3 text-xs font-bold uppercase text-slate-500">Completed</div>
              {recentCompleted.length ? (
                <div className="divide-y divide-slate-100">
                  {recentCompleted.map((exam) => (
                    <div key={exam.id} className="px-5 py-4 text-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-bold text-slate-950">{exam.subject}</p>
                          <p className="mt-1 text-xs text-slate-500">{exam.department} - Sem {exam.semester}</p>
                        </div>
                        <StatusPill tone="emerald">Completed</StatusPill>
                      </div>
                      <p className="mt-3 text-sm font-semibold text-slate-700">{formatDisplayDate(exam.examDate)}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {formatDisplayTime(exam.startTime)} - {formatDisplayTime(exam.endTime)} - Hall {exam.hall}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-5">
                  <EmptyState title="No completed exams" description="Finished exams will appear here after their end time." />
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-bold text-slate-950">Performance Snapshot</h2>
              <p className="mt-1 text-sm text-slate-500">{formatCompactNumber(model.publishedResults.length)} published results</p>
            </div>
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-amber-50 text-amber-700">
              <Icon name="award" className="h-5 w-5" />
            </span>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 text-center">
            <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-3">
              <p className="text-2xl font-bold text-emerald-700 tabular-nums">{model.passCount}</p>
              <p className="mt-1 text-xs font-semibold text-emerald-700">Passed</p>
            </div>
            <div className="rounded-lg border border-violet-100 bg-violet-50 p-3">
              <p className="text-2xl font-bold text-violet-700 tabular-nums">{formatCompactNumber(averageMarks)}</p>
              <p className="mt-1 text-xs font-semibold text-violet-700">Average</p>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            {gradeOrder.filter((grade) => model.gradeCounts[grade]).map((grade) => (
              <ProgressBar
                key={grade}
                label={`Grade ${grade}`}
                value={model.gradeCounts[grade]}
                max={Math.max(1, model.publishedResults.length)}
                tone={grade === 'F' ? 'rose' : grade === 'O' || grade === 'A+' ? 'violet' : 'blue'}
                rightLabel={formatCompactNumber(model.gradeCounts[grade])}
              />
            ))}
            {!model.publishedResults.length && (
              <EmptyState title="No published grades yet" description="Published results will populate the performance snapshot." />
            )}
          </div>

          {model.bestResult && (
            <div className="mt-5 rounded-lg border border-amber-100 bg-amber-50 p-4">
              <p className="text-xs font-bold uppercase text-amber-800">Best result</p>
              <p className="mt-2 font-bold text-slate-950">{model.bestResult.exam?.subject || 'Subject'}</p>
              <p className="mt-1 text-sm text-slate-600">
                {model.bestResult.marks} marks <span className="mx-1">/</span> Grade {model.bestResult.grade}
              </p>
            </div>
          )}
        </section>
      </div>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="font-bold text-slate-950">Published Results</h2>
            <p className="mt-1 text-sm text-slate-500">Marks and grades released by admin</p>
          </div>
          <Link to="/student/results" className="btn-secondary px-3 py-1.5 text-xs">Open Results</Link>
        </div>

        {model.publishedResults.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50">
                <tr className="border-b border-slate-100 text-left text-xs font-bold uppercase text-slate-500">
                  {['Subject', 'Department', 'Exam Date', 'Marks', 'Grade'].map((heading) => (
                    <th key={heading} className="px-5 py-3">{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {model.publishedResults.slice(0, 7).map((result) => (
                  <tr key={result.id} className="hover:bg-blue-50/40">
                    <td className="px-5 py-4 font-bold text-slate-950">{result.exam?.subject || 'Subject'}</td>
                    <td className="px-5 py-4 text-slate-600">{result.exam?.department || '-'}</td>
                    <td className="px-5 py-4 text-slate-600" title={result.exam?.examDate}>{formatDisplayDate(result.exam?.examDate)}</td>
                    <td className="px-5 py-4 font-bold tabular-nums text-slate-950">{result.marks}</td>
                    <td className="px-5 py-4"><GradeBadge grade={result.grade} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-5">
            <EmptyState title="No published results yet" description="Results appear after faculty submission and admin publication." />
          </div>
        )}
      </section>
    </div>
  );
}
