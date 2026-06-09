import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchExams } from '../../features/exams/examSlice';
import { EmptyState, Icon, StatusPill, formatCompactNumber } from '../../components/shared/DashboardUI';
import { formatDisplayDate, formatDisplayTime, isExamEnded } from '../../utils/dateTime';

export default function FacultyExams() {
  const dispatch = useDispatch();
  const { items: exams, loading } = useSelector((s) => s.exams);
  const { user } = useSelector((s) => s.auth);

  useEffect(() => { dispatch(fetchExams()); }, [dispatch]);

  const myExams = exams.filter((exam) => exam.facultyId === user?.id);
  const now = new Date();

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-cyan-700">Faculty exams</p>
            <h1 className="mt-2 text-2xl font-bold text-slate-950">My Assigned Exams</h1>
            <p className="mt-2 text-sm text-slate-500">{formatCompactNumber(myExams.length)} assigned exam records</p>
          </div>
          <span className="grid h-11 w-11 place-items-center rounded-lg bg-blue-50 text-blue-700 ring-1 ring-blue-100">
            <Icon name="calendar" className="h-5 w-5" />
          </span>
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-slate-400">Loading exams...</div>
        ) : myExams.length === 0 ? (
          <div className="p-5">
            <EmptyState title="No exams assigned yet" description="Admin assigned exams will appear here." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50">
                <tr className="border-b border-slate-100 text-left text-xs font-bold uppercase text-slate-500">
                  {['Subject', 'Dept / Sem', 'Date', 'Time', 'Hall', 'Status', 'Details'].map((heading) => (
                    <th key={heading} className="px-5 py-3">{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {myExams.map((exam) => {
                  const completed = isExamEnded(exam.examDate, exam.endTime, now);
                  return (
                    <tr key={exam.id} className="hover:bg-blue-50/40">
                      <td className="px-5 py-4 font-bold text-slate-950">{exam.subject}</td>
                      <td className="px-5 py-4 text-slate-600">
                        {exam.department}
                        <br />
                        <span className="text-xs">Sem {exam.semester}</span>
                      </td>
                      <td className="px-5 py-4 text-slate-600" title={exam.examDate}>{formatDisplayDate(exam.examDate)}</td>
                      <td className="px-5 py-4 text-slate-600">{formatDisplayTime(exam.startTime)} - {formatDisplayTime(exam.endTime)}</td>
                      <td className="px-5 py-4 text-slate-600">{exam.hall}</td>
                      <td className="px-5 py-4">
                        <StatusPill tone={completed ? 'emerald' : 'blue'}>{completed ? 'Completed' : 'Upcoming'}</StatusPill>
                      </td>
                      <td className="px-5 py-4">
                        <Link to={`/faculty/exams/${exam.id}`} className="btn-secondary px-3 py-1.5 text-xs">
                          <Icon name="clipboard" className="h-4 w-4" />
                          Details
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
