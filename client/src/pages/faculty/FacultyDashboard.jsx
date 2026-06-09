import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import {
  ActionTile,
  EmptyState,
  Icon,
  MetricCard,
  ProgressBar,
  StatusPill,
  formatCompactNumber,
} from '../../components/shared/DashboardUI';
import { formatDisplayDate, formatDisplayTime, isExamEnded } from '../../utils/dateTime';

function FilterButton({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-10 rounded-lg px-3 py-2 text-sm font-bold transition-colors ${
        active ? 'bg-blue-600 text-white shadow-sm' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'
      }`}
    >
      {children}
    </button>
  );
}

const getExamDate = (exam) => String(exam.examDate || '').slice(0, 10);

const examSortValue = (exam) => {
  const value = new Date(`${getExamDate(exam)}T${formatDisplayTime(exam.startTime)}`).getTime();
  return Number.isNaN(value) ? 0 : value;
};

const isCompletedExam = (exam, now) => isExamEnded(getExamDate(exam), exam.endTime, now);

const statusTone = (status) => {
  if (status === 'published') return 'emerald';
  if (status === 'ready') return 'violet';
  if (status === 'draft') return 'amber';
  return 'slate';
};

export default function FacultyDashboard() {
  const [data, setData] = useState(null);
  const [exams, setExams] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showNotifications, setShowNotifications] = useState(false);
  const buttonRef = useRef(null);
  const panelRef = useRef(null);
  const [detailOpenFor, setDetailOpenFor] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    let mounted = true;

    Promise.all([
      api.get('/dashboard'),
      api.get('/exams', { params: { limit: 100 } }),
      api.get('/results', { params: { limit: 100 } }),
    ])
      .then(([dashboardResponse, examsResponse, resultsResponse]) => {
        if (!mounted) return;
        setData(dashboardResponse.data.dashboard);
        setExams(examsResponse.data.exams || []);
        setResults(resultsResponse.data.results || []);
      })
      .catch(() => toast.error('Failed to load faculty dashboard'))
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!showNotifications) return undefined;

    const handleClickOutside = (event) => {
      if (
        buttonRef.current &&
        panelRef.current &&
        !buttonRef.current.contains(event.target) &&
        !panelRef.current.contains(event.target)
      ) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showNotifications]);

  const now = useMemo(() => new Date(), []);

  const decoratedExams = useMemo(() => {
    return [...exams]
      .sort((a, b) => examSortValue(a) - examSortValue(b))
      .map((exam) => ({
        ...exam,
        completed: isCompletedExam(exam, now),
      }));
  }, [exams, now]);

  const filteredExams = useMemo(() => {
    const query = search.trim().toLowerCase();

    return decoratedExams.filter((exam) => {
      if (statusFilter === 'upcoming' && exam.completed) return false;
      if (statusFilter === 'completed' && !exam.completed) return false;
      if (!query) return true;

      return [
        exam.subject,
        exam.department,
        exam.semester,
        exam.hall,
        formatDisplayDate(exam.examDate),
      ].some((value) => String(value || '').toLowerCase().includes(query));
    });
  }, [decoratedExams, search, statusFilter]);

  if (loading) {
    return <div className="flex h-64 items-center justify-center text-slate-400">Loading dashboard...</div>;
  }
  if (!data) return null;

  const { kpis } = data;
  const pendingCount = Number(kpis.subjectsPendingEvaluation || 0);
  const upcomingCount = Number(kpis.upcomingAssignedExams || 0);
  const completedCount = Number(kpis.totalCompletedExams || 0);
  const averageMarks = Number(kpis.averageMarks || 0);
  const notificationCount = pendingCount + upcomingCount;
  const upcomingExams = decoratedExams.filter((exam) => !exam.completed);
  const completedExams = decoratedExams.filter((exam) => exam.completed);
  const nextExam = upcomingExams[0];
  const queue = completedExams.slice(0, 4);
  const draftCount = results.filter((result) => result.status === 'draft').length;
  const readyCount = results.filter((result) => result.status === 'ready').length;
  const publishedCount = results.filter((result) => result.status === 'published').length;
  const workflowTotal = Math.max(1, draftCount + readyCount + publishedCount);

  const notifications = [
    pendingCount > 0
      ? `${pendingCount} completed subject${pendingCount === 1 ? '' : 's'} need evaluation.`
      : 'No completed subject is pending evaluation.',
    upcomingCount > 0
      ? `${upcomingCount} assigned exam${upcomingCount === 1 ? '' : 's'} are upcoming.`
      : 'No upcoming assigned exam alerts.',
  ];

  const openExamDetail = async (examId) => {
    try {
      setDetailOpenFor(examId);
      setDetail(null);
      setDetailLoading(true);
      const { data: response } = await api.get(`/attendance/exams/${examId}`);
      const d = response || {};
      if (Array.isArray(d.students)) {
        const extractNumber = (value) => {
          if (!value) return NaN;
          const trailing = String(value).match(/(\d+)\s*$/);
          if (trailing) return parseInt(trailing[1], 10);
          const first = String(value).match(/(\d+)/);
          return first ? parseInt(first[1], 10) : NaN;
        };

        d.students.sort((x, y) => {
          if (x.rollNo && y.rollNo) {
            const xn = extractNumber(x.rollNo);
            const yn = extractNumber(y.rollNo);
            if (!Number.isNaN(xn) && !Number.isNaN(yn)) return xn - yn;
            return x.rollNo.localeCompare(y.rollNo, undefined, { numeric: true, sensitivity: 'base' });
          }
          const xn = extractNumber(x.name);
          const yn = extractNumber(y.name);
          if (!Number.isNaN(xn) && !Number.isNaN(yn)) return xn - yn;
          return x.name.localeCompare(y.name, undefined, { sensitivity: 'base' });
        });
      }
      setDetail(d);
    } catch (err) {
      toast.error('Failed to load exam details');
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-5 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-cyan-700">Faculty workspace</p>
            <h1 className="mt-2 text-3xl font-bold tracking-normal text-slate-950">Teaching Operations Dashboard</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
              Assigned exams, marks entry, imports, attendance summary, and workflow status are available here.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {['Assigned exams', 'Marks entry', 'Bulk import', 'Attendance detail', 'Draft to ready workflow'].map((item) => (
                <span key={item} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700 ring-1 ring-slate-200">
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="relative">
            <button
              type="button"
              ref={buttonRef}
              onClick={() => setShowNotifications((current) => !current)}
              className="relative inline-flex h-12 w-12 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-sm transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
              aria-label="Dashboard notifications"
              title="Notifications"
            >
              <Icon name="bell" className="h-5 w-5" />
              {notificationCount > 0 && (
                <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-rose-600 px-1 text-xs font-bold text-white">
                  {notificationCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div
                ref={panelRef}
                className="absolute right-0 z-20 mt-2 w-80 rounded-lg border border-slate-200 bg-white p-4 shadow-xl"
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-bold text-slate-900">Notifications</p>
                    <p className="text-sm text-slate-500">Pending and upcoming exam alerts.</p>
                  </div>
                  <Icon name="bell" className="h-5 w-5 text-blue-600" />
                </div>
                <div className="space-y-3">
                  {notifications.map((message) => (
                    <div key={message} className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                      {message}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Pending Evaluation" value={pendingCount} icon="edit" tone="amber" sub="Completed subjects needing marks" />
        <MetricCard label="Upcoming Exams" value={upcomingCount} icon="calendar" tone="blue" sub="Assigned invigilation or subject duty" />
        <MetricCard label="Completed Exams" value={completedCount} icon="check" tone="emerald" sub="Eligible for result workflow" />
        <MetricCard label="Average Marks" value={averageMarks} icon="chart" tone="violet" sub="Across evaluated assigned exams" />
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <ActionTile
          to="/faculty/exams"
          title="Assigned Exam Desk"
          description={`${formatCompactNumber(decoratedExams.length)} assigned exams with date, hall, department, and status.`}
          icon="calendar"
          tone="blue"
          meta={`${formatCompactNumber(upcomingExams.length)} upcoming`}
        />
        <ActionTile
          to="/faculty/marks"
          title="Marks Entry"
          description={`${formatCompactNumber(pendingCount)} subject${pendingCount === 1 ? '' : 's'} need attention before publication.`}
          icon="edit"
          tone="amber"
          meta={`${formatCompactNumber(draftCount)} draft`}
        />
        <ActionTile
          to="/faculty/import"
          title="Bulk Import"
          description="Upload marks in one batch, then review entries through the same result workflow."
          icon="import"
          tone="cyan"
          meta="CSV supported"
        />
        <ActionTile
          to="/faculty/marks"
          title="Ready Review"
          description={`${formatCompactNumber(readyCount)} result record${readyCount === 1 ? '' : 's'} are ready for admin publishing.`}
          icon="workflow"
          tone="emerald"
          meta={`${formatCompactNumber(publishedCount)} published`}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_340px]">
        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className="font-bold text-slate-950">Total Exam List and Details</h2>
                <p className="mt-1 text-sm text-slate-500">{formatCompactNumber(decoratedExams.length)} assigned exams</p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <label className="relative block sm:w-72">
                  <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    className="input pl-9"
                    placeholder="Search exams"
                  />
                </label>
                <div className="flex gap-2">
                  <FilterButton active={statusFilter === 'all'} onClick={() => setStatusFilter('all')}>All</FilterButton>
                  <FilterButton active={statusFilter === 'upcoming'} onClick={() => setStatusFilter('upcoming')}>Upcoming</FilterButton>
                  <FilterButton active={statusFilter === 'completed'} onClick={() => setStatusFilter('completed')}>Completed</FilterButton>
                </div>
              </div>
            </div>
          </div>

          {filteredExams.length ? (
            <div className="divide-y divide-slate-100">
              {filteredExams.map((exam) => (
                <div
                  key={exam.id}
                  className="grid grid-cols-1 gap-3 px-5 py-4 text-sm transition-colors hover:bg-blue-50/50 md:grid-cols-[1fr_auto_auto] md:items-center"
                >
                  <div className="min-w-0">
                    <Link to={`/faculty/exams/${exam.id}`} className="block">
                      <p className="truncate font-bold text-slate-950">{exam.subject}</p>
                      <p className="mt-1 text-xs font-medium text-slate-500">
                        {exam.department} - Sem {exam.semester} - Hall {exam.hall}
                      </p>
                    </Link>
                  </div>

                  <div className="text-left md:text-right">
                    <p className="font-semibold text-slate-700" title={exam.examDate}>{formatDisplayDate(exam.examDate)}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {formatDisplayTime(exam.startTime)} - {formatDisplayTime(exam.endTime)}
                    </p>
                  </div>

                  <div className="flex items-center justify-end gap-3">
                    <StatusPill tone={exam.completed ? 'emerald' : 'blue'}>
                      {exam.completed ? 'Completed' : 'Upcoming'}
                    </StatusPill>

                    {exam.completed && (
                      <button
                        type="button"
                        onClick={() => openExamDetail(exam.id)}
                        className="btn-secondary min-h-9 px-3 py-1.5 text-xs"
                      >
                        <Icon name="clipboard" className="h-4 w-4" />
                        Details
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-5">
              <EmptyState title="No exams match the selected filter" description="Change the search or status filter to see assigned exams." />
            </div>
          )}
        </section>

        <aside className="space-y-6">
          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-bold text-slate-950">Next Assigned Exam</h2>
                <p className="mt-1 text-sm text-slate-500">Nearest upcoming duty</p>
              </div>
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-blue-50 text-blue-700">
                <Icon name="clock" className="h-5 w-5" />
              </span>
            </div>

            {nextExam ? (
              <div className="mt-5 rounded-lg border border-blue-100 bg-blue-50 p-4">
                <p className="font-bold text-slate-950">{nextExam.subject}</p>
                <p className="mt-2 text-sm text-slate-600">{nextExam.department} - Sem {nextExam.semester}</p>
                <p className="mt-2 text-sm font-semibold text-blue-700">
                  {formatDisplayDate(nextExam.examDate)}, {formatDisplayTime(nextExam.startTime)} - {formatDisplayTime(nextExam.endTime)}
                </p>
                <p className="mt-1 text-sm text-slate-600">Hall {nextExam.hall}</p>
              </div>
            ) : (
              <div className="mt-5">
                <EmptyState title="No upcoming assigned exams" description="Completed exams remain available for review." />
              </div>
            )}
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-bold text-slate-950">Marks Workflow</h2>
                <p className="mt-1 text-sm text-slate-500">{formatCompactNumber(results.length)} result records</p>
              </div>
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-violet-50 text-violet-700">
                <Icon name="workflow" className="h-5 w-5" />
              </span>
            </div>

            <div className="mt-5 space-y-4">
              <ProgressBar label="Draft" value={draftCount} max={workflowTotal} tone="amber" rightLabel={formatCompactNumber(draftCount)} />
              <ProgressBar label="Ready" value={readyCount} max={workflowTotal} tone="violet" rightLabel={formatCompactNumber(readyCount)} />
              <ProgressBar label="Published" value={publishedCount} max={workflowTotal} tone="emerald" rightLabel={formatCompactNumber(publishedCount)} />
            </div>

            <Link to="/faculty/marks" className="btn-primary mt-5 w-full">
              <Icon name="edit" className="h-4 w-4" />
              Open Marks Entry
            </Link>
          </section>

          <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="font-bold text-slate-950">Evaluation Queue</h2>
              <p className="mt-1 text-sm text-slate-500">Completed exams ready for attention</p>
            </div>
            {queue.length ? (
              <div className="divide-y divide-slate-100">
                {queue.map((exam) => (
                  <Link key={exam.id} to="/faculty/marks" className="block px-5 py-4 text-sm transition-colors hover:bg-amber-50">
                    <p className="font-bold text-slate-950">{exam.subject}</p>
                    <p className="mt-1 text-xs text-slate-500">{formatDisplayDate(exam.examDate)} - Hall {exam.hall}</p>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="p-5">
                <EmptyState title="Queue is clear" description="Completed exams will appear here." />
              </div>
            )}
          </section>
        </aside>
      </div>

      {results.length > 0 && (
        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="font-bold text-slate-950">Recent Result Entries</h2>
              <p className="mt-1 text-sm text-slate-500">Latest records for assigned subjects</p>
            </div>
            <Link to="/faculty/marks" className="btn-secondary px-3 py-1.5 text-xs">All Marks</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50">
                <tr className="border-b border-slate-100 text-left text-xs font-bold uppercase text-slate-500">
                  {['Student', 'Subject', 'Marks', 'Grade', 'Status'].map((heading) => (
                    <th key={heading} className="px-5 py-3">{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {results.slice(0, 6).map((result) => (
                  <tr key={result.id} className="hover:bg-blue-50/40">
                    <td className="px-5 py-4 font-semibold text-slate-900">{result.student?.name || 'Student'}</td>
                    <td className="px-5 py-4 text-slate-600">{result.exam?.subject || 'Subject'}</td>
                    <td className="px-5 py-4 font-bold tabular-nums text-slate-950">{result.marks}</td>
                    <td className="px-5 py-4 text-slate-600">{result.grade || '-'}</td>
                    <td className="px-5 py-4"><StatusPill tone={statusTone(result.status)}>{result.status || 'draft'}</StatusPill></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {detailOpenFor && (
        <div className="fixed inset-0 z-40 flex items-start justify-center p-6">
          <div className="absolute inset-0 bg-slate-950/50" onClick={() => setDetailOpenFor(null)} />
          <div className="relative z-50 w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-slate-950">Exam Details</h3>
                <p className="text-sm text-slate-500">Summary for completed exam</p>
              </div>
              <button type="button" onClick={() => setDetailOpenFor(null)} className="btn-secondary min-h-9 px-3 py-1.5 text-xs">Close</button>
            </div>

            <div className="mt-4">
              {detailLoading ? (
                <div className="py-8 text-center text-sm text-slate-500">Loading...</div>
              ) : detail ? (
                <div className="space-y-3">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p className="text-sm text-slate-600">Subject</p>
                    <p className="font-bold text-slate-950">{detail.exam?.subject}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-center">
                    <div className="rounded-lg border border-slate-200 p-3">
                      <p className="text-sm text-slate-600">Total Students</p>
                      <p className="mt-1 text-2xl font-bold text-slate-950">{detail.summary?.totalStudents ?? '-'}</p>
                    </div>
                    <div className="rounded-lg border border-slate-200 p-3">
                      <p className="text-sm text-slate-600">Present</p>
                      <p className="mt-1 text-2xl font-bold text-emerald-700">{detail.summary?.presentCount ?? 0}</p>
                    </div>
                    <div className="rounded-lg border border-slate-200 p-3">
                      <p className="text-sm text-slate-600">Absent</p>
                      <p className="mt-1 text-2xl font-bold text-rose-700">{detail.summary?.absentCount ?? 0}</p>
                    </div>
                    <div className="rounded-lg border border-slate-200 p-3">
                      <p className="text-sm text-slate-600">Average Marks</p>
                      <p className="mt-1 text-2xl font-bold text-violet-700">{detail.summary?.averageMarks ?? '-'}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center text-sm text-slate-500">No details available</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
