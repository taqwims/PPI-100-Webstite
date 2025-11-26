import React from 'react';
import NavbarGlass from '../ui/glass/NavbarGlass';

interface PublicLayoutProps {
    children: React.ReactNode;
}

const PublicLayout: React.FC<PublicLayoutProps> = ({ children }) => {
    return (
        <div className="min-h-screen relative">
            {/* Background Elements */}
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-purple-600/20 blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-600/20 blur-[120px]" />
            </div>

            <NavbarGlass />

            <main className="relative z-10 pt-24 pb-12 px-6">
                {children}
            </main>

            <footer className="relative z-10 border-t border-white/10 bg-black/20 backdrop-blur-lg mt-12">
                <div className="container mx-auto px-6 py-8">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="text-gray-400 text-sm">
                            © 2024 Pesantren Persis 100 Banjar­sari. All rights reserved.
                        </div>
                        <div className="flex gap-6">
                            <a href="#" className="text-gray-400 hover:text-white transition-colors">Instagram</a>
                            <a href="#" className="text-gray-400 hover:text-white transition-colors">Facebook</a>
                            <a href="#" className="text-gray-400 hover:text-white transition-colors">YouTube</a>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default PublicLayout;
