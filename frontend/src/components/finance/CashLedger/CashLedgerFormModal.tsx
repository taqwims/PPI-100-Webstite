import React, { useState, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../../services/api';
import toast from 'react-hot-toast';
import { Briefcase, Tag, UserCheck, FileText, Search, Layers, ArrowRight, CheckCircle2, Info, Plus, Upload, Image as ImageIcon, Trash2, Loader2 } from 'lucide-react';
import clsx from 'clsx';
import { StaffUser, TransactionCode, CashLedgerEntry, BudgetComponent } from '../../../types/cashLedgerTypes';

interface Props {
  showModal: boolean;
  setShowModal: (val: boolean) => void;
  editingEntry: CashLedgerEntry | null;
  setEditingEntry: (val: CashLedgerEntry | null) => void;
  formData: any;
  setFormData: (val: any) => void;
  submitting: boolean;
  handleSubmit: (e: React.FormEvent) => void;
  handleInput: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  handleTransactionCodeChange: (codeId: string) => void;
  transactionCodes: TransactionCode[];
  staffList: StaffUser[];
}

const CashLedgerFormModal: React.FC<Props> = ({
  showModal, setShowModal,
  editingEntry, setEditingEntry,
  formData, setFormData,
  submitting, handleSubmit, handleInput,
  handleTransactionCodeChange,
  transactionCodes, staffList
}) => {
  const [codeSearch, setCodeSearch] = useState('');
  const [showAllTypes, setShowAllTypes] = useState(false);

  // Fetch admin budget-categories
  const { data: budgetCategories = [], refetch: refetchBudgetCategories } = useQuery<{ id: number; name: string }[]>({
    queryKey: ['budget-categories'],
    queryFn: async () => (await api.get('/finance/budget-categories')).data || [],
    enabled: showModal,
  });

  // Fetch admin budget-components
  const { data: allComponents = [], refetch: refetchComponents } = useQuery<BudgetComponent[]>({
    queryKey: ['budget-components'],
    queryFn: async () => (await api.get('/finance/budget-components')).data || [],
    enabled: showModal,
  });

  const [showAddComponent, setShowAddComponent] = useState(false);
  const [newComponentName, setNewComponentName] = useState('');
  const [addingComponent, setAddingComponent] = useState(false);

  // File upload state for proof
  const [uploadingProof, setUploadingProof] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const selectedCatObj = useMemo(() => {
    if (!formData.category) return null;
    return budgetCategories.find(c => c.name.trim().toLowerCase() === formData.category.trim().toLowerCase()) || null;
  }, [budgetCategories, formData.category]);

  const filteredComponents = useMemo(() => {
    if (!formData.category) return [];
    const catId = selectedCatObj?.id;
    const comps = allComponents.filter(c => {
      if (catId && c.category_id === catId) return true;
      if (c.category && c.category.name.trim().toLowerCase() === formData.category.trim().toLowerCase()) return true;
      return false;
    });
    const set = new Set<string>();
    comps.forEach(c => { if (c.name) set.add(c.name.trim()); });
    if (formData.component) set.add(formData.component.trim());
    return Array.from(set).filter(Boolean).sort((a, b) => a.localeCompare(b));
  }, [allComponents, selectedCatObj, formData.category, formData.component]);

  const handleCreateComponent = async () => {
    if (!newComponentName.trim() || !formData.category) return;
    setAddingComponent(true);
    try {
      let catId = selectedCatObj?.id;
      if (!catId) {
        const resCat = await api.post('/finance/budget-categories', {
          name: formData.category.trim(),
          description: 'Dibuat otomatis dari BKU'
        });
        catId = resCat.data?.id;
        await refetchBudgetCategories();
      }
      if (catId) {
        await api.post('/finance/budget-components', {
          category_id: catId,
          name: newComponentName.trim(),
          description: 'Ditambahkan dari Modal BKU'
        });
        await refetchComponents();
        setFormData((prev: any) => ({ ...prev, component: newComponentName.trim() }));
        setNewComponentName('');
        setShowAddComponent(false);
        toast.success('Komponen baru berhasil ditambahkan');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Gagal menambahkan komponen');
    } finally {
      setAddingComponent(false);
    }
  };

  const handleDeleteSelectedComponent = async () => {
    if (!formData.component) return;
    const targetComp = allComponents.find(c =>
      c.name.trim().toLowerCase() === formData.component.trim().toLowerCase() &&
      (!selectedCatObj || c.category_id === selectedCatObj.id || c.category?.name.trim().toLowerCase() === formData.category.trim().toLowerCase())
    );
    if (!targetComp) {
      // Just clear from form
      setFormData((prev: any) => ({ ...prev, component: '' }));
      return;
    }
    if (confirm(`Hapus komponen "${formData.component}" dari daftar anggaran?`)) {
      try {
        await api.delete(`/finance/budget-components/${targetComp.id}`);
        await refetchComponents();
        setFormData((prev: any) => ({ ...prev, component: '' }));
        toast.success('Komponen berhasil dihapus');
      } catch (err: any) {
        toast.error(err.response?.data?.error || 'Gagal menghapus komponen');
      }
    }
  };

  const handleDeleteSelectedCategory = async () => {
    if (!selectedCatObj) {
      setFormData((prev: any) => ({ ...prev, category: '', component: '' }));
      return;
    }
    if (confirm(`Hapus kategori "${selectedCatObj.name}" dan semua komponen di dalamnya?`)) {
      try {
        await api.delete(`/finance/budget-categories/${selectedCatObj.id}`);
        await refetchBudgetCategories();
        await refetchComponents();
        setFormData((prev: any) => ({ ...prev, category: '', component: '' }));
        toast.success('Kategori berhasil dihapus');
      } catch (err: any) {
        toast.error(err.response?.data?.error || 'Gagal menghapus kategori');
      }
    }
  };

  const handleProofUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Hanya file gambar yang diperbolehkan');
      return;
    }

    const uploadFormData = new FormData();
    uploadFormData.append('file', file);

    setUploadingProof(true);
    try {
      const res = await api.post('/finance/cash-ledger/upload-proof', uploadFormData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const url = res.data?.url;
      if (url) {
        setFormData((prev: any) => ({ ...prev, proof_url: url }));
        toast.success('Bukti transaksi berhasil diunggah!');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Gagal mengunggah bukti gambar');
    } finally {
      setUploadingProof(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const categoryOptions = useMemo(() => {
    const set = new Set<string>();
    const isIncome = formData.type === 'Income' || formData.type === 'Penerimaan';

    // Categories from transaction codes matching current type
    transactionCodes
      .filter(tc => {
        const tcIsIncome = tc.type === 'Income' || tc.type === 'Penerimaan';
        return isIncome ? tcIsIncome : !tcIsIncome;
      })
      .forEach(c => {
        if (c.category) set.add(c.category.trim());
      });

    // Budget categories
    budgetCategories.forEach(c => {
      const name = c.name?.trim();
      if (!name) return;
      const usedInOpposite = transactionCodes.some(tc => {
        const tcIsIncome = tc.type === 'Income' || tc.type === 'Penerimaan';
        const isOpposite = isIncome ? !tcIsIncome : tcIsIncome;
        return isOpposite && tc.category?.toLowerCase() === name.toLowerCase();
      });
      const usedInCurrent = transactionCodes.some(tc => {
        const tcIsIncome = tc.type === 'Income' || tc.type === 'Penerimaan';
        const isCurrent = isIncome ? tcIsIncome : !tcIsIncome;
        return isCurrent && tc.category?.toLowerCase() === name.toLowerCase();
      });
      if (usedInCurrent || !usedInOpposite) {
        set.add(name);
      }
    });

    if (formData.category) set.add(formData.category.trim());
    return Array.from(set).filter(Boolean).sort((a, b) => a.localeCompare(b));
  }, [budgetCategories, transactionCodes, formData.type, formData.category]);

  // Selected Transaction Code & its parent (if child)
  const selectedTC = useMemo(() => {
    if (!formData.transaction_code_id) return null;
    return transactionCodes.find(tc => String(tc.id) === String(formData.transaction_code_id)) || null;
  }, [formData.transaction_code_id, transactionCodes]);

  const parentTC = useMemo(() => {
    if (!selectedTC || !selectedTC.parent_code_id) return null;
    return transactionCodes.find(tc => tc.id === selectedTC.parent_code_id) || selectedTC.parent_code || null;
  }, [selectedTC, transactionCodes]);

  // Filter transaction codes based on active type and search term
  const matchingCodes = useMemo(() => {
    return transactionCodes.filter(tc => {
      if (!tc.is_active) return false;
      
      // Type matching unless showAllTypes is toggled
      if (!showAllTypes) {
        if (formData.type === 'Expense' && !(tc.type === 'Expense' || tc.type === 'Pengeluaran')) return false;
        if (formData.type === 'Income' && !(tc.type === 'Income' || tc.type === 'Penerimaan')) return false;
      }

      // Search matching
      if (codeSearch.trim()) {
        const q = codeSearch.toLowerCase();
        const matchesSelf = tc.code.toLowerCase().includes(q) ||
                            tc.name.toLowerCase().includes(q) ||
                            tc.category.toLowerCase().includes(q) ||
                            (tc.description && tc.description.toLowerCase().includes(q));
        return matchesSelf;
      }

      return true;
    });
  }, [transactionCodes, formData.type, showAllTypes, codeSearch]);

  // Relevant master codes that either match or have matching children
  const relevantMasters = useMemo(() => {
    const matchingIds = new Set(matchingCodes.map(c => c.id));
    return transactionCodes.filter(tc => {
      if (!tc.is_active || tc.parent_code_id) return false;
      // If master itself matches
      if (matchingIds.has(tc.id)) return true;
      // If any child matches
      const hasMatchingChild = transactionCodes.some(c => c.parent_code_id === tc.id && matchingIds.has(c.id));
      return hasMatchingChild;
    });
  }, [transactionCodes, matchingCodes]);

  if (!showModal) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 animate-in fade-in duration-200">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[92vh] overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4.5 border-b border-slate-100 flex justify-between items-center bg-slate-50/90 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shadow-2xs">
                        <Briefcase size={20} />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-slate-800">
                            {editingEntry ? 'Edit Transaksi Kas' : 'Input Transaksi Kas Baru'}
                        </h2>
                        <p className="text-xs text-slate-500">
                            {editingEntry ? 'Perbarui data entri buku kas umum' : 'Catat penerimaan atau pengeluaran dana sekolah'}
                        </p>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={() => { setShowModal(false); setEditingEntry(null); }}
                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                    ✕
                </button>
            </div>

            {/* Modal Form Content */}
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* SECTION 1: Jenis Transaksi & Pos Anggaran */}
                    <div className="space-y-4 p-4.5 rounded-2xl bg-slate-50/80 border border-slate-200/90 shadow-2xs">
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                                Jenis Transaksi Kas <span className="text-red-500">*</span>
                            </label>
                            <div className="grid grid-cols-2 gap-2 bg-slate-200/70 p-1 rounded-xl">
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, type: 'Income', responsible_id: '' })}
                                    className={clsx(
                                        "py-2 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer",
                                        formData.type === 'Income'
                                            ? "bg-white text-emerald-700 shadow-sm border border-emerald-100"
                                            : "text-slate-600 hover:text-slate-800"
                                    )}
                                >
                                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                                    Pemasukan
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, type: 'Expense' })}
                                    className={clsx(
                                        "py-2 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer",
                                        formData.type === 'Expense'
                                            ? "bg-white text-rose-700 shadow-sm border border-rose-100"
                                            : "text-slate-600 hover:text-slate-800"
                                    )}
                                >
                                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                                    Pengeluaran
                                </button>
                            </div>
                        </div>

                        {/* Pos Akun / Kode Transaksi (RKAS) */}
                        <div className="space-y-2 pt-2 border-t border-slate-200/60">
                            <div className="flex justify-between items-center">
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                                    <span className="flex items-center gap-1.5"><Tag size={13} className="text-blue-600" /> Pos Akun / Kode Transaksi (RKAS)</span>
                                </label>
                                <button
                                    type="button"
                                    onClick={() => setShowAllTypes(!showAllTypes)}
                                    className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold transition cursor-pointer"
                                >
                                    {showAllTypes ? '✓ Filter Sesuai Jenis' : 'Tampilkan Semua Pos'}
                                </button>
                            </div>

                            <div className="relative">
                                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Cari kode atau nama pos anggaran (contoh: listrik, ATK, gaji)..."
                                    value={codeSearch}
                                    onChange={e => setCodeSearch(e.target.value)}
                                    className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition shadow-2xs"
                                />
                                {codeSearch && (
                                    <button
                                        type="button"
                                        onClick={() => setCodeSearch('')}
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>

                            <select
                                name="transaction_code_id"
                                value={formData.transaction_code_id}
                                onChange={e => handleTransactionCodeChange(e.target.value)}
                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 text-sm font-medium bg-white shadow-2xs"
                            >
                                <option value="">-- Pilih Pos Akun / Kode Transaksi --</option>
                                {relevantMasters.map(master => {
                                    const children = matchingCodes.filter(c => c.parent_code_id === master.id && c.is_active);
                                    return (
                                        <React.Fragment key={master.id}>
                                            <option value={master.id}>
                                                📁 [{master.code}] {master.name} (Induk - {master.category})
                                            </option>
                                            {children.map(child => (
                                                <option key={child.id} value={child.id}>
                                                    &nbsp;&nbsp;&nbsp;&nbsp;↳ 📄 [{child.code}] {child.name}
                                                </option>
                                            ))}
                                        </React.Fragment>
                                    );
                                })}
                            </select>

                            {/* Selected Hierarchy & Path Breakdown */}
                            {selectedTC ? (
                                selectedTC.parent_code_id ? (
                                    <div className="p-3 bg-blue-50 border border-blue-200/90 rounded-xl text-xs space-y-1.5 shadow-2xs">
                                        <div className="flex items-center gap-1.5 font-bold text-blue-900">
                                            <Layers size={14} className="text-blue-600 shrink-0" />
                                            <span>Jalur Aliran Pos Anggaran:</span>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-1.5 text-slate-700 bg-white/90 p-2 rounded-lg border border-blue-100 font-medium">
                                            <span className="px-2 py-0.5 bg-slate-100 text-slate-800 rounded text-[11px] font-bold">
                                                📁 Induk: {parentTC ? `[${parentTC.code}] ${parentTC.name}` : `Pos Induk #${selectedTC.parent_code_id}`}
                                            </span>
                                            <ArrowRight size={12} className="text-blue-500 shrink-0" />
                                            <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-[11px] font-bold">
                                                📄 Sub-Pos: [${selectedTC.code}] ${selectedTC.name}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between pt-0.5 text-[11px] text-slate-600">
                                            <span>Kategori: <strong className="text-slate-800">{selectedTC.category}</strong></span>
                                            <span className="text-emerald-700 font-semibold flex items-center gap-1">
                                                <CheckCircle2 size={12} /> Otomatis Merealisasikan RKAS
                                            </span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs space-y-1 shadow-2xs">
                                        <div className="flex items-center gap-1.5 font-bold text-amber-900">
                                            <Info size={14} className="text-amber-600 shrink-0" />
                                            <span>Pos Akun Induk: [${selectedTC.code}] ${selectedTC.name} ({selectedTC.category})</span>
                                        </div>
                                        <p className="text-[11px] text-amber-800">
                                            Pos induk dipilih. Untuk pembukuan lebih rinci, Anda dapat memilih sub-pos bila tersedia.
                                        </p>
                                    </div>
                                )
                            ) : (
                                <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                                    <Info size={12} /> Pilih pos akun untuk menghubungkan transaksi kas ini dengan realisasi anggaran RKAS.
                                </p>
                            )}
                        </div>
                    </div>

                    {/* SECTION 2: Rincian Transaksi */}
                    <div className="space-y-4">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                            Rincian Transaksi
                        </h3>

                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                            <div className="sm:col-span-7">
                                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                    Nama Item / Keperluan <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    name="item_name"
                                    required
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 placeholder-slate-400 text-sm shadow-2xs"
                                    placeholder="Contoh: Pembayaran Listrik Gedung"
                                    value={formData.item_name}
                                    onChange={handleInput}
                                />
                            </div>

                            <div className="sm:col-span-5">
                                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                    Nominal (Rp) <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">Rp</span>
                                    <input
                                        type="number"
                                        name="amount"
                                        required
                                        min="1000"
                                        className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 placeholder-slate-400 font-semibold text-sm shadow-2xs text-slate-800"
                                        placeholder="0"
                                        value={formData.amount}
                                        onChange={handleInput}
                                    />
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                Sumber / Tujuan Dana <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                name="source"
                                required
                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 placeholder-slate-400 text-sm shadow-2xs"
                                placeholder="Pihak penerima (cth: PLN, Toko ATK) atau pemberi dana..."
                                value={formData.source}
                                onChange={handleInput}
                            />
                        </div>
                    </div>

                    {/* SECTION 3: Klasifikasi Kategori, Komponen & Penanggung Jawab */}
                    <div className="space-y-4">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                            Klasifikasi Anggaran & Penanggung Jawab
                        </h3>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Kategori */}
                            <div>
                                <div className="flex justify-between items-center mb-1.5">
                                    <label className="block text-xs font-semibold text-slate-700">
                                        🏷️ Kategori <span className="text-red-500">*</span>
                                    </label>
                                    {formData.category && selectedCatObj && (
                                        <button
                                            type="button"
                                            onClick={handleDeleteSelectedCategory}
                                            title={`Hapus kategori ${formData.category}`}
                                            className="text-[11px] text-red-500 hover:text-red-700 font-semibold flex items-center gap-1 transition cursor-pointer"
                                        >
                                            <Trash2 size={12} /> Hapus Kategori
                                        </button>
                                    )}
                                </div>
                                <select
                                    name="category"
                                    value={formData.category}
                                    onChange={(e) => {
                                        handleInput(e);
                                        setFormData((prev: any) => ({ ...prev, category: e.target.value, component: '' }));
                                    }}
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 text-sm bg-white shadow-2xs"
                                    required
                                >
                                    <option value="">-- Pilih Kategori --</option>
                                    {categoryOptions.map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                                <p className="text-[11px] text-slate-400 mt-1">Kategori induk pengeluaran/penerimaan</p>
                            </div>

                            {/* Komponen (Turunan Kategori) */}
                            <div>
                                <div className="flex justify-between items-center mb-1.5">
                                    <label className="block text-xs font-semibold text-slate-700">
                                        🧩 Komponen
                                    </label>
                                    <div className="flex items-center gap-2">
                                        {formData.component && (
                                            <button
                                                type="button"
                                                onClick={handleDeleteSelectedComponent}
                                                title={`Hapus komponen ${formData.component}`}
                                                className="text-[11px] text-red-500 hover:text-red-700 font-semibold flex items-center gap-1 transition cursor-pointer"
                                            >
                                                <Trash2 size={12} /> Hapus Komponen
                                            </button>
                                        )}
                                        {formData.category && !showAddComponent && (
                                            <button
                                                type="button"
                                                onClick={() => setShowAddComponent(true)}
                                                className="text-[11px] text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 transition cursor-pointer"
                                            >
                                                <Plus size={13} /> Tambah Baru
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {showAddComponent ? (
                                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl space-y-2 shadow-2xs">
                                        <label className="text-[11px] text-blue-900 font-bold block">
                                            Tambah Komponen untuk "{formData.category}"
                                        </label>
                                        <div className="flex gap-1.5">
                                            <input
                                                type="text"
                                                value={newComponentName}
                                                onChange={e => setNewComponentName(e.target.value)}
                                                placeholder="Nama komponen..."
                                                className="flex-1 px-3 py-1.5 bg-white border border-blue-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500"
                                                autoFocus
                                            />
                                            <button
                                                type="button"
                                                disabled={addingComponent || !newComponentName.trim()}
                                                onClick={handleCreateComponent}
                                                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 disabled:opacity-50 transition"
                                            >
                                                {addingComponent ? '...' : 'Simpan'}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => { setShowAddComponent(false); setNewComponentName(''); }}
                                                className="px-2 py-1.5 border border-slate-200 bg-white text-slate-600 rounded-lg text-xs hover:bg-slate-50 transition"
                                            >
                                                Batal
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <select
                                        name="component"
                                        value={formData.component || ''}
                                        onChange={handleInput}
                                        disabled={!formData.category}
                                        className={clsx(
                                            "w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:ring-2 focus:ring-blue-500 shadow-2xs",
                                            !formData.category && "bg-slate-50 text-slate-400 cursor-not-allowed"
                                        )}
                                    >
                                        <option value="">{formData.category ? '-- Pilih Komponen (Opsional) --' : '-- Pilih Kategori Dahulu --'}</option>
                                        {filteredComponents.map(comp => (
                                            <option key={comp} value={comp}>{comp}</option>
                                        ))}
                                    </select>
                                )}
                                <p className="text-[11px] text-slate-400 mt-1">Sub-komponen turunan dari kategori</p>
                            </div>

                            {/* Sumber Dana */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                    💰 Sumber Dana
                                </label>
                                <select
                                    name="fund_source"
                                    value={formData.fund_source}
                                    onChange={handleInput}
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 text-sm bg-white shadow-2xs"
                                >
                                    <option value="Kas Umum">Kas Umum</option>
                                    <option value="Infaq">Infaq</option>
                                    <option value="Tabungan Siswa">Tabungan Siswa</option>
                                </select>
                            </div>

                            {/* Penanggung Jawab - hanya untuk Expense */}
                            {formData.type === 'Expense' ? (
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                        <span className="flex items-center gap-1">
                                            <UserCheck size={13} className="text-blue-500" />
                                            Penanggung Jawab (Staff)
                                        </span>
                                    </label>
                                    <select
                                        name="responsible_id"
                                        value={formData.responsible_id}
                                        onChange={handleInput}
                                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 text-sm bg-white shadow-2xs"
                                    >
                                        <option value="">-- Pilih Penanggung Jawab --</option>
                                        {staffList.map(s => (
                                            <option key={s.id} value={s.id}>{s.name}</option>
                                        ))}
                                    </select>
                                </div>
                            ) : (
                                <div className="hidden sm:block" />
                            )}
                        </div>
                    </div>

                    {/* SECTION 4: Bukti Transaksi & Catatan */}
                    <div className="space-y-4">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                            Bukti Dokumen & Catatan
                        </h3>

                        {/* Upload Bukti */}
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                <span className="flex items-center gap-1.5">
                                    <ImageIcon size={14} className="text-blue-500" />
                                    Bukti Transaksi / Nota (Upload Gambar)
                                </span>
                            </label>

                            {formData.proof_url ? (
                                <div className="flex items-center justify-between p-3.5 border border-emerald-200 bg-emerald-50/60 rounded-2xl shadow-2xs">
                                    <div className="flex items-center gap-3">
                                        <img
                                            src={formData.proof_url}
                                            alt="Bukti"
                                            className="w-14 h-14 object-cover rounded-xl border border-emerald-300 shadow-2xs"
                                        />
                                        <div>
                                            <p className="text-xs font-bold text-emerald-800">Bukti Gambar Terlampir</p>
                                            <a
                                                href={formData.proof_url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="text-[11px] text-blue-600 hover:underline font-medium inline-block mt-0.5"
                                            >
                                                Lihat Gambar Ukuran Penuh
                                            </a>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setFormData((prev: any) => ({ ...prev, proof_url: '' }))}
                                        className="p-2 text-red-500 hover:bg-red-100 rounded-xl transition cursor-pointer"
                                        title="Hapus Bukti"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ) : (
                                <div className="relative">
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        onChange={handleProofUpload}
                                        className="hidden"
                                        id="bku-proof-upload"
                                        disabled={uploadingProof}
                                    />
                                    <label
                                        htmlFor="bku-proof-upload"
                                        className={clsx(
                                            "w-full flex flex-col items-center justify-center p-5 border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-2xl cursor-pointer bg-slate-50/50 hover:bg-blue-50/30 transition text-center shadow-2xs",
                                            uploadingProof && "opacity-60 cursor-not-allowed pointer-events-none"
                                        )}
                                    >
                                        {uploadingProof ? (
                                            <div className="flex items-center gap-2 text-blue-600 text-sm font-semibold py-2">
                                                <Loader2 size={18} className="animate-spin" />
                                                <span>Mengunggah ke Cloudflare R2 / Server...</span>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 mb-2">
                                                    <Upload size={18} />
                                                </div>
                                                <span className="text-xs font-bold text-slate-700">Klik untuk Unggah Foto Bukti / Struk</span>
                                                <span className="text-[11px] text-slate-400 mt-0.5">Format JPG, PNG, atau WebP (Tersimpan di Cloudflare R2)</span>
                                            </>
                                        )}
                                    </label>
                                </div>
                            )}
                        </div>

                        {/* Catatan */}
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Catatan Tambahan</label>
                            <div className="relative">
                                <FileText className="absolute left-3.5 top-3 text-slate-400" size={16} />
                                <textarea
                                    name="notes"
                                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 placeholder-slate-400 text-sm shadow-2xs"
                                    rows={2}
                                    placeholder="Nomor referensi kwitansi, rincian keperluan, dsb..."
                                    value={formData.notes}
                                    onChange={handleInput}
                                ></textarea>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Modal Footer */}
                <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/90 flex justify-end items-center gap-3 shrink-0">
                    <button
                        type="button"
                        onClick={() => { setShowModal(false); setEditingEntry(null); }}
                        className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-white transition text-sm cursor-pointer shadow-2xs"
                    >
                        Batal
                    </button>
                    <button
                        type="submit"
                        disabled={submitting}
                        className={clsx(
                            "px-6 py-2.5 rounded-xl text-white font-semibold transition flex items-center justify-center gap-2 shadow-sm text-sm cursor-pointer",
                            "bg-blue-600 hover:bg-blue-700 active:scale-[0.98]",
                            submitting && "opacity-50 cursor-not-allowed"
                        )}
                    >
                        {submitting ? (
                            <>
                                <Loader2 size={16} className="animate-spin" />
                                <span>Menyimpan...</span>
                            </>
                        ) : (
                            <span>{editingEntry ? 'Simpan Perubahan' : 'Simpan Transaksi'}</span>
                        )}
                    </button>
                </div>
            </form>
        </div>
    </div>
  );
};

export default CashLedgerFormModal;
