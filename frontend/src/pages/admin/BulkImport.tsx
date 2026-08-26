import React, { useState, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '../../services/api';
import {
    Upload, FileText, Download, CheckCircle, XCircle,
    AlertCircle, Users, Eye, Play, X, FileSpreadsheet, Info, Loader2,
    GraduationCap, Copy, Check, Search, Layers
} from 'lucide-react';
import CardGlass from '../../components/ui/glass/CardGlass';
import ButtonGlass from '../../components/ui/glass/ButtonGlass';
import {
    TableGlass, TableHeaderGlass, TableBodyGlass,
    TableRowGlass, TableHeadGlass, TableCellGlass
} from '../../components/ui/glass/TableGlass';
import toast from 'react-hot-toast';
import {
    parseImportFile, downloadXLSXTemplate, isValidImportFile,
    type ParsedRow
} from '../../utils/importUtils';
import { useUnits } from '../../hooks/useUnits';
import type { Class } from '../../types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface BulkImportRowError {
    row: number;
    email: string;
    reason: string;
}

interface BulkImportResult {
    total_rows: number;
    success: number;
    failed: number;
    errors: BulkImportRowError[];
}

const ROLE_MAP: Record<string, { name: string; desc: string; studentReq?: boolean }> = {
    '1': { name: 'Super Admin', desc: 'Akses penuh ke semua modul sistem' },
    '4': { name: 'Guru', desc: 'Akses modul akademik & nilai' },
    '5': { name: 'Wali Kelas', desc: 'Akses nilai, absensi, & siswa binaan' },
    '6': { name: 'Siswa', desc: 'Wajib mencantumkan NISN & Class ID', studentReq: true },
    '7': { name: 'Orang Tua', desc: 'Akses portal tagihan & perkembangan santri' },
    '9': { name: 'Bendahara', desc: 'Akses penuh transaksi & laporan keuangan' },
    '10': { name: 'Teller Tabungan', desc: 'Akses setoran/penarikan tabungan' },
    '11': { name: 'Teller Transaksional', desc: 'Akses pembayaran tagihan harian' },
};

const getRoleName = (roleId: string) => ROLE_MAP[roleId]?.name || roleId || '-';

// ─── Component ────────────────────────────────────────────────────────────────

