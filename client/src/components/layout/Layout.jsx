import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../../features/auth/authSlice';
import { Icon } from '../shared/DashboardUI';

const navByRole = {
  admin: [
    { to: '/admin/dashboard', label: 'Dashboard', icon: 'grid' },
    { to: '/admin/exams', label: 'Exam Schedule', icon: 'calendar' },
    { to: '/admin/results', label: 'Results', icon: 'result' },
    { to: '/admin/users', label: 'Users', icon: 'users' },
  ],
  faculty: [
    { to: '/faculty/dashboard', label: 'Dashboard', icon: 'grid' },
    { to: '/faculty/exams', label: 'My Exams', icon: 'calendar' },
    { to: '/faculty/marks', label: 'Enter Marks', icon: 'edit' },
    { to: '/faculty/import', label: 'Bulk Import', icon: 'import' },
  ],
  student: [
    { to: '/student/dashboard', label: 'Dashboard', icon: 'grid' },
    { to: '/student/schedule', label: 'My Schedule', icon: 'calendar' },
    { to: '/student/results', label: 'My Results', icon: 'award' },
  ],
};

export default function Layout({ children }) {
  const { user } = useSelector((s) => s.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const nav = navByRole[user?.role] || [];
  const activeItem = nav.find((item) => location.pathname === item.to || location.pathname.startsWith(`${item.to}/`));

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-slate-100">
      <aside className={`${sidebarOpen ? 'w-72' : 'w-[76px]'} flex shrink-0 flex-col bg-[#171923] text-white shadow-xl transition-all duration-200`}>
        <div className="border-b border-white/10 p-4">
          <div className="flex items-center justify-between gap-3">
            <Link to={`/${user?.role || 'admin'}/dashboard`} className="flex min-w-0 items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-cyan-400 text-slate-950 shadow-sm">
                <Icon name="calendar" className="h-5 w-5" />
              </span>
              {sidebarOpen && (
                <span className="min-w-0">
                  <span className="block truncate text-base font-bold tracking-normal">ExamScheduler</span>
                  <span className="block truncate text-xs font-medium text-cyan-100/80">Exam operations suite</span>
                </span>
              )}
            </Link>
            <button
              type="button"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-slate-300 transition hover:bg-white/10 hover:text-white"
              aria-label={sidebarOpen ? 'Collapse navigation' : 'Expand navigation'}
              title={sidebarOpen ? 'Collapse navigation' : 'Expand navigation'}
            >
              <Icon name={sidebarOpen ? 'chevronRight' : 'menu'} className={`h-4 w-4 ${sidebarOpen ? 'rotate-180' : ''}`} />
            </button>
          </div>
          {sidebarOpen && (
            <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Workspace</p>
              <p className="mt-1 truncate text-sm font-semibold capitalize text-white">{user?.role || 'User'} portal</p>
            </div>
          )}
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {nav.map((item) => {
            const active = location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);
            return (
              <Link
                key={item.to}
                to={item.to}
                title={item.label}
                className={`flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${
                  active
                    ? 'bg-cyan-400 text-slate-950 shadow-sm'
                    : 'text-slate-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${active ? 'bg-slate-950/10' : 'bg-white/10'}`}>
                  <Icon name={item.icon} className="h-4 w-4" />
                </span>
                {sidebarOpen && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/10 p-3">
          {sidebarOpen && (
            <div className="mb-3 rounded-lg bg-white/[0.06] p-3 text-xs text-slate-300">
              <div className="truncate font-semibold text-white">{user?.name || user?.email}</div>
              <div className="mt-1 truncate capitalize">{user?.role}</div>
            </div>
          )}
          <button
            type="button"
            onClick={handleLogout}
            className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-rose-200 transition-colors hover:bg-rose-500/15 hover:text-white"
          >
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-rose-500/15">
              <Icon name="logOut" className="h-4 w-4" />
            </span>
            {sidebarOpen && 'Logout'}
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 overflow-y-auto">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 px-4 py-3 shadow-sm backdrop-blur sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">ExamScheduler</p>
              <h2 className="mt-0.5 truncate text-base font-bold text-slate-950">{activeItem?.label || 'Dashboard'}</h2>
            </div>
            <div className="flex items-center gap-3">
              <span className="hidden rounded-full bg-slate-100 px-3 py-1 text-xs font-bold capitalize text-slate-700 ring-1 ring-slate-200 sm:inline-flex">
                {user?.role || 'User'}
              </span>
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-cyan-50 text-sm font-bold text-cyan-700 ring-1 ring-cyan-100">
                {(user?.name || user?.email || 'U').slice(0, 1).toUpperCase()}
              </span>
            </div>
          </div>
        </header>
        <div className="px-4 py-6 sm:px-6 lg:px-8">{children}</div>
      </main>
    </div>
  );
}
