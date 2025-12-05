import React from 'react';
import { cn } from '../../../lib/utils';

export interface TableGlassProps extends React.TableHTMLAttributes<HTMLTableElement> {
    headers?: string[];
    data?: { id: string | number;[key: string]: any; actions?: React.ReactNode }[];
    children?: React.ReactNode;
    className?: string;
}

export const TableGlass: React.FC<TableGlassProps> = ({ headers, data, children, className, ...props }) => {
    if (headers && data) {
        return (
            <div className="w-full overflow-x-auto rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md">
                <table className={cn("w-full text-left text-sm text-slate-300-300", className)} {...props}>
                    <TableHeaderGlass>
                        <TableRowGlass>
                            {headers.map((header, index) => (
                                <TableHeadGlass key={index}>{header}</TableHeadGlass>
                            ))}
                        </TableRowGlass>
                    </TableHeaderGlass>
                    <TableBodyGlass>
                        {data.map((row, rowIndex) => (
                            <TableRowGlass key={row.id || rowIndex}>
                                {headers.map((_header, colIndex) => {
                                    // Map header to data key (lowercase, replace spaces with underscores if needed)
                                    // This is a simple mapping, might need adjustment based on data structure
                                    // For now, assuming data keys match header names or we iterate values
                                    // But data is passed as object, so we need to know keys.
                                    // In Academic.tsx, data is mapped to specific keys.
                                    // Let's assume the data object keys order matches headers or we just render values excluding id/actions if not in header?
                                    // Actually, Academic.tsx maps data to specific keys.
                                    // Let's just render the values of the row object (excluding id if not in header?)
                                    // Better approach: The data object in Academic.tsx seems to have keys matching what we want to display.
                                    // Let's iterate over the object values.

                                    // Wait, the data in Academic.tsx is: { id, name, unit, actions }
                                    // Headers: ['ID', 'Nama Kelas', 'Unit ID', 'Aksi']
                                    // So we can just iterate object values.
                                    const values = Object.values(row);
                                    // Ensure we don't render 'id' if it's used as key but not in headers? 
                                    // Actually, let's just render all values in the row object.
                                    const cellValue = values[colIndex];
                                    return (
                                        <TableCellGlass key={colIndex}>
                                            {cellValue}
                                        </TableCellGlass>
                                    );
                                })}
                            </TableRowGlass>
                        ))}
                    </TableBodyGlass>
                </table>
            </div>
        );
    }

    return (
        <div className="w-full overflow-x-auto rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md">
            <table className={cn("w-full text-left text-sm text-slate-300-300", className)} {...props}>
                {children}
            </table>
        </div>
    );
};

export const TableHeaderGlass: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({ children, className, ...props }) => {
    return (
        <thead className={cn("bg-white/5 text-xs uppercase text-slate-300-200", className)} {...props}>
            {children}
        </thead>
    );
};

export const TableBodyGlass: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({ children, className, ...props }) => {
    return (
        <tbody className={cn("divide-y divide-white/10", className)} {...props}>
            {children}
        </tbody>
    );
};

export const TableRowGlass: React.FC<React.HTMLAttributes<HTMLTableRowElement>> = ({ children, className, ...props }) => {
    return (
        <tr className={cn("hover:bg-white/5 transition-colors", className)} {...props}>
            {children}
        </tr>
    );
};

export const TableHeadGlass: React.FC<React.ThHTMLAttributes<HTMLTableCellElement>> = ({ children, className, ...props }) => {
    return (
        <th className={cn("px-6 py-4 font-medium", className)} {...props}>
            {children}
        </th>
    );
};

export const TableCellGlass: React.FC<React.TdHTMLAttributes<HTMLTableCellElement>> = ({ children, className, ...props }) => {
    return (
        <td className={cn("px-6 py-4", className)} {...props}>
            {children}
        </td>
    );
};
