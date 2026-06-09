import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { fetchExams } from '../../features/exams/examSlice';
import { EmptyState, Icon, StatusPill, formatCompactNumber } from '../../components/shared/DashboardUI';
import { formatDisplayDate, formatDisplayTime, isExamEnded } from '../../utils/dateTime';

export default function StudentSchedule() {
  const dispatch = useDispatch();
  const location = useLocation();
  const { items: exams, loading } = useSelector((s) => s.exams);
  const [search, setSearch] = useState('');

  useEffect(() => { dispatch(fetchExams()); }, [dispatch]);

  const now = new Date();
  const searchParams = new URLSearchParams(location.search);
  const tab = searchParams.get('tab');
  const showUpcomingOnly = tab === 'upcoming';
  const showCompletedOnly = tab === 'completed';

  const filtered = exams.filter((exam) =>
    exam.subject.toLowerCase().includes(search.toLowerCase())
  );
  const upcoming = filtered.filter((exam) => !isExamEnded(exam.examDate, exam.endTime, now));
  const past = filtered.filter((exam) => isExamEnded(exam.examDate, exam.endTime, now));

  const ExamCard = ({ exam, completed = false }) => (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-200 hover:bg-blue-50/40">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-bold text-slate-950">{exam.subject}</p>
          <p className="mt-1 text-xs font-medium text-slate-500">{exam.department} - Semester {exam.semester}</p>
        </div>
        <StatusPill tone={completed ? 'emerald' : 'blue'}>{completed ? 'Completed' : 'Upcoming'}</StatusPill>
      </div>

      <div className="mt-4 grid gap-3 text-sm text-slate-600 sm:grid-cols-3">
        <div className="flex items-center gap-2">
          <Icon name="calendar" className="h-4 w-4 text-blue-600" />
          <span title={exam.examDate}>{formatDisplayDate(exam.examDate)}</span>
        </div>
        <div className="flex items-center gap-2">
          <Icon name="clock" className="h-4 w-4 text-cyan-600" />
          <span>{formatDisplayTime(exam.startTime)} - {formatDisplayTime(exam.endTime)}</span>
        </div>
        <div className="flex items-center gap-2">
          <Icon name="building" className="h-4 w-4 text-amber-600" />
          <span>Hall {exam.hall}</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-cyan-700">Student schedule</p>
            <h1 className="mt-2 text-2xl font-bold text-slate-950">My Exam Schedule</h1>
            <p className="mt-2 text-sm text-slate-500">
              {formatCompactNumber(upcoming.length)} upcoming and {formatCompactNumber(past.length)} completed exams
            </p>
          </div>
          <label className="relative block w-full lg:w-80">
            <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="input pl-9"
              placeholder="Search subject"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
        </div>
      </section>

      {loading ? (
        <div className="py-12 text-center text-slate-400">Loading schedule...</div>
      ) : (
        <>
          {!showCompletedOnly && (
            <section className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Upcoming ({upcoming.length})</h2>
              </div>
              {upcoming.length === 0 ? (
                <EmptyState title="No upcoming exams" description="New scheduled exams will appear here." />
              ) : (
                <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                  {upcoming.map((exam) => <ExamCard key={exam.id} exam={exam} />)}
                </div>
              )}
            </section>
          )}

          {!showUpcomingOnly && (
            <section className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">
                  {showCompletedOnly ? 'Completed Exams' : 'Completed'} ({past.length})
                </h2>
              </div>
              {past.length === 0 ? (
                <EmptyState title="No completed exams" description="Completed exams appear after their end time." />
              ) : (
                <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                  {past.map((exam) => <ExamCard key={exam.id} exam={exam} completed />)}
                </div>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}
