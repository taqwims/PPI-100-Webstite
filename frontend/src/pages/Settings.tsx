import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import CardGlass from '../components/ui/glass/CardGlass';
import InputGlass from '../components/ui/glass/InputGlass';
import ButtonGlass from '../components/ui/glass/ButtonGlass';
import { User, Lock, Save, Camera } from 'lucide-react';
import api from '../services/api';
import { useMutation } from '@tanstack/react-query';

const Settings: React.FC = () => {
    const { user } = useAuth(); // login is used to refresh token if needed, but here we might just need to refetch profile
    const [activeTab, setActiveTab] = useState<'profile' | 'password'>('profile');

    // Profile State
    const [name, setName] = useState(user?.name || '');
    const [email, setEmail] = useState(user?.email || '');

    // Password State
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const updateProfileMutation = useMutation({
        mutationFn: async (data: { name: string; email: string }) => {
            return await api.put('/profile', data);
        },
        onSuccess: () => {
            alert('Profil berhasil diperbarui. Silakan login ulang untuk melihat perubahan.');
            // In a real app, we would refetch the user profile here
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
        updateProfileMutation.mutate({ name, email });
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
                                                // In a real app, we would invalidate the user query here
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
                                            icon={User} // Should be Mail icon but User is fine for now
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
