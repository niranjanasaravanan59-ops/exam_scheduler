import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { login, register as registerUser, clearError } from '../features/auth/authSlice';

export default function LoginPage() {
  const [tab, setTab] = useState('login'); // 'login' | 'register'
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, loading, error } = useSelector((s) => s.auth);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm();

  // Redirect when logged in
  useEffect(() => {
    if (user) navigate(`/${user.role}/dashboard`);
  }, [user, navigate]);

  // Clear errors and reset form when switching tabs
  useEffect(() => {
    dispatch(clearError());
    reset();
  }, [tab, dispatch, reset]);

  const onLogin = (data) => {
    dispatch(login({ email: data.email, password: data.password }));
  };

  const onRegister = (data) => {
    dispatch(
      registerUser({
        name: data.name,
        email: data.email,
        password: data.password,
        role: data.role,
        department: data.department || undefined,
        rollNo: data.rollNo || undefined,
      })
    );
  };

  const selectedRole = watch('role');

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 to-indigo-700 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">🎓</div>
          <h1 className="text-2xl font-bold text-gray-900">Exam Scheduler</h1>
          <p className="text-gray-500 text-sm mt-1">Manage exams, results and schedules</p>
        </div>

        {/* Tabs */}
        <div className="flex rounded-lg overflow-hidden border border-gray-200 mb-6">
          <button
            type="button"
            onClick={() => setTab('login')}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${
              tab === 'login'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => setTab('register')}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${
              tab === 'register'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            Sign Up
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* ── SIGN IN FORM ── */}
        {tab === 'login' && (
          <form onSubmit={handleSubmit(onLogin)} className="space-y-4">
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                className="input"
                placeholder="you@example.com"
                {...register('email', { required: 'Email is required' })}
              />
              {errors.email && (
                <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="label">Password</label>
              <input
                type="password"
                className="input"
                placeholder="••••••••"
                {...register('password', { required: 'Password is required' })}
              />
              {errors.password && (
                <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-2.5 mt-2"
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        )}

        {/* ── SIGN UP FORM ── */}
        {tab === 'register' && (
          <form onSubmit={handleSubmit(onRegister)} className="space-y-4">
            {/* Role selector */}
            <div>
              <label className="label">Role</label>
              <select
                className="input"
                {...register('role', { required: 'Role is required' })}
                defaultValue=""
              >
                <option value="" disabled>Select your role</option>
                <option value="faculty">Faculty</option>
                <option value="student">Student</option>
                {/* Admin accounts can only be created by an existing admin */}
              </select>
              {errors.role && (
                <p className="text-red-500 text-xs mt-1">{errors.role.message}</p>
              )}
            </div>

            {/* Full Name */}
            <div>
              <label className="label">Full Name</label>
              <input
                type="text"
                className="input"
                placeholder="Your full name"
                {...register('name', {
                  required: 'Name is required',
                  minLength: { value: 2, message: 'Name must be at least 2 characters' },
                })}
              />
              {errors.name && (
                <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                className="input"
                placeholder="you@example.com"
                {...register('email', { required: 'Email is required' })}
              />
              {errors.email && (
                <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>
              )}
            </div>

            {/* Department — shown for both faculty and student */}
            {(selectedRole === 'faculty' || selectedRole === 'student') && (
              <div>
                <label className="label">Department</label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. CSE, ECE, MECH"
                  {...register('department')}
                />
              </div>
            )}

            {/* Roll No — students only */}
            {selectedRole === 'student' && (
              <div>
                <label className="label">Roll Number</label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. 21CS001"
                  {...register('rollNo')}
                />
              </div>
            )}

            {/* Role info banner */}
            {selectedRole === 'faculty' && (
              <div className="text-xs bg-blue-50 border border-blue-200 rounded-lg p-3 text-blue-700">
                🏫 Faculty account — you will be assigned subjects by the admin after registration.
              </div>
            )}
            {selectedRole === 'student' && (
              <div className="text-xs bg-green-50 border border-green-200 rounded-lg p-3 text-green-700">
                🎒 Student account — you can view your exam schedule and results after registration.
              </div>
            )}

            {/* Password */}
            <div>
              <label className="label">Password</label>
              <input
                type="password"
                className="input"
                placeholder="••••••••"
                {...register('password', {
                  required: 'Password is required',
                  minLength: { value: 8, message: 'Password must be at least 8 characters' },
                  pattern: {
                    value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
                    message: 'Must include uppercase, lowercase, and a number',
                  },
                })}
              />
              {errors.password && (
                <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="label">Confirm Password</label>
              <input
                type="password"
                className="input"
                placeholder="••••••••"
                {...register('confirmPassword', {
                  required: 'Please confirm your password',
                  validate: (val) =>
                    val === watch('password') || 'Passwords do not match',
                })}
              />
              {errors.confirmPassword && (
                <p className="text-red-500 text-xs mt-1">{errors.confirmPassword.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-2.5 mt-2"
            >
              {loading
                ? 'Creating account…'
                : selectedRole === 'faculty'
                ? 'Create Faculty Account'
                : selectedRole === 'student'
                ? 'Create Student Account'
                : 'Create Account'}
            </button>

            <p className="text-center text-xs text-gray-500 mt-2">
              Admin accounts are created by existing admins only.
            </p>
          </form>
        )}


      </div>
    </div>
  );
}