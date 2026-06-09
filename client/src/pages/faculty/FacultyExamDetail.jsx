import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import KPICard from '../../components/shared/KPICard';
import { GradeBadge, StatusBadge } from '../../components/shared/Badges';
import { formatDisplayDate, formatDisplayTime } from '../../utils/dateTime';

const SUMMARY_ICONS = {
  students: 'graduation',
  present: 'check',
  absent: 'alert',
  average: 'chart',
};

function AttendanceBadge({ status }) {
  const config = {
    present: 'bg-green-100 text-green-700',
    absent: 'bg-red-100 text-red-700',
    unmarked: 'bg-gray-100 text-gray-600',
  };

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${config[status] || config.unmarked}`}>
      {status}
    </span>
  );
}

function AttendanceButton({ active, disabled, tone, children, onClick, title }) {
  const styles = {
    green: active ? 'border-green-600 bg-green-600 text-white' : 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100',
    red: active ? 'border-red-600 bg-red-600 text-white' : 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100',
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`inline-flex min-w-20 justify-center rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${styles[tone]}`}
    >
      {children}
    </button>
  );
}

export default function FacultyExamDetail() {
  const { examId } = useParams();
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);

  const loadDetail = useCallback(() => {
    setLoading(true);
    api.get(`/attendance/exams/${examId}`)
      .then((response) => {
          const d = response.data || {};
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
      })
      .catch(() => toast.error('Failed to load exam details'))
      .finally(() => setLoading(false));
  }, [examId]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  const handleAttendance = async (student, status) => {
    setSavingId(student.id);
    try {
      await api.patch(`/attendance/exams/${examId}/students/${student.id}`, { status });
      toast.success(`${student.name} marked ${status}`);
      await api.get(`/attendance/exams/${examId}`).then((response) => {
        const d = response.data || {};
        if (Array.isArray(d.students)) {
          d.students.sort((a, b) => {
            if (a.rollNo && b.rollNo) return a.rollNo.localeCompare(b.rollNo, undefined, { numeric: true, sensitivity: 'base' });
            if (a.rollNo) return -1;
            if (b.rollNo) return 1;
            return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
          });
        }
        setDetail(d);
      });
    } catch (error) {
      toast.error(error.response?.data?.error?.message || 'Could not update attendance');
    } finally {
      setSavingId(null);
    }
  };

  const students = useMemo(() => detail?.students || [], [detail]);

  if (loading) {
    return <div className="flex h-64 items-center justify-center text-gray-400">Loading exam details...</div>;
  }
  if (!detail) return null;

  const { exam, summary } = detail;
  const canMarkAttendance = Boolean(exam.completed);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link to="/faculty/dashboard" className="text-sm font-semibold text-blue-600 hover:text-blue-700">
            Back to dashboard
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-gray-900">{exam.subject}</h1>
          <p className="mt-1 text-sm text-gray-500">
            {exam.department} - Sem {exam.semester} - Hall {exam.hall} - {formatDisplayDate(exam.examDate)}, {formatDisplayTime(exam.startTime)} - {formatDisplayTime(exam.endTime)}
          </p>
        </div>
        <span className={`inline-flex w-fit rounded-full px-3 py-1 text-sm font-semibold ${
          exam.completed ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
        }`}>
          {exam.completed ? 'Completed' : 'Upcoming'}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KPICard label="Total Students" value={summary.totalStudents} icon={SUMMARY_ICONS.students} color="blue" />
        <KPICard label="Present" value={summary.presentCount} icon={SUMMARY_ICONS.present} color="green" />
        <KPICard label="Absent" value={summary.absentCount} icon={SUMMARY_ICONS.absent} color="red" />
        <KPICard label="Average Marks" value={summary.averageMarks} icon={SUMMARY_ICONS.average} color="purple" />
      </div>

      <div className={`rounded-lg border p-4 text-sm ${
        canMarkAttendance ? 'border-green-200 bg-green-50 text-green-700' : 'border-amber-200 bg-amber-50 text-amber-700'
      }`}>
        {canMarkAttendance
          ? 'Mark students present or absent. Students marked absent are blocked from result entry and publishing.'
          : 'Attendance can be marked after the exam is completed.'}
      </div>

      <section className="card p-0">
        <div className="flex flex-col gap-2 border-b border-gray-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold text-gray-800">Student Attendance and Result Details</h2>
            <p className="text-sm text-gray-500">
              {summary.presentCount} present, {summary.absentCount} absent, {summary.unmarkedCount} unmarked
            </p>
          </div>
          <Link to="/faculty/marks" className="btn-secondary text-sm">Open Marks Entry</Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead className="border-b bg-gray-50">
              <tr>
                {['Roll No', 'Student', 'Attendance', 'Mark Attendance', 'Marks', 'Grade', 'Result Status'].map((heading) => (
                  <th key={heading} className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {students.map((student) => {
                const result = student.result;
                const absent = student.attendanceStatus === 'absent';
                const publishedResult = result?.status === 'published';

                return (
                  <tr key={student.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{student.rollNo || '-'}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{student.name}</p>
                      <p className="text-xs text-gray-500">{student.email}</p>
                    </td>
                    <td className="px-4 py-3"><AttendanceBadge status={student.attendanceStatus} /></td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <AttendanceButton
                          tone="green"
                          active={student.attendanceStatus === 'present'}
                          disabled={!canMarkAttendance || savingId === student.id}
                          onClick={() => handleAttendance(student, 'present')}
                        >
                          Present
                        </AttendanceButton>
                        <AttendanceButton
                          tone="red"
                          active={absent}
                          disabled={!canMarkAttendance || savingId === student.id || publishedResult}
                          title={publishedResult ? 'Published results cannot be marked absent' : ''}
                          onClick={() => handleAttendance(student, 'absent')}
                        >
                          Absent
                        </AttendanceButton>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {result ? <span className="font-semibold text-gray-900">{result.marks}</span> : <span className="text-gray-400">-</span>}
                      {absent && <p className="mt-1 text-xs font-medium text-red-600">Result blocked</p>}
                    </td>
                    <td className="px-4 py-3">{result?.grade ? <GradeBadge grade={result.grade} /> : '-'}</td>
                    <td className="px-4 py-3">{result?.status ? <StatusBadge status={result.status} /> : <span className="text-xs text-gray-400">Not entered</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
