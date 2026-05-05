// Import utility functions for bulk import feature
// Supports both CSV and XLSX formats

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

// ─── CSV Parsing ──────────────────────────────────────────────────────────────

export function parseCSV(text: string): ParsedRow[] {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    const rows: ParsedRow[] = [];

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

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

// ─── XLSX Parsing (Pure JS — central-directory based ZIP reader) ──────────────

/**
 * Reads ZIP via the Central Directory (at end of file) for reliability.
 * Handles both stored (method 0) and deflated (method 8) entries.
 */
async function unzip(buffer: ArrayBuffer): Promise<Map<string, Uint8Array>> {
    const bytes = new Uint8Array(buffer);
    const view = new DataView(buffer);
    const files = new Map<string, Uint8Array>();

    // 1. Find EOCD (End of Central Directory) — scan backwards
    let eocdOffset = -1;
    for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) {
        if (view.getUint32(i, true) === 0x06054b50) {
            eocdOffset = i;
            break;
        }
    }
    if (eocdOffset === -1) throw new Error('ZIP EOCD tidak ditemukan — file bukan ZIP/XLSX yang valid');

    const totalEntries = view.getUint16(eocdOffset + 10, true);
    const centralDirOffset = view.getUint32(eocdOffset + 16, true);

    // 2. Walk Central Directory entries
    let cdOffset = centralDirOffset;
    for (let e = 0; e < totalEntries; e++) {
        if (cdOffset + 46 > bytes.length) break;
        if (view.getUint32(cdOffset, true) !== 0x02014b50) break;

        const compressionMethod = view.getUint16(cdOffset + 10, true);
        const compressedSize = view.getUint32(cdOffset + 20, true);
        const uncompressedSize = view.getUint32(cdOffset + 24, true);
        const fileNameLen = view.getUint16(cdOffset + 28, true);
        const extraFieldLen = view.getUint16(cdOffset + 30, true);
        const commentLen = view.getUint16(cdOffset + 32, true);
        const localHeaderOffset = view.getUint32(cdOffset + 42, true);

        const fileName = new TextDecoder().decode(
            bytes.slice(cdOffset + 46, cdOffset + 46 + fileNameLen)
        );

        // 3. Jump to local file header to find actual data start
        const localFileNameLen = view.getUint16(localHeaderOffset + 26, true);
        const localExtraLen = view.getUint16(localHeaderOffset + 28, true);
        const dataStart = localHeaderOffset + 30 + localFileNameLen + localExtraLen;

        let fileData: Uint8Array;

        if (compressedSize === 0 && uncompressedSize === 0) {
            // Directory entry or truly empty file
            fileData = new Uint8Array(0);
        } else if (compressionMethod === 0) {
            // Stored — raw copy
            fileData = bytes.slice(dataStart, dataStart + uncompressedSize);
        } else if (compressionMethod === 8) {
            // Deflated — use browser DecompressionStream
            const compressed = bytes.slice(dataStart, dataStart + compressedSize);
            try {
                const ds = new DecompressionStream('deflate-raw');
                const writer = ds.writable.getWriter();
                writer.write(compressed);
                writer.close();
                const reader = ds.readable.getReader();
                const chunks: Uint8Array[] = [];
                // eslint-disable-next-line no-constant-condition
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    chunks.push(value);
                }
                const totalLen = chunks.reduce((a, c) => a + c.length, 0);
                fileData = new Uint8Array(totalLen);
                let pos = 0;
                for (const chunk of chunks) { fileData.set(chunk, pos); pos += chunk.length; }
            } catch (err) {
                console.warn(`[XLSX] Gagal dekompresi ${fileName}:`, err);
                fileData = new Uint8Array(0);
            }
        } else {
            console.warn(`[XLSX] Metode kompresi tidak didukung (${compressionMethod}) untuk ${fileName}`);
            fileData = new Uint8Array(0);
        }

        if (fileData.length > 0) {
            files.set(fileName, fileData);
        }

        cdOffset += 46 + fileNameLen + extraFieldLen + commentLen;
    }

    return files;
}

function decodeXmlEntities(s: string): string {
    return s
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'");
}

function parseSharedStrings(xml: string): string[] {
    const strings: string[] = [];
    const siRegex = /<si>([\s\S]*?)<\/si>/g;
    let match;
    while ((match = siRegex.exec(xml)) !== null) {
        const siContent = match[1];
        const tRegex = /<t[^>]*>([\s\S]*?)<\/t>/g;
        let tMatch;
        let text = '';
        while ((tMatch = tRegex.exec(siContent)) !== null) {
            text += tMatch[1];
        }
        strings.push(decodeXmlEntities(text));
    }
    return strings;
}

