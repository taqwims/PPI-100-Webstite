import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2 } from 'lucide-react';
import CardGlass from '../../components/ui/glass/CardGlass';
import ButtonGlass from '../../components/ui/glass/ButtonGlass';
import InputGlass from '../../components/ui/glass/InputGlass';
import { TableGlass } from '../../components/ui/glass/TableGlass';
import ModalGlass from '../../components/ui/glass/ModalGlass';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const Academic = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<'classes' | 'subjects' | 'schedules'>('classes');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Data States
    const [classes, setClasses] = useState<any[]>([]);
    const [subjects, setSubjects] = useState<any[]>([]);
    const [schedules, setSchedules] = useState<any[]>([]);

    // Form States
    const [formData, setFormData] = useState<any>({});

    useEffect(() => {
        fetchData();
    }, [activeTab]);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            let endpoint = '';
            switch (activeTab) {
                case 'classes':
                    endpoint = '/academic/classes';
                    break;
                case 'subjects':
                    endpoint = '/academic/subjects';
                    break;
                case 'schedules':
                    endpoint = '/academic/schedules';
                    break;
            }

            // Add unit_id filter if user has unit_id (assuming user object has unit_id)
            // For now, fetching all or filtering by query param if backend supports it
            const response = await api.get(endpoint);

            switch (activeTab) {
                case 'classes':
                    setClasses(response.data || []);
                    break;
                case 'subjects':
                    setSubjects(response.data || []);
                    break;
                case 'schedules':
                    setSchedules(response.data || []);
                    break;
            }
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleOpenModal = () => {
        setFormData({});
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            let endpoint = '';
            switch (activeTab) {
                case 'classes':
                    endpoint = '/academic/classes';
                    break;
                case 'subjects':
                    endpoint = '/academic/subjects';
                    break;
                case 'schedules':
                    endpoint = '/academic/schedules';
                    break;
            }

            // Ensure unit_id is sent. Defaulting to user's unit_id or 1 for now if missing
            const payload = { ...formData, unit_id: user?.unit_id || 1 };
            // Convert unit_id to number if it's a string
            if (payload.unit_id) payload.unit_id = Number(payload.unit_id);

            await api.post(endpoint, payload);
            fetchData();
            handleCloseModal();
        } catch (error) {
            console.error('Error saving data:', error);
            alert('Failed to save data');
        }
    };

    const renderTabs = () => (
        <div className="flex space-x-4 mb-6 border-b border-white/10">
            {[
                { id: 'classes', label: 'Data Kelas' },
                { id: 'subjects', label: 'Mata Pelajaran' },
                { id: 'schedules', label: 'Jadwal Pelajaran' },
            ].map((tab) => (
                <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`pb-2 px-4 text-sm font-medium transition-colors relative ${activeTab === tab.id
                        ? 'text-white'
                        : 'text-white/60 hover:text-white'
                        }`}
                >
                    {tab.label}
                    {activeTab === tab.id && (
                        <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                    )}
                </button>
            ))}
        </div>
    );

    const renderContent = () => {
        if (isLoading) {
            return <div className="text-white text-center py-8">Loading...</div>;
        }

        switch (activeTab) {
            case 'classes':
                return (
                    <TableGlass
                        headers={['ID', 'Nama Kelas', 'Unit ID', 'Aksi']}
                        data={classes.map((cls) => ({
                            id: cls.ID,
                            name: cls.Name,
                            unit: cls.UnitID,
                            actions: (
                                <div className="flex space-x-2">
                                    <button className="text-blue-400 hover:text-blue-300"><Edit size={16} /></button>
                                    <button className="text-red-400 hover:text-red-300"><Trash2 size={16} /></button>
                                </div>
                            )
                        }))}
                    />
                );
            case 'subjects':
                return (
                    <TableGlass
                        headers={['ID', 'Nama Mapel', 'Unit ID', 'Aksi']}
                        data={subjects.map((subj) => ({
                            id: subj.ID,
                            name: subj.Name,
                            unit: subj.UnitID,
                            actions: (
                                <div className="flex space-x-2">
                                    <button className="text-blue-400 hover:text-blue-300"><Edit size={16} /></button>
                                    <button className="text-red-400 hover:text-red-300"><Trash2 size={16} /></button>
                                </div>
                            )
                        }))}
                    />
                );
            case 'schedules':
                return (
                    <TableGlass
                        headers={['ID', 'Kelas', 'Mapel', 'Hari', 'Jam', 'Aksi']}
                        data={schedules.map((sch) => ({
                            id: sch.ID,
                            class: sch.ClassID, // Ideally fetch class name
                            subject: sch.SubjectID, // Ideally fetch subject name
                            day: sch.Day,
                            time: `${sch.StartTime} - ${sch.EndTime}`,
                            actions: (
                                <div className="flex space-x-2">
                                    <button className="text-blue-400 hover:text-blue-300"><Edit size={16} /></button>
                                    <button className="text-red-400 hover:text-red-300"><Trash2 size={16} /></button>
                                </div>
                            )
                        }))}
                    />
                );
            default:
                return null;
        }
    };

    const renderModalContent = () => {
        switch (activeTab) {
            case 'classes':
                return (
                    <div className="space-y-4">
                        <InputGlass
                            label="Nama Kelas"
                            name="name"
                            value={formData.name || ''}
                            onChange={handleInputChange}
                            placeholder="Contoh: 7A"
                        />
                        {/* Unit ID is handled automatically or could be a select if admin manages multiple units */}
                    </div>
                );
            case 'subjects':
                return (
                    <div className="space-y-4">
                        <InputGlass
                            label="Nama Mata Pelajaran"
                            name="name"
                            value={formData.name || ''}
                            onChange={handleInputChange}
                            placeholder="Contoh: Matematika"
                        />
                    </div>
                );
            case 'schedules':
                return (
                    <div className="space-y-4">
                        <InputGlass
                            label="Class ID"
                            name="class_id"
                            type="number"
                            value={formData.class_id || ''}
                            onChange={handleInputChange}
                        />
                        <InputGlass
                            label="Subject ID"
                            name="subject_id"
                            type="number"
                            value={formData.subject_id || ''}
                            onChange={handleInputChange}
                        />
                        <InputGlass
                            label="Teacher ID (UUID)"
                            name="teacher_id"
                            value={formData.teacher_id || ''}
                            onChange={handleInputChange}
                        />
                        <InputGlass
                            label="Hari"
                            name="day"
                            value={formData.day || ''}
                            onChange={handleInputChange}
                            placeholder="Monday"
                        />
                        <div className="grid grid-cols-2 gap-4">
                            <InputGlass
                                label="Jam Mulai"
                                name="start_time"
                                type="time"
                                value={formData.start_time || ''}
                                onChange={handleInputChange}
                            />
                            <InputGlass
                                label="Jam Selesai"
                                name="end_time"
                                type="time"
                                value={formData.end_time || ''}
                                onChange={handleInputChange}
                            />
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Akademik</h1>
                    <p className="text-white/60">Manajemen data akademik sekolah</p>
                </div>
                <ButtonGlass onClick={handleOpenModal} icon={Plus}>
                    Tambah Data
                </ButtonGlass>
            </div>

            <CardGlass>
                {renderTabs()}

                <div className="mb-6 flex gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40" size={20} />
                        <input
                            type="text"
                            placeholder="Cari data..."
                            className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-white placeholder-white/40 focus:outline-none focus:border-white/30 transition-colors"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {renderContent()}
            </CardGlass>

            <ModalGlass
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                title={`Tambah ${activeTab === 'classes' ? 'Kelas' :
                    activeTab === 'subjects' ? 'Mata Pelajaran' : 'Jadwal'
                    }`}
            >
                <form onSubmit={handleSubmit}>
                    {renderModalContent()}
                    <div className="mt-6 flex justify-end space-x-3">
                        <button
                            type="button"
                            onClick={handleCloseModal}
                            className="px-4 py-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                        >
                            Batal
                        </button>
                        <ButtonGlass type="submit">
                            Simpan
                        </ButtonGlass>
                    </div>
                </form>
            </ModalGlass>
        </div>
    );
};

export default Academic;
