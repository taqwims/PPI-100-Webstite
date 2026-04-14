import axios from 'axios';
import toast from 'react-hot-toast';

// Augment Axios config to support _suppressToast flag
declare module 'axios' {
    interface InternalAxiosRequestConfig {
        _suppressToast?: boolean;
    }
}

const api = axios.create({
    baseURL: '/api',
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true, // Kirim httpOnly cookie secara otomatis
});

// ─── Request Interceptor ───
// Tambahkan Authorization header dari localStorage (backward compatibility)
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// ─── Response Interceptor ───
api.interceptors.response.use(
    // Success: teruskan response tanpa modifikasi
    (response) => response,

    // Error: tangani secara global
    (error) => {
        // 401 Unauthorized — token expired atau tidak valid
        if (error.response?.status === 401) {
            // Import dinamis untuk menghindari circular dependency
            import('../store/authStore').then(({ useAuthStore }) => {
                useAuthStore.getState().logout();
            });
            // Redirect ke login jika belum di sana
            if (window.location.pathname !== '/login') {
                window.location.href = '/login';
            }
            return Promise.reject(error);
        }

        // Jangan tampilkan toast untuk request yang dibatalkan
        if (axios.isCancel(error)) {
            return Promise.reject(error);
        }

        // Ekstrak pesan error yang user-friendly
        const message =
            error.response?.data?.error ??
            error.response?.data?.message ??
            (error.response?.status === 403
                ? 'Anda tidak memiliki izin untuk melakukan aksi ini.'
                : error.response?.status === 404
                ? 'Data tidak ditemukan.'
                : error.response?.status >= 500
                ? 'Terjadi kesalahan server. Silakan coba lagi.'
                : 'Terjadi kesalahan. Silakan coba lagi.');

        // Tampilkan toast error (kecuali untuk beberapa kasus khusus)
        const skipToastUrls = ['/auth/login', '/auth/register'];
        const requestUrl = error.config?.url ?? '';
        const shouldSkipToast = skipToastUrls.some((url) => requestUrl.includes(url));

        if (!error.config?._suppressToast && !shouldSkipToast) {
            toast.error(message);
        }

        return Promise.reject(error);
    }
);

export default api;
