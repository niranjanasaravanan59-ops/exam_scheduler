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

    dispatch(fetchResults({ examId: selectedExam, limit: RESULT_FETCH_LIMIT }));

    const currentExam = exams.find((e) => e.id === selectedExam);
    const params = { role: 'student' };
    if (currentExam?.department) params.department = currentExam.department;

    api.get('/auth/users', { params })
      .then((r) => setStudents(r.data.users || []))
      .catch(() => toast.error('Failed to load students'));
  }, [selectedExam, dispatch, exams]);

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

  const handleExamChange = (examId) => {
    setSelectedExam(examId);
    setEditingResult(null);
    reset({});
    setDraft({ selectedExam: examId, editingResult: null, formValues: {} });
    dispatch(clearResultErrors());
  };

  const openCreateResult = (student) => {
    const entry = { mode: 'create', studentId: student.id, studentName: student.name };
    const values = { studentId: student.id, examId: selectedExam, marks: '', remarks: '' };
    setEditingResult(entry);
    reset(values);
    setDraft({ selectedExam, editingResult: entry, formValues: values });
  };

  const openEditResult = (result) => {
    if (result.status !== EDITABLE_RESULT_STATUS) {
      toast.error('Marks can be edited only before the result is ready.');
      return;
    }

    const entry = { mode: 'edit', resultId: result.id, studentName: result.student?.name };
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
    } else if (result.payload?.code === 'RESULT_EXISTS') {
      await dispatch(fetchResults({ examId: selectedExam, limit: RESULT_FETCH_LIMIT }));
      toast.error('Result already exists. Reloaded existing marks.');
      setEditingResult(null);
      clearDraft();
    } else {
      toast.error(result.payload?.message || 'Unable to save marks');
    }
  };

  const handleReload = async () => {
    dispatch(clearResultErrors());
    await dispatch(fetchResults({ examId: selectedExam, limit: RESULT_FETCH_LIMIT }));
    setEditingResult(null);
  };

  const handleRetry = () => {
    if (concurrencyError?.currentVersion) {
      setValue('version', concurrencyError.currentVersion);
    }
    dispatch(clearResultErrors());
  };

  const handleMarkReady = async (result) => {
    const action = await dispatch(transitionResult({ id: result.id, action: 'ready' }));
    if (!action.error) {
      toast.success('Result marked ready');
    } else {
      toast.error(action.payload?.message || 'Unable to mark result ready');
    }
  };

  const handleMarkAllDraftsReady = async () => {
    const draftResults = results.filter((result) => result.examId === selectedExam && result.status === 'draft');
    if (!draftResults.length) {
      toast('No draft results available to move to ready', { icon: 'ℹ️' });
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
  };

  const studentsWithResults = students.map((student) => ({
    ...student,
    result: results.find((result) => result.studentId === student.id),
  }));

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
                <button type="submit" disabled={examLocked} className="btn-primary flex-1" title={examLocked ? 'Exam not completed yet' : ''}>
                  Save Marks
                </button>
                <button type="button" onClick={closeModal} className="btn-secondary">Cancel</button>
              </div>
              {examLocked && <p className="text-xs text-amber-600 text-center">Cannot save until the exam is completed.</p>}
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
              disabled={examLocked || !results.some((result) => result.examId === selectedExam && result.status === 'draft')}
              className="btn-secondary text-xs disabled:opacity-40"
            >
              Mark all drafts ready
            </button>
          </div>
          {loading ? (
            <div className="p-8 text-center text-gray-400">Loading...</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {['Name', 'Roll No', 'Marks', 'Grade', 'Status', 'Action'].map((heading) => (
                    <th key={heading} className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {studentsWithResults.map((student) => (
                  <tr key={student.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">{student.name}</td>
                    <td className="px-4 py-3 text-gray-500">{student.rollNo}</td>
                    <td className="px-4 py-3">
                      {student.result ? <span className="font-medium">{student.result.marks}</span> : <span className="text-gray-300">-</span>}
                    </td>
                    <td className="px-4 py-3">{student.result ? <GradeBadge grade={student.result.grade} /> : '-'}</td>
                    <td className="px-4 py-3">
                      {student.result ? <StatusBadge status={student.result.status} /> : <span className="text-gray-400 text-xs">Not entered</span>}
                    </td>
                    <td className="px-4 py-3">
                      {student.result?.status === 'published' ? (
                        <span className="text-xs text-gray-400">Published</span>
                      ) : student.result?.status === 'ready' ? (
                        <span className="text-xs text-gray-400">Ready</span>
                      ) : student.result ? (
                        <div className="flex items-center gap-3">
                          <button onClick={() => openEditResult(student.result)} disabled={examLocked} className="text-blue-600 hover:underline text-xs disabled:opacity-40">Edit</button>
                          <button onClick={() => handleMarkReady(student.result)} disabled={examLocked} className="text-yellow-600 hover:underline text-xs disabled:opacity-40">Ready</button>
                        </div>
                      ) : (
                        <button onClick={() => openCreateResult(student)} disabled={examLocked} className="text-green-600 hover:underline text-xs disabled:opacity-40">Enter</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
