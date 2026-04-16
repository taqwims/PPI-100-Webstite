/**
 * AuthContext — backward-compatible wrapper di atas useAuthStore.
 * Komponen yang sudah menggunakan useAuth() tidak perlu diubah.
 * State sebenarnya dikelola oleh useAuthStore (Zustand).
 */
import React, { createContext, useContext, useEffect } from 'react';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';
import { useFeatureStore } from '../store/featureStore';
import type { User } from '../types';

interface AuthContextType {
    user: User | null;
    token: string | null;
    login: (token: string) => void;
    logout: () => void;
    isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, token, login, logout, setUser, isAuthenticated } = useAuthStore();
    const fetchFeatures = useFeatureStore((s) => s.fetchFeatures);
    const featuresLoaded = useFeatureStore((s) => s.loaded);

    // Fetch feature config on mount (once)
    useEffect(() => {
        if (!featuresLoaded) {
            fetchFeatures();
        }
    }, []);

    // Fetch user profile saat token ada tapi user belum di-load
    useEffect(() => {
        if (token && !user) {
            api.get('/profile')
                .then((response) => setUser(response.data))
                .catch(() => logout());
        }
    }, [token]);

    return (
        <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

