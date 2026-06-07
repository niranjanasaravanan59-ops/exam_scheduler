import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchExams } from '../../features/exams/examSlice';
import { formatDisplayDate, formatDisplayTime, isExamEnded } from '../../utils/dateTime';

export default function FacultyExams() {
  const dispatch = useDispatch();
  const { items: exams, loading } = useSelector((s) => s.exams);
  const { user } = useSelector((s) => s.auth);

  useEffect(() => { dispatch(fetchExams()); }, [dispatch]);

  const myExams = exams.filter((e) => e.facultyId === user?.id);
  const now = new Date();

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-gray-900">My Assigned Exams</h1>
      <div className="card p-0 overflow-hidden">
        {loading ? <div className="p-8 text-center text-gray-400">Loading...</div>
          : myExams.length === 0 ? <div className="p-8 text-center text-gray-400">No exams assigned yet.</div>
          : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                {['Subject', 'Dept / Sem', 'Date', 'Time', 'Hall', 'Status'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {myExams.map((exam) => {
                const completed = isExamEnded(exam.examDate, exam.endTime, now);
                return (
                  <tr key={exam.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{exam.subject}</td>
                    <td className="px-4 py-3 text-gray-600">{exam.department}<br/><span className="text-xs">Sem {exam.semester}</span></td>
                    <td className="px-4 py-3" title={exam.examDate}>{formatDisplayDate(exam.examDate)}</td>
                    <td className="px-4 py-3 text-gray-600">{formatDisplayTime(exam.startTime)} – {formatDisplayTime(exam.endTime)}</td>
                    <td className="px-4 py-3">{exam.hall}</td>
                    <td className="px-4 py-3">
                      <span className={`badge ${completed ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                        {completed ? '✅ Completed' : '🔵 Upcoming'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