function colLetterToIndex(col: string): number {
    let idx = 0;
    for (let i = 0; i < col.length; i++) {
        idx = idx * 26 + (col.charCodeAt(i) - 64);
    }
    return idx - 1;
}

/**
 * Parse a worksheet XML into a 2D string array.
 * Uses attribute-order-independent parsing for <c> elements.
 */
function parseSheet(xml: string, sharedStrings: string[]): string[][] {
    const rows: string[][] = [];
    const rowRegex = /<row\b[^>]*>([\s\S]*?)<\/row>/g;
    let rowMatch;

    while ((rowMatch = rowRegex.exec(xml)) !== null) {
        const rowContent = rowMatch[1];
        // Match each <c ...>...</c> or self-closing <c .../>
        const cellRegex = /<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g;
        let cellMatch;
        const rowData: string[] = [];

        while ((cellMatch = cellRegex.exec(rowContent)) !== null) {
            const attrs = cellMatch[1];
            const innerContent = cellMatch[2] || '';

            // Extract "r" attribute (cell reference, e.g. "A1", "B3")
            const rMatch = attrs.match(/r="([^"]+)"/);
            if (!rMatch) continue;
            const colPart = rMatch[1].match(/^([A-Z]+)/);
            if (!colPart) continue;
            const colIdx = colLetterToIndex(colPart[1]);

            // Extract "t" attribute (type: "s" = shared string, "inlineStr", etc.)
            const tMatch = attrs.match(/t="([^"]+)"/);
            const cellType = tMatch ? tMatch[1] : '';

            // Extract <v>value</v>
            const vMatch = innerContent.match(/<v>([\s\S]*?)<\/v>/);
            const rawValue = vMatch ? vMatch[1] : '';

            while (rowData.length <= colIdx) rowData.push('');

            if (cellType === 's') {
                const ssIdx = parseInt(rawValue, 10);
                rowData[colIdx] = (ssIdx >= 0 && ssIdx < sharedStrings.length)
                    ? sharedStrings[ssIdx]
                    : rawValue;
            } else if (cellType === 'inlineStr') {
                const tInline = innerContent.match(/<t[^>]*>([\s\S]*?)<\/t>/);
                rowData[colIdx] = tInline ? decodeXmlEntities(tInline[1]) : '';
            } else {
                rowData[colIdx] = decodeXmlEntities(rawValue);
            }
        }

        if (rowData.some(v => v !== '')) {
            rows.push(rowData);
        }
    }

    return rows;
}

export async function parseXLSX(buffer: ArrayBuffer): Promise<ParsedRow[]> {
    const files = await unzip(buffer);

    // Debug: log found entries
    console.log('[XLSX] Entries ditemukan:', [...files.keys()]);

    // Get shared strings
    let sharedStrings: string[] = [];
    const ssFile = files.get('xl/sharedStrings.xml');
    if (ssFile) {
        const ssXml = new TextDecoder().decode(ssFile);
        sharedStrings = parseSharedStrings(ssXml);
        console.log('[XLSX] Shared strings:', sharedStrings.length);
    }

    // Get first sheet
    const sheetFile = files.get('xl/worksheets/sheet1.xml');
    if (!sheetFile) {
        // Try alternate path or list available sheets
        const sheetNames = [...files.keys()].filter(k => k.includes('worksheets/'));
        console.error('[XLSX] sheet1.xml tidak ditemukan. Sheets:', sheetNames);
        if (sheetNames.length > 0) {
            const alt = files.get(sheetNames[0]);
            if (alt) {
                const altXml = new TextDecoder().decode(alt);
                const data = parseSheet(altXml, sharedStrings);
                return convertDataToRows(data);
            }
        }
        throw new Error('Sheet tidak ditemukan dalam file XLSX');
    }

    const sheetXml = new TextDecoder().decode(sheetFile);
    const data = parseSheet(sheetXml, sharedStrings);
    console.log('[XLSX] Parsed rows:', data.length);

    return convertDataToRows(data);
}

