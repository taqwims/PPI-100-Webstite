import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';


/**
 * useAuth — hook untuk mengakses state autentikasi dan user profile.
 * Menggunakan React Query untuk fetch dan cache user profile.
 */
export const useAuth = () => {
    const { user, login, logout, setUser, isAuthenticated } = useAuthStore();

    // Fetch user profile jika sudah terautentikasi tapi data user belum ada
    const { data: profileData, isLoading: isLoadingProfile, isError } = useQuery({
        queryKey: ['profile'],
        queryFn: () => api.get('/profile').then((r) => r.data),
        enabled: isAuthenticated && !user,
    });

    useEffect(() => {
        if (profileData) {
            setUser(profileData);
        }
        if (isError) {
            logout();
        }
    }, [profileData, isError, setUser, logout]);

    return {
        user,
        isAuthenticated,
        isLoadingProfile,
        login,
        logout,
    };
};
