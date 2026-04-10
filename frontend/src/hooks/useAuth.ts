import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';
import type { User } from '../types';

/**
 * useAuth — hook untuk mengakses state autentikasi dan user profile.
 * Menggunakan React Query untuk fetch dan cache user profile.
 */
export const useAuth = () => {
    const { user, token, login, logout, setUser, isAuthenticated } = useAuthStore();

    // Fetch user profile jika token ada
    const { isLoading: isLoadingProfile } = useQuery<User>({
        queryKey: ['profile'],
        queryFn: () => api.get('/profile').then((r) => r.data),
        enabled: !!token && !user,
        onSuccess: (data) => setUser(data),
        onError: () => logout(),
    } as Parameters<typeof useQuery>[0]);

    return {
        user,
        token,
        isAuthenticated,
        isLoadingProfile,
        login,
        logout,
    };
};
