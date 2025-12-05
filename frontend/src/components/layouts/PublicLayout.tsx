import React from 'react';
import { useLocation } from 'react-router-dom';
import NavbarGlass from '../ui/glass/NavbarGlass';

interface PublicLayoutProps {
    children: React.ReactNode;
}

const PublicLayout: React.FC<PublicLayoutProps> = ({ children }) => {
    const location = useLocation();
    const isHome = location.pathname === '/';

    return (
        <div className="min-h-screen relative">
            {/* Background Elements */}
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-green-600/20 blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-yellow-600/20 blur-[120px]" />
            </div>

            <NavbarGlass />

            <main className={`relative z-10 ${isHome ? '' : 'pt-24 px-6'} pb-12`}>
                {children}
            </main>

            <footer className="relative z-10 border-t border-slate-200 bg-white/50 backdrop-blur-lg mt-12">
                <div className="container mx-auto px-6 py-8">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="text-slate-500 text-sm">
                            © 2025 Pesantren Persis 100 Banjar­sari. All rights reserved.
                        </div>
                        <div className="flex gap-6">
                            <a href="https://www.instagram.com/ppi100banjarsari_?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==" target="_blank" className="text-slate-400 hover:text-green-600 transition-colors">Instagram</a>
                            <a href="https://www.facebook.com/ppi100banjarsari" target="_blank" className="text-slate-400 hover:text-green-600 transition-colors">Facebook</a>
                            <a href="https://www.youtube.com/@ppi100banjarsari" target="_blank" className="text-slate-400 hover:text-green-600 transition-colors">YouTube</a>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default PublicLayout;
