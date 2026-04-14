import React, { useState, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import api from '../../services/api';
import {
    Upload, FileText, Download, CheckCircle, XCircle,
    AlertCircle, Users, Eye, Play, X
} from 'lucide-react';
import CardGlass from '../../components/ui/glass/CardGlass';
import ButtonGlass from '../../components/ui/glass/ButtonGlass';
import {
    TableGlass, TableHeaderGlass, TableBodyGlass,
    TableRowGlass, TableHeadGlass, TableCellGlass
} from '../../components/ui/glass/TableGlass';
import toast from 'react-hot-toast';
import { parseCSV, downloadCSVTemplate, type ParsedRow } from '../../utils/csvUtils';

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

const getRoleName = (roleId: string) => {
    const m: Record<string, string> = {
        '1': 'Super Admin', '4': 'Guru', '5': 'Wali Kelas',
        '6': 'Siswa', '7': 'Orang Tua', '9': 'Bendahara',
        '10': 'Teller Tabungan', '11': 'Teller Infaq',
    };
    return m[roleId] || roleId || '-';
};

// ─── Component ────────────────────────────────────────────────────────────────

const BulkImport: React.FC = () => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [fileName, setFileName] = useState<string | null>(null);
    const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
    const [importResult, setImportResult] = useState<BulkImportResult | null>(null);

    // ── File handling ──────────────────────────────────────────────────────────

    const handleFile = (file: File) => {
        if (!file.name.endsWith('.csv')) {
            toast.error('Hanya file CSV yang didukung.');
            return;
        }
        setFileName(file.name);
        setImportResult(null);

        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target?.result as string;
            const rows = parseCSV(text);
            if (rows.length === 0) {
                toast.error('File CSV kosong atau format tidak valid.');
                return;
            }
            setParsedRows(rows);
        };
        reader.readAsText(file);
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
        setFileName(null);
        setParsedRows([]);
        setImportResult(null);
    };

    // ── Import mutation ────────────────────────────────────────────────────────

    const importMutation = useMutation({
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
        },
        onSuccess: (result) => {
            setImportResult(result);
            if (result.failed === 0) {
                toast.success(`${result.success} akun berhasil dibuat.`);
            } else {
                toast.success(
                    `${result.success} akun berhasil dibuat, ${result.failed} akun gagal.`
                );
            }
        },
    });

    const handleProcessImport = () => {
        if (parsedRows.length === 0) return;
        importMutation.mutate(parsedRows);
    };

    // ── Download template ──────────────────────────────────────────────────────

    const handleDownloadTemplate = () => {
        downloadCSVTemplate();
    };

    // ─── Render ────────────────────────────────────────────────────────────────

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Bulk Import Akun</h1>
                    <p className="text-slate-500 text-sm mt-1">
                        Buat banyak akun pengguna sekaligus melalui file CSV
                    </p>
                </div>
                <ButtonGlass
                    variant="secondary"
                    icon={Download}
                    onClick={handleDownloadTemplate}
                >
                    Download Template
                </ButtonGlass>
            </div>

            {/* Upload Area */}
            <CardGlass>
                <div className="flex items-center gap-2 mb-4">
                    <Upload size={20} className="text-purple-600" />
                    <h2 className="font-semibold text-slate-900">Upload File CSV</h2>
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
                        <FileText size={40} className="mx-auto mb-3 text-slate-400" />
                        <p className="text-slate-600 font-medium">
                            Klik atau seret file CSV ke sini
                        </p>
                        <p className="text-slate-400 text-sm mt-1">
                            Format: name, email, password, role_id, unit_id, nisn (opsional), class_id (opsional)
                        </p>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".csv"
                            className="hidden"
                            onChange={handleFileChange}
                        />
                    </div>
                ) : (
                    <div className="flex items-center justify-between bg-white/10 rounded-xl px-4 py-3">
                        <div className="flex items-center gap-3">
                            <FileText size={20} className="text-purple-600" />
                            <span className="text-slate-800 font-medium">{fileName}</span>
                            <span className="text-slate-500 text-sm">
                                ({parsedRows.length} baris data)
                            </span>
                        </div>
                        <button
                            onClick={handleClear}
                            className="text-slate-400 hover:text-red-500 transition-colors"
                        >
                            <X size={18} />
                        </button>
                    </div>
                )}
            </CardGlass>

            {/* Preview Table */}
            {parsedRows.length > 0 && (
                <CardGlass>
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <Eye size={20} className="text-indigo-600" />
                            <h2 className="font-semibold text-slate-900">
                                Preview Data ({parsedRows.length} baris)
                            </h2>
                        </div>
                        <ButtonGlass
                            icon={Play}
                            onClick={handleProcessImport}
                            disabled={importMutation.isPending}
                        >
                            {importMutation.isPending ? 'Memproses...' : 'Proses Import'}
                        </ButtonGlass>
                    </div>

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
                </CardGlass>
            )}

            {/* Import Results */}
            {importResult && (
                <CardGlass>
                    <div className="flex items-center gap-2 mb-4">
                        <Users size={20} className="text-green-600" />
                        <h2 className="font-semibold text-slate-900">Hasil Import</h2>
                    </div>

                    {/* Summary */}
                    <div className="grid grid-cols-3 gap-4 mb-6">
                        <div className="bg-slate-100/60 rounded-2xl p-4 text-center">
                            <p className="text-2xl font-bold text-slate-700">{importResult.total_rows}</p>
                            <p className="text-sm text-slate-500 mt-1">Total Baris</p>
                        </div>
                        <div className="bg-green-50 rounded-2xl p-4 text-center">
                            <div className="flex items-center justify-center gap-1 mb-1">
                                <CheckCircle size={18} className="text-green-600" />
                                <p className="text-2xl font-bold text-green-700">{importResult.success}</p>
                            </div>
                            <p className="text-sm text-green-600">Berhasil</p>
                        </div>
                        <div className="bg-red-50 rounded-2xl p-4 text-center">
                            <div className="flex items-center justify-center gap-1 mb-1">
                                <XCircle size={18} className="text-red-500" />
                                <p className="text-2xl font-bold text-red-600">{importResult.failed}</p>
                            </div>
                            <p className="text-sm text-red-500">Gagal</p>
                        </div>
                    </div>

                    {/* Error Table */}
                    {importResult.errors && importResult.errors.length > 0 && (
                        <>
                            <div className="flex items-center gap-2 mb-3">
                                <AlertCircle size={16} className="text-amber-500" />
                                <h3 className="font-medium text-slate-700 text-sm">
                                    Detail Baris Gagal ({importResult.errors.length} baris)
                                </h3>
                            </div>
                            <TableGlass>
                                <TableHeaderGlass>
                                    <TableRowGlass>
                                        <TableHeadGlass>Baris</TableHeadGlass>
                                        <TableHeadGlass>Email</TableHeadGlass>
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
                        </>
                    )}

                    {importResult.failed === 0 && (
                        <div className="flex items-center gap-2 text-green-600 bg-green-50 rounded-xl px-4 py-3">
                            <CheckCircle size={18} />
                            <span className="text-sm font-medium">
                                Semua {importResult.success} akun berhasil dibuat.
                            </span>
                        </div>
                    )}
                </CardGlass>
            )}
        </div>
    );
};

export default BulkImport;
