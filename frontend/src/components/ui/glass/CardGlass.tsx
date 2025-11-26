import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface CardGlassProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
    className?: string;
}

const CardGlass: React.FC<CardGlassProps> = ({ children, className, ...props }) => {
    return (
        <div
            className={cn(
                "glass-panel rounded-3xl p-6 transition-all duration-300 hover:bg-white/15",
                className
            )}
            {...props}
        >
            {children}
        </div>
    );
};

export default CardGlass;
