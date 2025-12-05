import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '../../../lib/utils';

interface ButtonGlassProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    children: React.ReactNode;
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
    className?: string;
    icon?: LucideIcon;
}

const ButtonGlass: React.FC<ButtonGlassProps> = ({ children, variant = 'primary', className, icon: Icon, ...props }) => {
    const variants = {
        primary: "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-purple-500/20",
        secondary: "bg-white/10 hover:bg-white/20 text-slate-900 border border-white/10",
        danger: "bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-500 hover:to-pink-500 text-white shadow-red-500/20",
        ghost: "bg-transparent hover:bg-white/5 text-slate-300-300 hover:text-slate-900",
    };

    return (
        <button
            className={cn(
                "font-medium py-2.5 px-5 rounded-xl transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2",
                variants[variant],
                className
            )}
            {...props}
        >
            {Icon && <Icon size={18} />}
            {children}
        </button>
    );
};

export default ButtonGlass;
