import { create } from 'zustand';
import type { User } from '../types';

interface AuthState {
    user: User | null;
    isAuthenticated: boolean;
    isInitialized: boolean;
    login: () => void;
    logout: () => void;
    setUser: (user: User | null) => void;
    setInitialized: (val: boolean) => void;
}

const getStoredToken = (): string | null => {
    try {
        return localStorage.getItem('token');
    } catch {
        return null;
    }
};

const getStoredUser = (): User | null => {
    try {
        const raw = localStorage.getItem('cached_user');
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
};

const hasInitialToken = Boolean(getStoredToken());
const initialUser = hasInitialToken ? getStoredUser() : null;

export const useAuthStore = create<AuthState>((set) => ({
    user: initialUser,
    isAuthenticated: hasInitialToken,
    isInitialized: false,

    login: () => {
        set({ isAuthenticated: true });
    },

    logout: () => {
        try {
            localStorage.removeItem('token');
            localStorage.removeItem('cached_user');
        } catch {
            // Ignore storage errors
        }
        set({ user: null, isAuthenticated: false, isInitialized: true });
    },

    setUser: (user: User | null) => {
        if (user) {
            try {
                localStorage.setItem('cached_user', JSON.stringify(user));
            } catch {
                // Ignore storage errors
            }
            set({ user, isAuthenticated: true, isInitialized: true });
        } else {
            try {
                localStorage.removeItem('cached_user');
            } catch {
                // Ignore
            }
            set({ user: null });
        }
    },

    setInitialized: (val: boolean) => set({ isInitialized: val }),
}));
