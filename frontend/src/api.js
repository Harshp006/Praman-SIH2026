import axios from 'axios';

// Create an Axios instance
// Note: In development via Docker, host browser accesses backend via localhost:8081
const api = axios.create({
  baseURL: 'http://localhost:8081/api',
  timeout: 120000, // 2 minutes timeout for Ollama operations
});

// Add a request interceptor to include JWT token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('praman_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => Promise.reject(error));

// Add a response interceptor to handle auth errors globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear token and redirect to login on 401 Unauthorized
      localStorage.removeItem('praman_token');
      localStorage.removeItem('praman_officer');
      // If we are not already on the login page, reload to trigger auth check
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