function convertDataToRows(data: string[][]): ParsedRow[] {
    if (data.length < 2) return [];

    const headers = data[0].map(h => h.trim().toLowerCase());
    const rows: ParsedRow[] = [];

    for (let i = 1; i < data.length; i++) {
        const vals = data[i];
        const obj: Record<string, string> = {};
        headers.forEach((h, idx) => { obj[h] = (vals[idx] ?? '').trim(); });

        // Skip completely empty rows or role-info reference rows
        if (!obj['name'] && !obj['email']) continue;

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

// ─── Unified file parser ──────────────────────────────────────────────────────

export async function parseImportFile(file: File): Promise<ParsedRow[]> {
    const ext = file.name.split('.').pop()?.toLowerCase();

    if (ext === 'csv') {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const text = e.target?.result as string;
                resolve(parseCSV(text));
            };
            reader.onerror = () => reject(new Error('Gagal membaca file CSV'));
            reader.readAsText(file);
        });
    }

    if (ext === 'xlsx') {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const buffer = e.target?.result as ArrayBuffer;
                    const rows = await parseXLSX(buffer);
                    resolve(rows);
                } catch (err) {
                    console.error('[XLSX] Parse error:', err);
                    reject(err);
                }
            };
            reader.onerror = () => reject(new Error('Gagal membaca file XLSX'));
            reader.readAsArrayBuffer(file);
        });
    }

    throw new Error('Format file tidak didukung. Gunakan .csv atau .xlsx');
}

// ─── XLSX Template Generator ─────────────────────────────────────────────────

function colIndexToLetter(idx: number): string {
    let result = '';
    let n = idx;
    while (n >= 0) {
        result = String.fromCharCode(65 + (n % 26)) + result;
        n = Math.floor(n / 26) - 1;
    }
    return result;
}

