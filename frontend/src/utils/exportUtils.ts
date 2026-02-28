export const exportToCSV = (data: any[], filename: string) => {
    if (!data || !data.length) {
        alert("Tidak ada data untuk diekspor");
        return;
    }

    // Get headers
    const headers = Object.keys(data[0]);

    // Create CSV content
    const csvContent = [
        headers.join(','),
        ...data.map(row =>
            headers.map(fieldName => {
                let cellData = row[fieldName];
                if (cellData === null || cellData === undefined) {
                    return '""';
                }
                // Handle objects (like student: { user: { name: '...' } })
                if (typeof cellData === 'object') {
                    cellData = JSON.stringify(cellData).replace(/"/g, '""');
                }
                // Wrap in quotes and escape internal quotes
                return `"${String(cellData).replace(/"/g, '""')}"`;
            }).join(',')
        )
    ].join('\r\n');

    // Create Blob and download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
};
