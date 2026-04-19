import { create } from 'zustand';
import api from '../services/api';

export interface SchoolBankAccount {
    id: number;
    bank_name: string;
    account_number: string;
    account_holder: string;
    is_primary: boolean;
    is_active: boolean;
}

interface SchoolInfo {
    name: string;
    logo_url: string;
    address: string;
    phone: string;
    email: string;
    npsn: string;
}

interface FeatureState {
    features: Record<string, boolean>;
    school: SchoolInfo;
    bankAccounts: SchoolBankAccount[];
    loaded: boolean;
    fetchFeatures: () => Promise<void>;
    isEnabled: (key: string) => boolean;
}

export const useFeatureStore = create<FeatureState>((set, get) => ({
    features: {},
    school: { name: 'Sekolah', logo_url: '', address: '', phone: '', email: '', npsn: '' },
    bankAccounts: [],
    loaded: false,

    fetchFeatures: async () => {
        try {
            const res = await api.get('/config/features', { _suppressToast: true } as any);
            set({
                features: res.data.features || {},
                school: res.data.school || { name: 'Sekolah', logo_url: '', address: '', phone: '', email: '', npsn: '' },
                bankAccounts: res.data.bank_accounts || [],
                loaded: true,
            });
        } catch (err) {
            console.error('Failed to load feature config:', err);
            set({ loaded: true });
        }
    },

    isEnabled: (key: string) => {
        const { features } = get();
        // Default to true if the feature is not found in the config
        return features[key] !== undefined ? features[key] : true;
    },
}));
