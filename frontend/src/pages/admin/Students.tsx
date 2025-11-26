import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import { Edit, Trash2 } from 'lucide-react';

interface Student {
    ID: string;
    User: {
        Name: string;
        Email: string;
    };
    NISN: string;
    Class: {
        Name: string;
    };
}

const Students: React.FC = () => {
    const [unitID, setUnitID] = useState(1);

    const { data: students, isLoading } = useQuery({
        queryKey: ['students', unitID],
        queryFn: async () => {
            const res = await api.get(`/students/?unit_id=${unitID}`);
            return res.data;
        },
    });

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-800">Data Siswa</h1>
                <div className="flex space-x-2">
                    <select
                        value={unitID}
                        onChange={(e) => setUnitID(Number(e.target.value))}
                        className="border rounded-lg px-3 py-2 bg-white"
                    >
                        <option value={1}>MTS</option>
                        <option value={2}>MA</option>
                    </select>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">NISN</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nama</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kelas</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {isLoading ? (
                                <tr><td colSpan={4} className="text-center py-4">Loading...</td></tr>
                            ) : (
                                students?.map((student: Student) => (
                                    <tr key={student.ID}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.NISN}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{student.User.Name}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.Class?.Name || '-'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button className="text-indigo-600 hover:text-indigo-900 mr-4"><Edit size={18} /></button>
                                            <button className="text-red-600 hover:text-red-900"><Trash2 size={18} /></button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Students;
