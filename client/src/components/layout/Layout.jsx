import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../../features/auth/authSlice';

const navByRole = {
  admin: [
    { to: '/admin/dashboard', label: 'Dashboard', icon: 'D' },
    { to: '/admin/exams', label: 'Exam Schedule', icon: 'E' },
    { to: '/admin/results', label: 'Results', icon: 'R' },
    { to: '/admin/users', label: 'Users', icon: 'U' },
  ],
  faculty: [
    { to: '/faculty/dashboard', label: 'Dashboard', icon: 'D' },
    { to: '/faculty/exams', label: 'My Exams', icon: 'E' },
    { to: '/faculty/marks', label: 'Enter Marks', icon: 'M' },
    { to: '/faculty/import', label: 'Bulk Import', icon: 'I' },
  ],
  student: [
    { to: '/student/dashboard', label: 'Dashboard', icon: 'D' },
    { to: '/student/schedule', label: 'My Schedule', icon: 'S' },
    { to: '/student/results', label: 'My Results', icon: 'R' },
  ],
};

export default function Layout({ children }) {
  const { user } = useSelector((s) => s.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const nav = navByRole[user?.role] || [];

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <aside className={`${sidebarOpen ? 'w-64' : 'w-16'} bg-gray-900 text-white flex flex-col transition-all duration-200`}>
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          {sidebarOpen && <span className="font-bold text-lg truncate">ExamScheduler</span>}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1 rounded hover:bg-gray-700">
            {sidebarOpen ? '<' : '>'}
          </button>
        </div>

        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          {nav.map((item) => {
            const active = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  active ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'
                }`}
              >
                <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-white/10 text-xs font-semibold">
                  {item.icon}
                </span>
                {sidebarOpen && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-gray-700">
          {sidebarOpen && (
            <div className="mb-2 text-xs text-gray-400 truncate">
              <div className="font-medium text-white">{user?.name || user?.email}</div>
              <div className="capitalize">{user?.role}</div>
            </div>
          )}
          <button onClick={handleLogout} className="w-full text-left px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-gray-700 flex items-center gap-2">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-red-500/10 text-xs font-semibold">Q</span>
            {sidebarOpen && 'Logout'}
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
