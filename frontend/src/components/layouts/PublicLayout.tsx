import React from 'react';
import { useLocation } from 'react-router-dom';
import NavbarGlass from '../ui/glass/NavbarGlass';
import PWAPrompt from '../ui/PWAPrompt';

import { useFeatureStore } from '../../store/featureStore';

interface PublicLayoutProps {
    children: React.ReactNode;
}

const PublicLayout: React.FC<PublicLayoutProps> = ({ children }) => {
    const location = useLocation();
    const isHome = location.pathname === '/';
    const { school } = useFeatureStore();

    const currentYear = new Date().getFullYear();
    const defaultCopyright = `© ${currentYear} ${school.name || 'SDIT An-Nur Banjarsari'}. All rights reserved.`;
    const copyrightText = school.footer_copyright || defaultCopyright;

    const socialLinks = [
        { name: 'Instagram', url: school.social_instagram },
        { name: 'Facebook', url: school.social_facebook },
        { name: 'YouTube', url: school.social_youtube },
        { name: 'TikTok', url: school.social_tiktok },
        { name: 'WhatsApp', url: school.social_whatsapp ? `https://wa.me/${school.social_whatsapp.replace(/[^0-9]/g, '')}` : '' },
    ].filter(s => !!s.url);

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
                            {copyrightText}
                        </div>
                        {socialLinks.length > 0 && (
                            <div className="flex flex-wrap gap-6">
                                {socialLinks.map((s, idx) => (
                                    <a
                                        key={idx}
                                        href={s.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-slate-400 hover:text-green-600 transition-colors text-sm font-medium"
                                    >
                                        {s.name}
                                    </a>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </footer>

            <PWAPrompt />
        </div>
    );
};

export default PublicLayout;
