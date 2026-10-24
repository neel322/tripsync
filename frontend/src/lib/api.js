import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 20000, // don't leave the UI spinning forever if the server hangs
});

// Attach token from localStorage on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('tripsync_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Endpoints where a 401 means "wrong email/password", NOT "session expired".
// Redirecting here would reload the page and wipe the error before it is shown.
const AUTH_FORM_URLS = ['/auth/login', '/auth/register'];

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const isAuthForm = AUTH_FORM_URLS.some((u) => err.config?.url?.includes(u));
    const hadSession = !!localStorage.getItem('tripsync_token');

    if (err.response?.status === 401 && !isAuthForm && hadSession) {
      localStorage.removeItem('tripsync_token');
      localStorage.removeItem('tripsync_user');
      // Login page reads this once and tells the user why they were signed out
      sessionStorage.setItem('tripsync_signed_out', err.response?.data?.error || 'Your session has expired. Please sign in again.');
      if (window.location.pathname !== '/login') window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
