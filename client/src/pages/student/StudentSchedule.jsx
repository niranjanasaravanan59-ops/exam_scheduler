import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchExams } from '../../features/exams/examSlice';
import { formatDisplayDate, formatDisplayTime, isExamEnded } from '../../utils/dateTime';

export default function StudentSchedule() {
  const dispatch = useDispatch();
  const { items: exams, loading } = useSelector((s) => s.exams);
  const [search, setSearch] = useState('');

  useEffect(() => { dispatch(fetchExams()); }, [dispatch]);

  const now = new Date();
  const filtered = exams.filter((e) =>
    e.subject.toLowerCase().includes(search.toLowerCase())
  );
  const upcoming = filtered.filter((e) => !isExamEnded(e.examDate, e.endTime, now));
  const past = filtered.filter((e) => isExamEnded(e.examDate, e.endTime, now));

  const ExamCard = ({ exam }) => (
    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors">
      <div>
        <p className="font-semibold text-gray-900">{exam.subject}</p>
        <p className="text-xs text-gray-500 mt-0.5">{exam.department} • Semester {exam.semester}</p>
      </div>
      <div className="text-right text-sm">
        <p className="font-medium text-gray-800" title={exam.examDate}>📅 {formatDisplayDate(exam.examDate)}</p>
        <p className="text-gray-500 text-xs">🕐 {formatDisplayTime(exam.startTime)} – {formatDisplayTime(exam.endTime)}</p>
        <p className="text-gray-500 text-xs">🏛 {exam.hall}</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-5 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900">My Exam Schedule</h1>
      <input
        className="input"
        placeholder="Search subject..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : (
        <>
          <section>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Upcoming ({upcoming.length})
            </h2>
            {upcoming.length === 0 ? (
              <p className="text-gray-400 text-sm">No upcoming exams.</p>
            ) : (
              <div className="space-y-2">
                {upcoming.map((e) => <ExamCard key={e.id} exam={e} />)}
              </div>
            )}
          </section>
          {past.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">
                Past ({past.length})
              </h2>
              <div className="space-y-2 opacity-60">
                {past.map((e) => <ExamCard key={e.id} exam={e} />)}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
