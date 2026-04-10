import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AcademicYear } from '../types';

interface UIState {
    // Academic Year
    selectedAcademicYear: AcademicYear | null;
    setSelectedAcademicYear: (year: AcademicYear | null) => void;

    // Sidebar
    sidebarOpen: boolean;
    toggleSidebar: () => void;
    setSidebarOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>()(
    persist(
        (set) => ({
            selectedAcademicYear: null,
            setSelectedAcademicYear: (year) => set({ selectedAcademicYear: year }),

            sidebarOpen: true,
            toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
            setSidebarOpen: (open) => set({ sidebarOpen: open }),
        }),
        {
            name: 'ui-storage',
            // Hanya persist selectedAcademicYear
            partialize: (state) => ({ selectedAcademicYear: state.selectedAcademicYear }),
        }
    )
);
