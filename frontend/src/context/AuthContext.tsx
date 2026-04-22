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
    login: () => void;
    logout: () => void;
    isAuthenticated: boolean;
    isInitialized: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, login, logout, setUser, isAuthenticated, isInitialized } = useAuthStore();
    const fetchFeatures = useFeatureStore((s) => s.fetchFeatures);
    const featuresLoaded = useFeatureStore((s) => s.loaded);

    // Fetch feature config on mount (once)
    useEffect(() => {
        if (!featuresLoaded) {
            fetchFeatures();
        }
    }, [featuresLoaded, fetchFeatures]);

    // Fetch user profile on mount to check cookie session
    useEffect(() => {
        if (!isInitialized) {
            api.get('/profile')
                .then((response) => setUser(response.data))
                .catch(() => {
                    logout(); // This will set isInitialized = true
                });
        }
    }, [isInitialized, setUser, logout]);

    return (
        <AuthContext.Provider value={{ user, login, logout, isAuthenticated, isInitialized }}>
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
