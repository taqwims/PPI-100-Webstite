import React from 'react';

type PPDBPaymentStatus = 'Belum Bayar' | 'DP Terpenuhi' | 'Lunas';

interface PPDBPaymentStatusBadgeProps {
    status: string;
}

const statusConfig: Record<PPDBPaymentStatus, { bg: string; text: string; label: string }> = {
    'Belum Bayar': {
        bg: 'bg-red-100',
        text: 'text-red-600',
        label: 'Belum Bayar',
    },
    'DP Terpenuhi': {
        bg: 'bg-yellow-100',
        text: 'text-yellow-600',
        label: 'DP Terpenuhi',
    },
    'Lunas': {
        bg: 'bg-green-100',
        text: 'text-green-600',
        label: 'Lunas',
    },
};

const PPDBPaymentStatusBadge: React.FC<PPDBPaymentStatusBadgeProps> = ({ status }) => {
    const config = statusConfig[status as PPDBPaymentStatus] ?? {
        bg: 'bg-slate-100',
        text: 'text-slate-600',
        label: status,
    };

    return (
        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${config.bg} ${config.text}`}>
            {config.label}
        </span>
    );
};

export default PPDBPaymentStatusBadge;
