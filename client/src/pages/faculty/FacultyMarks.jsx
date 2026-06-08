import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { fetchResults, createResult, updateResult, transitionResult, clearResultErrors } from '../../features/results/resultSlice';
import { fetchExams } from '../../features/exams/examSlice';
import TripwireAlert from '../../components/shared/TripwireAlert';
import ConcurrencyModal from '../../components/shared/ConcurrencyModal';
import { StatusBadge, GradeBadge } from '../../components/shared/Badges';
import { useDraftRecovery } from '../../hooks/useDraftRecovery';
import api from '../../utils/api';
import { formatDisplayDate, formatDisplayDateTime, isExamEnded } from '../../utils/dateTime';

const EMPTY_DRAFT = { selectedExam: '', editingResult: null, formValues: {} };
const RESULT_FETCH_LIMIT = 1000;
const EDITABLE_RESULT_STATUS = 'draft';
const ABSENT_ATTENDANCE = 'absent';

function AttendanceBadge({ status }) {
  const config = {
    present: { label: 'Present', cls: 'bg-green-100 text-green-700' },
    absent: { label: 'Absent', cls: 'bg-red-100 text-red-700' },
    unmarked: { label: 'Unmarked', cls: 'bg-gray-100 text-gray-600' },
  };
  const cfg = config[status] || config.unmarked;

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

function AttendanceButton({ active, disabled, tone, children, onClick, title }) {
  const styles = {
    present: active ? 'border-green-600 bg-green-600 text-white' : 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100',
    absent: active ? 'border-red-600 bg-red-600 text-white' : 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100',
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`inline-flex min-w-[4rem] justify-center rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${styles[tone]}`}
    >
      {children}
    </button>
  );
}

const loadAttendanceStudents = async (examId) => {
  const { data } = await api.get(`/attendance/exams/${examId}`);
  const students = data.students || [];

  const extractNumber = (s) => {
    if (!s) return NaN;
    const m = String(s).match(/(\d+)\s*$/); // trailing number
    if (m) return parseInt(m[1], 10);
    const m2 = String(s).match(/(\d+)/); // first number
    return m2 ? parseInt(m2[1], 10) : NaN;
  };

  const studentCompare = (x, y) => {
    // try rollNo numeric comparison
    if (x.rollNo && y.rollNo) {
      const xn = extractNumber(x.rollNo);
      const yn = extractNumber(y.rollNo);
      if (!Number.isNaN(xn) && !Number.isNaN(yn)) return xn - yn;
      return x.rollNo.localeCompare(y.rollNo, undefined, { numeric: true, sensitivity: 'base' });
    }

    // fallback to numeric suffix in name (e.g., 'CSE Student 10')
    const xn = extractNumber(x.name);
    const yn = extractNumber(y.name);
    if (!Number.isNaN(xn) && !Number.isNaN(yn)) return xn - yn;

    // final fallback: name locale compare
    return x.name.localeCompare(y.name, undefined, { sensitivity: 'base' });
  };

  students.sort(studentCompare);
  return students;
};

