/**
 * Client-side lightweight image compressor
 * Resizes and compresses images to prevent huge payloads and keep the website fast.
 */
export const compressImage = async (
    file: File,
    maxWidth = 1920,
    maxHeight = 1080,
    quality = 0.82
): Promise<File> => {
    // If SVG or small image (< 300KB), return as is
    if (file.type === 'image/svg+xml' || file.size < 300 * 1024) {
        return file;
    }

    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                let width = img.width;
                let height = img.height;

                if (width > maxWidth || height > maxHeight) {
                    if (width / height > maxWidth / maxHeight) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    } else {
                        width = Math.round((width * maxHeight) / height);
                        height = maxHeight;
                    }
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    resolve(file);
                    return;
                }

                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob(
                    (blob) => {
                        if (!blob || blob.size >= file.size) {
                            resolve(file);
                            return;
                        }
                        const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".webp", {
                            type: "image/webp",
                            lastModified: Date.now(),
                        });
                        resolve(compressedFile);
                    },
                    "image/webp",
                    quality
                );
            };
            img.onerror = () => resolve(file);
        };
        reader.onerror = () => resolve(file);
    });
};
