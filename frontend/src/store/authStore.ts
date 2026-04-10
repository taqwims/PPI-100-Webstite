import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '../types';

interface AuthState {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    login: (token: string) => void;
    logout: () => void;
    setUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            user: null,
            token: localStorage.getItem('token'),
            isAuthenticated: !!localStorage.getItem('token'),

            login: (token: string) => {
                localStorage.setItem('token', token);
                set({ token, isAuthenticated: true });
            },

            logout: () => {
                localStorage.removeItem('token');
                set({ user: null, token: null, isAuthenticated: false });
            },

            setUser: (user: User) => set({ user }),
        }),
        {
            name: 'auth-storage',
            // Hanya persist token, bukan user object (user di-fetch ulang saat app load)
            partialize: (state) => ({ token: state.token }),
        }
    )
);
