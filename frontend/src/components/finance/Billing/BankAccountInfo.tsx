import React from 'react';
import { Landmark, Copy } from 'lucide-react';
import toast from 'react-hot-toast';
import { useSchoolBank } from '../../../hooks/useFeature'; // Already exists in legacy codebase

const BankAccountInfo: React.FC = () => {
    const bankAccounts = useSchoolBank();
    
    if (bankAccounts.length === 0) {
        return (
            <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 text-sm text-amber-700">
                Belum ada rekening bank untuk transfer. Hubungi admin sekolah.
            </div>
        );
    }
    
    return (
        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 space-y-3">
            <p className="text-xs text-blue-600 font-medium">Transfer ke rekening berikut:</p>
            {bankAccounts.map((acc: any) => (
                <div key={acc.id} className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                            <Landmark size={20} className="text-white" />
                        </div>
                        <div>
                            <p className="font-semibold text-slate-800">{acc.bank_name}{acc.is_primary ? ' ⭐' : ''}</p>
                            <p className="text-xs text-slate-500">a.n. {acc.account_holder}</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="font-mono text-slate-800">{acc.account_number}</p>
                        <button
                            type="button"
                            className="text-xs text-blue-600 hover:text-blue-500 flex items-center gap-1 justify-end mt-1"
                            onClick={() => {
                                navigator.clipboard.writeText(acc.account_number);
                                toast.success('Nomor rekening disalin!');
                            }}
                        >
                            <Copy size={12} /> Salin
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default BankAccountInfo;