function escXml(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function buildXLSXTemplate(): Blob {
    const roleInfo = [
        ['', '', '', '', '', '', ''],
        ['REFERENSI ROLE ID:', '', '', '', '', '', ''],
        ['Role ID', 'Nama Role', 'Keterangan', '', '', '', ''],
        ['1', 'Super Admin', 'Administrator sistem', '', '', '', ''],
        ['4', 'Guru', 'Tenaga pengajar', '', '', '', ''],
        ['5', 'Wali Kelas', 'Guru wali kelas', '', '', '', ''],
        ['6', 'Siswa', 'Peserta didik (wajib isi nisn & class_id)', '', '', '', ''],
        ['7', 'Orang Tua', 'Orang tua/wali murid', '', '', '', ''],
        ['9', 'Bendahara', 'Bendahara keuangan', '', '', '', ''],
        ['10', 'Teller Tabungan', 'Petugas tabungan', '', '', '', ''],
        ['11', 'Teller Transaksional', 'Petugas transaksi harian', '', '', '', ''],
    ];

    const headers = ['name', 'email', 'password', 'role_id', 'unit_id', 'nisn', 'class_id'];
    const examples = [
        ['Budi Santoso', 'budi@example.com', 'password123', '6', '1', '1234567890', '1'],
        ['Siti Rahayu', 'siti@example.com', 'password456', '6', '1', '0987654321', '2'],
        ['Ahmad Guru', 'ahmad@example.com', 'password789', '4', '1', '', ''],
        ['Fatimah Wali', 'fatimah@example.com', 'password321', '7', '1', '', ''],
    ];

    const allRows = [headers, ...examples, ...roleInfo];

    // Build shared strings table
    const uniqueStrings: string[] = [];
    const stringMap = new Map<string, number>();

    function getStringIndex(s: string): number {
        if (stringMap.has(s)) return stringMap.get(s)!;
        const idx = uniqueStrings.length;
        uniqueStrings.push(s);
        stringMap.set(s, idx);
        return idx;
    }

    // Build sheet rows XML
    let sheetRowsXml = '';
    for (let r = 0; r < allRows.length; r++) {
        let cellsXml = '';
        for (let c = 0; c < allRows[r].length; c++) {
            const val = allRows[r][c];
            if (val === '') continue;
            const ref = colIndexToLetter(c) + (r + 1);
            // All values as shared strings for maximum compatibility
            const ssIdx = getStringIndex(val);
            cellsXml += `<c r="${ref}" t="s"><v>${ssIdx}</v></c>`;
        }
        if (cellsXml) {
            sheetRowsXml += `<row r="${r + 1}">${cellsXml}</row>`;
        }
    }

    const lastCol = colIndexToLetter(headers.length - 1);
    const lastRow = allRows.length;

    // SharedStrings XML
    const ssItems = uniqueStrings.map(s => `<si><t>${escXml(s)}</t></si>`).join('');
    const ssXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${uniqueStrings.length}" uniqueCount="${uniqueStrings.length}">${ssItems}</sst>`;

    // Sheet1 XML
    const sheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><dimension ref="A1:${lastCol}${lastRow}"/><sheetData>${sheetRowsXml}</sheetData></worksheet>`;

    // Workbook XML
    const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Template Import" sheetId="1" r:id="rId1"/></sheets></workbook>`;

    // Workbook rels
    const wbRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/></Relationships>`;

    // Content types
    const ctXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/></Types>`;

    // Root rels
    const rootRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;

    const enc = (s: string) => new TextEncoder().encode(s);

    return createZip([
        { name: '[Content_Types].xml', data: enc(ctXml) },
        { name: '_rels/.rels', data: enc(rootRelsXml) },
        { name: 'xl/workbook.xml', data: enc(workbookXml) },
        { name: 'xl/_rels/workbook.xml.rels', data: enc(wbRelsXml) },
        { name: 'xl/worksheets/sheet1.xml', data: enc(sheetXml) },
        { name: 'xl/sharedStrings.xml', data: enc(ssXml) },
    ]);
}

// ─── ZIP Writer (Store method, no compression) ───────────────────────────────

function createZip(files: { name: string; data: Uint8Array }[]): Blob {
    const parts: Uint8Array[] = [];
    const centralParts: Uint8Array[] = [];
    let localOffset = 0;

    for (const file of files) {
        const nameBytes = new TextEncoder().encode(file.name);
        const crc = crc32(file.data);

        // Local file header (30 bytes + name + data)
        const lh = new ArrayBuffer(30 + nameBytes.length);
        const lhv = new DataView(lh);
        lhv.setUint32(0, 0x04034b50, true);
        lhv.setUint16(4, 20, true);
        lhv.setUint16(6, 0, true);
        lhv.setUint16(8, 0, true); // store
        lhv.setUint16(10, 0, true);
        lhv.setUint16(12, 0, true);
        lhv.setUint32(14, crc, true);
        lhv.setUint32(18, file.data.length, true);
        lhv.setUint32(22, file.data.length, true);
        lhv.setUint16(26, nameBytes.length, true);
        lhv.setUint16(28, 0, true);
        new Uint8Array(lh).set(nameBytes, 30);

        parts.push(new Uint8Array(lh));
        parts.push(file.data);

        // Central directory header (46 bytes + name)
        const ch = new ArrayBuffer(46 + nameBytes.length);
        const chv = new DataView(ch);
        chv.setUint32(0, 0x02014b50, true);
        chv.setUint16(4, 20, true);
        chv.setUint16(6, 20, true);
        chv.setUint16(8, 0, true);
        chv.setUint16(10, 0, true);
        chv.setUint16(12, 0, true);
        chv.setUint16(14, 0, true);
        chv.setUint32(16, crc, true);
        chv.setUint32(20, file.data.length, true);
        chv.setUint32(24, file.data.length, true);
        chv.setUint16(28, nameBytes.length, true);
        chv.setUint16(30, 0, true);
        chv.setUint16(32, 0, true);
        chv.setUint16(34, 0, true);
        chv.setUint16(36, 0, true);
        chv.setUint32(38, 0, true);
        chv.setUint32(42, localOffset, true);
        new Uint8Array(ch).set(nameBytes, 46);

        centralParts.push(new Uint8Array(ch));
        localOffset += 30 + nameBytes.length + file.data.length;
    }

    const centralDirSize = centralParts.reduce((a, c) => a + c.length, 0);

    // EOCD
    const eocd = new ArrayBuffer(22);
    const ev = new DataView(eocd);
    ev.setUint32(0, 0x06054b50, true);
    ev.setUint16(4, 0, true);
    ev.setUint16(6, 0, true);
    ev.setUint16(8, files.length, true);
    ev.setUint16(10, files.length, true);
    ev.setUint32(12, centralDirSize, true);
    ev.setUint32(16, localOffset, true);
    ev.setUint16(20, 0, true);

    return new Blob([...parts, ...centralParts, new Uint8Array(eocd)] as BlobPart[], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
}

// ─── CRC-32 ──────────────────────────────────────────────────────────────────

let _crc32Table: Uint32Array | null = null;
function getCrc32Table(): Uint32Array {
    if (_crc32Table) return _crc32Table;
    _crc32Table = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
        let c = i;
        for (let j = 0; j < 8; j++) {
            c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
        }
        _crc32Table[i] = c >>> 0;
    }
    return _crc32Table;
}

function crc32(data: Uint8Array): number {
    let crc = 0xFFFFFFFF;
    const table = getCrc32Table();
    for (let i = 0; i < data.length; i++) {
        crc = (crc >>> 8) ^ table[(crc ^ data[i]) & 0xFF];
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
}

// ─── Template Download ───────────────────────────────────────────────────────

export function downloadXLSXTemplate(): void {
    const blob = buildXLSXTemplate();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'template_bulk_import.xlsx';
    a.click();
    URL.revokeObjectURL(url);
}

export function isValidImportFile(fileName: string): boolean {
    const ext = fileName.split('.').pop()?.toLowerCase();
    return ext === 'csv' || ext === 'xlsx';
}
