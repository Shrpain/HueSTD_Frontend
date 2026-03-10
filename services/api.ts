
import axios from 'axios';
import { supabase } from './supabase';

const apiBaseUrl = 'http://36.50.55.100:5000/api';

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
