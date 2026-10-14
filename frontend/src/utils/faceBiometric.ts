export const extractFaceEmbedding = (
    source: HTMLVideoElement | HTMLCanvasElement | HTMLImageElement
): number[] => {
    // 1. Determine natural resolution
    let vw = 640;
    let vh = 480;

    if (source instanceof HTMLVideoElement) {
        vw = source.videoWidth || 640;
        vh = source.videoHeight || 480;
    } else if (source instanceof HTMLImageElement) {
        vw = source.naturalWidth || source.width || 640;
        vh = source.naturalHeight || source.height || 480;
    } else {
        vw = source.width || 640;
        vh = source.height || 480;
    }

    // 2. Center crop corresponding to the face oval guide (50% width, 65% height centered)
    const cropW = Math.max(64, Math.round(vw * 0.5));
    const cropH = Math.max(64, Math.round(vh * 0.65));
    const cropX = Math.max(0, Math.round((vw - cropW) / 2));
    const cropY = Math.max(0, Math.round((vh - cropH) / 2));

    // 3. Create standardized 64x64 offscreen canvas
    const normCanvas = document.createElement('canvas');
    normCanvas.width = 64;
    normCanvas.height = 64;
    const ctx = normCanvas.getContext('2d');

    if (!ctx) return Array(128).fill(0.088);

    // Draw scaled center crop to 64x64
    ctx.drawImage(source, cropX, cropY, cropW, cropH, 0, 0, 64, 64);

    const imgData = ctx.getImageData(0, 0, 64, 64);
    const data = imgData.data;

    // 4. Divide into 8x8 spatial blocks (each block is 8x8 pixels = 64 blocks)
    // For each block, extract:
    // Feature 1: Average normalized luminance (-1.0 to 1.0)
    // Feature 2: Horizontal edge contrast / gradient (-1.0 to 1.0)
    // Total features = 64 blocks * 2 = 128 features
    const embedding: number[] = [];
    const blockSize = 8;
    const blocksPerAxis = 8;

    for (let by = 0; by < blocksPerAxis; by++) {
        for (let bx = 0; bx < blocksPerAxis; bx++) {
            let sumLuma = 0;
            let leftLuma = 0;
            let rightLuma = 0;

            for (let py = 0; py < blockSize; py++) {
                for (let px = 0; px < blockSize; px++) {
                    const x = bx * blockSize + px;
                    const y = by * blockSize + py;
                    const idx = (y * 64 + x) * 4;

                    const r = data[idx] || 0;
                    const g = data[idx + 1] || 0;
                    const b = data[idx + 2] || 0;

                    // Standard ITU-R BT.601 luminance
                    const luma = (0.299 * r + 0.587 * g + 0.114 * b) / 255.0;
                    sumLuma += luma;

                    if (px < 4) leftLuma += luma;
                    else rightLuma += luma;
                }
            }

            const totalPixelsInBlock = blockSize * blockSize; // 64
            const avgLuma = (sumLuma / totalPixelsInBlock) * 2.0 - 1.0;
            const contrast = (rightLuma - leftLuma) / (totalPixelsInBlock / 2);

            embedding.push(parseFloat(avgLuma.toFixed(4)));
            embedding.push(parseFloat(contrast.toFixed(4)));
        }
    }

    // 5. L2 Normalization
    const norm = Math.sqrt(embedding.reduce((acc, val) => acc + val * val, 0)) || 1.0;
    return embedding.map(val => parseFloat((val / norm).toFixed(6)));
};

/**
 * Extracts biometric descriptor from an image URL (such as student profile photo).
 */
export const extractEmbeddingFromImageUrl = (
    url: string
): Promise<{ embedding: number[]; dataUrl: string }> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            try {
                const embedding = extractFaceEmbedding(img);
                const canvas = document.createElement('canvas');
                canvas.width = Math.min(img.naturalWidth || 400, 400);
                canvas.height = Math.min(img.naturalHeight || 400, 400);
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    resolve({ embedding, dataUrl: canvas.toDataURL('image/jpeg', 0.85) });
                } else {
                    resolve({ embedding, dataUrl: url });
                }
            } catch (err) {
                reject(err);
            }
        };
        img.onerror = () => reject(new Error('Gagal memuat gambar foto profil'));
        img.src = url;
    });
};

/**
 * Extracts biometric descriptor from an uploaded File (e.g. Pas Foto JPG/PNG).
 */
export const extractEmbeddingFromFile = (
    file: File
): Promise<{ embedding: number[]; dataUrl: string }> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const dataUrl = e.target?.result as string;
            if (!dataUrl) return reject(new Error('Gagal membaca file foto'));
            extractEmbeddingFromImageUrl(dataUrl)
                .then(resolve)
                .catch(reject);
        };
        reader.onerror = () => reject(new Error('Gagal membaca file foto'));
        reader.readAsDataURL(file);
    });
};
