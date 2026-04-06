import { Toaster } from 'react-hot-toast';

const ToastProvider = () => (
    <Toaster
        position="top-right"
        toastOptions={{
            duration: 3000,
            style: {
                borderRadius: '12px',
                background: '#1e293b',
                color: '#f8fafc',
                fontSize: '14px',
                padding: '12px 16px',
            },
            success: {
                iconTheme: { primary: '#10b981', secondary: '#f8fafc' },
            },
            error: {
                iconTheme: { primary: '#ef4444', secondary: '#f8fafc' },
                duration: 4000,
            },
        }}
    />
);

export default ToastProvider;
