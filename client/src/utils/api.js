import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

const publicAuthRoutes = ['/auth/login', '/auth/register', '/auth/refresh'];

// Attach token to every request EXCEPT public auth routes
api.interceptors.request.use((config) => {
  const isPublicAuthRoute = publicAuthRoutes.some((route) => config.url?.startsWith(route));
  if (!isPublicAuthRoute) {
    const token = localStorage.getItem('accessToken');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 globally — never retry or redirect for public auth routes
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;
    const isPublicAuthRoute = publicAuthRoutes.some((route) => original?.url?.startsWith(route));

    // Let login/register/refresh errors pass through to the UI
    if (isPublicAuthRoute) {
      return Promise.reject(err);
    }

    if (err.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          const { data } = await axios.post('/api/auth/refresh', { refreshToken });
          localStorage.setItem('accessToken', data.accessToken);
          localStorage.setItem('refreshToken', data.refreshToken);
          original.headers.Authorization = `Bearer ${data.accessToken}`;
          return api(original);
        } catch {
          localStorage.clear();
          window.location.href = '/login';
        }
      } else {
        localStorage.clear();
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export default api;
