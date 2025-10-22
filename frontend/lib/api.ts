import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

// Type definitions for API data
interface DocumentData {
  title?: string;
  description?: string;
  file?: File;
  category?: string;
  tags?: string[];
  [key: string]: unknown;
}

interface CategoryData {
  name: string;
  description?: string;
  parent?: string;
  [key: string]: unknown;
}

interface UserData {
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  role?: string;
  is_active?: boolean;
  [key: string]: unknown;
}

interface ApiParams {
  page?: number;
  page_size?: number;
  search?: string;
  ordering?: string;
  [key: string]: unknown;
}

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refresh_token');
        const response = await axios.post(`${API_URL}/auth/refresh/`, {
          refresh: refreshToken,
        });

        const { access } = response.data;
        localStorage.setItem('access_token', access);

        originalRequest.headers.Authorization = `Bearer ${access}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;

// API functions
export const auth = {
  login: (username: string, password: string) =>
    apiClient.post('/auth/login/', { username, password }),
  refresh: (refresh: string) =>
    apiClient.post('/auth/refresh/', { refresh }),
};

export const documents = {
  list: (params?: ApiParams) => apiClient.get('/documents/', { params }),
  get: (id: string) => apiClient.get(`/documents/${id}/`),
  create: (data: FormData) => apiClient.post('/documents/', data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  update: (id: string, data: Partial<DocumentData>) => apiClient.patch(`/documents/${id}/`, data),
  delete: (id: string) => apiClient.delete(`/documents/${id}/`),
  approve: (id: string) => apiClient.post(`/documents/${id}/approve/`),
  reject: (id: string) => apiClient.post(`/documents/${id}/reject/`),
  download: (id: string) => apiClient.post(`/documents/${id}/download/`),
};

export const categories = {
  list: () => apiClient.get('/categories/'),
  get: (id: string) => apiClient.get(`/categories/${id}/`),
  create: (data: CategoryData) => apiClient.post('/categories/', data),
  update: (id: string, data: Partial<CategoryData>) => apiClient.patch(`/categories/${id}/`, data),
  delete: (id: string) => apiClient.delete(`/categories/${id}/`),
};

export const users = {
  list: () => apiClient.get('/users/'),
  get: (id: string) => apiClient.get(`/users/${id}/`),
  create: (data: UserData) => apiClient.post('/users/', data),
  update: (id: string, data: Partial<UserData>) => apiClient.patch(`/users/${id}/`, data),
};







