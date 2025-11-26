import React from 'react';
import { Bell, Search, Menu } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const Header: React.FC = () => {
    const { user } = useAuth();

    return (
        <header className="sticky top-0 z-30 px-6 py-4 lg:px-8">
            <div className="glass-panel rounded-2xl px-6 py-3 flex justify-between items-center">
                {/* Mobile Menu Button (Visible only on small screens) */}
                <button className="lg:hidden text-slate-500 hover:text-slate-900">
                    <Menu size={24} />
                </button>

                {/* Search Bar */}
                <div className="hidden md:flex items-center gap-3 flex-1 max-w-md ml-4">
                    <div className="relative w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search..."
                            className="w-full bg-white/50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500/20 transition-all"
                        />
                    </div>
                </div>

                {/* Right Actions */}
                <div className="flex items-center gap-4 ml-auto">
                    <button className="relative p-2 text-slate-500 hover:text-slate-900 transition-colors">
                        <Bell size={20} />
                        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
                    </button>

                    <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
                        <div className="text-right hidden sm:block">
                            <p className="text-sm font-medium text-slate-900">{user?.Name || 'User'}</p>
                            <p className="text-xs text-slate-500">{user?.RoleID === 1 ? 'Super Admin' : 'User'}</p>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white font-bold shadow-lg shadow-green-500/20">
                            {user?.Name?.charAt(0) || 'U'}
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;
