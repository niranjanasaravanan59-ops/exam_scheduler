import React, { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import { RoleBadge } from '../../components/shared/Badges';
import { EmptyState, Icon, MetricCard, formatCompactNumber } from '../../components/shared/DashboardUI';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filterRole, setFilterRole] = useState('');
  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const load = (role = '') => {
    setLoading(true);
    api.get('/auth/users', { params: role ? { role } : {} })
      .then((r) => setUsers(r.data.users))
      .catch(() => toast.error('Failed to load users'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(filterRole); }, [filterRole]);

  const roleCounts = useMemo(() => users.reduce((acc, user) => {
    acc[user.role] = (acc[user.role] || 0) + 1;
    return acc;
  }, {}), [users]);

  const onSubmit = async (data) => {
    try {
      await api.post('/auth/register', data);
      toast.success('User created');
      setShowForm(false);
      reset();
      load(filterRole);
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to create user');
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-cyan-700">Admin users</p>
            <h1 className="mt-2 text-2xl font-bold text-slate-950">User Registry</h1>
            <p className="mt-2 text-sm text-slate-500">Role based accounts for admins, faculty, and students</p>
          </div>
          <button onClick={() => setShowForm(true)} className="btn-primary w-full sm:w-auto">
            <Icon name="userPlus" className="h-4 w-4" />
            Add User
          </button>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Visible Users" value={users.length} icon="users" tone="blue" sub={`${formatCompactNumber(users.length)} records in this filter`} />
        <MetricCard label="Admins" value={roleCounts.admin || 0} icon="shield" tone="rose" sub="System operators" />
        <MetricCard label="Faculty" value={roleCounts.faculty || 0} icon="building" tone="cyan" sub="Assigned evaluators" />
        <MetricCard label="Students" value={roleCounts.student || 0} icon="graduation" tone="emerald" sub="Exam participants" />
      </div>

      <div className="flex flex-wrap gap-2">
        {['', 'admin', 'faculty', 'student'].map((role) => (
          <button
            key={role}
            type="button"
            onClick={() => setFilterRole(role)}
            className={`min-h-10 rounded-lg px-4 py-2 text-sm font-bold capitalize transition-colors ${
              filterRole === role
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50'
            }`}
          >
            {role || 'All'}
          </button>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-950">Create User</h2>
                <p className="mt-1 text-sm text-slate-500">Add a new role based account</p>
              </div>
              <button type="button" onClick={() => { setShowForm(false); reset(); }} className="btn-secondary min-h-9 px-3 py-1.5 text-xs">
                Close
              </button>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
              <div>
                <label className="label">Name</label>
                <input className="input" {...register('name', { required: true })} />
                {errors.name && <p className="mt-1 text-xs text-red-600">Name is required</p>}
              </div>
              <div>
                <label className="label">Email</label>
                <input type="email" className="input" {...register('email', { required: true })} />
                {errors.email && <p className="mt-1 text-xs text-red-600">Email is required</p>}
              </div>
              <div>
                <label className="label">Password</label>
                <input type="password" className="input" {...register('password', { required: true, minLength: 8 })} />
                <p className="mt-1 text-xs text-slate-400">Minimum 8 characters with uppercase, lowercase, and number</p>
              </div>
              <div>
                <label className="label">Role</label>
                <select className="input" {...register('role', { required: true })}>
                  <option value="student">Student</option>
                  <option value="faculty">Faculty</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <label className="label">Department</label>
                <input className="input" {...register('department')} />
              </div>
              <div>
                <label className="label">Roll No (students only)</label>
                <input className="input" {...register('rollNo')} />
              </div>
              <div className="flex flex-col gap-3 pt-2 sm:flex-row">
                <button type="submit" className="btn-primary flex-1">
                  <Icon name="check" className="h-4 w-4" />
                  Create
                </button>
                <button type="button" onClick={() => { setShowForm(false); reset(); }} className="btn-secondary">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-slate-400">Loading users...</div>
        ) : users.length === 0 ? (
          <div className="p-5">
            <EmptyState title="No users found" description="Create a user or change the role filter." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50">
                <tr className="border-b border-slate-100 text-left text-xs font-bold uppercase text-slate-500">
                  {['Name', 'Email', 'Role', 'Department', 'Roll No'].map((heading) => (
                    <th key={heading} className="px-5 py-3">{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-blue-50/40">
                    <td className="px-5 py-4 font-bold text-slate-950">{user.name}</td>
                    <td className="px-5 py-4 text-slate-600">{user.email}</td>
                    <td className="px-5 py-4"><RoleBadge role={user.role} /></td>
                    <td className="px-5 py-4 text-slate-600">{user.department || '-'}</td>
                    <td className="px-5 py-4 text-slate-600">{user.rollNo || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
