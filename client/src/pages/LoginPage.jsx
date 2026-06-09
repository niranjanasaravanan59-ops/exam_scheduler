import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { login, clearError } from '../features/auth/authSlice';
import { Icon } from '../components/shared/DashboardUI';

export default function LoginPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, loading, error } = useSelector((s) => s.auth);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm();

  useEffect(() => {
    if (user) navigate(`/${user.role}/dashboard`);
  }, [user, navigate]);

  useEffect(() => {
    dispatch(clearError());
    reset();
  }, [dispatch, reset]);

  const onLogin = (data) => {
    dispatch(login({ email: data.email, password: data.password }));
  };

  return (
    <div className="min-h-screen bg-slate-100 p-4 text-slate-950">
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-6xl overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl lg:grid-cols-[0.95fr_1.05fr]">
        <section className="flex flex-col justify-between bg-[#171923] p-8 text-white">
          <div>
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-lg bg-cyan-400 text-slate-950">
                <Icon name="calendar" className="h-5 w-5" />
              </span>
              <div>
                <p className="text-lg font-bold">ExamScheduler</p>
                <p className="text-sm text-cyan-100/80">Exam operations suite</p>
              </div>
            </div>

            <div className="mt-12 max-w-md">
              <p className="text-sm font-bold uppercase tracking-wide text-cyan-200">Secure sign in</p>
              <h1 className="mt-3 text-4xl font-bold tracking-normal">One workspace for exams, marks, and publishing.</h1>
              <p className="mt-4 text-sm leading-6 text-slate-300">
                Admin, faculty, and student portals share the same scheduling and result workflow.
              </p>
            </div>
          </div>

          <div className="mt-10 grid grid-cols-3 gap-3 text-center text-xs font-bold">
            <div className="rounded-lg bg-white/10 p-3 ring-1 ring-white/10">Admin</div>
            <div className="rounded-lg bg-white/10 p-3 ring-1 ring-white/10">Faculty</div>
            <div className="rounded-lg bg-white/10 p-3 ring-1 ring-white/10">Student</div>
          </div>
        </section>

        <section className="flex items-center justify-center p-6 sm:p-10">
          <div className="w-full max-w-md">
            <div className="mb-8">
              <p className="text-sm font-bold uppercase tracking-wide text-cyan-700">Welcome back</p>
              <h2 className="mt-2 text-2xl font-bold text-slate-950">Sign in to continue</h2>
              <p className="mt-2 text-sm text-slate-500">Use your assigned account credentials.</p>
            </div>

            {error && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
                {error}
              </div>
            )}

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
                  <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>
                )}
              </div>

              <div>
                <label className="label">Password</label>
                <input
                  type="password"
                  className="input"
                  placeholder="Password"
                  {...register('password', { required: 'Password is required' })}
                />
                {errors.password && (
                  <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary mt-2 w-full py-2.5"
              >
                <Icon name="lock" className="h-4 w-4" />
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}
