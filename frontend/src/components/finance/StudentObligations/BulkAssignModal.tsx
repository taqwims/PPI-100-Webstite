import React, { useState, useEffect } from 'react';
import { Users, X } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../../services/api';
import { AcademicYear, ClassOption, PaymentType } from './types';

interface BulkAssignModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    filterYearId: string;
    classes: ClassOption[];
    students: any[];
    academicYears: AcademicYear[];
    paymentTypes: PaymentType[];
    semesterMonths: { semester1: number[]; semester2: number[] };
}

const formatCurrency = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);
const MONTH_NAMES = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

export const BulkAssignModal: React.FC<BulkAssignModalProps> = ({
    isOpen, onClose, onSuccess, filterYearId, classes, students, academicYears, paymentTypes, semesterMonths
}) => {
    const [submitting, setSubmitting] = useState(false);
    const [assignTarget, setAssignTarget] = useState<'class' | 'student'>('class');
    const [bulkForm, setBulkForm] = useState({ class_id: '', payment_type_ids: [] as string[], academic_year_id: filterYearId });
    const [studentId, setStudentId] = useState('');
    const [filterAssignClassId, setFilterAssignClassId] = useState('');
    const [selectedMonths, setSelectedMonths] = useState<number[]>([]);
    const [installmentCount, setInstallmentCount] = useState(1);

    const getCurrentSemesterMonths = (): number[] => {
        const now = new Date();
        const currentMonth = now.getMonth() + 1;
        if (semesterMonths.semester1.includes(currentMonth)) return semesterMonths.semester1;
        if (semesterMonths.semester2.includes(currentMonth)) return semesterMonths.semester2;
        return [...semesterMonths.semester1, ...semesterMonths.semester2];
    };

    useEffect(() => {
        if (isOpen) {
            setBulkForm({ class_id: '', payment_type_ids: [], academic_year_id: filterYearId });
            setAssignTarget('class');
            setStudentId('');
            setFilterAssignClassId('');
            setSelectedMonths(getCurrentSemesterMonths());
            setInstallmentCount(1);
        }
    }, [isOpen, filterYearId]);

    if (!isOpen) return null;

    const selectedPTs = paymentTypes.filter(pt => bulkForm.payment_type_ids.includes(String(pt.id)));
    const hasMonthly = selectedPTs.some(pt => pt.payment_schedule === 'Bulanan');
    const hasYearly = selectedPTs.some(pt => pt.payment_schedule === 'Tahunan');

    const handleAssign = async (e: React.FormEvent) => {
        e.preventDefault();
        if (bulkForm.payment_type_ids.length === 0) {
            toast.error('Pilih minimal satu jenis pembayaran');
            return;
        }
        setSubmitting(true);
        try {
            let totalCount = 0;
            for (const pt_id of bulkForm.payment_type_ids) {
                const pt = paymentTypes.find(p => p.id === Number(pt_id));
                if (assignTarget === 'class') {
                    const payload: any = {
                        class_id: Number(bulkForm.class_id),
                        payment_type_id: Number(pt_id),
                        academic_year_id: Number(bulkForm.academic_year_id),
                    };
                    if (pt?.payment_schedule === 'Bulanan') {
                        payload.selected_months = selectedMonths;
                    }
                    if (pt?.payment_schedule === 'Tahunan' && installmentCount > 1) {
                        payload.installment_count = installmentCount;
                    }
                    const res = await api.post('/finance/student-obligations/bulk-assign', payload);
                    totalCount += res.data?.count || 0;
                } else {
                    if (pt?.payment_schedule === 'Bulanan' && selectedMonths.length > 0) {
                        for (const month of selectedMonths) {
                            await api.post('/finance/student-obligations', {
                                student_id: studentId,
                                payment_type_id: Number(pt_id),
                                academic_year_id: Number(bulkForm.academic_year_id),
                                billing_month: month
                            });
                            totalCount += 1;
                        }
                    } else if (pt?.payment_schedule === 'Tahunan' && installmentCount > 1) {
                        for (let i = 1; i <= installmentCount; i++) {
                            await api.post('/finance/student-obligations', {
                                student_id: studentId,
                                payment_type_id: Number(pt_id),
                                academic_year_id: Number(bulkForm.academic_year_id),
                                installment_number: i,
                                total_installments: installmentCount
                            });
                            totalCount += 1;
                        }
                    } else {
                        await api.post('/finance/student-obligations', {
                            student_id: studentId,
                            payment_type_id: Number(pt_id),
                            academic_year_id: Number(bulkForm.academic_year_id),
                        });
                        totalCount += 1;
                    }
                }
            }
            if (assignTarget === 'class') {
                toast.success(`${totalCount} item tanggungan berhasil ditambahkan`);
            } else {
                toast.success(`${totalCount} tanggungan berhasil ditambahkan untuk siswa`);
            }
            onSuccess();
            onClose();
        } catch (err: any) {
             console.error(err);
        } finally { 
            setSubmitting(false); 
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2"><Users size={20} className="text-blue-600" /> Assign Tanggungan</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                </div>
                <div className="overflow-y-auto w-full max-h-full">
                    <form onSubmit={handleAssign} className="p-6 space-y-4">
                        <div className="flex gap-4 border-b border-slate-200 pb-2 mb-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="radio" checked={assignTarget === 'class'} onChange={() => setAssignTarget('class')} className="text-blue-600" />
                                <span className="text-sm font-medium text-slate-700">Per Kelas</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="radio" checked={assignTarget === 'student'} onChange={() => setAssignTarget('student')} className="text-blue-600" />
                                <span className="text-sm font-medium text-slate-700">Per Siswa</span>
                            </label>
                        </div>

                        {assignTarget === 'class' ? (
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Kelas</label>
                                <select value={bulkForm.class_id} onChange={e => setBulkForm({ ...bulkForm, class_id: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm" required={assignTarget === 'class'}>
                                    <option value="">Pilih kelas</option>
                                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                        ) : (
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Filter Kelas</label>
                                <select value={filterAssignClassId} onChange={e => { setFilterAssignClassId(e.target.value); setStudentId(''); }} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl mb-3 text-sm">
                                    <option value="">-- Semua Kelas --</option>
                                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>

                                <label className="block text-sm font-medium text-slate-700 mb-1">Pilih Siswa</label>
                                <select value={studentId} onChange={e => setStudentId(e.target.value)} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm" required={assignTarget === 'student'}>
                                    <option value="">Pilih Siswa</option>
                                    {students.filter(s => filterAssignClassId ? String(s.student?.class?.id) === filterAssignClassId : true).map(s => <option key={s.student?.id} value={s.student?.id}>{s.name} ({s.student?.class?.name || 'Belum ada kelas'})</option>)}
                                </select>
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Jenis Pembayaran (Bisa Pilih Lebih dari 1)</label>
                            <div className="space-y-2 max-h-48 overflow-y-auto border border-slate-200 rounded-xl p-3 bg-slate-50">
                                {paymentTypes.filter(pt => pt.is_active).map(pt => (
                                    <label key={pt.id} className="flex items-center gap-3 cursor-pointer hover:bg-white p-2 rounded-lg transition border border-transparent hover:border-slate-200">
                                        <input 
                                            type="checkbox" 
                                            className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500" 
                                            checked={bulkForm.payment_type_ids.includes(String(pt.id))} 
                                            onChange={(e) => {
                                                const checked = e.target.checked;
                                                setBulkForm(prev => ({
                                                    ...prev,
                                                    payment_type_ids: checked 
                                                        ? [...prev.payment_type_ids, String(pt.id)] 
                                                        : prev.payment_type_ids.filter(id => id !== String(pt.id))
                                                }));
                                            }}
                                        />
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-slate-800">[{pt.code}] {pt.name}</p>
                                            <p className="text-xs text-slate-500">{formatCurrency(pt.amount)}</p>
                                        </div>
                                    </label>
                                ))}
                                {paymentTypes.filter(pt => pt.is_active).length === 0 && (
                                    <p className="text-xs text-slate-500 text-center py-2">Belum ada jenis pembayaran aktif</p>
                                )}
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Tahun Ajaran</label>
                            <select value={bulkForm.academic_year_id} onChange={e => setBulkForm({ ...bulkForm, academic_year_id: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm" required>
                                <option value="">Pilih tahun ajaran</option>
                                {academicYears.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
                            </select>
                        </div>

                        {/* Monthly billing options */}
                        {hasMonthly && (
                            <div className="border border-blue-200 rounded-xl p-4 bg-blue-50/50">
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 gap-2">
                                    <label className="text-sm font-medium text-blue-800">Bulan Tagihan (Bulanan)</label>
                                    <div className="flex bg-white rounded-lg border border-blue-100 p-1 text-xs">
                                        <button type="button" onClick={() => setSelectedMonths(semesterMonths.semester1)} className={`px-2 py-1 rounded-md transition-colors ${selectedMonths.join(',') === semesterMonths.semester1.join(',') ? 'bg-blue-100 text-blue-700 font-medium' : 'hover:bg-slate-50 text-slate-600'}`}>Ganjil</button>
                                        <button type="button" onClick={() => setSelectedMonths(semesterMonths.semester2)} className={`px-2 py-1 rounded-md transition-colors ${selectedMonths.join(',') === semesterMonths.semester2.join(',') ? 'bg-blue-100 text-blue-700 font-medium' : 'hover:bg-slate-50 text-slate-600'}`}>Genap</button>
                                        <button type="button" onClick={() => setSelectedMonths([...semesterMonths.semester1, ...semesterMonths.semester2])} className={`px-2 py-1 rounded-md transition-colors ${selectedMonths.length === 12 ? 'bg-blue-100 text-blue-700 font-medium' : 'hover:bg-slate-50 text-slate-600'}`}>1 Tahun</button>
                                    </div>
                                </div>
                                <div className="grid grid-cols-6 gap-2">
                                    {[...semesterMonths.semester1, ...semesterMonths.semester2].map((m: number) => {
                                        const isSelected = selectedMonths.includes(m);
                                        return (
                                            <label key={m} className={`flex items-center justify-center py-2 rounded-lg border cursor-pointer transition-all ${isSelected ? 'bg-blue-600 text-white border-blue-600 shadow-md transform -translate-y-0.5' : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'}`}>
                                                <input type="checkbox" className="hidden" checked={isSelected} onChange={(e) => {
                                                    if (e.target.checked) setSelectedMonths([...selectedMonths, m]);
                                                    else setSelectedMonths(selectedMonths.filter(x => x !== m));
                                                }} />
                                                <span className="text-[10px] font-bold uppercase">{MONTH_NAMES[m]?.slice(0,3)}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Yearly billing options */}
                        {hasYearly && (
                            <div className="border border-purple-200 rounded-xl p-4 bg-purple-50/50">
                                <label className="text-sm font-medium text-purple-800 block mb-2">Sistem Pembayaran (Tahunan)</label>
                                <div className="flex items-center gap-3">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="radio" checked={installmentCount === 1} onChange={() => setInstallmentCount(1)} className="text-purple-600" />
                                        <span className="text-sm text-slate-700">Lunas / 1x Bayar</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="radio" checked={installmentCount > 1} onChange={() => setInstallmentCount(2)} className="text-purple-600" />
                                        <span className="text-sm text-slate-700">Cicil Beberapa Kali</span>
                                    </label>
                                </div>
                                {installmentCount > 1 && (
                                    <div className="mt-3 flex items-center gap-3">
                                        <label className="text-sm text-slate-600">Jumlah Cicilan:</label>
                                        <div className="flex bg-white rounded-lg border border-purple-100 p-1">
                                            {[2,3,4,5,6].map(num => (
                                                <button type="button" key={num} onClick={() => setInstallmentCount(num)} className={`w-8 h-8 rounded-md text-sm transition-colors ${installmentCount === num ? 'bg-purple-100 text-purple-700 font-bold' : 'hover:bg-slate-50 text-slate-600'}`}>{num}x</button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="flex gap-3 pt-4 shrink-0">
                            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl font-medium text-slate-600">Batal</button>
                            <button type="submit" disabled={submitting} className="flex-[2] bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 shadow-lg shadow-blue-200 flex items-center justify-center">
                                {submitting ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : 'Assign Tagihan'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};
