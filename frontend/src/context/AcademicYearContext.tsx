import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '../services/api';

interface AcademicYear {
    id: number;
    name: string;
    is_active: boolean;
    start_date: string;
    end_date: string;
}

interface AcademicYearContextType {
    academicYears: AcademicYear[];
    selectedYear: AcademicYear | null;
    setSelectedYear: (year: AcademicYear | null) => void;
    refreshYears: () => void;
    loading: boolean;
}

const AcademicYearContext = createContext<AcademicYearContextType>({
    academicYears: [],
    selectedYear: null,
    setSelectedYear: () => {},
    refreshYears: () => {},
    loading: true,
});

export const useAcademicYear = () => useContext(AcademicYearContext);

export const AcademicYearProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
    const [selectedYear, setSelectedYear] = useState<AcademicYear | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchYears = async () => {
        try {
            const res = await api.get('/finance/academic-years');
            const years: AcademicYear[] = res.data || [];
            setAcademicYears(years);
            // Auto-select active year if none selected
            if (!selectedYear || !years.find(y => y.id === selectedYear.id)) {
                const active = years.find(y => y.is_active);
                setSelectedYear(active || years[0] || null);
            }
        } catch (err) {
            console.error('Failed to fetch academic years', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchYears(); }, []);

    return (
        <AcademicYearContext.Provider value={{
            academicYears,
            selectedYear,
            setSelectedYear,
            refreshYears: fetchYears,
            loading,
        }}>
            {children}
        </AcademicYearContext.Provider>
    );
};
