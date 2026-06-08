import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import KPICard from '../../components/shared/KPICard';
import { formatDisplayDate, formatDisplayTime, isExamEnded } from '../../utils/dateTime';

const CARD_ICONS = {
  pending: '\u{1F4DD}',
  upcoming: '\u{1F4C5}',
  completed: '\u2705',
};

function BellIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true" {...props}>
      <path d="M15 17H9m10-2h-1V9a6 6 0 0 0-12 0v6H5a2 2 0 0 0-2 2h18a2 2 0 0 0-2-2Z" />
      <path d="M10 20a2 2 0 0 0 4 0" />
    </svg>
  );
}

function FilterButton({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
        active ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
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

export default function FacultyDashboard() {
  const [data, setData] = useState(null);
  const [exams, setExams] = useState([]);
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
    ])
      .then(([dashboardResponse, examsResponse]) => {
        if (!mounted) return;
        setData(dashboardResponse.data.dashboard);
        setExams(examsResponse.data.exams || []);
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
    return <div className="flex h-64 items-center justify-center text-gray-400">Loading dashboard...</div>;
  }
  if (!data) return null;

  const { kpis } = data;
  const pendingCount = Number(kpis.subjectsPendingEvaluation || 0);
  const upcomingCount = Number(kpis.upcomingAssignedExams || 0);
  const completedCount = Number(kpis.totalCompletedExams || 0);
  const notificationCount = pendingCount + upcomingCount;

  const notifications = [
    pendingCount > 0
      ? `${pendingCount} completed subject${pendingCount === 1 ? '' : 's'} need marks evaluation.`
      : 'No completed subject is pending evaluation.',
    upcomingCount > 0
      ? `${upcomingCount} assigned exam${upcomingCount === 1 ? '' : 's'} are upcoming.`
      : 'No upcoming assigned exam alerts.',
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-blue-600">Faculty workspace</p>
          <h1 className="mt-1 text-2xl font-bold text-gray-900">Faculty Dashboard</h1>
        </div>

        <div className="relative">
          <button
            type="button"
            ref={buttonRef}
            onClick={() => setShowNotifications((current) => !current)}
            className="relative inline-flex h-11 w-11 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 shadow-sm transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
            aria-label="Dashboard notifications"
            title="Notifications"
          >
            <BellIcon className="h-5 w-5" />
            {notificationCount > 0 && (
              <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-xs font-bold text-white">
                {notificationCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div
              ref={panelRef}
              className="absolute right-0 z-20 mt-2 w-80 rounded-3xl border border-gray-200 bg-white p-4 shadow-xl"
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-gray-800">Notifications</p>
                  <p className="text-sm text-gray-500">Pending and upcoming exam alerts.</p>
                </div>
                <BellIcon className="h-5 w-5 text-blue-600" />
              </div>
              <div className="space-y-3">
                {notifications.map((message) => (
                  <div key={message} className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
                    {message}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <KPICard label="Pending Evaluation" value={pendingCount} icon={CARD_ICONS.pending} color="orange" />
        <KPICard label="Upcoming Exams" value={upcomingCount} icon={CARD_ICONS.upcoming} color="blue" />
        <KPICard label="Completed Exams" value={completedCount} icon={CARD_ICONS.completed} color="green" />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_320px]">
        <section className="card">
          <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="font-semibold text-gray-800">Total Exam List and Details</h2>
              <p className="text-sm text-gray-500">{decoratedExams.length} assigned exams</p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="input sm:w-72"
                placeholder="Search exams"
              />
              <div className="flex gap-2">
                <FilterButton active={statusFilter === 'all'} onClick={() => setStatusFilter('all')}>All</FilterButton>
                <FilterButton active={statusFilter === 'upcoming'} onClick={() => setStatusFilter('upcoming')}>Upcoming</FilterButton>
                <FilterButton active={statusFilter === 'completed'} onClick={() => setStatusFilter('completed')}>Completed</FilterButton>
              </div>
            </div>
          </div>

          {filteredExams.length ? (
            <div className="overflow-hidden rounded-lg border border-gray-100">
              {filteredExams.map((exam) => (
                <div
                  key={exam.id}
                  className="grid grid-cols-1 gap-3 border-b border-gray-100 bg-white p-4 text-sm transition-colors last:border-b-0 hover:bg-blue-50/50 md:grid-cols-[1fr_auto_auto] md:items-center"
                >
                  <div className="min-w-0">
                    <Link to={`/faculty/exams/${exam.id}`} className="block">
                      <p className="truncate font-semibold text-gray-900">{exam.subject}</p>
                      <p className="text-xs text-gray-500">
                        {exam.department} - Sem {exam.semester} - Hall {exam.hall}
                      </p>
                    </Link>
                  </div>

                  <div className="hidden md:block text-left md:text-right">
                    <p className="font-medium text-gray-700" title={exam.examDate}>{formatDisplayDate(exam.examDate)}</p>
                    <p className="text-xs text-gray-500">
                      {formatDisplayTime(exam.startTime)} - {formatDisplayTime(exam.endTime)}
                    </p>
                  </div>

                  <div className="flex items-center justify-end gap-3">
                    <span className={`inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${
                      exam.completed ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {exam.completed ? 'Completed' : 'Upcoming'}
                    </span>

                    {exam.completed && (
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            setDetailOpenFor(exam.id);
                            setDetail(null);
                            setDetailLoading(true);
                            const { data } = await api.get(`/attendance/exams/${exam.id}`);
                            const d = data || {};
                            if (Array.isArray(d.students)) {
                              const extractNumber = (s) => {
                                if (!s) return NaN;
                                const m = String(s).match(/(\d+)\s*$/);
                                if (m) return parseInt(m[1], 10);
                                const m2 = String(s).match(/(\d+)/);
                                return m2 ? parseInt(m2[1], 10) : NaN;
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
                        }}
                        className="inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-semibold hover:bg-gray-50"
                      >
                        Details
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-gray-200 p-8 text-center text-sm text-gray-400">
              No exams match the selected filter.
            </div>
          )}
        </section>

      </div>

      {detailOpenFor && (
        <div className="fixed inset-0 z-40 flex items-start justify-center p-6">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDetailOpenFor(null)} />
          <div className="relative z-50 w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Exam Details</h3>
                <p className="text-sm text-gray-500">Summary for completed exam</p>
              </div>
              <button type="button" onClick={() => setDetailOpenFor(null)} className="text-gray-400 hover:text-gray-600">Close</button>
            </div>

            <div className="mt-4">
              {detailLoading ? (
                <div className="text-center text-sm text-gray-500">Loading...</div>
              ) : detail ? (
                <div className="space-y-3">
                  <div className="rounded-lg border p-3">
                    <p className="text-sm text-gray-600">Subject</p>
                    <p className="font-medium text-gray-900">{detail.exam?.subject}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-center">
                    <div className="rounded-lg border p-3">
                      <p className="text-sm text-gray-600">Total Students</p>
                      <p className="mt-1 text-2xl font-semibold text-gray-900">{detail.summary?.totalStudents ?? '-'}</p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-sm text-gray-600">Present</p>
                      <p className="mt-1 text-2xl font-semibold text-green-700">{detail.summary?.presentCount ?? 0}</p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-sm text-gray-600">Absent</p>
                      <p className="mt-1 text-2xl font-semibold text-red-700">{detail.summary?.absentCount ?? 0}</p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-sm text-gray-600">Average Marks</p>
                      <p className="mt-1 text-2xl font-semibold text-purple-700">{detail.summary?.averageMarks ?? '-'}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center text-sm text-gray-500">No details available</div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
