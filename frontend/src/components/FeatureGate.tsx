import React from 'react';
import { useFeature } from '../hooks/useFeature';
import { Lock } from 'lucide-react';

interface FeatureGateProps {
    /** Feature key (e.g. 'payroll', 'rkas', 'assets') */
    feature: string;
    children: React.ReactNode;
    /** If true, show a "locked" placeholder instead of hiding content */
    showLocked?: boolean;
}

/**
 * FeatureGate — conditionally renders children based on feature flags.
 *
 * Usage:
 *   <FeatureGate feature="payroll">
 *     <PayrollPage />
 *   </FeatureGate>
 *
 * With locked placeholder:
 *   <FeatureGate feature="payroll" showLocked>
 *     <PayrollPage />
 *   </FeatureGate>
 */
const FeatureGate: React.FC<FeatureGateProps> = ({ feature, children, showLocked }) => {
    const isEnabled = useFeature(feature);

    if (isEnabled) {
        return <>{children}</>;
    }

    if (showLocked) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
                <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6">
                    <Lock size={36} className="text-slate-400" />
                </div>
                <h2 className="text-2xl font-bold text-slate-800 mb-2">Fitur Tidak Tersedia</h2>
                <p className="text-slate-500 max-w-md">
                    Fitur ini tidak tersedia dalam paket Anda. Hubungi administrator untuk mengaktifkan fitur ini.
                </p>
            </div>
        );
    }

    return null;
};

export default FeatureGate;
