import React from 'react';
import CardGlass from '../components/ui/glass/CardGlass';
import { Construction } from 'lucide-react';

interface PlaceholderPageProps {
    title: string;
}

const PlaceholderPage: React.FC<PlaceholderPageProps> = ({ title }) => {
    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-white">{title}</h1>
            <CardGlass className="p-12 flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center text-yellow-400 animate-pulse">
                    <Construction size={40} />
                </div>
                <h2 className="text-xl font-bold text-white">Sedang Dalam Pengembangan</h2>
                <p className="text-gray-400 max-w-md">
                    Halaman ini sedang dalam tahap pengembangan. Fitur ini akan segera tersedia dalam update berikutnya.
                </p>
            </CardGlass>
        </div>
    );
};

export default PlaceholderPage;
