import React, { useState } from 'react';
import { 
    X, 
    BookOpen, 
    Layers, 
    ArrowRight, 
    TrendingDown, 
    TrendingUp, 
    HelpCircle, 
    Search, 
    CheckCircle2, 
    Building2, 
    Sparkles, 
    Info 
} from 'lucide-react';
import clsx from 'clsx';

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

interface QuickAction {
    keyword: string;
    label: string;
    module: string;
    flowType: 'Income' | 'Expense';
    suggestedPath: string;
    explanation: string;
    rkasEffect: string;
}

const QUICK_LOOKUP_DATA: QuickAction[] = [
    {
        keyword: 'atk kertas spidol pulpen buku tulis perlengkapan',
        label: 'Beli ATK / Alat Tulis Sekolah',
        module: 'Buku Kas Umum (BKU)',
        flowType: 'Expense',
        suggestedPath: '📁 Induk: Operasional Sekolah ➔ 📄 Anak: Belanja Alat Tulis & Cetak',
        explanation: 'Catat di Buku Kas Umum menu Pengeluaran. Pilih anak kode belanja ATK agar nota nota terkelompok rapi.',
        rkasEffect: 'Saldo Kas berkurang & Pagu Belanja RKAS pos ATK otomatis terealisasi.'
    },
    {
        keyword: 'listrik pln air pdam wifi internet telepon indihome',
        label: 'Bayar Tagihan Listrik / Air / Internet',
        module: 'Buku Kas Umum (BKU)',
        flowType: 'Expense',
        suggestedPath: '📁 Induk: Operasional Sekolah ➔ 📄 Anak: Daya & Jasa (Listrik/Air/Internet)',
        explanation: 'Gunakan jenis transaksi Pengeluaran, isi nominal sesuai tagihan resmi bulan bersangkutan.',
        rkasEffect: 'Realisasi anggaran belanja bulanan listrik/utilitas di RKAS otomatis bertambah.'
    },
    {
        keyword: 'gaji guru honor staf karyawan thr insentif wali kelas',
        label: 'Pembayaran Gaji Guru & Karyawan',
        module: 'Menu Penggajian (Payroll)',
        flowType: 'Expense',
        suggestedPath: '📁 Induk: Beban Personalia / Gaji ➔ 📄 Anak: Gaji Pokok & Tunjangan',
        explanation: 'Disarankan diproses melalui menu Penggajian. Saat status slip diset "Paid", transaksi otomatis tercatat di BKU!',
        rkasEffect: 'Otomatis mengurangi kas dan merealisasikan pos anggaran Belanja Gaji di RKAS tanpa perlu input manual dua kali.'
    },
    {
        keyword: 'spp dsp uang gedung seragam formulir pendaftaran siswa',
        label: 'Penerimaan Pembayaran Tagihan Siswa',
        module: 'Menu Pembayaran Siswa / Billing',
        flowType: 'Income',
        suggestedPath: '📁 Induk: Penerimaan Siswa ➔ 📄 Anak: Kode Sesuai Jenis Pembayaran (SPP, dll)',
        explanation: 'Input pembayaran pada menu Tagihan/Kewajiban Siswa. Sistem otomatis mencatat kuitansi dan status lunas.',
        rkasEffect: 'Otomatis menambah realisasi penerimaan RKAS pada pos pendapatan siswa terkait.'
    },
    {
        keyword: 'infaq jumat sedekah kotak amal sukarela santunan anak yatim',
        label: 'Penerimaan Infaq Harian / Kotak Amal',
        module: 'Menu Infaq Harian',
        flowType: 'Income',
        suggestedPath: '📁 Induk: Penerimaan Sumbangan/Infaq ➔ 📄 Anak: Infaq Harian / Jumat',
        explanation: 'Gunakan modul Infaq Harian per kelas atau umum. Menghasilkan rekap infaq yang rapi dan terukur.',
        rkasEffect: 'Menambah kas sekolah dan merealisasikan pos target penerimaan infaq di RKAS.'
    },
    {
        keyword: 'meja kursi lemari papan tulis proyektor renovasi gedung komputer laptop ac',
        label: 'Belanja Sarana Prasarana / Aset Modal',
        module: 'Buku Kas Umum (BKU) / Modul Aset',
        flowType: 'Expense',
        suggestedPath: '📁 Induk: Belanja Modal / Sarpras ➔ 📄 Anak: Pengadaan Aset / Inventaris',
        explanation: 'Catat pengeluaran di BKU dengan kode sarpras, lalu daftarkan barang tersebut ke Modul Manajemen Aset.',
        rkasEffect: 'Pagu belanja modal sarana prasarana di RKAS langsung terealisasi.'
    },
    {
        keyword: 'bos bantuan operasional sekolah hibah pemerintah yayasan',
        label: 'Penerimaan Dana BOS / Hibah',
        module: 'Buku Kas Umum (BKU)',
        flowType: 'Income',
        suggestedPath: '📁 Induk: Penerimaan Bantuan Pemerintah ➔ 📄 Anak: Dana BOS / Hibah',
        explanation: 'Pilih jenis transaksi Pemasukan di BKU, gunakan sumber dana rekening BOS/Bank.',
        rkasEffect: 'Target pendapatan dana BOS di RKAS tahunan langsung terisi realisasinya.'
    }
];

