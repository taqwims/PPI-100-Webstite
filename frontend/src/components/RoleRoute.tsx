import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

/**
 * Mapping role ID ke default route setelah login.
 * Role IDs:
 *   1 = Super Admin
 *   2 = Admin MTS
 *   3 = Admin MA
 *   4 = Guru
 *   5 = Wali Kelas
 *   6 = Siswa
 *   7 = Orang Tua
 *   8 = Pimpinan
 *   9 = Bendahara
 *  10 = Teller Tabungan
 *  11 = Teller Transaksional
 */
export const getDefaultRoute = (roleId: number): string => {
    const routes: Record<number, string> = {
        1: '/dashboard',
        2: '/dashboard',
        3: '/dashboard',
        4: '/dashboard/teacher/schedule',
        5: '/dashboard/homeroom',
        6: '/dashboard/bills',
        7: '/dashboard/children',
        8: '/dashboard/principal/finance-summary',
        9: '/dashboard/finance/cash-ledger',
        10: '/dashboard',
        11: '/dashboard/finance/cash-ledger',
    };
    return routes[roleId] ?? '/dashboard';
};

interface RoleRouteProps {
    children: React.ReactNode;
    /** Daftar role ID yang diizinkan mengakses route ini */
    allowedRoles: number[];
    /** Konten alternatif jika role tidak diizinkan (default: redirect ke default route) */
    fallback?: React.ReactNode;
}

/**
 * RoleRoute — melindungi route berdasarkan role user.
 * Jika user tidak login → redirect ke /login
 * Jika role tidak diizinkan → redirect ke default route atau render fallback
 */
const RoleRoute: React.FC<RoleRouteProps> = ({ children, allowedRoles, fallback }) => {
    const { user, isAuthenticated } = useAuthStore();

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    // Tunggu user profile selesai di-load
    if (!user) {
        return null;
    }

    if (!allowedRoles.includes(user.role_id)) {
        if (fallback) {
            return <>{fallback}</>;
        }
        return <Navigate to={getDefaultRoute(user.role_id)} replace />;
    }

    return <>{children}</>;
};

export default RoleRoute;
