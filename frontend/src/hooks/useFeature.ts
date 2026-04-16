import { useFeatureStore } from '../store/featureStore';
import type { SchoolBankAccount } from '../store/featureStore';

/**
 * Check if a specific feature is enabled.
 * Usage: const isPayrollEnabled = useFeature('payroll');
 */
export const useFeature = (key: string): boolean => {
    return useFeatureStore((state) => state.isEnabled(key));
};

/**
 * Get the list of active school bank accounts.
 * Usage: const banks = useSchoolBank();
 */
export const useSchoolBank = (): SchoolBankAccount[] => {
    return useFeatureStore((state) => state.bankAccounts);
};

/**
 * Get school branding info (name, logo, address).
 * Usage: const school = useSchool();
 */
export const useSchool = () => {
    return useFeatureStore((state) => state.school);
};
