import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import CardGlass from '../components/ui/glass/CardGlass';
import InputGlass from '../components/ui/glass/InputGlass';
import ButtonGlass from '../components/ui/glass/ButtonGlass';
import { User, Lock, Save, Camera, Landmark } from 'lucide-react';
import api from '../services/api';
import { useMutation } from '@tanstack/react-query';

const Settings: React.FC = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<'profile' | 'password'>('profile');

    // Profile State
    const [name, setName] = useState(user?.name || '');
    const [email, setEmail] = useState(user?.email || '');

    // Bank Account State
    const [bankName, setBankName] = useState(user?.bank_name || '');
    const [bankAccountNumber, setBankAccountNumber] = useState(user?.bank_account_number || '');
    const [bankAccountHolder, setBankAccountHolder] = useState(user?.bank_account_holder || '');

    // Password State
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // Staff roles (not student=6, not parent=7)
    const isStaff = user?.role_id !== 6 && user?.role_id !== 7;

    const updateProfileMutation = useMutation({
        mutationFn: async (data: { name: string; email: string; bank_name: string; bank_account_number: string; bank_account_holder: string }) => {
            return await api.put('/profile', data);
        },
        onSuccess: () => {
            alert('Profil berhasil diperbarui. Silakan login ulang untuk melihat perubahan.');
        },
        onError: (error: any) => {
            alert(error.response?.data?.error || 'Gagal memperbarui profil');
        }
    });

    const changePasswordMutation = useMutation({
        mutationFn: async (data: any) => {
            return await api.put('/profile/password', data);
        },
        onSuccess: () => {
            alert('Password berhasil diubah.');
            setOldPassword('');
            setNewPassword('');
            setConfirmPassword('');
        },
        onError: (error: any) => {
            alert(error.response?.data?.error || 'Gagal mengubah password');
        }
    });

    const handleUpdateProfile = (e: React.FormEvent) => {
        e.preventDefault();
        updateProfileMutation.mutate({
            name,
            email,
            bank_name: bankName,
            bank_account_number: bankAccountNumber,
            bank_account_holder: bankAccountHolder
        });
    };

    const handleChangePassword = (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            alert('Konfirmasi password tidak cocok');
            return;
        }
        changePasswordMutation.mutate({ old_password: oldPassword, new_password: newPassword });
    };

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-slate-900">Pengaturan Akun</h1>

            <div className="flex space-x-4 border-b border-slate-200 pb-1">
                <button
                    onClick={() => setActiveTab('profile')}
                    className={`pb-3 px-4 text-sm font-medium transition-colors relative ${activeTab === 'profile' ? 'text-purple-600' : 'text-slate-500 hover:text-slate-900'
                        }`}
                >
                    Profil Saya
                    {activeTab === 'profile' && (
                        <div className="absolute bottom-0 left-0 w-full h-0.5 bg-purple-600 rounded-t-full" />
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('password')}
                    className={`pb-3 px-4 text-sm font-medium transition-colors relative ${activeTab === 'password' ? 'text-purple-600' : 'text-slate-500 hover:text-slate-900'
                        }`}
                >
                    Ganti Password
                    {activeTab === 'password' && (
                        <div className="absolute bottom-0 left-0 w-full h-0.5 bg-purple-600 rounded-t-full" />
                    )}
                </button>
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
                {/* Profile Card */}
                <div className="lg:col-span-1">
                    <CardGlass className="p-6 text-center space-y-6">
                        <div className="relative inline-block">
                            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 p-1 mx-auto">
                                <div className="w-full h-full rounded-full bg-slate-100 flex items-center justify-center overflow-hidden">
                                    {user?.photo_url ? (
                                        <img src={user.photo_url} alt={user.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <User size={48} className="text-slate-400" />
                                    )}
                                </div>
                            </div>
                            <label className="absolute bottom-0 right-0 p-2 bg-white/40 hover:bg-white/60 backdrop-blur-md rounded-full border border-white/20 transition-colors cursor-pointer shadow-sm">
                                <Camera size={16} className="text-slate-700" />
                                <input
                                    type="file"
                                    className="hidden"
                                    accept="image/*"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                            const formData = new FormData();
                                            formData.append('file', file);
                                            api.post('/profile/photo', formData, {
                                                headers: { 'Content-Type': 'multipart/form-data' }
                                            }).then(() => {
                                                alert('Foto profil berhasil diperbarui. Silakan refresh halaman.');
                                            }).catch((err) => {
                                                alert('Gagal mengupload foto: ' + (err.response?.data?.error || err.message));
                                            });
                                        }
                                    }}
                                />
                            </label>
                        </div>

                        <div>
                            <h2 className="text-xl font-bold text-slate-900">{user?.name}</h2>
                            <p className="text-purple-600">{user?.email}</p>
                            <div className="mt-2 inline-flex px-3 py-1 rounded-full bg-white/40 border border-white/20 text-xs text-slate-600 shadow-sm">
                                {user?.role_id === 1 ? 'Super Admin' : 'User'}
                            </div>
                        </div>
                    </CardGlass>
                </div>

                {/* Form Section */}
                <div className="lg:col-span-2">
                    <CardGlass className="p-8">
                        {activeTab === 'profile' ? (
                            <form onSubmit={handleUpdateProfile} className="space-y-6">
                                <div className="grid md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-sm text-slate-600">Nama Lengkap</label>
                                        <InputGlass
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            icon={User}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm text-slate-600">Email</label>
                                        <InputGlass
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            icon={User}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm text-slate-600">Nomor Telepon</label>
                                        <InputGlass placeholder="0812..." disabled className="opacity-50 cursor-not-allowed" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm text-slate-600">Alamat</label>
                                        <InputGlass placeholder="Jl. ..." disabled className="opacity-50 cursor-not-allowed" />
                                    </div>
                                </div>

                                {/* Bank Account Section - Only for Staff */}
                                {isStaff && (
                                    <div className="mt-6 pt-6 border-t border-slate-200">
                                        <div className="flex items-center gap-2 mb-4">
                                            <Landmark size={20} className="text-blue-600" />
                                            <h3 className="text-lg font-semibold text-slate-800">Informasi Rekening Bank</h3>
                                        </div>
                                        <p className="text-xs text-slate-500 mb-4">Digunakan untuk penerimaan gaji dan tunjangan melalui transfer.</p>
                                        <div className="grid md:grid-cols-3 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-sm text-slate-600">Nama Bank</label>
                                                <InputGlass
                                                    value={bankName}
                                                    onChange={(e) => setBankName(e.target.value)}
                                                    placeholder="BSI / BCA / Mandiri ..."
                                                    icon={Landmark}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-sm text-slate-600">Nomor Rekening</label>
                                                <InputGlass
                                                    value={bankAccountNumber}
                                                    onChange={(e) => setBankAccountNumber(e.target.value)}
                                                    placeholder="1234567890"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-sm text-slate-600">Atas Nama</label>
                                                <InputGlass
                                                    value={bankAccountHolder}
                                                    onChange={(e) => setBankAccountHolder(e.target.value)}
                                                    placeholder="Nama pemilik rekening"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="pt-4 flex justify-end">
                                    <ButtonGlass type="submit" className="flex items-center gap-2" disabled={updateProfileMutation.isPending}>
                                        <Save size={18} />
                                        {updateProfileMutation.isPending ? 'Menyimpan...' : 'Simpan Perubahan'}
                                    </ButtonGlass>
                                </div>
                            </form>
                        ) : (
                            <form onSubmit={handleChangePassword} className="space-y-6 max-w-md">
                                <div className="space-y-2">
                                    <label className="text-sm text-slate-600">Password Saat Ini</label>
                                    <InputGlass
                                        type="password"
                                        icon={Lock}
                                        value={oldPassword}
                                        onChange={(e) => setOldPassword(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm text-slate-600">Password Baru</label>
                                    <InputGlass
                                        type="password"
                                        icon={Lock}
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm text-slate-600">Konfirmasi Password Baru</label>
                                    <InputGlass
                                        type="password"
                                        icon={Lock}
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                    />
                                </div>

                                <div className="pt-4">
                                    <ButtonGlass type="submit" className="flex items-center gap-2" disabled={changePasswordMutation.isPending}>
                                        <Save size={18} />
                                        {changePasswordMutation.isPending ? 'Mengubah...' : 'Update Password'}
                                    </ButtonGlass>
                                </div>
                            </form>
                        )}
                    </CardGlass>
                </div>
            </div>
        </div>
    );
};

export default Settings;
