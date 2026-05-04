import React, { useState, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import api from '../../services/api';
import {
    Upload, FileText, Download, CheckCircle, XCircle,
    AlertCircle, Users, Eye, Play, X, FileSpreadsheet, Info, Loader2
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

const ROLE_MAP: Record<string, string> = {
    '1': 'Super Admin', '4': 'Guru', '5': 'Wali Kelas',
    '6': 'Siswa', '7': 'Orang Tua', '9': 'Bendahara',
    '10': 'Teller Tabungan', '11': 'Teller Infaq',
};

const getRoleName = (roleId: string) => ROLE_MAP[roleId] || roleId || '-';

// ─── Component ────────────────────────────────────────────────────────────────

const BulkImport: React.FC = () => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [fileName, setFileName] = useState<string | null>(null);
    const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
    const [importResult, setImportResult] = useState<BulkImportResult | null>(null);
    const [showRoleRef, setShowRoleRef] = useState(false);
    const [importProgress, setImportProgress] = useState(0);
    const [isImporting, setIsImporting] = useState(false);

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
                // Offset row numbers for errors in this batch
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

    // ─── Render ────────────────────────────────────────────────────────────────

    return (
        <div className="space-y-6 pb-20">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Bulk Import Akun</h1>
                    <p className="text-slate-500 text-sm mt-1">
                        Buat banyak akun pengguna sekaligus melalui file CSV atau Excel (.xlsx)
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <ButtonGlass
                        variant="secondary"
                        icon={Info}
                        onClick={() => setShowRoleRef(!showRoleRef)}
                    >
                        Role ID
                    </ButtonGlass>
                    <ButtonGlass
                        variant="secondary"
                        icon={Download}
                        onClick={() => downloadXLSXTemplate()}
                    >
                        Download Template (.xlsx)
                    </ButtonGlass>
                </div>
            </div>

            {/* Role ID Reference */}
            {showRoleRef && (
                <CardGlass>
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <Info size={18} className="text-blue-600" />
                            <h2 className="font-semibold text-slate-900 text-sm">Referensi Role ID</h2>
                        </div>
                        <button onClick={() => setShowRoleRef(false)} className="text-slate-400 hover:text-red-500">
                            <X size={16} />
                        </button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                        {Object.entries(ROLE_MAP).map(([id, name]) => (
                            <div key={id} className="flex items-center gap-2 bg-white/20 rounded-lg px-3 py-2">
                                <span className="px-2 py-0.5 rounded-full text-xs bg-purple-100 text-purple-700 font-bold">
                                    {id}
                                </span>
                                <span className="text-slate-700 text-sm">{name}</span>
                            </div>
                        ))}
                    </div>
                    <p className="text-xs text-slate-400 mt-2">
                        * Untuk role Siswa (6), field <strong>nisn</strong> dan <strong>class_id</strong> wajib diisi.
                    </p>
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
                            Kolom: name, email, password, role_id, unit_id, nisn (opsional), class_id (opsional)
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
                                    <TableHeadGlass>Class ID</TableHeadGlass>
                                </TableRowGlass>
                            </TableHeaderGlass>
                            <TableBodyGlass>
                                {parsedRows.map((row) => (
                                    <TableRowGlass key={row.row}>
                                        <TableCellGlass className="text-slate-400">{row.row}</TableCellGlass>
                                        <TableCellGlass>
                                            <span className={!row.name ? 'text-red-500 italic' : ''}>
                                                {row.name || '(kosong)'}
                                            </span>
                                        </TableCellGlass>
                                        <TableCellGlass>
                                            <span className={!row.email ? 'text-red-500 italic' : ''}>
                                                {row.email || '(kosong)'}
                                            </span>
                                        </TableCellGlass>
                                        <TableCellGlass>
                                            <span className="px-2 py-0.5 rounded-full text-xs bg-purple-100 text-purple-700">
                                                {getRoleName(row.role_id)}
                                            </span>
                                        </TableCellGlass>
                                        <TableCellGlass>{row.unit_id || '-'}</TableCellGlass>
                                        <TableCellGlass>{row.nisn || '-'}</TableCellGlass>
                                        <TableCellGlass>{row.class_id || '-'}</TableCellGlass>
                                    </TableRowGlass>
                                ))}
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
