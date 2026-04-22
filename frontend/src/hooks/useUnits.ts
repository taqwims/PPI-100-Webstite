import { useFeatureStore } from '../store/featureStore';

/**
 * Shared hook to access active units from the feature store.
 * All unit dropdowns/tabs/labels should use this hook instead of hardcoding.
 */
export function useUnits() {
    const units = useFeatureStore(s => s.units);
    const getUnitName = useFeatureStore(s => s.getUnitName);

    return {
        units,              // Array of active units from DB
        getUnitName,        // (id: number) => "MTS" | "MA" | etc.
        defaultUnitId: units[0]?.id || 1,
    };
}
