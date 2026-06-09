import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
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
import api from '../../utils/api';
import { formatDisplayDate, formatDisplayTime, isExamEnded } from '../../utils/dateTime';

const percent = (value, total) => {
  const denominator = Number(total || 0);
  if (!denominator) return 0;
  return Math.round((Number(value || 0) / denominator) * 100);
};

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard')
      .then((r) => setData(r.data.dashboard))
      .catch(() => toast.error('Failed to load dashboard'))
      .finally(() => setLoading(false));
  }, []);

  const model = useMemo(() => {
    if (!data) return null;

    const { kpis } = data;
    const exams = (data.exams || []).map((exam) => ({
      ...exam,
      completed: isExamEnded(exam.examDate, exam.endTime),
    }));

    const upcoming = exams.filter((exam) => !exam.completed);
    const completed = exams.filter((exam) => exam.completed);
    const countedExamTotal = Number(kpis.upcomingExams || 0) + Number(kpis.examsCompleted || 0);
    const totalExams = Number(kpis.totalExams ?? (countedExamTotal || exams.length));
    const pendingPublication = Number(kpis.resultsPendingPublication || 0);
    const publishedPublication = Number(kpis.finishedPublications || 0);
    const publicationTotal = pendingPublication + publishedPublication;

    const departments = Object.values(exams.reduce((acc, exam) => {
      const key = exam.department || 'Unassigned';
      if (!acc[key]) {
        acc[key] = {
          department: key,
          total: 0,
          upcoming: 0,
          completed: 0,
          halls: new Set(),
        };
      }

      acc[key].total += 1;
      acc[key][exam.completed ? 'completed' : 'upcoming'] += 1;
      if (exam.hall) acc[key].halls.add(exam.hall);
      return acc;
    }, {}))
      .map((row) => ({ ...row, halls: row.halls.size }))
      .sort((a, b) => b.total - a.total || a.department.localeCompare(b.department));

    return {
      kpis,
      exams,
      upcoming,
      completed,
      totalExams,
      pendingPublication,
      publishedPublication,
      publicationTotal,
      departments,
    };
  }, [data]);

  if (loading) return <div className="flex h-64 items-center justify-center text-slate-400">Loading dashboard...</div>;
  if (!model) return null;

  const {
    kpis,
    exams,
    upcoming,
    completed,
    totalExams,
    pendingPublication,
    publishedPublication,
    publicationTotal,
    departments,
  } = model;

  const timeline = [...upcoming, ...completed].slice(0, 7);
  const passRate = Number(kpis.overallPassPercentage || 0);
  const chartRows = departments.slice(0, 6).map((row) => ({
    department: row.department,
    Upcoming: row.upcoming,
    Completed: row.completed,
  }));

  const capabilityMap = [
    'Role based portals',
    'Clash detection',
    'Faculty assignment',
    'Result workflow',
    'Bulk import',
    'Attendance aware results',
    'Optimistic locking',
    'Publication analytics',
  ];

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="grid gap-5 p-5 lg:grid-cols-[1.3fr_0.7fr] lg:items-center">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-cyan-700">Admin command center</p>
            <h1 className="mt-2 text-3xl font-bold tracking-normal text-slate-950">ExamScheduler Dashboard</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
              Scheduling, publication, users, and department workload are visible from the first screen.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {capabilityMap.map((item) => (
                <span key={item} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700 ring-1 ring-slate-200">
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-lg bg-blue-50 p-3 ring-1 ring-blue-100">
              <p className="text-2xl font-bold text-blue-700 tabular-nums">{percent(completed.length || kpis.examsCompleted, totalExams)}%</p>
              <p className="mt-1 text-xs font-semibold text-blue-700">Exam completion</p>
            </div>
            <div className="rounded-lg bg-emerald-50 p-3 ring-1 ring-emerald-100">
              <p className="text-2xl font-bold text-emerald-700 tabular-nums">{formatCompactNumber(passRate)}%</p>
              <p className="mt-1 text-xs font-semibold text-emerald-700">Pass rate</p>
            </div>
            <div className="rounded-lg bg-amber-50 p-3 ring-1 ring-amber-100">
              <p className="text-2xl font-bold text-amber-700 tabular-nums">{formatCompactNumber(pendingPublication)}</p>
              <p className="mt-1 text-xs font-semibold text-amber-700">Pending marks</p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 border-t border-slate-100 bg-slate-50 px-5 py-4">
          <Link to="/admin/exams" className="btn-primary">
            <Icon name="calendar" className="h-4 w-4" />
            Schedule Exam
          </Link>
          <Link to="/admin/results" className="btn-secondary">
            <Icon name="publish" className="h-4 w-4" />
            Publish Results
          </Link>
          <Link to="/admin/users" className="btn-secondary">
            <Icon name="userPlus" className="h-4 w-4" />
            Manage Users
          </Link>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <MetricCard label="Total Exams" value={totalExams} icon="calendar" tone="blue" sub={`${formatCompactNumber(upcoming.length)} upcoming in schedule`} />
        <MetricCard label="Upcoming Exams" value={kpis.upcomingExams} icon="clock" tone="cyan" sub="Active timetable workload" />
        <MetricCard label="Completed Exams" value={kpis.examsCompleted} icon="check" tone="emerald" sub="Ready for marks workflow" />
        <MetricCard label="Published Results" value={publishedPublication} icon="publish" tone="violet" sub={`${formatCompactNumber(pendingPublication)} waiting`} />
        <MetricCard label="Students" value={kpis.totalStudents} icon="graduation" tone="amber" sub="Active student accounts" />
        <MetricCard label="Faculty" value={kpis.totalFaculty} icon="building" tone="rose" sub="Active faculty accounts" />
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <ActionTile
          to="/admin/exams"
          title="Schedule Builder"
          description={`${formatCompactNumber(totalExams)} exam records with halls, faculty ownership, and clash control.`}
          icon="calendar"
          tone="blue"
          meta={`${formatCompactNumber(upcoming.length)} upcoming`}
        />
        <ActionTile
          to="/admin/results"
          title="Result Console"
          description={`${formatCompactNumber(publicationTotal)} result records across draft, ready, and published states.`}
          icon="result"
          tone="violet"
          meta={`${formatCompactNumber(publishedPublication)} published`}
        />
        <ActionTile
          to="/admin/publication-overview"
          title="Publication Analytics"
          description={`Pass rate, averages, fail count, and subject publication progress in one review view.`}
          icon="chart"
          tone="emerald"
          meta={`${formatCompactNumber(passRate)}% pass rate`}
        />
        <ActionTile
          to="/admin/users"
          title="User Registry"
          description={`${formatCompactNumber(kpis.totalStudents)} students and ${formatCompactNumber(kpis.totalFaculty)} faculty are active in the system.`}
          icon="users"
          tone="amber"
          meta="Role access"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="font-bold text-slate-950">Exam Timeline</h2>
              <p className="mt-1 text-sm text-slate-500">{formatCompactNumber(exams.length)} total scheduled exams</p>
            </div>
            <Link to="/admin/exams" className="btn-secondary px-3 py-1.5 text-xs">
              Full Schedule
            </Link>
          </div>

          {timeline.length ? (
            <div className="divide-y divide-slate-100">
              {timeline.map((exam) => (
                <div
                  key={exam.id}
                  className="grid grid-cols-1 gap-3 px-5 py-4 text-sm transition-colors hover:bg-blue-50/50 md:grid-cols-[1fr_auto_auto] md:items-center"
                >
                  <div className="min-w-0">
                    <p className="truncate font-bold text-slate-950">{exam.subject}</p>
                    <p className="mt-1 text-xs font-medium text-slate-500">
                      {exam.department} - Sem {exam.semester} - Hall {exam.hall}
                    </p>
                  </div>
                  <div className="text-left md:text-right">
                    <p className="font-semibold text-slate-700" title={exam.examDate}>{formatDisplayDate(exam.examDate)}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {formatDisplayTime(exam.startTime)} - {formatDisplayTime(exam.endTime)}
                    </p>
                  </div>
                  <StatusPill tone={exam.completed ? 'emerald' : 'blue'}>
                    {exam.completed ? 'Completed' : 'Upcoming'}
                  </StatusPill>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-5">
              <EmptyState title="No exams scheduled" description="Create an exam to begin building the timetable." />
            </div>
          )}
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-bold text-slate-950">Publication Flow</h2>
              <p className="mt-1 text-sm text-slate-500">{formatCompactNumber(publicationTotal)} result records tracked</p>
            </div>
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-violet-50 text-violet-700">
              <Icon name="workflow" className="h-5 w-5" />
            </span>
          </div>

          <div className="mt-6 space-y-5">
            <ProgressBar
              label="Published"
              value={publishedPublication}
              max={publicationTotal}
              tone="emerald"
              rightLabel={formatCompactNumber(publishedPublication)}
            />
            <ProgressBar
              label="Draft or ready"
              value={pendingPublication}
              max={publicationTotal}
              tone="amber"
              rightLabel={formatCompactNumber(pendingPublication)}
            />
            <ProgressBar
              label="Overall pass rate"
              value={passRate}
              max={100}
              tone="blue"
              rightLabel={`${formatCompactNumber(passRate)}%`}
            />
          </div>

          <Link to="/admin/publication-overview" className="btn-secondary mt-6 w-full">
            <Icon name="chart" className="h-4 w-4" />
            Open Publication Overview
          </Link>
        </section>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-bold text-slate-950">Department Load</h2>
              <p className="mt-1 text-sm text-slate-500">Exam volume by academic department</p>
            </div>
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-cyan-50 text-cyan-700">
              <Icon name="building" className="h-5 w-5" />
            </span>
          </div>

          {chartRows.length ? (
            <div className="mt-5 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartRows} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="department" tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} />
                  <Tooltip cursor={{ fill: '#f8fafc' }} />
                  <Bar dataKey="Upcoming" stackId="a" fill="#0891b2" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Completed" stackId="a" fill="#059669" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="mt-5">
              <EmptyState title="No department load yet" description="Department charts appear after exams are scheduled." />
            </div>
          )}
        </section>

        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="font-bold text-slate-950">Department Coverage</h2>
              <p className="mt-1 text-sm text-slate-500">{formatCompactNumber(departments.length)} departments represented</p>
            </div>
          </div>
          {departments.length ? (
            <div className="divide-y divide-slate-100">
              {departments.slice(0, 7).map((row) => (
                <div key={row.department} className="grid grid-cols-2 gap-3 px-5 py-4 text-sm sm:grid-cols-[1fr_auto_auto_auto] sm:items-center">
                  <div className="col-span-2 min-w-0 sm:col-span-1">
                    <p className="truncate font-bold text-slate-950">{row.department}</p>
                    <p className="mt-1 text-xs text-slate-500">{formatCompactNumber(row.halls)} halls used</p>
                  </div>
                  <StatusPill tone="slate">{formatCompactNumber(row.total)} total</StatusPill>
                  <StatusPill tone="blue">{formatCompactNumber(row.upcoming)} upcoming</StatusPill>
                  <StatusPill tone="emerald">{formatCompactNumber(row.completed)} completed</StatusPill>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-5">
              <EmptyState title="No department data" description="Schedule entries will populate this table." />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
