import React, { InputHTMLAttributes } from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '../../../lib/utils';

interface InputGlassProps extends InputHTMLAttributes<HTMLInputElement> {
    className?: string;
    icon?: LucideIcon;
    label?: string;
}

const InputGlass: React.FC<InputGlassProps> = ({ className, icon: Icon, label, ...props }) => {
    return (
        <div className="space-y-2">
            {label && (
                <label className="text-sm font-medium text-white/80 ml-1">
                    {label}
                </label>
            )}
            <div className="relative">
                {Icon && (
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                        <Icon size={18} />
                    </div>
                )}
                <input
                    className={cn(
                        "glass-input w-full",
                        Icon && "pl-10",
                        className
                    )}
                    {...props}
                />
            </div>
        </div>
    );
};

export default InputGlass;
