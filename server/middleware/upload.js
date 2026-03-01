const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // Unique filename: itemID-timestamp.ext
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (req, file, cb) => {
        // Updated to allow CDR and ZIP for Digital Printing
        const filetypes = /jpeg|jpg|png|pdf|cdr|zip/;
        // Mime check can be unreliable for CDR, rely mostly on extension
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase().replace('.', ''));

        // Relax strict mime check for CDR/ZIP as they vary wildly
        if (extname) {
            return cb(null, true);
        }
        cb(new Error('Apenas arquivos de Imagem, PDF, CDR ou ZIP são permitidos!'));
    }
});

module.exports = upload;