const BulkImport: React.FC = () => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { units, getUnitName } = useUnits();

    // Fetch classes for reference and preview validation
    const { data: classes = [], isLoading: isLoadingClasses } = useQuery<Class[]>({
        queryKey: ['all-classes-bulk-import'],
        queryFn: async () => (await api.get('/academic/classes')).data || [],
    });

    const [isDragging, setIsDragging] = useState(false);
    const [fileName, setFileName] = useState<string | null>(null);
    const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
    const [importResult, setImportResult] = useState<BulkImportResult | null>(null);
    const [showRoleRef, setShowRoleRef] = useState(false);
    const [showClassRef, setShowClassRef] = useState(true);
    const [classSearch, setClassSearch] = useState('');
    const [selectedUnitFilter, setSelectedUnitFilter] = useState<number | 'all'>('all');
    const [copiedClassId, setCopiedClassId] = useState<number | null>(null);
    const [copiedRoleId, setCopiedRoleId] = useState<string | null>(null);
    const [copiedUnitId, setCopiedUnitId] = useState<number | null>(null);
    const [importProgress, setImportProgress] = useState(0);
    const [isImporting, setIsImporting] = useState(false);

    // ── Copy helpers ───────────────────────────────────────────────────────────

    const handleCopy = (text: string, label: string, type: 'class' | 'role' | 'unit', id: number | string) => {
        navigator.clipboard.writeText(text);
        toast.success(`${label} disalin ke clipboard!`);
        if (type === 'class') {
            setCopiedClassId(id as number);
            setTimeout(() => setCopiedClassId(null), 2000);
        } else if (type === 'role') {
            setCopiedRoleId(id as string);
            setTimeout(() => setCopiedRoleId(null), 2000);
        } else if (type === 'unit') {
            setCopiedUnitId(id as number);
            setTimeout(() => setCopiedUnitId(null), 2000);
        }
    };

    // ── Filtered Classes ───────────────────────────────────────────────────────

    const filteredClasses = classes.filter(cls => {
        const matchesUnit = selectedUnitFilter === 'all' || cls.unit_id === selectedUnitFilter;
        const q = classSearch.toLowerCase().trim();
        if (!q) return matchesUnit;
        const unitName = (getUnitName(cls.unit_id) || '').toLowerCase();
        const teacherName = (cls.homeroom_teacher?.user?.name || '').toLowerCase();
        const name = cls.name.toLowerCase();
        const idStr = String(cls.id);
        return matchesUnit && (
            name.includes(q) || 
            idStr === q || 
            idStr.includes(q) || 
            unitName.includes(q) || 
            teacherName.includes(q)
        );
    });

    // ── File handling ──────────────────────────────────────────────────────────

    const handleFile = async (file: File) => {
        if (!isValidImportFile(file.name)) {
            toast.error('Format file tidak didukung. Gunakan file .csv atau .xlsx');
            return;
        }
        setFileName(file.name);
        setImportResult(null);
        setImportProgress(0);

        try {
            const rows = await parseImportFile(file);
            if (rows.length === 0) {
                toast.error('File kosong atau format tidak valid.');
                setParsedRows([]);
                return;
            }
            setParsedRows(rows);
            toast.success(`${rows.length} baris data berhasil dimuat.`);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Gagal membaca file.');
            setParsedRows([]);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleFile(file);
        e.target.value = '';
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) handleFile(file);
    };

    const handleClear = () => {
        if (isImporting) return;
        setFileName(null);
        setParsedRows([]);
        setImportResult(null);
        setImportProgress(0);
    };

    // ── Import mutation (Batching logic) ───────────────────────────────────────

    const batchMutation = useMutation({
        mutationFn: async (rows: ParsedRow[]) => {
            const payload = rows.map(r => ({
                name: r.name,
                email: r.email,
                password: r.password,
                role_id: parseInt(r.role_id, 10) || 0,
                unit_id: parseInt(r.unit_id, 10) || 0,
                nisn: r.nisn || undefined,
                class_id: r.class_id ? (parseInt(r.class_id, 10) || undefined) : undefined,
            }));
            const res = await api.post('/users/bulk', payload);
            return res.data as BulkImportResult;
        }
    });

    const handleProcessImport = async () => {
        if (parsedRows.length === 0 || isImporting) return;
        
        setIsImporting(true);
        setImportProgress(0);
        const initialResult: BulkImportResult = {
            total_rows: parsedRows.length,
            success: 0,
            failed: 0,
            errors: []
        };
        setImportResult(initialResult);

        const BATCH_SIZE = 50; // Aman untuk Bcrypt hashing tanpa timeout
        const totalRows = parsedRows.length;
        const totalBatches = Math.ceil(totalRows / BATCH_SIZE);

        let currentSuccess = 0;
        let currentFailed = 0;
        let currentErrors: BulkImportRowError[] = [];

        for (let i = 0; i < totalBatches; i++) {
            const start = i * BATCH_SIZE;
            const end = Math.min(start + BATCH_SIZE, totalRows);
            const batch = parsedRows.slice(start, end);

            try {
                const res = await batchMutation.mutateAsync(batch);
                currentSuccess += res.success;
                currentFailed += res.failed;
                currentErrors = [...currentErrors, ...res.errors];
                
                setImportResult({
                    total_rows: totalRows,
                    success: currentSuccess,
                    failed: currentFailed,
                    errors: currentErrors
                });
                setImportProgress(Math.round(((i + 1) / totalBatches) * 100));
            } catch (err: any) {
                const errorMsg = err.response?.data?.error || err.message || 'Unknown error';
                toast.error(`Batch ${i + 1} gagal: ${errorMsg}`);
                currentFailed += batch.length;
                currentErrors.push({
                    row: start + 1,
                    email: 'Batch Failure',
                    reason: `Koneksi terputus atau server error pada baris ${start + 1}-${end}`
                });
                setImportResult(prev => prev ? ({ ...prev, failed: currentFailed, errors: currentErrors }) : null);
            }
        }

        setIsImporting(false);
        if (currentFailed === 0) {
            toast.success('Import selesai! Semua akun berhasil dibuat.');
        } else {
            toast.error(`Import selesai dengan ${currentFailed} kegagalan.`);
        }
    };

    // ── Download failed rows report ───────────────────────────────────────────

    const handleDownloadErrorReport = () => {
        if (!importResult || importResult.errors.length === 0) return;
        
        const header = 'Baris,Email,Alasan Gagal\n';
        const rows = importResult.errors.map(e => `${e.row},"${e.email}","${e.reason}"`).join('\n');
        const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `error_report_${new Date().getTime()}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleDownloadTemplate = () => {
        const templateClasses = classes.map(c => ({
            id: c.id,
            name: c.name,
            unit_id: c.unit_id,
            unit_name: getUnitName(c.unit_id)
        }));
        const templateUnits = units.map(u => ({
            id: u.id,
            name: u.name
        }));
        downloadXLSXTemplate(templateClasses, templateUnits);
    };

    // ─── Render ────────────────────────────────────────────────────────────────

    return (
        <div className="space-y-6 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Bulk Import Akun</h1>
                    <p className="text-slate-500 text-sm mt-1">
                        Buat banyak akun pengguna sekaligus melalui file CSV atau Excel (.xlsx)
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <ButtonGlass
                        variant={showClassRef ? "primary" : "secondary"}
                        icon={GraduationCap}
                        onClick={() => setShowClassRef(!showClassRef)}
                    >
                        ID Kelas ({classes.length})
                    </ButtonGlass>
                    <ButtonGlass
                        variant={showRoleRef ? "primary" : "secondary"}
                        icon={Info}
                        onClick={() => setShowRoleRef(!showRoleRef)}
                    >
                        Role & Unit ID
                    </ButtonGlass>
                    <ButtonGlass
                        variant="secondary"
                        icon={Download}
                        onClick={handleDownloadTemplate}
                    >
                        Download Template (.xlsx)
                    </ButtonGlass>
                </div>
            </div>

            {/* Class ID Reference Section */}
            {showClassRef && (
                <CardGlass className="border-indigo-100 bg-white/70 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                                <GraduationCap size={20} />
                            </div>
                            <div>
                                <h2 className="font-bold text-slate-900 text-base">Referensi ID Kelas (class_id)</h2>
                                <p className="text-xs text-slate-500">
                                    Klik ID untuk menyalin. Wajib diisi pada kolom <code className="px-1.5 py-0.5 rounded bg-slate-100 font-mono text-purple-700">class_id</code> saat membuat akun Siswa (Role ID 6).
                                </p>
                            </div>
                        </div>
                        <button 
                            onClick={() => setShowClassRef(false)} 
                            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 self-end sm:self-center transition-colors"
                            title="Tutup Referensi ID Kelas"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {/* Filter & Search Bar */}
                    <div className="flex flex-col sm:flex-row gap-3 mb-4">
                        <div className="relative flex-1">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Cari nama kelas, ID, tingkat, wali kelas..."
                                value={classSearch}
                                onChange={(e) => setClassSearch(e.target.value)}
                                className="w-full pl-9 pr-8 py-2 text-sm rounded-xl border border-slate-200 bg-white/80 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                            />
                            {classSearch && (
                                <button
                                    onClick={() => setClassSearch('')}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                >
                                    <X size={14} />
                                </button>
                            )}
                        </div>

                        {/* Unit Filter Pills */}
                        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                            <button
                                onClick={() => setSelectedUnitFilter('all')}
                                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
                                    selectedUnitFilter === 'all'
                                        ? 'bg-indigo-600 text-white shadow-sm'
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                            >
                                Semua Unit ({classes.length})
                            </button>
                            {units.map((unit) => {
                                const count = classes.filter(c => c.unit_id === unit.id).length;
                                return (
                                    <button
                                        key={unit.id}
                                        onClick={() => setSelectedUnitFilter(unit.id)}
                                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
                                            selectedUnitFilter === unit.id
                                                ? 'bg-indigo-600 text-white shadow-sm'
                                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                        }`}
                                    >
                                        {unit.name} ({count})
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Classes Grid */}
                    {isLoadingClasses ? (
                        <div className="py-8 flex items-center justify-center gap-2 text-slate-400 text-sm">
                            <Loader2 size={18} className="animate-spin text-indigo-600" />
                            Memuat daftar kelas...
                        </div>
                    ) : filteredClasses.length === 0 ? (
                        <div className="py-8 text-center text-slate-400 text-sm bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                            {classSearch ? 'Tidak ada kelas yang sesuai dengan kata kunci pencarian.' : 'Belum ada data kelas yang terdaftar.'}
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5 max-h-[320px] overflow-y-auto pr-1">
                            {filteredClasses.map((cls) => {
                                const isCopied = copiedClassId === cls.id;
                                const unitName = getUnitName(cls.unit_id);
                                return (
                                    <div
                                        key={cls.id}
                                        onClick={() => handleCopy(String(cls.id), `ID Kelas ${cls.name} (${cls.id})`, 'class', cls.id)}
                                        className={`group relative p-2.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                                            isCopied
                                                ? 'bg-green-50/90 border-green-300 ring-2 ring-green-500/20'
                                                : 'bg-white/80 hover:bg-indigo-50/50 border-slate-200/80 hover:border-indigo-300 hover:shadow-sm'
                                        }`}
                                        title="Klik untuk menyalin ID Kelas"
                                    >
                                        <div className="flex items-center justify-between gap-1 mb-1.5">
                                            <span className={`px-2 py-0.5 rounded-md font-mono font-bold text-xs ${
                                                isCopied
                                                    ? 'bg-green-600 text-white'
                                                    : 'bg-indigo-100 text-indigo-800 group-hover:bg-indigo-600 group-hover:text-white'
                                            } transition-colors`}>
                                                ID: {cls.id}
                                            </span>
                                            {unitName && (
                                                <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 truncate max-w-[65px]">
                                                    {unitName}
                                                </span>
                                            )}
                                        </div>

                                        <div className="mb-2">
                                            <p className="font-bold text-slate-800 text-sm group-hover:text-indigo-700 transition-colors leading-tight">
                                                {cls.name}
                                            </p>
                                            {cls.homeroom_teacher?.user?.name && (
                                                <p className="text-[11px] text-slate-400 truncate mt-0.5" title={cls.homeroom_teacher.user.name}>
                                                    {cls.homeroom_teacher.user.name}
                                                </p>
                                            )}
                                        </div>

                                        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1.5 border-t border-slate-100/80">
                                            <span className="group-hover:text-indigo-600 text-[10px] font-medium">
                                                {isCopied ? 'Tersalin!' : 'Klik salin'}
                                            </span>
                                            {isCopied ? (
                                                <Check size={13} className="text-green-600 animate-in zoom-in-50" />
                                            ) : (
                                                <Copy size={13} className="text-slate-400 group-hover:text-indigo-600 transition-colors" />
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardGlass>
            )}

            {/* Role & Unit ID Reference */}
            {showRoleRef && (
                <CardGlass>
                    <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                            <Info size={18} className="text-blue-600" />
                            <h2 className="font-semibold text-slate-900 text-sm">Referensi Role ID & Unit ID</h2>
                        </div>
                        <button onClick={() => setShowRoleRef(false)} className="text-slate-400 hover:text-red-500 p-1 rounded-lg">
                            <X size={16} />
                        </button>
                    </div>

                    <div className="space-y-4">
                        {/* Role IDs */}
                        <div>
                            <div className="flex items-center gap-1.5 mb-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
                                <Users size={14} className="text-purple-600" />
                                Daftar Role ID
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                                {Object.entries(ROLE_MAP).map(([id, info]) => {
                                    const isCopied = copiedRoleId === id;
                                    return (
                                        <div 
                                            key={id} 
                                            onClick={() => handleCopy(id, `Role ID ${info.name} (${id})`, 'role', id)}
                                            className={`flex items-start justify-between gap-2 p-2.5 rounded-xl border cursor-pointer transition-all ${
                                                isCopied
                                                    ? 'bg-green-50 border-green-300'
                                                    : 'bg-white/40 hover:bg-white/80 border-slate-200/60 hover:border-purple-300'
                                            }`}
                                            title="Klik untuk menyalin Role ID"
                                        >
                                            <div className="flex items-start gap-2 min-w-0">
                                                <span className="px-2 py-0.5 rounded-md text-xs bg-purple-100 text-purple-700 font-mono font-bold shrink-0 mt-0.5">
                                                    {id}
                                                </span>
                                                <div className="min-w-0">
                                                    <p className="text-slate-800 text-xs font-semibold truncate">{info.name}</p>
                                                    <p className="text-[10px] text-slate-400 truncate">{info.desc}</p>
                                                </div>
                                            </div>
                                            {isCopied ? (
                                                <Check size={14} className="text-green-600 shrink-0 mt-1" />
                                            ) : (
                                                <Copy size={14} className="text-slate-300 hover:text-purple-600 shrink-0 mt-1" />
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Unit IDs */}
                        <div>
                            <div className="flex items-center gap-1.5 mb-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
                                <Layers size={14} className="text-indigo-600" />
                                Daftar Unit ID
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                                {units.map((unit) => {
                                    const isCopied = copiedUnitId === unit.id;
                                    return (
                                        <div
                                            key={unit.id}
                                            onClick={() => handleCopy(String(unit.id), `Unit ID ${unit.name} (${unit.id})`, 'unit', unit.id)}
                                            className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all ${
                                                isCopied
                                                    ? 'bg-green-50 border-green-300'
                                                    : 'bg-white/40 hover:bg-white/80 border-slate-200/60 hover:border-indigo-300'
                                            }`}
                                            title="Klik untuk menyalin Unit ID"
                                        >
                                            <div className="flex items-center gap-2">
                                                <span className="px-2 py-0.5 rounded-md text-xs bg-indigo-100 text-indigo-700 font-mono font-bold">
                                                    {unit.id}
                                                </span>
                                                <span className="text-slate-800 text-xs font-semibold">{unit.name}</span>
                                            </div>
                                            {isCopied ? (
                                                <Check size={14} className="text-green-600" />
                                            ) : (
                                                <Copy size={14} className="text-slate-300 hover:text-indigo-600" />
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <p className="text-xs text-slate-500 pt-2 border-t border-slate-100">
                            💡 <strong>Catatan:</strong> Untuk role Siswa (<code className="px-1 py-0.2 rounded bg-slate-100 text-purple-700 font-mono">role_id = 6</code>), kolom <code className="px-1 py-0.2 rounded bg-slate-100 text-purple-700 font-mono">nisn</code>, <code className="px-1 py-0.2 rounded bg-slate-100 text-purple-700 font-mono">unit_id</code>, dan <code className="px-1 py-0.2 rounded bg-slate-100 text-purple-700 font-mono">class_id</code> wajib diisi.
                        </p>
                    </div>
                </CardGlass>
            )}

            {/* Upload Area */}
            <CardGlass>
                <div className="flex items-center gap-2 mb-4">
                    <Upload size={20} className="text-purple-600" />
                    <h2 className="font-semibold text-slate-900">Upload File</h2>
                </div>

                {!fileName ? (
                    <div
                        className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-colors ${
                            isDragging
                                ? 'border-purple-500 bg-purple-50'
                                : 'border-white/30 hover:border-purple-400 hover:bg-white/10'
                        }`}
                        onClick={() => fileInputRef.current?.click()}
                        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={handleDrop}
                    >
                        <FileSpreadsheet size={40} className="mx-auto mb-3 text-slate-400" />
                        <p className="text-slate-600 font-medium">
                            Klik atau seret file ke sini
                        </p>
                        <p className="text-slate-400 text-sm mt-1">
                            Format yang didukung: <strong>.csv</strong> dan <strong>.xlsx</strong> (Excel)
                        </p>
                        <p className="text-slate-400 text-xs mt-2">
                            Kolom: <code className="text-purple-600 font-mono">name, email, password, role_id, unit_id, nisn, class_id</code>
                        </p>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".csv,.xlsx"
                            className="hidden"
                            onChange={handleFileChange}
                        />
                    </div>
                ) : (
                    <div className="flex items-center justify-between bg-white/10 rounded-xl px-4 py-3">
                        <div className="flex items-center gap-3">
                            {fileName.endsWith('.xlsx') ? (
                                <FileSpreadsheet size={20} className="text-green-600" />
                            ) : (
                                <FileText size={20} className="text-purple-600" />
                            )}
                            <span className="text-slate-800 font-medium truncate max-w-[200px]">{fileName}</span>
                            <span className="text-slate-500 text-sm">
                                ({parsedRows.length} baris data)
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                fileName.endsWith('.xlsx')
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-blue-100 text-blue-700'
                            }`}>
                                {fileName.endsWith('.xlsx') ? 'XLSX' : 'CSV'}
                            </span>
                        </div>
                        {!isImporting && (
                            <button
                                onClick={handleClear}
                                className="text-slate-400 hover:text-red-500 transition-colors"
                            >
                                <X size={18} />
                            </button>
                        )}
                    </div>
                )}
            </CardGlass>

            {/* Progress Bar (During Import) */}
            {isImporting && (
                <CardGlass className="border-purple-200">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 text-purple-700 font-semibold text-sm">
                            <Loader2 size={16} className="animate-spin" />
                            Mengimport Data...
                        </div>
                        <span className="text-sm font-bold text-purple-700">{importProgress}%</span>
                    </div>
                    <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-300"
                            style={{ width: `${importProgress}%` }}
                        />
                    </div>
                    <p className="text-[11px] text-slate-400 mt-2 text-center italic">
                        Mohon jangan menutup halaman ini hingga proses selesai.
                    </p>
                </CardGlass>
            )}

            {/* Preview Table */}
            {parsedRows.length > 0 && !importResult && (
                <CardGlass>
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <Eye size={20} className="text-indigo-600" />
                            <h2 className="font-semibold text-slate-900">
                                Preview Data ({parsedRows.length} baris)
                            </h2>
                        </div>
                        <ButtonGlass
                            icon={isImporting ? Loader2 : Play}
                            onClick={handleProcessImport}
                            disabled={isImporting}
                            className={isImporting ? 'opacity-70' : ''}
                        >
                            {isImporting ? 'Memproses...' : 'Proses Import'}
                        </ButtonGlass>
                    </div>

                    <div className="max-h-[400px] overflow-y-auto rounded-xl border border-slate-100">
                        <TableGlass>
                            <TableHeaderGlass>
                                <TableRowGlass>
                                    <TableHeadGlass>#</TableHeadGlass>
                                    <TableHeadGlass>Nama</TableHeadGlass>
                                    <TableHeadGlass>Email</TableHeadGlass>
                                    <TableHeadGlass>Role</TableHeadGlass>
                                    <TableHeadGlass>Unit</TableHeadGlass>
                                    <TableHeadGlass>NISN</TableHeadGlass>
                                    <TableHeadGlass>Class ID (ID Kelas)</TableHeadGlass>
                                </TableRowGlass>
                            </TableHeaderGlass>
                            <TableBodyGlass>
                                {parsedRows.map((row) => {
                                    const matchedClass = row.class_id ? classes.find(c => String(c.id) === String(row.class_id)) : undefined;
                                    const unitName = row.unit_id ? getUnitName(parseInt(row.unit_id, 10)) : undefined;
                                    const isStudent = row.role_id === '6';
                                    
                                    return (
                                        <TableRowGlass key={row.row}>
                                            <TableCellGlass className="text-slate-400 font-mono text-xs">{row.row}</TableCellGlass>
                                            <TableCellGlass>
                                                <span className={!row.name ? 'text-red-500 italic' : 'font-medium text-slate-800'}>
                                                    {row.name || '(kosong)'}
                                                </span>
                                            </TableCellGlass>
                                            <TableCellGlass>
                                                <span className={!row.email ? 'text-red-500 italic' : 'text-slate-600'}>
                                                    {row.email || '(kosong)'}
                                                </span>
                                            </TableCellGlass>
                                            <TableCellGlass>
                                                <span className="px-2 py-0.5 rounded-full text-xs bg-purple-100 text-purple-700 font-medium">
                                                    {getRoleName(row.role_id)}
                                                </span>
                                            </TableCellGlass>
                                            <TableCellGlass>
                                                {row.unit_id ? (
                                                    <span className="inline-flex items-center gap-1.5">
                                                        <span className="font-mono text-xs text-slate-500 font-semibold">{row.unit_id}</span>
                                                        {unitName && (
                                                            <span className="px-2 py-0.5 rounded-md text-xs bg-slate-100 text-slate-700 font-medium">
                                                                {unitName}
                                                            </span>
                                                        )}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-400">-</span>
                                                )}
                                            </TableCellGlass>
                                            <TableCellGlass className="font-mono text-xs text-slate-600">
                                                {row.nisn || (isStudent ? <span className="text-red-500 text-xs italic font-medium">Wajib diisi</span> : '-')}
                                            </TableCellGlass>
                                            <TableCellGlass>
                                                {(() => {
                                                    if (!row.class_id) {
                                                        if (isStudent) {
                                                            return (
                                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
                                                                    <AlertCircle size={12} />
                                                                    Wajib diisi (Siswa)
                                                                </span>
                                                            );
                                                        }
                                                        return <span className="text-slate-400">-</span>;
                                                    }
                                                    if (matchedClass) {
                                                        const classUnitName = getUnitName(matchedClass.unit_id);
                                                        return (
                                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                                <span className="px-2 py-0.5 rounded-md font-mono font-bold text-xs bg-indigo-100 text-indigo-800 border border-indigo-200">
                                                                    ID {row.class_id}
                                                                </span>
                                                                <span className="text-xs font-semibold text-slate-800">
                                                                    {matchedClass.name}
                                                                </span>
                                                                {classUnitName && (
                                                                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-500">
                                                                        {classUnitName}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        );
                                                    }
                                                    return (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
                                                            <AlertCircle size={12} />
                                                            ID {row.class_id} (Tidak Ditemukan)
                                                        </span>
                                                    );
                                                })()}
                                            </TableCellGlass>
                                        </TableRowGlass>
                                    );
                                })}
                            </TableBodyGlass>
                        </TableGlass>
                    </div>
                </CardGlass>
            )}

            {/* Import Results */}
            {importResult && (
                <CardGlass className={importResult.failed > 0 ? 'border-amber-200' : 'border-green-200'}>
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <Users size={20} className="text-indigo-600" />
                            <h2 className="font-semibold text-slate-900">Hasil Import</h2>
                        </div>
                        <div className="flex gap-2">
                            {importResult.errors.length > 0 && (
                                <ButtonGlass 
                                    variant="secondary" 
                                    icon={Download}
                                    onClick={handleDownloadErrorReport}
                                >
                                    Download Laporan Error
                                </ButtonGlass>
                            )}
                            <ButtonGlass variant="primary" onClick={handleClear} disabled={isImporting}>
                                Import Lagi
                            </ButtonGlass>
                        </div>
                    </div>

                    {/* Summary */}
                    <div className="grid grid-cols-3 gap-4 mb-6">
                        <div className="bg-slate-100/60 rounded-2xl p-4 text-center border border-slate-100">
                            <p className="text-2xl font-bold text-slate-700">{importResult.total_rows}</p>
                            <p className="text-sm text-slate-500 mt-1">Total Baris</p>
                        </div>
                        <div className="bg-green-50 rounded-2xl p-4 text-center border border-green-100">
                            <div className="flex items-center justify-center gap-1 mb-1">
                                <CheckCircle size={18} className="text-green-600" />
                                <p className="text-2xl font-bold text-green-700">{importResult.success}</p>
                            </div>
                            <p className="text-sm text-green-600">Berhasil</p>
                        </div>
                        <div className="bg-red-50 rounded-2xl p-4 text-center border border-red-100">
                            <div className="flex items-center justify-center gap-1 mb-1">
                                <XCircle size={18} className="text-red-500" />
                                <p className="text-2xl font-bold text-red-600">{importResult.failed}</p>
                            </div>
                            <p className="text-sm text-red-500">Gagal</p>
                        </div>
                    </div>

                    {/* Error Table */}
                    {importResult.errors.length > 0 && (
                        <div className="mt-4">
                            <div className="flex items-center gap-2 mb-3">
                                <AlertCircle size={16} className="text-amber-500" />
                                <h3 className="font-medium text-slate-700 text-sm">
                                    Detail Kegagalan ({importResult.errors.length} baris)
                                </h3>
                            </div>
                            <div className="max-h-[300px] overflow-y-auto rounded-xl border border-slate-100">
                                <TableGlass>
                                    <TableHeaderGlass>
                                        <TableRowGlass>
                                            <TableHeadGlass>Baris</TableHeadGlass>
                                            <TableHeadGlass>Identifier</TableHeadGlass>
                                            <TableHeadGlass>Alasan Gagal</TableHeadGlass>
                                        </TableRowGlass>
                                    </TableHeaderGlass>
                                    <TableBodyGlass>
                                        {importResult.errors.map((err, idx) => (
                                            <TableRowGlass key={idx}>
                                                <TableCellGlass>
                                                    <span className="px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-600 font-medium">
                                                        #{err.row}
                                                    </span>
                                                </TableCellGlass>
                                                <TableCellGlass className="text-slate-600">
                                                    {err.email || '-'}
                                                </TableCellGlass>
                                                <TableCellGlass>
                                                    <span className="text-red-600 text-sm">{err.reason}</span>
                                                </TableCellGlass>
                                            </TableRowGlass>
                                        ))}
                                    </TableBodyGlass>
                                </TableGlass>
                            </div>
                        </div>
                    )}

                    {importResult.failed === 0 && !isImporting && (
                        <div className="flex items-center gap-2 text-green-600 bg-green-50 rounded-xl px-4 py-3 border border-green-100">
                            <CheckCircle size={18} />
                            <span className="text-sm font-medium">
                                Sempurna! Semua {importResult.success} akun berhasil dibuat tanpa kendala.
                            </span>
                        </div>
                    )}
                </CardGlass>
            )}
        </div>
    );
};

export default BulkImport;
