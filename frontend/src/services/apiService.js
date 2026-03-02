import axios from 'axios';

// Task FE-S1-7: Axios instance
// In development, Vite proxies /api/* to http://localhost:5000 — no CORS issues.
// In production, set VITE_API_URL to the deployed backend URL.
const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || '/api',
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor to attach JWT token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export const setupAxiosInterceptors = (logout) => {
    api.interceptors.response.use(
        (response) => {
            return response;
        },
        (error) => {
            // If 401 Unauthorized occurs, session expired or invalid token
            if (error.response && error.response.status === 401) {
                logout();
            }
            return Promise.reject(error);
        }
    );
};

export default api;
