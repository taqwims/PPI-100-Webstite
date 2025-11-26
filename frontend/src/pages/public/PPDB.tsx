import React, { useState } from 'react';
import api from '../../services/api';

const PPDB: React.FC = () => {
    const [formData, setFormData] = useState({
        name: '',
        nisn: '',
        origin_school: '',
        parent_name: '',
        phone: '',
    });
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/public/ppdb', formData);
            setSuccess(true);
            setFormData({ name: '', nisn: '', origin_school: '', parent_name: '', phone: '' });
        } catch (err: any) {
            setError(err.response?.data?.error || 'Gagal mendaftar. Silakan coba lagi.');
        }
    };

    return (
        <div className="container mx-auto px-4 py-12">
            <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-8">
                <h1 className="text-3xl font-bold text-center mb-8 text-primary">Pendaftaran Peserta Didik Baru</h1>

                {success && (
                    <div className="bg-green-100 text-green-700 p-4 rounded-lg mb-6 text-center">
                        Pendaftaran berhasil! Kami akan menghubungi Anda segera.
                    </div>
                )}

                {error && (
                    <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-6 text-center">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-gray-700 font-bold mb-2">Nama Lengkap</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-gray-700 font-bold mb-2">NISN</label>
                        <input
                            type="text"
                            value={formData.nisn}
                            onChange={(e) => setFormData({ ...formData, nisn: e.target.value })}
                            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-gray-700 font-bold mb-2">Asal Sekolah</label>
                        <input
                            type="text"
                            value={formData.origin_school}
                            onChange={(e) => setFormData({ ...formData, origin_school: e.target.value })}
                            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-gray-700 font-bold mb-2">Nama Orang Tua</label>
                        <input
                            type="text"
                            value={formData.parent_name}
                            onChange={(e) => setFormData({ ...formData, parent_name: e.target.value })}
                            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-gray-700 font-bold mb-2">Nomor Telepon / WA</label>
                        <input
                            type="text"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        className="w-full bg-primary text-white font-bold py-3 rounded-lg hover:bg-primary/90 transition"
                    >
                        Daftar Sekarang
                    </button>
                </form>
            </div>
        </div>
    );
};

export default PPDB;
