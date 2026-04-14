import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Plus, Trash2, DollarSign } from 'lucide-react';
import ModalGlass from './ui/glass/ModalGlass';
import ButtonGlass from './ui/glass/ButtonGlass';
import InputGlass from './ui/glass/InputGlass';

interface PPDBRegistration {
    id: string;
    name: string;
    nisn: string;
    phone: string;
    status: string;
}

interface PaymentItemForm {
    item_name: string;
    expected_amount: string;
    paid_amount: string;
}

interface PPDBPaymentFormProps {
    isOpen: boolean;
    onClose: () => void;
    editPayment?: any;
}

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(amount);
};

const PPDBPaymentForm: React.FC<PPDBPaymentFormProps> = ({ isOpen, onClose, editPayment }) => {
    const queryClient = useQueryClient();
    const [selectedRegistrationId, setSelectedRegistrationId] = useState('');
    const [items, setItems] = useState<PaymentItemForm[]>([
        { item_name: 'Uang Bangunan', expected_amount: '', paid_amount: '' },
        { item_name: 'Uang Tes Kemampuan', expected_amount: '', paid_amount: '' }
    ]);
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Fetch PPDB registrations
    const { data: registrations } = useQuery({
        queryKey: ['ppdb-registrations-for-payment'],
        queryFn: async () => {
            const res = await api.get('/ppdb/');
            return res.data;
        },
        enabled: isOpen
    });

    // Reset form when modal opens/closes
    useEffect(() => {
        if (isOpen && !editPayment) {
            setSelectedRegistrationId('');
            setItems([
                { item_name: 'Uang Bangunan', expected_amount: '', paid_amount: '' },
                { item_name: 'Uang Tes Kemampuan', expected_amount: '', paid_amount: '' }
            ]);
            setErrors({});
        }
    }, [isOpen, editPayment]);

    // Load edit data
    useEffect(() => {
        if (editPayment) {
            setSelectedRegistrationId(editPayment.ppdb_registration_id);
            setItems(editPayment.items.map((item: any) => ({
                item_name: item.item_name,
                expected_amount: String(item.expected_amount),
                paid_amount: String(item.paid_amount)
            })));
        }
    }, [editPayment]);

    const createPaymentMutation = useMutation({
        mutationFn: async (data: any) => {
            if (editPayment) {
                return api.put(`/ppdb/payments/${editPayment.id}`, data);
            }
            return api.post('/ppdb/payments', data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ppdb-payments'] });
            toast.success(editPayment ? 'Pembayaran berhasil diperbarui' : 'Pembayaran berhasil dicatat');
            onClose();
        }
    });

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!selectedRegistrationId) {
            newErrors.registration = 'Pilih calon siswa terlebih dahulu';
        }

        if (items.length === 0) {
            newErrors.items = 'Tambahkan minimal satu item pembayaran';
        }

        items.forEach((item, index) => {
            if (!item.item_name.trim()) {
                newErrors[`item_name_${index}`] = 'Nama item wajib diisi';
            }
            if (!item.expected_amount || parseFloat(item.expected_amount) <= 0) {
                newErrors[`expected_amount_${index}`] = 'Nominal yang diharapkan harus lebih dari 0';
            }
            if (!item.paid_amount || parseFloat(item.paid_amount) < 0) {
                newErrors[`paid_amount_${index}`] = 'Nominal yang dibayar tidak boleh negatif';
            }
            if (parseFloat(item.paid_amount) > parseFloat(item.expected_amount)) {
                newErrors[`paid_amount_${index}`] = 'Nominal yang dibayar tidak boleh melebihi yang diharapkan';
            }
        });

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            toast.error('Mohon perbaiki kesalahan pada form');
            return;
        }

        const payload = {
            ppdb_registration_id: selectedRegistrationId,
            items: items.map(item => ({
                item_name: item.item_name,
                expected_amount: parseFloat(item.expected_amount),
                paid_amount: parseFloat(item.paid_amount)
            }))
        };

        createPaymentMutation.mutate(payload);
    };

    const addItem = () => {
        setItems([...items, { item_name: '', expected_amount: '', paid_amount: '' }]);
    };

    const removeItem = (index: number) => {
        if (items.length > 1) {
            setItems(items.filter((_, i) => i !== index));
        } else {
            toast.error('Minimal harus ada satu item pembayaran');
        }
    };

    const updateItem = (index: number, field: keyof PaymentItemForm, value: string) => {
        const newItems = [...items];
        newItems[index][field] = value;
        setItems(newItems);
        
        // Clear error for this field
        const errorKey = `${field}_${index}`;
        if (errors[errorKey]) {
            const newErrors = { ...errors };
            delete newErrors[errorKey];
            setErrors(newErrors);
        }
    };

    const calculateTotal = () => {
        return items.reduce((sum, item) => {
            const expected = parseFloat(item.expected_amount) || 0;
            return sum + expected;
        }, 0);
    };

    const calculateTotalPaid = () => {
        return items.reduce((sum, item) => {
            const paid = parseFloat(item.paid_amount) || 0;
            return sum + paid;
        }, 0);
    };

    return (
        <ModalGlass
            isOpen={isOpen}
            onClose={onClose}
            title={editPayment ? 'Edit Pembayaran PPDB' : 'Catat Pembayaran PPDB'}
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Select PPDB Registration */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                        Calon Siswa <span className="text-red-500">*</span>
                    </label>
                    <select
                        value={selectedRegistrationId}
                        onChange={(e) => {
                            setSelectedRegistrationId(e.target.value);
                            if (errors.registration) {
                                const newErrors = { ...errors };
                                delete newErrors.registration;
                                setErrors(newErrors);
                            }
                        }}
                        className={`w-full px-3 py-2.5 border rounded-xl text-sm ${
                            errors.registration ? 'border-red-300' : 'border-slate-200'
                        }`}
                        disabled={!!editPayment}
                    >
                        <option value="">Pilih Calon Siswa</option>
                        {registrations?.map((reg: PPDBRegistration) => (
                            <option key={reg.id} value={reg.id}>
                                {reg.name} - {reg.nisn}
                            </option>
                        ))}
                    </select>
                    {errors.registration && (
                        <p className="mt-1 text-xs text-red-500">{errors.registration}</p>
                    )}
                </div>

                {/* Payment Items */}
                <div>
                    <div className="flex justify-between items-center mb-3">
                        <label className="block text-sm font-medium text-slate-700">
                            Rincian Item Biaya <span className="text-red-500">*</span>
                        </label>
                        <button
                            type="button"
                            onClick={addItem}
                            className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                        >
                            <Plus size={14} />
                            Tambah Item
                        </button>
                    </div>

                    <div className="space-y-3">
                        {items.map((item, index) => (
                            <div key={index} className="p-4 border border-slate-200 rounded-lg bg-slate-50/50">
                                <div className="flex justify-between items-start mb-3">
                                    <span className="text-xs font-semibold text-slate-500">Item #{index + 1}</span>
                                    {items.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => removeItem(index)}
                                            className="text-red-500 hover:text-red-700"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    )}
                                </div>

                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-xs font-medium text-slate-600 mb-1">
                                            Nama Item
                                        </label>
                                        <input
                                            type="text"
                                            value={item.item_name}
                                            onChange={(e) => updateItem(index, 'item_name', e.target.value)}
                                            className={`w-full px-3 py-2 border rounded-lg text-sm ${
                                                errors[`item_name_${index}`] ? 'border-red-300' : 'border-slate-200'
                                            }`}
                                            placeholder="Contoh: Uang Bangunan"
                                        />
                                        {errors[`item_name_${index}`] && (
                                            <p className="mt-1 text-xs text-red-500">{errors[`item_name_${index}`]}</p>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-medium text-slate-600 mb-1">
                                                Nominal yang Diharapkan (Rp)
                                            </label>
                                            <input
                                                type="number"
                                                value={item.expected_amount}
                                                onChange={(e) => updateItem(index, 'expected_amount', e.target.value)}
                                                className={`w-full px-3 py-2 border rounded-lg text-sm ${
                                                    errors[`expected_amount_${index}`] ? 'border-red-300' : 'border-slate-200'
                                                }`}
                                                placeholder="0"
                                                min="0"
                                                step="1000"
                                            />
                                            {errors[`expected_amount_${index}`] && (
                                                <p className="mt-1 text-xs text-red-500">{errors[`expected_amount_${index}`]}</p>
                                            )}
                                        </div>

                                        <div>
                                            <label className="block text-xs font-medium text-slate-600 mb-1">
                                                Jumlah yang Dibayar (Rp)
                                            </label>
                                            <input
                                                type="number"
                                                value={item.paid_amount}
                                                onChange={(e) => updateItem(index, 'paid_amount', e.target.value)}
                                                className={`w-full px-3 py-2 border rounded-lg text-sm ${
                                                    errors[`paid_amount_${index}`] ? 'border-red-300' : 'border-slate-200'
                                                }`}
                                                placeholder="0"
                                                min="0"
                                                step="1000"
                                            />
                                            {errors[`paid_amount_${index}`] && (
                                                <p className="mt-1 text-xs text-red-500">{errors[`paid_amount_${index}`]}</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {errors.items && (
                        <p className="mt-2 text-xs text-red-500">{errors.items}</p>
                    )}
                </div>

                {/* Summary */}
                <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-100">
                    <div className="flex items-center gap-2 mb-3">
                        <DollarSign size={16} className="text-indigo-600" />
                        <h3 className="text-sm font-semibold text-indigo-900">Ringkasan</h3>
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-600">Total yang Diharapkan:</span>
                            <span className="font-semibold text-slate-900">{formatCurrency(calculateTotal())}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-600">Total yang Dibayar:</span>
                            <span className="font-semibold text-green-600">{formatCurrency(calculateTotalPaid())}</span>
                        </div>
                        <div className="flex justify-between text-sm pt-2 border-t border-indigo-200">
                            <span className="text-slate-600">Sisa:</span>
                            <span className="font-semibold text-amber-600">
                                {formatCurrency(Math.max(0, calculateTotal() - calculateTotalPaid()))}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                    <ButtonGlass
                        type="button"
                        variant="secondary"
                        onClick={onClose}
                    >
                        Batal
                    </ButtonGlass>
                    <ButtonGlass
                        type="submit"
                        variant="primary"
                        disabled={createPaymentMutation.isPending}
                    >
                        {createPaymentMutation.isPending ? 'Menyimpan...' : 'Simpan Pembayaran'}
                    </ButtonGlass>
                </div>
            </form>
        </ModalGlass>
    );
};

export default PPDBPaymentForm;
