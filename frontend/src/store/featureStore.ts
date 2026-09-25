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

export interface UnitInfo {
    id: number;
    name: string;
    code: string;
    is_active: boolean;
    foundation_id?: number;
    foundation?: { id: number; name: string; address?: string; phone?: string; email?: string };
}

export interface FoundationInfo {
    id: number;
    name: string;
    address?: string;
    phone?: string;
    email?: string;
    logo_url?: string;
}

interface SchoolInfo {
    name: string;
    logo_url: string;
    address: string;
    phone: string;
    email: string;
    npsn: string;
    landing_hero_title?: string;
    landing_hero_subtitle?: string;
    landing_slide_1_image?: string;
    landing_slide_2_image?: string;
    landing_slide_3_image?: string;
    landing_slide_1_title?: string;
    landing_slide_2_title?: string;
    landing_slide_3_title?: string;
    landing_slide_1_subtitle?: string;
    landing_slide_2_subtitle?: string;
    landing_slide_3_subtitle?: string;
    landing_slide_1_cta?: string;
    landing_slide_2_cta?: string;
    landing_slide_3_cta?: string;
    landing_slide_1_link?: string;
    landing_slide_2_link?: string;
    landing_slide_3_link?: string;
    landing_about_title?: string;
    landing_about_desc?: string;
    landing_cta_title?: string;
    landing_cta_desc?: string;
    active_payment_gateway?: string;
    midtrans_client_key?: string;
    xendit_public_key?: string;
    allow_delete_paid_obligations?: string;
    enable_rfid_attendance?: string;
    [key: string]: any;
}

interface FeatureState {
    features: Record<string, boolean>;
    school: SchoolInfo;
    bankAccounts: SchoolBankAccount[];
    units: UnitInfo[];
    foundations: FoundationInfo[];
    loaded: boolean;
    fetchFeatures: () => Promise<void>;
    isEnabled: (key: string) => boolean;
    isRFIDEnabled: () => boolean;
    getUnitName: (id: number) => string;
}

export const useFeatureStore = create<FeatureState>((set, get) => ({
    features: {},
    school: { name: 'Sekolah', logo_url: '', address: '', phone: '', email: '', npsn: '' },
    bankAccounts: [],
    units: [],
    foundations: [],
    loaded: false,

    fetchFeatures: async () => {
        try {
            const res = await api.get('/config/features', { _suppressToast: true } as any);
            set({
                features: res.data.features || {},
                school: res.data.school || { name: 'Sekolah', logo_url: '', address: '', phone: '', email: '', npsn: '' },
                bankAccounts: res.data.bank_accounts || [],
                units: res.data.units || [],
                foundations: res.data.foundations || [],
                loaded: true,
            });
        } catch (err) {
            console.error('Failed to load feature config:', err);
            set({ loaded: true });
        }
    },

    isEnabled: (key: string) => {
        const { features, school } = get();
        if (key === 'rfid_attendance') {
            const envEnabled = features['rfid_attendance'] !== undefined ? features['rfid_attendance'] : true;
            const settingEnabled = school.enable_rfid_attendance !== 'false';
            return envEnabled && settingEnabled;
        }
        // Default to true if the feature is not found in the config
        return features[key] !== undefined ? features[key] : true;
    },

    isRFIDEnabled: () => {
        const { isEnabled } = get();
        return isEnabled('rfid_attendance');
    },

    getUnitName: (id: number) => {
        const { units } = get();
        return units.find(u => u.id === id)?.name || `Unit ${id}`;
    },
}));

