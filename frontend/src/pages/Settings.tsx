import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import CardGlass from '../components/ui/glass/CardGlass';
import InputGlass from '../components/ui/glass/InputGlass';
import ButtonGlass from '../components/ui/glass/ButtonGlass';
import { User, Lock, Save, Camera } from 'lucide-react';

const Settings: React.FC = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<'profile' | 'password'>('profile');

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-white">Pengaturan Akun</h1>

            <div className="flex space-x-4 border-b border-white/10 pb-1">
                <button
                    onClick={() => setActiveTab('profile')}
                    className={`pb-3 px-4 text-sm font-medium transition-colors relative ${activeTab === 'profile' ? 'text-purple-400' : 'text-gray-400 hover:text-white'
                        }`}
                >
                    Profil Saya
                    {activeTab === 'profile' && (
                        <div className="absolute bottom-0 left-0 w-full h-0.5 bg-purple-400 rounded-t-full" />
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('password')}
                    className={`pb-3 px-4 text-sm font-medium transition-colors relative ${activeTab === 'password' ? 'text-purple-400' : 'text-gray-400 hover:text-white'
                        }`}
                >
                    Ganti Password
                    {activeTab === 'password' && (
                        <div className="absolute bottom-0 left-0 w-full h-0.5 bg-purple-400 rounded-t-full" />
                    )}
                </button>
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
                {/* Profile Card */}
                <div className="lg:col-span-1">
                    <CardGlass className="p-6 text-center space-y-6">
                        <div className="relative inline-block">
                            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 p-1 mx-auto">
                                <div className="w-full h-full rounded-full bg-gray-900 flex items-center justify-center overflow-hidden">
                                    {user?.photo_url ? (
                                        <img src={user.photo_url} alt={user.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <User size={48} className="text-gray-400" />
                                    )}
                                </div>
                            </div>
                            <button className="absolute bottom-0 right-0 p-2 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full border border-white/10 transition-colors">
                                <Camera size={16} className="text-white" />
                            </button>
                        </div>

                        <div>
                            <h2 className="text-xl font-bold text-white">{user?.name}</h2>
                            <p className="text-purple-300">{user?.email}</p>
                            <div className="mt-2 inline-flex px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-gray-300">
                                {user?.role_id === 1 ? 'Super Admin' : 'User'}
                            </div>
                        </div>
                    </CardGlass>
                </div>

                {/* Form Section */}
                <div className="lg:col-span-2">
                    <CardGlass className="p-8">
                        {activeTab === 'profile' ? (
                            <form className="space-y-6">
                                <div className="grid md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-sm text-gray-400">Nama Lengkap</label>
                                        <InputGlass defaultValue={user?.name} icon={User} />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm text-gray-400">Email</label>
                                        <InputGlass defaultValue={user?.email} disabled className="opacity-50 cursor-not-allowed" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm text-gray-400">Nomor Telepon</label>
                                        <InputGlass placeholder="0812..." />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm text-gray-400">Alamat</label>
                                        <InputGlass placeholder="Jl. ..." />
                                    </div>
                                </div>

                                <div className="pt-4 flex justify-end">
                                    <ButtonGlass className="flex items-center gap-2">
                                        <Save size={18} /> Simpan Perubahan
                                    </ButtonGlass>
                                </div>
                            </form>
                        ) : (
                            <form className="space-y-6 max-w-md">
                                <div className="space-y-2">
                                    <label className="text-sm text-gray-400">Password Saat Ini</label>
                                    <InputGlass type="password" icon={Lock} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm text-gray-400">Password Baru</label>
                                    <InputGlass type="password" icon={Lock} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm text-gray-400">Konfirmasi Password Baru</label>
                                    <InputGlass type="password" icon={Lock} />
                                </div>

                                <div className="pt-4">
                                    <ButtonGlass className="flex items-center gap-2">
                                        <Save size={18} /> Update Password
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
