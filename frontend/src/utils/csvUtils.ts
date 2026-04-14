// CSV utility functions for bulk import feature
// Feature: ppdb-payment-and-improvements

export interface ParsedRow {
    row: number;
    name: string;
    email: string;
    password: string;
    role_id: string;
    unit_id: string;
    nisn?: string;
    class_id?: string;
}

/**
 * Parses CSV text into an array of ParsedRow objects.
 * Handles quoted fields and skips empty lines.
 */
export function parseCSV(text: string): ParsedRow[] {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    const rows: ParsedRow[] = [];

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Handle quoted fields
        const values: string[] = [];
        let current = '';
        let inQuotes = false;
        for (const ch of line) {
            if (ch === '"') { inQuotes = !inQuotes; }
            else if (ch === ',' && !inQuotes) { values.push(current.trim()); current = ''; }
            else { current += ch; }
        }
        values.push(current.trim());

        const obj: Record<string, string> = {};
        headers.forEach((h, idx) => { obj[h] = values[idx] ?? ''; });

        rows.push({
            row: i,
            name: obj['name'] ?? '',
            email: obj['email'] ?? '',
            password: obj['password'] ?? '',
            role_id: obj['role_id'] ?? '',
            unit_id: obj['unit_id'] ?? '',
            nisn: obj['nisn'],
            class_id: obj['class_id'],
        });
    }

    return rows;
}

/**
 * Generates and triggers download of a CSV template file
 * with example rows to guide users.
 */
export function downloadCSVTemplate(): void {
    const header = 'name,email,password,role_id,unit_id,nisn,class_id';
    const examples = [
        'Budi Santoso,budi@example.com,password123,6,1,1234567890,1',
        'Siti Rahayu,siti@example.com,password456,6,1,0987654321,2',
        'Ahmad Guru,ahmad@example.com,password789,4,1,,',
    ];
    const csvContent = [header, ...examples].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'template_bulk_import.csv';
    a.click();
    URL.revokeObjectURL(url);
}
