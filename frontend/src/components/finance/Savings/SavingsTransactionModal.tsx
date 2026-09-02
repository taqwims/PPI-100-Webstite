import React, { useState, useEffect } from 'react';
import { ArrowUpRight, ArrowDownRight, X, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import api from '../../../services/api';
import { SavingAccount, ClassData, Student } from './types';

const formatCurrency = (amount: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);

const getTodayDate = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    initialType: 'Deposit' | 'Withdrawal';
    initialStudentId?: string;
    classes: ClassData[];
    students: Student[];
    accounts: SavingAccount[];
}

export const SavingsTransactionModal: React.FC<Props> = ({
    isOpen, onClose, onSuccess, initialType, initialStudentId, classes, students, accounts
}) => {
    const [trxType, setTrxType] = useState<'Deposit' | 'Withdrawal'>('Deposit');
    const [trxStudentId, setTrxStudentId] = useState('');
    const [trxAmount, setTrxAmount] = useState('');
    const [trxDate, setTrxDate] = useState(getTodayDate());
    const [trxNotes, setTrxNotes] = useState('');
    const [trxClassFilter, setTrxClassFilter] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setTrxType(initialType);
            setTrxStudentId(initialStudentId || '');
            setTrxAmount('');
            setTrxDate(getTodayDate());
            setTrxNotes('');
            setTrxClassFilter('');
        }
    }, [isOpen, initialType, initialStudentId]);

    if (!isOpen) return null;

    const filteredStudents = trxClassFilter 
        ? students.filter(s => s.class_id?.toString() === String(trxClassFilter) || s.class?.id?.toString() === String(trxClassFilter)) 
        : students;

    const handleTransactionSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!trxStudentId) return;
        setSubmitting(true);
        try {
            await api.post('/finance/savings/transactions', { 
                student_id: trxStudentId, 
                type: trxType, 
                amount: parseFloat(trxAmount), 
                notes: trxNotes,
                date: trxDate || undefined,
            });
            toast.success(trxType === 'Deposit' ? 'Setoran berhasil' : 'Penarikan berhasil');
            onSuccess();
            onClose();
        } catch (error: any) { 
            console.error(error);
        } finally { 
            setSubmitting(false); 
        }
    };

    const selectedAccount = accounts.find(a => a.student_id === trxStudentId);

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] overflow-y-auto border border-white/20">
                <div className={clsx(
                    "p-8 border-b border-white/10 flex justify-between items-center sticky top-0 bg-white/80 backdrop-blur-md z-10",
                    trxType === 'Deposit' ? "bg-emerald-50/30" : "bg-red-50/30"
                )}>
                    <h2 className="text-2xl font-black flex items-center text-slate-800 tracking-tight">
                        {trxType === 'Deposit' ? (
                            <><div className="p-2 bg-emerald-100 text-emerald-600 rounded-xl mr-3"><ArrowUpRight size={24} /></div> Setor Dana</>
                        ) : (
                            <><div className="p-2 bg-red-100 text-red-600 rounded-xl mr-3"><ArrowDownRight size={24} /></div> Tarik Dana</>
                        )}
                    </h2>
                    <button onClick={onClose} className="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center transition-colors"><X size={24} className="text-slate-400" /></button>
                </div>
                
                <form onSubmit={handleTransactionSubmit} className="p-8 space-y-6">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Jenis Transaksi</label>
                            <div className="flex bg-slate-100/50 p-1.5 rounded-2xl border border-slate-200/60">
                                <button type="button" onClick={() => setTrxType('Deposit')} className={clsx("flex-1 py-3 text-sm font-black rounded-xl transition-all duration-300 flex items-center justify-center gap-2", trxType === 'Deposit' ? "bg-white text-emerald-600 shadow-sm scale-[1.02]" : "text-slate-500")}>Setoran</button>
                                <button type="button" onClick={() => setTrxType('Withdrawal')} className={clsx("flex-1 py-3 text-sm font-black rounded-xl transition-all duration-300 flex items-center justify-center gap-2", trxType === 'Withdrawal' ? "bg-white text-red-600 shadow-sm scale-[1.02]" : "text-slate-500")}>Penarikan</button>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Filter Kelas</label>
                                <select value={trxClassFilter} onChange={e => { setTrxClassFilter(e.target.value); setTrxStudentId(''); }} className="w-full px-5 py-3.5 rounded-2xl border-2 border-slate-100 focus:border-emerald-500/30 bg-slate-50/50 font-bold text-slate-700 appearance-none">
                                    <option value="">Semua Kelas</option>
                                    {classes.map(c => (<option key={c.id} value={c.id}>{c.name}</option>))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Pilih Siswa</label>
                                <select required value={trxStudentId} onChange={e => setTrxStudentId(e.target.value)} className="w-full px-5 py-3.5 rounded-2xl border-2 border-slate-100 focus:border-emerald-500/30 bg-slate-50/50 font-bold text-slate-700 appearance-none">
                                    <option value="">-- Nama Siswa --</option>
                                    {filteredStudents.map(s => (<option key={s.id} value={s.id}>{s.user?.name} ({s.class?.name || '-'})</option>))}
                                </select>
                            </div>
                        </div>
                        
                        {trxStudentId && (
                            <div className={clsx("p-4 rounded-2xl border flex items-center justify-between", selectedAccount ? "bg-emerald-50/50 border-emerald-100" : "bg-blue-50/50 border-blue-100")}>
                                <p className="text-xs font-black uppercase tracking-widest opacity-60">Status Saldo:</p>
                                <p className="font-black tracking-tight text-xl">{selectedAccount ? formatCurrency(selectedAccount.balance) : 'AKUN BARU'}</p>
                            </div>
                        )}
                        
                        <div>
                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                                <Calendar size={14} className="text-emerald-500" />
                                Tanggal Transaksi
                            </label>
                            <input 
                                type="date" 
                                required 
                                className="w-full px-5 py-3.5 rounded-2xl border-2 border-slate-100 focus:border-emerald-500/30 bg-slate-50/50 font-bold text-slate-800 text-sm" 
                                value={trxDate}
                                onChange={e => setTrxDate(e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Nominal (Rp)</label>
                            <div className="relative group">
                                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-2xl font-black text-slate-300 group-focus-within:text-emerald-500 transition-colors">Rp</div>
                                <input 
                                    type="text" 
                                    required 
                                    className="w-full pl-16 pr-5 py-5 rounded-[1.5rem] border-2 border-slate-100 focus:border-emerald-500/30 bg-slate-50/50 font-black text-3xl tracking-tight text-slate-900" 
                                    value={trxAmount ? new Intl.NumberFormat('id-ID').format(Number(trxAmount)) : ''}
                                    onChange={e => {
                                        const val = e.target.value.replace(/\D/g, '');
                                        setTrxAmount(val ? val : '');
                                    }} 
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Catatan Keterangan</label>
                            <textarea rows={2} placeholder="Misal: Tabungan mingguan" className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 focus:border-emerald-500/30 bg-slate-50/50 font-medium text-slate-700" value={trxNotes} onChange={e => setTrxNotes(e.target.value)} />
                        </div>
                    </div>
                    
                    <div className="flex gap-3 pt-4">
                        <button type="button" onClick={onClose} className="flex-1 px-6 py-4 rounded-2xl border-2 border-slate-100 text-slate-400 font-black uppercase tracking-widest hover:bg-slate-50 transition-all">Batal</button>
                        <button type="submit" disabled={submitting} className={clsx("flex-[2] px-6 py-4 rounded-2xl text-white font-black uppercase tracking-widest shadow-xl transition-all hover:-translate-y-1 active:scale-95", trxType === 'Deposit' ? "bg-emerald-600 shadow-emerald-200" : "bg-red-600 shadow-red-200", submitting && "opacity-50 pointer-events-none")}>
                            {submitting ? 'Memproses...' : trxType === 'Deposit' ? 'Proses Setoran' : 'Proses Tarikan'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