export const FinancialFlowGuideModal: React.FC<Props> = ({ isOpen, onClose }) => {
    const [activeTab, setActiveTab] = useState<'flow' | 'hierarchy' | 'lookup' | 'faq'>('flow');
    const [searchQuery, setSearchQuery] = useState('');

    if (!isOpen) return null;

    const filteredLookups = QUICK_LOOKUP_DATA.filter(item => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return item.keyword.includes(q) || item.label.toLowerCase().includes(q) || item.suggestedPath.toLowerCase().includes(q);
    });

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
                {/* Modal Header */}
                <div className="p-6 bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 text-white flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-white/15 backdrop-blur-md rounded-2xl border border-white/20">
                            <BookOpen size={24} className="text-white" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-xl font-bold tracking-tight">Pusat Bantuan & Panduan Alur Keuangan</h2>
                                <span className="px-2 py-0.5 bg-blue-500/40 border border-blue-300/30 rounded-full text-[10px] font-semibold uppercase tracking-wider text-blue-100">
                                    Official Guide
                                </span>
                            </div>
                            <p className="text-xs text-blue-100/80 mt-0.5">
                                Panduan memahami alur pos pengeluaran, anak kode transaksi, dan integrasi otomatis ke RAB/RKAS.
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Tabs Navigation */}
                <div className="px-6 py-2.5 bg-slate-50 border-b border-slate-200 flex gap-2 shrink-0 overflow-x-auto">
                    <button
                        onClick={() => setActiveTab('flow')}
                        className={clsx(
                            "px-4 py-2 text-xs font-semibold rounded-xl transition flex items-center gap-1.5 whitespace-nowrap",
                            activeTab === 'flow' 
                                ? "bg-blue-600 text-white shadow-sm" 
                                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/70"
                        )}
                    >
                        <Layers size={15} />
                        <span>1. Peta Alur Transaksi (Diagram)</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('hierarchy')}
                        className={clsx(
                            "px-4 py-2 text-xs font-semibold rounded-xl transition flex items-center gap-1.5 whitespace-nowrap",
                            activeTab === 'hierarchy' 
                                ? "bg-blue-600 text-white shadow-sm" 
                                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/70"
                        )}
                    >
                        <Building2 size={15} />
                        <span>2. Kode Induk vs Kode Anak</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('lookup')}
                        className={clsx(
                            "px-4 py-2 text-xs font-semibold rounded-xl transition flex items-center gap-1.5 whitespace-nowrap",
                            activeTab === 'lookup' 
                                ? "bg-blue-600 text-white shadow-sm" 
                                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/70"
                        )}
                    >
                        <Sparkles size={15} className="text-amber-300" />
                        <span>3. Mau Catat Apa? (Simulator)</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('faq')}
                        className={clsx(
                            "px-4 py-2 text-xs font-semibold rounded-xl transition flex items-center gap-1.5 whitespace-nowrap",
                            activeTab === 'faq' 
                                ? "bg-blue-600 text-white shadow-sm" 
                                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/70"
                        )}
                    >
                        <HelpCircle size={15} />
                        <span>4. FAQ & Rekonsiliasi</span>
                    </button>
                </div>

                {/* Modal Body */}
                <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-700">
                    {/* TAB 1: PETA ALUR TRANSAKSI */}
                    {activeTab === 'flow' && (
                        <div className="space-y-6">
                            <div className="bg-blue-50 border border-blue-200/80 rounded-2xl p-4 flex items-start gap-3">
                                <Info size={20} className="text-blue-600 shrink-0 mt-0.5" />
                                <div className="text-xs text-blue-900 space-y-1">
                                    <p className="font-bold text-sm">Prinsip Aliran Keuangan Sekolah</p>
                                    <p>
                                        Semua transaksi uang masuk dan keluar sekolah saling terhubung dengan <strong>Kode Transaksi (Transaction Code)</strong>. Kode ini berfungsi sebagai jembatan yang otomatis menyambungkan pencatatan riil kas/bank ke mata anggaran tahunan di <strong>RAB/RKAS</strong>.
                                    </p>
                                </div>
                            </div>

                            {/* Peta Alur Visual (2 Kolom: Pemasukan & Pengeluaran) */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                {/* Alur Pengeluaran */}
                                <div className="p-5 bg-white border-2 border-red-100 rounded-2xl shadow-xs space-y-4">
                                    <div className="flex items-center gap-2 text-red-700 font-bold border-b border-red-100 pb-3">
                                        <TrendingDown size={18} />
                                        <span>JALUR PENGELUARAN (EXPENSE)</span>
                                    </div>

                                    {/* Step 1 */}
                                    <div className="space-y-2">
                                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                                            <span className="font-bold text-slate-800 flex items-center gap-1.5">
                                                <span className="w-5 h-5 rounded-full bg-red-100 text-red-700 flex items-center justify-center font-bold text-[10px]">1</span>
                                                Input Belanja / Gaji
                                            </span>
                                            <p className="text-slate-600 pl-6.5 text-[11px]">
                                                Belanja harian dicatat di <strong>Buku Kas Umum</strong> atau terbit otomatis saat slip <strong>Penggajian (Payroll)</strong> dibayar.
                                            </p>
                                        </div>

                                        <div className="flex justify-center text-slate-300">
                                            <ArrowRight size={16} className="rotate-90" />
                                        </div>

                                        {/* Step 2 */}
                                        <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-xs space-y-1">
                                            <span className="font-bold text-blue-900 flex items-center gap-1.5">
                                                <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[10px]">2</span>
                                                Memilih Pos / Anak Kode Transaksi
                                            </span>
                                            <p className="text-blue-800 pl-6.5 text-[11px]">
                                                Admin memilih anak kode belanja (misal: <code>B12 Listrik</code> di bawah Induk <code>B1 Operasional</code>).
                                            </p>
                                        </div>

                                        <div className="flex justify-center text-slate-300">
                                            <ArrowRight size={16} className="rotate-90" />
                                        </div>

                                        {/* Step 3 */}
                                        <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl text-xs space-y-1">
                                            <span className="font-bold text-emerald-900 flex items-center gap-1.5">
                                                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-[10px]">3</span>
                                                Efek Otomatis ke RKAS
                                            </span>
                                            <p className="text-emerald-800 pl-6.5 text-[11px]">
                                                Saldo Kas berkurang & <strong>Realisasi Pagu Belanja RKAS</strong> pada pos tersebut otomatis bertambah tanpa input manual lagi!
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Alur Penerimaan */}
                                <div className="p-5 bg-white border-2 border-emerald-100 rounded-2xl shadow-xs space-y-4">
                                    <div className="flex items-center gap-2 text-emerald-700 font-bold border-b border-emerald-100 pb-3">
                                        <TrendingUp size={18} />
                                        <span>JALUR PENERIMAAN (INCOME)</span>
                                    </div>

                                    {/* Step 1 */}
                                    <div className="space-y-2">
                                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                                            <span className="font-bold text-slate-800 flex items-center gap-1.5">
                                                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-[10px]">1</span>
                                                Siswa Bayar / Kas Masuk / Infaq
                                            </span>
                                            <p className="text-slate-600 pl-6.5 text-[11px]">
                                                Orang tua membayar SPP/DSP, siswa infaq harian, atau sekolah menerima dana hibah/BOS di Kas Umum.
                                            </p>
                                        </div>

                                        <div className="flex justify-center text-slate-300">
                                            <ArrowRight size={16} className="rotate-90" />
                                        </div>

                                        {/* Step 2 */}
                                        <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-xs space-y-1">
                                            <span className="font-bold text-blue-900 flex items-center gap-1.5">
                                                <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[10px]">2</span>
                                                Keterhubungan Kode Pembayaran
                                            </span>
                                            <p className="text-blue-800 pl-6.5 text-[11px]">
                                                Setiap Jenis Pembayaran memiliki Kode Transaksi yang terhubung ke mata anggaran penerimaan sekolah.
                                            </p>
                                        </div>

                                        <div className="flex justify-center text-slate-300">
                                            <ArrowRight size={16} className="rotate-90" />
                                        </div>

                                        {/* Step 3 */}
                                        <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl text-xs space-y-1">
                                            <span className="font-bold text-emerald-900 flex items-center gap-1.5">
                                                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-[10px]">3</span>
                                                Efek Otomatis ke RKAS
                                            </span>
                                            <p className="text-emerald-800 pl-6.5 text-[11px]">
                                                Kas bertambah, kuitansi terbit, dan <strong>Realisasi Target Pendapatan RKAS</strong> langsung terisi.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 2: KODE INDUK VS KODE ANAK */}
                    {activeTab === 'hierarchy' && (
                        <div className="space-y-6">
                            <div className="border border-slate-200 rounded-2xl p-5 bg-white space-y-4">
                                <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                                    <Layers className="text-blue-600" size={18} />
                                    Mengapa Ada Kode Induk dan Kode Anak?
                                </h3>
                                <p className="text-xs text-slate-600 leading-relaxed">
                                    Di sistem keuangan madrasah/sekolah, terdapat puluhan nota belanja yang berbeda-beda setiap harinya. Jika semua rincian belanja dicatat tanpa induk, laporan tahunan RKAS akan menjadi ratusan baris dan membingungkan yayasan/dinas.
                                </p>

                                {/* Perbandingan Side by Side */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                                    <div className="p-4 bg-amber-50/70 border border-amber-200/80 rounded-2xl space-y-2">
                                        <div className="flex items-center gap-1.5 font-bold text-amber-900 text-xs">
                                            <span className="text-sm">📁</span>
                                            <span>KODE INDUK (MASTER ACCOUNT)</span>
                                        </div>
                                        <p className="text-[11px] text-amber-800">
                                            Kelompok besar mata anggaran institusi pada RKAS. Menampung pagu akumulasi tahunan.
                                        </p>
                                        <div className="p-2.5 bg-white/90 border border-amber-200 rounded-xl text-xs font-mono font-bold text-slate-800">
                                            B1 — Biaya Operasional Madrasah
                                        </div>
                                        <span className="text-[10px] text-amber-700 block font-medium">
                                            Fungsi: Membatasi total pagu anggaran sekolah pada satu bidang.
                                        </span>
                                    </div>

                                    <div className="p-4 bg-blue-50/70 border border-blue-200/80 rounded-2xl space-y-2">
                                        <div className="flex items-center gap-1.5 font-bold text-blue-900 text-xs">
                                            <span className="text-sm">📄</span>
                                            <span>KODE ANAK (SUB-POS / RINCIAN OBJEK)</span>
                                        </div>
                                        <p className="text-[11px] text-blue-800">
                                            Rincian nota belanja aktual saat bertransaksi di Buku Kas Umum (BKU).
                                        </p>
                                        <div className="p-2.5 bg-white/90 border border-blue-200 rounded-xl text-xs font-mono space-y-1 text-slate-800">
                                            <div>↳ B11 — Pembelian ATK & Kertas</div>
                                            <div>↳ B12 — Tagihan Listrik PLN & Air</div>
                                            <div>↳ B13 — Konsumsi Rapat & Tamu</div>
                                        </div>
                                        <span className="text-[10px] text-blue-700 block font-medium">
                                            Fungsi: Menjamin akuntabilitas nota nota belanja secara spesifik.
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Cara Membaca Jalur */}
                            <div className="p-5 bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-2xl space-y-3">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-blue-300 flex items-center gap-1.5">
                                    <Sparkles size={14} />
                                    Cara Cepat Membaca Jalur Aliran di Buku Kas Umum (BKU)
                                </h4>
                                <div className="flex flex-wrap items-center gap-2 text-xs bg-white/10 p-3 rounded-xl border border-white/15">
                                    <span className="px-2.5 py-1 bg-white text-slate-900 rounded-lg font-bold">
                                        📁 Induk: B1 (Operasional)
                                    </span>
                                    <ArrowRight size={14} className="text-blue-300" />
                                    <span className="px-2.5 py-1 bg-blue-500 text-white rounded-lg font-bold">
                                        📄 Anak: B12 (Listrik)
                                    </span>
                                    <ArrowRight size={14} className="text-blue-300" />
                                    <span className="px-2.5 py-1 bg-emerald-500 text-white rounded-lg font-bold">
                                        ✅ Merealisasikan Pagu Belanja Listrik di RKAS
                                    </span>
                                </div>
                                <p className="text-[11px] text-slate-300">
                                    Ketika Anda melihat badge ini pada tabel Kas Umum, artinya uang keluar untuk keperluan spesifik <strong>Listrik (B12)</strong> dan otomatis mencatatkan serapan dana pada kelompok anggaran <strong>Operasional (B1)</strong> di RKAS.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* TAB 3: SIMULATOR "MAU CATAT APA?" */}
                    {activeTab === 'lookup' && (
                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                                    <Sparkles className="text-amber-500" size={18} />
                                    Pencarian Instan Alur Transaksi Sekolah
                                </h3>
                                <p className="text-xs text-slate-500">
                                    Ketik keperluan transaksi yang ingin Anda input (misal: listrik, spidol, spp, gaji, ac, kursi), sistem akan menunjukkan modul dan jalurnya.
                                </p>
                            </div>

                            {/* Search bar */}
                            <div className="relative">
                                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Ketik keperluan: beli kertas, bayar wifi, terima spp, gaji honorer..."
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 text-sm font-medium"
                                />
                                {searchQuery && (
                                    <button 
                                        onClick={() => setSearchQuery('')}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
                                    >
                                        Hapus
                                    </button>
                                )}
                            </div>

                            {/* Lookup Cards Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-2">
                                {filteredLookups.map((item, idx) => (
                                    <div key={idx} className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-blue-300 hover:shadow-md transition space-y-2.5">
                                        <div className="flex justify-between items-start">
                                            <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                                                {item.flowType === 'Expense' ? (
                                                    <span className="w-2 h-2 rounded-full bg-red-500"></span>
                                                ) : (
                                                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                                )}
                                                {item.label}
                                            </span>
                                            <span className={clsx(
                                                "px-2 py-0.5 rounded-md text-[10px] font-bold uppercase",
                                                item.flowType === 'Expense' ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"
                                            )}>
                                                {item.flowType === 'Expense' ? 'Pengeluaran' : 'Pemasukan'}
                                            </span>
                                        </div>

                                        <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-xs">
                                            <div className="text-[11px] text-slate-500 font-medium">Modul yang Digunakan:</div>
                                            <div className="font-bold text-blue-700">{item.module}</div>
                                            <div className="text-[11px] text-slate-500 font-medium pt-1">Rekomendasi Pos Akun:</div>
                                            <div className="font-semibold text-slate-800 text-[11px] font-mono">{item.suggestedPath}</div>
                                        </div>

                                        <p className="text-[11px] text-slate-600 leading-snug">
                                            {item.explanation}
                                        </p>

                                        <div className="text-[10px] text-emerald-800 bg-emerald-50/80 border border-emerald-200 px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1">
                                            <CheckCircle2 size={12} className="shrink-0 text-emerald-600" />
                                            <span>{item.rkasEffect}</span>
                                        </div>
                                    </div>
                                ))}

                                {filteredLookups.length === 0 && (
                                    <div className="col-span-2 py-10 text-center text-slate-400">
                                        <p className="text-sm">Tidak ditemukan kata kunci transaksi "{searchQuery}".</p>
                                        <p className="text-xs mt-1">Coba gunakan kata umum seperti "listrik", "gaji", "spp", atau "atk".</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* TAB 4: FAQ & REKONSILIASI */}
                    {activeTab === 'faq' && (
                        <div className="space-y-4">
                            <div className="border border-slate-200 rounded-2xl p-4 bg-white space-y-2">
                                <h4 className="font-bold text-slate-900 text-xs flex items-center gap-2">
                                    <HelpCircle size={15} className="text-blue-600" />
                                    Bagaimana jika saya salah memilih kode transaksi saat menginput di Buku Kas Umum?
                                </h4>
                                <p className="text-xs text-slate-600 leading-relaxed pl-6">
                                    Anda dapat mengklik tombol <strong>Edit</strong> pada baris transaksi di Buku Kas Umum kapan saja. Sistem secara otomatis akan membatalkan realisasi dari kode transaksi yang lama dan memindahkan realisasinya ke kode transaksi yang baru.
                                </p>
                            </div>

                            <div className="border border-slate-200 rounded-2xl p-4 bg-white space-y-2">
                                <h4 className="font-bold text-slate-900 text-xs flex items-center gap-2">
                                    <HelpCircle size={15} className="text-blue-600" />
                                    Apa fungsi tombol "Sinkronkan Realisasi" di menu RKAS?
                                </h4>
                                <p className="text-xs text-slate-600 leading-relaxed pl-6">
                                    Tombol <strong>Sinkronkan Realisasi</strong> adalah fitur audit otomatis. Jika terjadi penyesuaian tahun ajaran, migrasi database, atau pembatalan transaksi kas, sistem akan mengaudit seluruh riwayat transaksi riil dan menghitung ulang angka realisasi pada setiap pos RKAS agar 100% akurat.
                                </p>
                            </div>

                            <div className="border border-slate-200 rounded-2xl p-4 bg-white space-y-2">
                                <h4 className="font-bold text-slate-900 text-xs flex items-center gap-2">
                                    <HelpCircle size={15} className="text-blue-600" />
                                    Apakah saya wajib mengisi Kode Transaksi untuk setiap entri Kas Umum?
                                </h4>
                                <p className="text-xs text-slate-600 leading-relaxed pl-6">
                                    Sangat disarankan ya! Dengan memilih Kode Transaksi, seluruh pembukuan kas sekolah Anda langsung tersambung ke instrumen RKAS dan Laporan Keuangan resmi tanpa perlu merekap manual di akhir tahun ajaran.
                                </p>
                            </div>

                            <div className="border border-slate-200 rounded-2xl p-4 bg-white space-y-2">
                                <h4 className="font-bold text-slate-900 text-xs flex items-center gap-2">
                                    <HelpCircle size={15} className="text-blue-600" />
                                    Bagaimana cara menambah Pos atau Anak Kode Transaksi baru?
                                </h4>
                                <p className="text-xs text-slate-600 leading-relaxed pl-6">
                                    Buka menu <strong>Kode Transaksi</strong> di sidebar Keuangan. Anda dapat menambah kode induk baru atau mengklik tombol tambah sub-kode pada induk terkait untuk membuat anak kode baru sesuai kebutuhan operasional sekolah.
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Modal Footer */}
                <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-between items-center shrink-0">
                    <div className="text-xs text-slate-500 flex items-center gap-1.5">
                        <CheckCircle2 size={14} className="text-emerald-600" />
                        <span>Sistem Keuangan Terintegrasi SDIT Management</span>
                    </div>
                    <button
                        onClick={onClose}
                        className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition"
                    >
                        Tutup Panduan
                    </button>
                </div>
            </div>
        </div>
    );
};

export default FinancialFlowGuideModal;
