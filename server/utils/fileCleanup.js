const fs = require('fs').promises;
const path = require('path');

const uploadDir = path.join(__dirname, '../uploads');

/**
 * Safely deletes a file and its potential thumbnail from the uploads directory.
 * @param {string} relativePath - The database stored path (e.g., '/uploads/file.png')
 * @returns {Promise<void>}
 */
async function deleteUploadedFile(relativePath) {
    if (!relativePath || typeof relativePath !== 'string') return;
    
    // Ignore non-upload paths
    if (!relativePath.startsWith('/uploads/')) return;
    
    // Extract filename
    const filename = path.basename(relativePath);
    const filePath = path.join(uploadDir, filename);
    const thumbPath = path.join(uploadDir, 'thumb-' + filename);
    
    // Delete main file
    try {
        await fs.unlink(filePath);
        console.log(`[Cleanup] Deleted file: ${filename}`);
    } catch (err) {
        if (err.code !== 'ENOENT') {
            console.error(`[Cleanup] Error deleting file ${filename}:`, err);
        }
    }
    
    // Delete thumbnail
    try {
        await fs.unlink(thumbPath);
        console.log(`[Cleanup] Deleted thumbnail: thumb-${filename}`);
    } catch (err) {
        if (err.code !== 'ENOENT') {
            // It's normal for non-images or files without thumbnails to fail with ENOENT
        }
    }
}

/**
 * Deletes all associated upload files for a list of items.
 * @param {Array<Object>} items - List of items from database
 * @returns {Promise<void>}
 */
async function deleteFilesForItems(items) {
    if (!items || !Array.isArray(items)) return;
    
    for (const item of items) {
        if (item.layout_path) {
            await deleteUploadedFile(item.layout_path);
        }
        if (item.arquivo_impressao_digital_url) {
            await deleteUploadedFile(item.arquivo_impressao_digital_url);
        }
        if (item.arquivo_impressao_laser_url) {
            await deleteUploadedFile(item.arquivo_impressao_laser_url);
        }
    }
}

module.exports = {
    deleteUploadedFile,
    deleteFilesForItems
};