export default function FacultyMarks() {
  const dispatch = useDispatch();
  const { items: results, loading, concurrencyError, tripwireError } = useSelector((s) => s.results);
  const { items: exams } = useSelector((s) => s.exams);
  const { user } = useSelector((s) => s.auth);

  const [selectedExam, setSelectedExam] = useState('');
  const [students, setStudents] = useState([]);
  const [editingResult, setEditingResult] = useState(null);
  const [myEditData, setMyEditData] = useState(null);
  const [draftRestored, setDraftRestored] = useState(false);
  const [attendanceSavingId, setAttendanceSavingId] = useState(null);

  const [draft, setDraft, clearDraft, hasDraft] = useDraftRecovery(
    `draft:marks:${user?.id || 'anonymous'}`,
    EMPTY_DRAFT
  );

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm();

  useEffect(() => {
    dispatch(fetchExams());
  }, [dispatch]);

  useEffect(() => {
    if (draftRestored) return;
    if (draft?.selectedExam) setSelectedExam(draft.selectedExam);
    if (draft?.editingResult) {
      setEditingResult(draft.editingResult);
      reset(draft.formValues || {});
    }
    setDraftRestored(true);
  }, [draft, draftRestored, reset]);

  useEffect(() => {
    if (!selectedExam) {
      setStudents([]);
      return;
    }

    let active = true;
    dispatch(fetchResults({ examId: selectedExam, limit: RESULT_FETCH_LIMIT }));

    loadAttendanceStudents(selectedExam)
      .then((loadedStudents) => {
        if (active) setStudents(loadedStudents);
      })
      .catch(() => toast.error('Failed to load students'));

    return () => {
      active = false;
    };
  }, [selectedExam, dispatch]);

  useEffect(() => {
    const subscription = watch((values) => {
      if (selectedExam || editingResult) {
        setDraft({ selectedExam, editingResult, formValues: values || {} });
      }
    });
    return () => subscription.unsubscribe();
  }, [watch, selectedExam, editingResult, setDraft]);

  const currentExam = exams.find((e) => e.id === selectedExam);
  const myExams = exams;

  const isExamCompleted = (exam) => {
    if (!exam) return false;
    return isExamEnded(exam.examDate, exam.endTime);
  };

  const examLocked = currentExam && !isExamCompleted(currentExam);
  const isStudentAbsent = (student) => student.attendanceStatus === ABSENT_ATTENDANCE;

  const refreshSelectedExam = async () => {
    if (!selectedExam) return;
    const [, loadedStudents] = await Promise.all([
      dispatch(fetchResults({ examId: selectedExam, limit: RESULT_FETCH_LIMIT })),
      loadAttendanceStudents(selectedExam),
    ]);
    setStudents(loadedStudents);
  };

  const handleExamChange = (examId) => {
    setSelectedExam(examId);
    setEditingResult(null);
    reset({});
    setDraft({ selectedExam: examId, editingResult: null, formValues: {} });
    dispatch(clearResultErrors());
  };

  const openCreateResult = (student) => {
    if (isStudentAbsent(student)) {
      toast.error('Absent students cannot have marks or grades.');
      return;
    }

    const entry = { mode: 'create', studentId: student.id, studentName: student.name };
    const values = { studentId: student.id, examId: selectedExam, marks: '', remarks: '' };
    setEditingResult(entry);
    reset(values);
    setDraft({ selectedExam, editingResult: entry, formValues: values });
  };

  const openEditResult = (result, student) => {
    if (isStudentAbsent(student)) {
      toast.error('Absent students cannot have marks or grades.');
      return;
    }

    if (result.status !== EDITABLE_RESULT_STATUS) {
      toast.error('Marks can be edited only before the result is ready.');
      return;
    }

    const entry = { mode: 'edit', resultId: result.id, studentId: result.studentId, studentName: result.student?.name };
    const values = { marks: result.marks, remarks: result.remarks || '', version: result.version };
    setEditingResult(entry);
    reset(values);
    setDraft({ selectedExam, editingResult: entry, formValues: values });
  };

  const closeModal = () => {
    setEditingResult(null);
    dispatch(clearResultErrors());
    setDraft({ selectedExam, editingResult: null, formValues: {} });
  };

  const onSubmit = async (data) => {
    if (!editingResult) return;
    setMyEditData(data);

    const payload = {
      marks: parseFloat(data.marks),
      remarks: data.remarks || '',
    };

    const action = editingResult.mode === 'create'
      ? createResult({ studentId: editingResult.studentId, examId: selectedExam, ...payload })
      : updateResult({ id: editingResult.resultId, version: parseInt(data.version, 10), ...payload });

    const result = await dispatch(action);
    if (!result.error) {
      toast.success(editingResult.mode === 'create' ? 'Marks saved' : 'Marks updated');
      setEditingResult(null);
      clearDraft();
      await refreshSelectedExam();
    } else if (result.payload?.code === 'RESULT_EXISTS') {
      await refreshSelectedExam();
      toast.error('Result already exists. Reloaded existing marks.');
      setEditingResult(null);
      clearDraft();
    } else {
      toast.error(result.payload?.message || 'Unable to save marks');
    }
  };

  const handleReload = async () => {
    dispatch(clearResultErrors());
    await refreshSelectedExam();
    setEditingResult(null);
  };

  const handleRetry = () => {
    if (concurrencyError?.currentVersion) {
      setValue('version', concurrencyError.currentVersion);
    }
    dispatch(clearResultErrors());
  };

  const handleAttendance = async (student, status) => {
    if (examLocked) return;
    if (status === ABSENT_ATTENDANCE && student.result?.status === 'published') {
      toast.error('Published results cannot be marked absent.');
      return;
    }

    setAttendanceSavingId(student.id);
    try {
      const response = await api.patch(`/attendance/exams/${selectedExam}/students/${student.id}`, { status });
      toast.success(`${student.name} marked ${status}`);
      if (response.data?.clearedResult) {
        toast('Existing draft or ready marks were cleared for this absent student.');
        if (editingResult?.studentId === student.id) closeModal();
      }
      await refreshSelectedExam();
    } catch (error) {
      toast.error(error.response?.data?.error?.message || 'Unable to update attendance');
    } finally {
      setAttendanceSavingId(null);
    }
  };

  const handleMarkReady = async (result, student) => {
    if (isStudentAbsent(student)) {
      toast.error('Absent students cannot be marked ready.');
      return;
    }

    const action = await dispatch(transitionResult({ id: result.id, action: 'ready' }));
    if (!action.error) {
      toast.success('Result marked ready');
      await refreshSelectedExam();
    } else {
      toast.error(action.payload?.message || 'Unable to mark result ready');
    }
  };

  const handleMarkAllDraftsReady = async () => {
    const absentStudentIds = new Set(
      students
        .filter((student) => student.attendanceStatus === ABSENT_ATTENDANCE)
        .map((student) => student.id)
    );
    const draftResults = results.filter((result) => (
      result.examId === selectedExam &&
      result.status === 'draft' &&
      !absentStudentIds.has(result.studentId)
    ));
    if (!draftResults.length) {
      toast('No present draft results available to move to ready');
      return;
    }

    const promises = draftResults.map((result) => dispatch(transitionResult({ id: result.id, action: 'ready' })));
    const settled = await Promise.all(promises);
    const failed = settled.filter((r) => r.error);

    if (!failed.length) {
      toast.success(`Marked ${draftResults.length} draft result${draftResults.length === 1 ? '' : 's'} ready`);
    } else if (failed.length === draftResults.length) {
      toast.error('Unable to mark any draft results ready');
    } else {
      toast.success(`Marked ${draftResults.length - failed.length} results ready`);
      toast.error(`${failed.length} result${failed.length === 1 ? '' : 's'} failed`);
    }

    await refreshSelectedExam();
  };

  const studentsWithResults = students.map((student) => ({
    ...student,
    result: results.find((result) => result.studentId === student.id),
  }));
  const absentStudentIds = new Set(
    studentsWithResults
      .filter((student) => isStudentAbsent(student))
      .map((student) => student.id)
  );
  const hasReadyEligibleDraft = results.some((result) => (
    result.examId === selectedExam &&
    result.status === 'draft' &&
    !absentStudentIds.has(result.studentId)
  ));
  const editingStudent = editingResult?.studentId
    ? studentsWithResults.find((student) => student.id === editingResult.studentId)
    : null;
  const editingStudentAbsent = editingStudent ? isStudentAbsent(editingStudent) : false;

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-gray-900">Enter Marks</h1>

      {hasDraft && !selectedExam && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700 flex items-center justify-between">
          <span>Draft recovered from your last session.</span>
          <button onClick={clearDraft} className="text-blue-500 hover:text-blue-700 text-xs underline">Clear draft</button>
        </div>
      )}

      <div className="card">
        <label className="label">Select Exam</label>
        <select className="input max-w-sm" value={selectedExam} onChange={(e) => handleExamChange(e.target.value)}>
          <option value="">-- Choose an exam --</option>
          {myExams.map((exam) => (
            <option key={exam.id} value={exam.id}>
              {exam.subject} - {exam.department} Sem {exam.semester} ({formatDisplayDate(exam.examDate)})
            </option>
          ))}
        </select>
      </div>

      {selectedExam && examLocked && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4">
          <div className="flex items-center gap-2">
            <span className="text-amber-500 text-xl">!</span>
            <div>
              <p className="font-semibold text-amber-800">Exam Not Yet Completed</p>
              <p className="text-sm text-amber-700">
                Marks entry will be unlocked after {formatDisplayDateTime(currentExam?.examDate, currentExam?.endTime)}.
              </p>
            </div>
          </div>
        </div>
      )}

      <ConcurrencyModal
        error={concurrencyError}
        myData={myEditData}
        onReload={handleReload}
        onRetry={handleRetry}
        onCompare={() => {}}
        onClose={() => dispatch(clearResultErrors())}
      />

      {editingResult && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full mx-4 p-6">
            <h2 className="text-lg font-bold mb-1">
              {editingResult.mode === 'create' ? 'Enter Marks' : 'Update Marks'}
            </h2>
            <p className="text-sm text-gray-500 mb-4">{editingResult.studentName}</p>

            <TripwireAlert error={tripwireError} onDismiss={() => dispatch(clearResultErrors())} />

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
              <div>
                <label className="label">Marks (0 - 100)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  className="input"
                  {...register('marks', {
                    required: 'Marks required',
                    min: { value: 0, message: 'Min 0' },
                    max: { value: 100, message: 'Max 100' },
                  })}
                />
                {errors.marks && <p className="text-red-500 text-xs mt-1">{errors.marks.message}</p>}
              </div>
              <div>
                <label className="label">Remarks (optional)</label>
                <input className="input" {...register('remarks')} />
              </div>
              <input type="hidden" {...register('version')} />
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={examLocked || editingStudentAbsent}
                  className="btn-primary flex-1"
                  title={examLocked ? 'Exam not completed yet' : editingStudentAbsent ? 'Student is marked absent' : ''}
                >
                  Save Marks
                </button>
                <button type="button" onClick={closeModal} className="btn-secondary">Cancel</button>
              </div>
              {examLocked && <p className="text-xs text-amber-600 text-center">Cannot save until the exam is completed.</p>}
              {editingStudentAbsent && <p className="text-xs text-red-600 text-center">Cannot save marks for an absent student.</p>}
            </form>
          </div>
        </div>
      )}

      {selectedExam && (
        <div className="card p-0 overflow-hidden">
          <div className="flex flex-col gap-2 px-4 py-3 bg-gray-50 border-b sm:flex-row sm:items-center sm:justify-between">
            <span className="font-medium text-gray-700 text-sm">Students - {studentsWithResults.length} total</span>
            <button
              type="button"
              onClick={handleMarkAllDraftsReady}
              disabled={examLocked || !hasReadyEligibleDraft}
              className="btn-secondary text-xs disabled:opacity-40"
            >
              Mark all drafts ready
            </button>
          </div>
          {loading ? (
            <div className="p-8 text-center text-gray-400">Loading...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {['Name', 'Roll No', 'Attendance', 'Marks', 'Grade', 'Status', 'Mark Attendance', 'Action'].map((heading) => (
                      <th key={heading} className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{heading}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {studentsWithResults.map((student) => {
                    const absent = isStudentAbsent(student);
                    const publishedResult = student.result?.status === 'published';

                    return (
                      <tr key={student.id} className={absent ? 'bg-red-50/40 hover:bg-red-50' : 'hover:bg-gray-50'}>
                        <td className="px-4 py-3">{student.name}</td>
                        <td className="px-4 py-3 text-gray-500">{student.rollNo}</td>
                        <td className="px-4 py-3"><AttendanceBadge status={student.attendanceStatus} /></td>
                        <td className="px-4 py-3">
                          {!absent && student.result ? <span className="font-medium">{student.result.marks}</span> : <span className="text-gray-300">-</span>}
                        </td>
                        <td className="px-4 py-3">{!absent && student.result ? <GradeBadge grade={student.result.grade} /> : '-'}</td>
                        <td className="px-4 py-3">
                          {absent ? (
                            <span className="text-xs font-medium text-red-600">Blocked</span>
                          ) : student.result ? (
                            <StatusBadge status={student.result.status} />
                          ) : (
                            <span className="text-gray-400 text-xs">Not entered</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <AttendanceButton
                              tone="present"
                              active={student.attendanceStatus === 'present'}
                              disabled={examLocked || attendanceSavingId === student.id}
                              onClick={() => handleAttendance(student, 'present')}
                            >
                              Present
                            </AttendanceButton>
                            <AttendanceButton
                              tone="absent"
                              active={absent}
                              disabled={examLocked || attendanceSavingId === student.id || publishedResult}
                              title={publishedResult ? 'Published results cannot be marked absent' : ''}
                              onClick={() => handleAttendance(student, ABSENT_ATTENDANCE)}
                            >
                              Absent
                            </AttendanceButton>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {absent ? (
                            <span className="text-xs text-red-500">Absent</span>
                          ) : student.result?.status === 'published' ? (
                            <span className="text-xs text-gray-400">Published</span>
                          ) : student.result?.status === 'ready' ? (
                            <span className="text-xs text-gray-400">Ready</span>
                          ) : student.result ? (
                            <div className="flex items-center gap-3">
                              <button onClick={() => openEditResult(student.result, student)} disabled={examLocked} className="text-blue-600 hover:underline text-xs disabled:opacity-40">Edit</button>
                              <button onClick={() => handleMarkReady(student.result, student)} disabled={examLocked} className="text-yellow-600 hover:underline text-xs disabled:opacity-40">Ready</button>
                            </div>
                          ) : (
                            <button onClick={() => openCreateResult(student)} disabled={examLocked} className="text-green-600 hover:underline text-xs disabled:opacity-40">Enter</button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
