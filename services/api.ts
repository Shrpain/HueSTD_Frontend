
import axios from 'axios';
import { supabase } from './supabase';

// Expect VITE_API_BASE_URL already includes path prefix when needed.
// Examples:
// - Local/preview with proxy: VITE_API_BASE_URL=/api
// - Direct backend: VITE_API_BASE_URL=http://localhost:5136/api
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';

const api = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to include the JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      console.warn('[API] No token found in localStorage for request:', config.url);
    }
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ===== Notification API =====
export const broadcastNotification = async (title: string, message: string, type: string = 'system') => {
  const response = await api.post('/Notification/broadcast', { title, message, type });
  return response.data;
};

// Upload file qua backend (backend dùng Supabase service role, tránh RLS).
// Dùng chung instance api để token luôn được gửi kèm.
export const uploadDocumentFile = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post<{ fileUrl: string; fileName: string }>('/documents/upload-file', formData);
  return response.data;
};

export default api;
