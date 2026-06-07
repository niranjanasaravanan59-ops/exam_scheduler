import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import { RoleBadge } from '../../components/shared/Badges';

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
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Users</h1>
        <button onClick={() => setShowForm(true)} className="btn-primary">+ Add User</button>
      </div>

      <div className="flex gap-3">
        {['', 'admin', 'faculty', 'student'].map((r) => (
          <button key={r} onClick={() => setFilterRole(r)}
            className={`px-3 py-1.5 rounded-lg text-sm capitalize transition-colors ${filterRole === r ? 'bg-blue-600 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}>
            {r || 'All'}
          </button>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <h2 className="text-lg font-bold mb-4">Create User</h2>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
              <div><label className="label">Name</label><input className="input" {...register('name', { required: true })} /></div>
              <div><label className="label">Email</label><input type="email" className="input" {...register('email', { required: true })} /></div>
              <div>
                <label className="label">Password</label>
                <input type="password" className="input" {...register('password', { required: true, minLength: 8 })} />
                <p className="text-xs text-gray-400 mt-1">Min 8 chars with uppercase, lowercase, and number</p>
              </div>
              <div>
                <label className="label">Role</label>
                <select className="input" {...register('role', { required: true })}>
                  <option value="student">Student</option>
                  <option value="faculty">Faculty</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div><label className="label">Department</label><input className="input" {...register('department')} /></div>
              <div><label className="label">Roll No (students only)</label><input className="input" {...register('rollNo')} /></div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="btn-primary flex-1">Create</button>
                <button type="button" onClick={() => { setShowForm(false); reset(); }} className="btn-secondary">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="card p-0 overflow-hidden">
        {loading ? <div className="p-8 text-center text-gray-400">Loading...</div> : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                {['Name', 'Email', 'Role', 'Department', 'Roll No'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{u.name}</td>
                  <td className="px-4 py-3 text-gray-500">{u.email}</td>
                  <td className="px-4 py-3"><RoleBadge role={u.role} /></td>
                  <td className="px-4 py-3 text-gray-500">{u.department || '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{u.rollNo || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
