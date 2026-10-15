import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import PWAPrompt from '../ui/PWAPrompt';
import { stopAllCameraStreams } from '../../utils/cameraGuard';

interface DashboardLayoutProps {
    children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const location = useLocation();

    // Pastikan semua kamera hardware dimatikan jika berpindah ke page yang bukan scanner wajah
    useEffect(() => {
        if (!location.pathname.includes('/attendance/face')) {
            stopAllCameraStreams();
        }
    }, [location.pathname]);

    return (
        <div className="min-h-screen flex relative">
            {/* Background Elements */}
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[20%] left-[20%] w-[30%] h-[30%] rounded-full bg-green-200/20 blur-[100px]" />
                <div className="absolute bottom-[20%] right-[20%] w-[30%] h-[30%] rounded-full bg-emerald-200/20 blur-[100px]" />
            </div>

            <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

            <div className="flex-1 flex flex-col min-h-screen relative z-10 w-full max-w-full overflow-hidden">
                <Header onMenuClick={() => setIsSidebarOpen(true)} />

                <main className="flex-1 p-4 lg:p-8 overflow-x-hidden w-full">
                    <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {children}
                    </div>
                </main>
            </div>
            
            <PWAPrompt />
        </div>
    );
};

export default DashboardLayout;
