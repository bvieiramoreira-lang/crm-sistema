const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;

/**
 * Optimizes an uploaded image:
 * 1. Resizes the original image to a max width/height of 1200px and reduces quality to 70% to save bandwidth.
 * 2. Generates a thumbnail version (max 150px, quality 60%) for list/dashboard view.
 * 
 * @param {Object} file - The file object from Multer
 * @returns {Promise<void>}
 */
async function optimizeImage(file) {
    if (!file || !file.mimetype || !file.mimetype.startsWith('image/')) {
        return; // Only process images
    }

    const filePath = file.path;
    const dir = path.dirname(filePath);
    const filename = path.basename(filePath);
    const tempPath = filePath + '.tmp';
    const thumbPath = path.join(dir, 'thumb-' + filename);

    try {
        // Step 1: Optimize the original image to a max of 1000px and convert to progressive/compressed image
        const img = sharp(filePath);
        const metadata = await img.metadata();

        let pipeline = sharp(filePath);
        if (metadata.width > 1000 || metadata.height > 1000) {
            pipeline = pipeline.resize(1000, 1000, {
                fit: 'inside',
                withoutEnlargement: true
            });
        }

        // Output format check
        if (metadata.format === 'png') {
            await pipeline.png({ quality: 60, compressionLevel: 8 }).toFile(tempPath);
        } else {
            await pipeline.jpeg({ quality: 60, progressive: true }).toFile(tempPath);
        }

        // Replace original file with the optimized one
        await fs.unlink(filePath);
        await fs.rename(tempPath, filePath);

        // Step 2: Generate a tiny thumbnail (max 150px, cover fit) matching original format
        const thumbPipeline = sharp(filePath).resize(150, 150, {
            fit: 'cover'
        });

        if (metadata.format === 'png') {
            await thumbPipeline.png({ quality: 50, compressionLevel: 8 }).toFile(thumbPath);
        } else {
            await thumbPipeline.jpeg({ quality: 50, progressive: true }).toFile(thumbPath);
        }

        console.log(`[ImageOptimizer] Optimized original (1000px, Q60) and generated thumbnail (Q50) for ${filename}`);
    } catch (error) {
        console.error(`[ImageOptimizer] Error optimizing image ${filename}:`, error);
        // Clean up temp file if exists
        try {
            await fs.unlink(tempPath);
        } catch (_) {}
    }
}

module.exports = { optimizeImage };
