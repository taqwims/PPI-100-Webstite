import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { FileStack, Plus, Users, GraduationCap, Tag, CheckSquare, Loader2 } from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';

interface Student { id: string; user: { name: string }; class?: { id: number; name: string }; class_id: number; nisn: string; }
interface ClassData { id: number; name: string; unit_id: number; }
interface AcademicYear { id: number; name: string; is_active: boolean; }
interface TransactionCode { id: number; code: string; name: string; type: string; category: string; is_active: boolean; }
interface BillTemplateData { id: number; template_name: string; title: string; amount: number; bill_type: string; transaction_code_id: number | null; is_installment: boolean; unit_id: number; }

const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);

const BillTemplates = () => {
    const { user } = useAuth();
    const [unitID, setUnitID] = useState(user?.unit_id || 1);
    const [classes, setClasses] = useState<ClassData[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
    const [transactionCodes, setTransactionCodes] = useState<TransactionCode[]>([]);
    const [selectedClassID, setSelectedClassID] = useState<number | null>(null);
    const [selectedStudentIDs, setSelectedStudentIDs] = useState<string[]>([]);
    const [selectAll, setSelectAll] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const [savedTemplates, setSavedTemplates] = useState<BillTemplateData[]>([]);
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
    const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);
    const [newTemplateName, setNewTemplateName] = useState('');

    const [formData, setFormData] = useState({
        title: '',
        amount: '',
        due_date: '',
        bill_type: 'SPP',
        academic_year_id: '',
        transaction_code_id: '',
        is_installment: false,
    });

    useEffect(() => {
        api.get(`/academic/classes?unit_id=${unitID}`).then(r => setClasses(r.data || [])).catch(() => { });
        api.get('/finance/academic-years').then(r => setAcademicYears(r.data || [])).catch(() => { });
        api.get('/finance/transaction-codes').then(r => setTransactionCodes(r.data || [])).catch(() => { });
        fetchTemplates();
    }, [unitID]);

    const fetchTemplates = () => {
        api.get(`/finance/templates?unit_id=${unitID}`).then(r => setSavedTemplates(r.data || [])).catch(() => { });
    }

    useEffect(() => {
        if (selectedClassID) {
            api.get(`/students/?unit_id=${unitID}`).then(r => {
                const all = r.data || [];
                setStudents(all.filter((s: Student) => s.class_id === selectedClassID));
            }).catch(() => { });
        } else {
            setStudents([]);
        }
        setSelectedStudentIDs([]);
        setSelectAll(false);
    }, [selectedClassID, unitID]);

    const toggleStudent = (id: string) => {
        setSelectedStudentIDs(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
    };

    const toggleAll = () => {
        if (selectAll) {
            setSelectedStudentIDs([]);
        } else {
            setSelectedStudentIDs(students.map(s => s.id));
        }
        setSelectAll(!selectAll);
    };
    const handleTransactionCodeChange = (codeId: string) => {
        const tc = transactionCodes.find(c => c.id === Number(codeId));
        setFormData({
            ...formData,
            transaction_code_id: codeId,
            bill_type: tc ? tc.name : formData.bill_type,
        });
    };

    const handleLoadTemplate = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const tempId = e.target.value;
        setSelectedTemplateId(tempId);
        if (!tempId) return;

        const t = savedTemplates.find(x => x.id.toString() === tempId);
        if (t) {
            setFormData({
                ...formData,
                title: t.title,
                amount: t.amount.toString(),
                bill_type: t.bill_type,
                transaction_code_id: t.transaction_code_id ? t.transaction_code_id.toString() : '',
                is_installment: t.is_installment
            });
        }
    };

    const handleSaveTemplate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTemplateName) { toast.error('Nama template wajib diisi'); return; }
        if (!formData.title || !formData.amount) { toast.error('Isi form detail batas minimum terlebih dahulu'); return; }

        try {
            const payload = {
                template_name: newTemplateName,
                title: formData.title,
                amount: parseFloat(formData.amount),
                bill_type: formData.bill_type,
                transaction_code_id: formData.transaction_code_id ? Number(formData.transaction_code_id) : undefined,
                is_installment: formData.is_installment,
                unit_id: unitID
            };
            await api.post('/finance/templates', payload);
            toast.success('Template berhasil disimpan');
            setShowSaveTemplateModal(false);
            setNewTemplateName('');
            fetchTemplates(); // refresh list
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Gagal menyimpan template');
        }
    };

    const handleDeleteTemplate = async (id: number) => {
        if (!confirm("Hapus template ini?")) return;
        try {
            await api.delete(`/finance/templates/${id}`);
            toast.success('Template dihapus');
            if (selectedTemplateId === id.toString()) setSelectedTemplateId('');
            fetchTemplates();
        } catch (error: any) {
            toast.error('Gagal menghapus template');
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedStudentIDs.length === 0) {
            toast.error('Pilih minimal 1 siswa');
            return;
        }
        if (!formData.title || !formData.amount || !formData.due_date) {
            toast.error('Lengkapi semua field yang wajib');
            return;
        }
        setSubmitting(true);
        try {
            const payload = {
                student_ids: selectedStudentIDs,
                title: formData.title,
                amount: parseFloat(formData.amount),
                due_date: formData.due_date,
                bill_type: formData.bill_type,
                academic_year_id: formData.academic_year_id ? Number(formData.academic_year_id) : undefined,
                transaction_code_id: formData.transaction_code_id ? Number(formData.transaction_code_id) : undefined,
                is_installment: formData.is_installment,
            };
            const res = await api.post('/finance/bills/batch', payload);
            toast.success(res.data?.message || 'Tagihan berhasil dibuat');
            setSelectedStudentIDs([]);
            setSelectAll(false);
            setFormData({ title: '', amount: '', due_date: '', bill_type: '', academic_year_id: '', transaction_code_id: '', is_installment: false });
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Gagal membuat tagihan batch');
        } finally {
            setSubmitting(false);
        }
    };



    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
                    <FileStack className="text-blue-600" size={32} /> Template Tagihan
                </h1>
                <p className="text-slate-500 mt-1">Buat tagihan untuk banyak siswa sekaligus dengan satu template.</p>
            </div>

            {/* Unit Switcher */}
            {[1, 9, 10].includes(user?.role_id || 0) && (
                <div className="p-1 bg-slate-100 rounded-lg inline-flex shadow-sm border border-slate-200">
                    <button onClick={() => setUnitID(1)}
                        className={clsx("px-4 py-1.5 text-sm font-medium rounded-md transition", unitID === 1 ? "bg-white text-blue-700 shadow" : "text-slate-500 hover:text-slate-700")}>
                        MTS
                    </button>
                    <button onClick={() => setUnitID(2)}
                        className={clsx("px-4 py-1.5 text-sm font-medium rounded-md transition", unitID === 2 ? "bg-white text-blue-700 shadow" : "text-slate-500 hover:text-slate-700")}>
                        MA
                    </button>
                </div>
            )}

            <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column — Data Tagihan */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Template Selection */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
                        <div className="flex justify-between items-center">
                            <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                                <FileStack size={20} className="text-indigo-500" /> Pilih Template Tersimpan (Opsional)
                            </h2>
                        </div>
                        <div className="flex items-center gap-3">
                            <select
                                value={selectedTemplateId}
                                onChange={handleLoadTemplate}
                                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 text-sm bg-slate-50"
                            >
                                <option value="">-- Kosongkan / Buat Manual --</option>
                                {savedTemplates.map(t => (
                                    <option key={t.id} value={t.id}>{t.template_name}</option>
                                ))}
                            </select>
                            {selectedTemplateId && (
                                <button type="button" onClick={() => handleDeleteTemplate(Number(selectedTemplateId))} className="px-4 py-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition font-medium text-sm border border-red-100">
                                    Hapus
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
                        <div className="flex justify-between items-center">
                            <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                                <Tag size={20} className="text-blue-500" /> Detail Tagihan
                            </h2>
                            <button type="button" onClick={() => setShowSaveTemplateModal(true)} className="text-sm px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg transition border border-slate-200">
                                Simpan Template
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Judul Tagihan *</label>
                                <input type="text" required value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 text-sm"
                                    placeholder="Contoh: SPP Bulan Maret 2026" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Nominal (Rp) *</label>
                                <input type="number" required min="1000" value={formData.amount}
                                    onChange={e => setFormData({ ...formData, amount: e.target.value })}
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 text-sm font-medium"
                                    placeholder="500000" />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Jatuh Tempo *</label>
                                <input type="date" required value={formData.due_date}
                                    onChange={e => setFormData({ ...formData, due_date: e.target.value })}
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 text-sm" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    <span className="flex items-center gap-1.5"><Tag size={14} className="text-green-500" /> Kode Transaksi *</span>
                                </label>
                                <select value={formData.transaction_code_id}
                                    onChange={e => handleTransactionCodeChange(e.target.value)}
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 text-sm"
                                    required>
                                    <option value="">-- Pilih Kode Transaksi --</option>
                                    {transactionCodes.filter(tc => tc.is_active).map(tc => (
                                        <option key={tc.id} value={tc.id}>[{tc.code}] {tc.name} ({tc.type === 'Income' ? 'Pendapatan' : 'Pengeluaran'})</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Tahun Ajaran</label>
                                <select value={formData.academic_year_id}
                                    onChange={e => setFormData({ ...formData, academic_year_id: e.target.value })}
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 text-sm">
                                    <option value="">-- Pilih Tahun Ajaran --</option>
                                    {academicYears.map(y => (
                                        <option key={y.id} value={y.id}>{y.name} {y.is_active ? '(Aktif)' : ''}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Installment checkbox */}
                        <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
                            <input type="checkbox" id="is_installment" checked={formData.is_installment}
                                onChange={e => setFormData({ ...formData, is_installment: e.target.checked })}
                                className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500" />
                            <label htmlFor="is_installment" className="text-sm text-slate-700">
                                <span className="font-medium">Boleh Dicicil</span>
                                <span className="block text-xs text-slate-500 mt-0.5">Siswa dapat membayar sebagian (status akan menjadi "Partial" sampai lunas).</span>
                            </label>
                        </div>
                    </div>

                    {/* Submit Summary */}
                    {selectedStudentIDs.length > 0 && (
                        <div className="bg-blue-50 rounded-2xl border border-blue-200 p-6 flex items-center justify-between">
                            <div>
                                <p className="text-blue-800 text-sm font-medium">
                                    {selectedStudentIDs.length} siswa dipilih
                                </p>
                                {formData.amount && (
                                    <p className="text-blue-600 text-xs mt-1">
                                        Total: {formatCurrency(parseFloat(formData.amount) * selectedStudentIDs.length)}
                                    </p>
                                )}
                            </div>
                            <button type="submit" disabled={submitting}
                                className={clsx("px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition flex items-center gap-2 shadow-lg shadow-blue-600/20", submitting && "opacity-50 cursor-not-allowed")}>
                                {submitting ? <><Loader2 size={18} className="animate-spin" /> Membuat...</> :
                                    <><Plus size={18} /> Buat {selectedStudentIDs.length} Tagihan</>}
                            </button>
                        </div>
                    )}
                </div>

                {/* Right Column — Pilih Siswa */}
                <div className="space-y-4">
                    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
                        <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                            <Users size={20} className="text-green-500" /> Pilih Siswa
                        </h2>

                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">Kelas</label>
                            <select value={selectedClassID || ''}
                                onChange={e => setSelectedClassID(e.target.value ? Number(e.target.value) : null)}
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 text-sm">
                                <option value="">-- Pilih Kelas --</option>
                                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>

                        {students.length > 0 && (
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs text-slate-500">{students.length} siswa di kelas ini</span>
                                    <button type="button" onClick={toggleAll}
                                        className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1">
                                        <CheckSquare size={14} /> {selectAll ? 'Batal Semua' : 'Pilih Semua'}
                                    </button>
                                </div>
                                <div className="max-h-[400px] overflow-y-auto space-y-1 border border-slate-100 rounded-xl p-2">
                                    {students.map(s => (
                                        <label key={s.id}
                                            className={clsx("flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition",
                                                selectedStudentIDs.includes(s.id) ? "bg-blue-50 border border-blue-200" : "hover:bg-slate-50 border border-transparent")}>
                                            <input type="checkbox" checked={selectedStudentIDs.includes(s.id)}
                                                onChange={() => toggleStudent(s.id)}
                                                className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500" />
                                            <div>
                                                <p className="text-sm font-medium text-slate-800">{s.user?.name || '-'}</p>
                                                <p className="text-xs text-slate-500">{s.nisn || 'No NISN'}</p>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}

                        {!selectedClassID && (
                            <div className="text-center py-8">
                                <GraduationCap size={40} className="mx-auto text-slate-300 mb-2" />
                                <p className="text-sm text-slate-500">Pilih kelas untuk menampilkan daftar siswa</p>
                            </div>
                        )}

                        {selectedClassID && students.length === 0 && (
                            <div className="text-center py-6">
                                <p className="text-sm text-slate-500">Tidak ada siswa di kelas ini</p>
                            </div>
                        )}
                    </div>
                </div>
            </form>

            {/* Save Template Modal */}
            {showSaveTemplateModal && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden border border-slate-200">
                        <div className="p-5 border-b border-slate-100 bg-slate-50">
                            <h2 className="text-lg font-bold text-slate-800">Simpan Template Tagihan</h2>
                            <p className="text-xs text-slate-500 mt-1">Simpan isian form ini untuk digunakan kembali nantinya.</p>
                        </div>
                        <form onSubmit={handleSaveTemplate} className="p-5 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Nama Template</label>
                                <input
                                    type="text"
                                    value={newTemplateName}
                                    onChange={(e) => setNewTemplateName(e.target.value)}
                                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500"
                                    placeholder="Contoh: SPP Bulanan Kelas 7"
                                    required
                                />
                            </div>
                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-6">
                                <button type="button" onClick={() => setShowSaveTemplateModal(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-xl border border-slate-200 transition">
                                    Batal
                                </button>
                                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition">
                                    Simpan Template
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BillTemplates;
