import React, { InputHTMLAttributes, useState } from 'react';
import { LucideIcon, Eye, EyeOff } from 'lucide-react';
import { cn } from '../../../lib/utils';

interface InputGlassProps extends InputHTMLAttributes<HTMLInputElement> {
    className?: string;
    icon?: LucideIcon;
    label?: string;
}

const InputGlass: React.FC<InputGlassProps> = ({ className, icon: Icon, label, type, ...props }) => {
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === 'password';

    return (
        <div className="space-y-2">
            {label && (
                <label className="text-sm font-medium text-slate-900/80 ml-1">
                    {label}
                </label>
            )}
            <div className="relative">
                {Icon && (
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                        <Icon size={18} />
                    </div>
                )}
                <input
                    type={isPassword && showPassword ? 'text' : type}
                    className={cn(
                        "glass-input w-full",
                        Icon && "pl-10",
                        isPassword && "pr-10",
                        className
                    )}
                    {...props}
                />
                {isPassword && (
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                    >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                )}
            </div>
        </div>
    );
};

export default InputGlass;
