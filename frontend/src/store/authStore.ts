import { create } from 'zustand';
import type { User } from '../types';

interface AuthState {
    user: User | null;
    isAuthenticated: boolean;
    isInitialized: boolean;
    login: () => void;
    logout: () => void;
    setUser: (user: User) => void;
    setInitialized: (val: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    isAuthenticated: false,
    isInitialized: false,

    login: () => {
        set({ isAuthenticated: true });
    },

    logout: () => {
        set({ user: null, isAuthenticated: false, isInitialized: true });
    },

    setUser: (user: User) => set({ user, isAuthenticated: true, isInitialized: true }),
    setInitialized: (val: boolean) => set({ isInitialized: val }),
}));

// Bersihkan token sisa versi lama di localStorage
try {
    localStorage.removeItem('token');
    localStorage.removeItem('auth-storage');
} catch (e) {
    // Ignore errors
}
