import React, { useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import CardGlass from '../components/ui/glass/CardGlass';
import InputGlass from '../components/ui/glass/InputGlass';
import ButtonGlass from '../components/ui/glass/ButtonGlass';
import { User, Lock, Save, Camera, Landmark, X } from 'lucide-react';
import api from '../services/api';
import { useMutation } from '@tanstack/react-query';
import Cropper from 'react-easy-crop';
import toast from 'react-hot-toast';

// Helper to create image element
const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
        const image = new Image();
        image.addEventListener('load', () => resolve(image));
        image.addEventListener('error', (error) => reject(error));
        image.setAttribute('crossOrigin', 'anonymous'); // to prevent CORS issues
        image.src = url;
    });

// Helper to crop image in canvas
async function getCroppedImg(imageSrc: string, pixelCrop: any): Promise<Blob> {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
        throw new Error('No 2d context');
    }

    // set canvas size to match the cropped area
    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    // draw cropped image
    ctx.drawImage(
        image,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        pixelCrop.width,
        pixelCrop.height
    );

    // As Blob
    return new Promise((resolve, reject) => {
        canvas.toBlob((file) => {
            if (file) {
                resolve(file);
            } else {
                reject(new Error('Canvas is empty'));
            }
        }, 'image/jpeg');
    });
}

const Settings: React.FC = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<'profile' | 'password'>('profile');

    // Profile State
    const [name, setName] = useState(user?.name || '');
    const [email, setEmail] = useState(user?.email || '');
    const [phone, setPhone] = useState(user?.phone || '');
    const [address, setAddress] = useState(user?.address || '');

    // Bank Account State
    const [bankName, setBankName] = useState(user?.bank_name || '');
    const [bankAccountNumber, setBankAccountNumber] = useState(user?.bank_account_number || '');
    const [bankAccountHolder, setBankAccountHolder] = useState(user?.bank_account_holder || '');

    // Password State
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // Cropper States
    const [imageSrc, setImageSrc] = useState<string | null>(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
    const [isUploading, setIsUploading] = useState(false);

    // Staff roles (not student=6, not parent=7)
    const isStaff = user?.role_id !== 6 && user?.role_id !== 7;

    const onCropComplete = useCallback((_croppedArea: any, croppedAreaPixels: any) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const updateProfileMutation = useMutation({
        mutationFn: async (data: { name: string; email: string; phone: string; address: string; bank_name: string; bank_account_number: string; bank_account_holder: string }) => {
            return await api.put('/profile', data);
        },
        onSuccess: () => {
            toast.success('Profil berhasil diperbarui. Silakan login ulang untuk melihat perubahan.');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.error || 'Gagal memperbarui profil');
        }
    });

    const changePasswordMutation = useMutation({
        mutationFn: async (data: any) => {
            return await api.put('/profile/password', data);
        },
        onSuccess: () => {
            toast.success('Password berhasil diubah.');
            setOldPassword('');
            setNewPassword('');
            setConfirmPassword('');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.error || 'Gagal mengubah password');
        }
    });

    const handleUpdateProfile = (e: React.FormEvent) => {
        e.preventDefault();
        updateProfileMutation.mutate({
            name,
            email,
            phone,
            address,
            bank_name: bankName,
            bank_account_number: bankAccountNumber,
            bank_account_holder: bankAccountHolder
        });
    };

    const handleChangePassword = (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            toast.error('Konfirmasi password tidak cocok');
            return;
        }
        changePasswordMutation.mutate({ old_password: oldPassword, new_password: newPassword });
    };

    const handleSaveCrop = async () => {
        if (!imageSrc || !croppedAreaPixels) return;
        setIsUploading(true);
        try {
            const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels);
            const croppedFile = new File([croppedBlob], 'profile.jpg', { type: 'image/jpeg' });
            
            const formData = new FormData();
            formData.append('file', croppedFile);
            
            await api.post('/profile/photo', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            
            toast.success('Foto profil berhasil diperbarui. Silakan refresh halaman.');
            setImageSrc(null);
        } catch (err: any) {
            toast.error('Gagal memproses foto: ' + (err.response?.data?.error || err.message));
        } finally {
            setIsUploading(false);
        }
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
                                            if (file.size > 3 * 1024 * 1024) {
                                                toast.error("Maksimal ukuran file adalah 3MB");
                                                e.target.value = '';
                                                return;
                                            }
                                            const reader = new FileReader();
                                            reader.addEventListener('load', () => {
                                                setImageSrc(reader.result as string);
                                            });
                                            reader.readAsDataURL(file);
                                            e.target.value = ''; // Reset input
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
                                        <InputGlass 
                                            value={phone}
                                            onChange={(e) => setPhone(e.target.value)}
                                            placeholder="0812..." 
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm text-slate-600">Alamat</label>
                                        <InputGlass 
                                            value={address}
                                            onChange={(e) => setAddress(e.target.value)}
                                            placeholder="Jl. ..." 
                                        />
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

            {/* Adjust/Crop Modal */}
            {imageSrc && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl overflow-hidden shadow-2xl w-full max-w-lg flex flex-col">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold text-slate-900 text-lg">Sesuaikan Foto Profil</h3>
                            <button onClick={() => setImageSrc(null)} className="text-slate-400 hover:text-slate-600 transition">
                                <X size={20} />
                            </button>
                        </div>
                        
                        {/* Cropper Container */}
                        <div className="relative w-full h-80 bg-slate-900">
                            <Cropper
                                image={imageSrc}
                                crop={crop}
                                zoom={zoom}
                                aspect={1}
                                onCropChange={setCrop}
                                onZoomChange={setZoom}
                                onCropComplete={onCropComplete}
                            />
                        </div>
                        
                        {/* Controls */}
                        <div className="p-6 space-y-4">
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Perbesar/Perkecil</label>
                                <input
                                    type="range"
                                    value={zoom}
                                    min={1}
                                    max={3}
                                    step={0.1}
                                    aria-labelledby="Zoom"
                                    onChange={(e) => setZoom(Number(e.target.value))}
                                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                                />
                            </div>
                            
                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={() => setImageSrc(null)}
                                    className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
                                >
                                    Batal
                                </button>
                                <button
                                    onClick={handleSaveCrop}
                                    disabled={isUploading}
                                    className="flex-1 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-sm font-semibold shadow-lg shadow-purple-500/20 flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
                                >
                                    {isUploading ? (
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                    ) : 'Terapkan & Simpan'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Settings;
