import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import { Menu } from 'lucide-react';

interface DashboardLayoutProps {
    children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    return (
        <div className="min-h-screen flex relative">
            {/* Background Elements */}
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[20%] left-[20%] w-[30%] h-[30%] rounded-full bg-green-200/20 blur-[100px]" />
                <div className="absolute bottom-[20%] right-[20%] w-[30%] h-[30%] rounded-full bg-emerald-200/20 blur-[100px]" />
            </div>

            <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

            <div className="flex-1 flex flex-col min-h-screen relative z-10">
                {/* Mobile Header for Sidebar Toggle */}
                <div className="lg:hidden p-4 flex items-center justify-between bg-white/80 backdrop-blur-md border-b border-slate-200">
                    <h1 className="text-xl font-bold text-slate-900">SIS PPI 100</h1>
                    <button onClick={() => setIsSidebarOpen(true)} className="text-slate-600 p-2 hover:bg-slate-100 rounded-lg">
                        <Menu size={24} />
                    </button>
                </div>

                <div className="hidden lg:block">
                    <Header />
                </div>

                <main className="flex-1 p-4 lg:p-8 overflow-x-hidden">
                    <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default DashboardLayout;
