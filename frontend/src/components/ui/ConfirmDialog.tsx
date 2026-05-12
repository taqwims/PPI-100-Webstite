import React, { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title?: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'info';
    isLoading?: boolean;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title = 'Konfirmasi',
    message,
    confirmText = 'Ya, Lanjutkan',
    cancelText = 'Batal',
    variant = 'danger',
    isLoading = false
}) => {
    const colors = {
        danger: {
            bg: 'bg-rose-50',
            icon: 'text-rose-500',
            btn: 'bg-rose-600 hover:bg-rose-700 shadow-rose-200',
            ring: 'focus:ring-rose-500'
        },
        warning: {
            bg: 'bg-amber-50',
            icon: 'text-amber-500',
            btn: 'bg-amber-600 hover:bg-amber-700 shadow-amber-200',
            ring: 'focus:ring-amber-500'
        },
        info: {
            bg: 'bg-blue-50',
            icon: 'text-blue-500',
            btn: 'bg-blue-600 hover:bg-blue-700 shadow-blue-200',
            ring: 'focus:ring-blue-500'
        }
    }[variant];

    return (
        <Transition show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-[70]" onClose={onClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-[2rem] bg-white p-8 text-left align-middle shadow-2xl transition-all border border-slate-100">
                                <button
                                    onClick={onClose}
                                    className="absolute right-6 top-6 text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                    <X size={20} />
                                </button>

                                <div className="flex flex-col items-center text-center">
                                    <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-2xl ${colors.bg} mb-6`}>
                                        <AlertTriangle className={`h-8 w-8 ${colors.icon}`} aria-hidden="true" />
                                    </div>
                                    <Dialog.Title
                                        as="h3"
                                        className="text-2xl font-black leading-6 text-slate-900 tracking-tight mb-3"
                                    >
                                        {title}
                                    </Dialog.Title>
                                    <div className="mt-2">
                                        <p className="text-slate-500 font-medium leading-relaxed">
                                            {message}
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-8 flex flex-col-reverse sm:flex-row gap-3">
                                    <button
                                        type="button"
                                        className="inline-flex flex-1 justify-center rounded-2xl border-2 border-slate-100 bg-white px-6 py-3.5 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2"
                                        onClick={onClose}
                                        disabled={isLoading}
                                    >
                                        {cancelText}
                                    </button>
                                    <button
                                        type="button"
                                        className={`inline-flex flex-1 justify-center rounded-2xl border border-transparent px-6 py-3.5 text-sm font-bold text-white shadow-xl transition-all focus:outline-none focus-visible:ring-2 ${colors.ring} focus-visible:ring-offset-2 ${colors.btn}`}
                                        onClick={onConfirm}
                                        disabled={isLoading}
                                    >
                                        {isLoading ? (
                                            <div className="flex items-center gap-2">
                                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                                <span>Memproses...</span>
                                            </div>
                                        ) : confirmText}
                                    </button>
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
};

export default ConfirmDialog;
