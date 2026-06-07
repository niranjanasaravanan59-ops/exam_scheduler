import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { fetchExams, createExam, updateExam, deleteExam, clearExamErrors } from '../../features/exams/examSlice';
import ClashAlert from '../../components/shared/ClashAlert';
import ConcurrencyModal from '../../components/shared/ConcurrencyModal';
import api from '../../utils/api';
import { formatDisplayDate, formatDisplayTime, getLocalInputDate, isExamEnded, isValidDateOnly } from '../../utils/dateTime';

const EMPTY_FILTERS = { subject: '', examDate: '', department: '', semester: '' };

export default function AdminExams() {
  const dispatch = useDispatch();
  const { items: exams, loading, conflictError, concurrencyError } = useSelector((s) => s.exams);
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [facultyList, setFacultyList] = useState([]);
  const [filters, setFilters] = useState(EMPTY_FILTERS);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm();

  const queryFilters = useMemo(
    () => Object.fromEntries(Object.entries(filters).filter(([, value]) => value)),
    [filters]
  );
  const activeFilterCount = Object.keys(queryFilters).length;

  useEffect(() => {
    dispatch(fetchExams(queryFilters));
  }, [dispatch, queryFilters]);

  useEffect(() => {
    api.get('/auth/users?role=faculty')
      .then((r) => setFacultyList(r.data.users || []))
      .catch(() => toast.error('Failed to load faculty list'));
  }, []);

  const updateFilter = (name, value) => {
    setFilters((current) => ({ ...current, [name]: value }));
  };

  const clearFilters = () => {
    setFilters(EMPTY_FILTERS);
  };

  const openCreate = () => {
    setEditTarget(null);
    dispatch(clearExamErrors());
    reset({ subject: '', department: '', semester: '', examDate: '', startTime: '', endTime: '', hall: '', facultyId: '' });
    setShowForm(true);
  };

  const openEdit = (exam) => {
    setEditTarget(exam);
    dispatch(clearExamErrors());
    reset({
      subject: exam.subject,
      department: exam.department,
      semester: exam.semester,
      examDate: exam.examDate,
      startTime: exam.startTime?.slice(0, 5),
      endTime: exam.endTime?.slice(0, 5),
      hall: exam.hall,
      facultyId: exam.facultyId || '',
      version: exam.version,
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditTarget(null);
    dispatch(clearExamErrors());
  };

  const onSubmit = async (data) => {
    const payload = { ...data, semester: parseInt(data.semester, 10) };
    if (isExamEnded(payload.examDate, payload.endTime)) {
      toast.error('Exam end time must be in the future');
      return;
    }

    if (editTarget) {
      const result = await dispatch(updateExam({ id: editTarget.id, ...payload }));
      if (!result.error) {
        toast.success('Exam updated');
        closeForm();
      } else {
        toast.error(result.payload?.message || 'Exam update failed');
      }
      return;
    }

    const result = await dispatch(createExam(payload));
    if (!result.error) {
      toast.success('Exam created');
      closeForm();
      reset({});
    } else {
      toast.error(result.payload?.message || 'Exam creation failed');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this exam?')) return;
    const result = await dispatch(deleteExam(id));
    if (!result.error) toast.success('Exam deleted');
    else toast.error(result.payload?.message || 'Delete failed');
  };

  const handleReloadLatest = () => {
    dispatch(clearExamErrors());
    dispatch(fetchExams(queryFilters));
    closeForm();
  };

  const handleRetryForce = () => {
    const latest = exams.find((exam) => exam.id === editTarget?.id);
    if (latest) setValue('version', latest.version);
    dispatch(clearExamErrors());
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Exam Schedule</h1>
          <p className="mt-1 text-sm text-gray-500">{exams.length} scheduled exam{exams.length === 1 ? '' : 's'}</p>
        </div>
        <button onClick={openCreate} className="btn-primary w-full sm:w-auto">+ Schedule Exam</button>
      </div>

      <div className="card p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-[1.3fr_1fr_1.2fr_0.8fr_auto]">
          <input
            className="input"
            placeholder="Search subject..."
            value={filters.subject}
            onChange={(event) => updateFilter('subject', event.target.value)}
          />
          <input
            className="input"
            type="date"
            value={filters.examDate}
            onChange={(event) => updateFilter('examDate', event.target.value)}
          />
          <input
            className="input"
            placeholder="Department..."
            value={filters.department}
            onChange={(event) => updateFilter('department', event.target.value)}
          />
          <select
            className="input"
            value={filters.semester}
            onChange={(event) => updateFilter('semester', event.target.value)}
          >
            <option value="">All Sems</option>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((semester) => (
              <option key={semester} value={semester}>Sem {semester}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={clearFilters}
            disabled={activeFilterCount === 0}
            className="btn-secondary whitespace-nowrap"
          >
            Clear {activeFilterCount > 0 ? `(${activeFilterCount})` : ''}
          </button>
        </div>
      </div>

      <ConcurrencyModal
        error={concurrencyError}
        onReload={handleReloadLatest}
        onRetry={handleRetryForce}
        onCompare={() => {}}
        onClose={() => dispatch(clearExamErrors())}
      />

      {showForm && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-xl overflow-y-auto rounded-lg bg-white p-6 shadow-xl max-h-[90vh]">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-gray-900">{editTarget ? 'Edit Exam' : 'Schedule New Exam'}</h2>
              <button type="button" onClick={closeForm} className="btn-secondary px-3 py-1.5">Close</button>
            </div>
            <ClashAlert error={conflictError} onDismiss={() => dispatch(clearExamErrors())} />
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="label">Subject</label>
                  <input className="input" {...register('subject', { required: 'Required' })} />
                  {errors.subject && <p className="text-red-500 text-xs mt-1">{errors.subject.message}</p>}
                </div>
                <div>
                  <label className="label">Department</label>
                  <input className="input" {...register('department', { required: 'Required' })} />
                  {errors.department && <p className="text-red-500 text-xs mt-1">{errors.department.message}</p>}
                </div>
                <div>
                  <label className="label">Semester</label>
                  <select className="input" {...register('semester', { required: 'Required' })}>
                    <option value="">Select</option>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((semester) => (
                      <option key={semester} value={semester}>Semester {semester}</option>
                    ))}
                  </select>
                  {errors.semester && <p className="text-red-500 text-xs mt-1">{errors.semester.message}</p>}
                </div>
                <div>
                  <label className="label">Exam Date</label>
                  <input
                    type="date"
                    min={getLocalInputDate()}
                    className="input"
                    {...register('examDate', {
                      required: 'Required',
                      validate: (value) => isValidDateOnly(value) || 'Use YYYY-MM-DD',
                    })}
                  />
                  {errors.examDate && <p className="text-red-500 text-xs mt-1">{errors.examDate.message}</p>}
                </div>
                <div>
                  <label className="label">Hall</label>
                  <input className="input" {...register('hall', { required: 'Required' })} />
                  {errors.hall && <p className="text-red-500 text-xs mt-1">{errors.hall.message}</p>}
                </div>
                <div>
                  <label className="label">Start Time</label>
                  <input type="time" className="input" {...register('startTime', { required: 'Required' })} />
                  {errors.startTime && <p className="text-red-500 text-xs mt-1">{errors.startTime.message}</p>}
                </div>
                <div>
                  <label className="label">End Time</label>
                  <input type="time" className="input" {...register('endTime', { required: 'Required' })} />
                  {errors.endTime && <p className="text-red-500 text-xs mt-1">{errors.endTime.message}</p>}
                </div>
                <div className="sm:col-span-2">
                  <label className="label">Assign Faculty (optional)</label>
                  <select className="input" {...register('facultyId')}>
                    <option value="">None</option>
                    {facultyList.map((faculty) => (
                      <option key={faculty.id} value={faculty.id}>{faculty.name} ({faculty.department})</option>
                    ))}
                  </select>
                </div>
              </div>
              <input type="hidden" {...register('version')} />
              <div className="flex flex-col gap-3 pt-2 sm:flex-row">
                <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">
                  {editTarget ? 'Update Exam' : 'Create Exam'}
                </button>
                <button type="button" onClick={closeForm} className="btn-secondary">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="card overflow-hidden p-0">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading...</div>
        ) : exams.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm font-medium text-gray-700">No exams scheduled yet.</p>
            <button onClick={openCreate} className="btn-primary mt-4">Schedule Exam</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  {['Subject', 'Dept / Sem', 'Date', 'Time', 'Hall', 'Faculty', 'Status', 'Actions'].map((heading) => (
                    <th key={heading} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {exams.map((exam) => {
                  const completed = isExamEnded(exam.examDate, exam.endTime);
                  return (
                    <tr key={exam.id} className="transition-colors hover:bg-blue-50/40">
                      <td className="px-4 py-4 font-semibold text-gray-900">{exam.subject}</td>
                      <td className="px-4 py-4 text-gray-600">
                        {exam.department}
                        <br />
                        <span className="text-xs text-gray-500">Sem {exam.semester}</span>
                      </td>
                      <td className="px-4 py-4 text-gray-700" title={exam.examDate}>{formatDisplayDate(exam.examDate)}</td>
                      <td className="px-4 py-4 text-gray-600">{formatDisplayTime(exam.startTime)} - {formatDisplayTime(exam.endTime)}</td>
                      <td className="px-4 py-4 text-gray-700">{exam.hall}</td>
                      <td className="px-4 py-4 text-gray-600">{exam.faculty?.name || 'Unassigned'}</td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${completed ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                          {completed ? 'Completed' : 'Upcoming'}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <button onClick={() => openEdit(exam)} className="rounded-lg px-3 py-1.5 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-100">
                            Edit
                          </button>
                          <button onClick={() => handleDelete(exam.id)} className="rounded-lg px-3 py-1.5 text-xs font-semibold text-red-700 transition-colors hover:bg-red-100">
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
