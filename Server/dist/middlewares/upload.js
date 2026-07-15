import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Ensure upload directories exist
const uploadDir = path.join(__dirname, '../../uploads/salons');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}
// Configure storage
const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, uploadDir);
    },
    filename: (_req, file, cb) => {
        // Create unique filename: timestamp-random-originalname
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const extension = path.extname(file.originalname);
        const filename = `${file.fieldname}-${uniqueSuffix}${extension}`;
        cb(null, filename);
    }
});
// File filter for images only
const fileFilter = (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    }
    else {
        cb(new Error('Only image files are allowed'));
    }
};
// Create multer instance
const upload = multer({
    storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit per file
        files: 12 // Max 12 files total (1 profile + 1 cover + 10 gallery)
    },
    fileFilter
});
// Export the specific middleware for salon creation
export const uploadSalonImages = upload.fields([
    { name: 'profileImage', maxCount: 1 },
    { name: 'coverImage', maxCount: 1 },
    { name: 'gallery', maxCount: 10 }
]);
// Error handling middleware for multer
export const handleUploadError = (err, _req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ message: 'File size too large. Max 5MB per file.' });
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({ message: 'Too many files uploaded.' });
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
            return res.status(400).json({ message: 'Unexpected file field.' });
        }
    }
    if (err.message === 'Only image files are allowed') {
        return res.status(400).json({ message: err.message });
    }
    next(err);
};
// Middleware for uploading review images
const reviewUploadDir = path.join(__dirname, '../../uploads/reviews');
if (!fs.existsSync(reviewUploadDir)) {
    fs.mkdirSync(reviewUploadDir, { recursive: true });
}
const reviewStorage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, reviewUploadDir);
    },
    filename: (_req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const extension = path.extname(file.originalname);
        const filename = `${file.fieldname}-${uniqueSuffix}${extension}`;
        cb(null, filename);
    }
});
export const uploadReviewImages = multer({
    storage: reviewStorage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB per file
        files: 5 // Max 5 images per review
    },
    fileFilter
}).array('reviewImages', 5);
const uploadDirUser = path.join(__dirname, '../../uploads/users');
if (!fs.existsSync(uploadDirUser)) {
    fs.mkdirSync(uploadDirUser, { recursive: true });
}
const userStorage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, uploadDirUser);
    },
    filename: (_req, file, cb) => {
        // Create unique filename: timestamp-random-originalname
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const extension = path.extname(file.originalname);
        const filename = `${file.fieldname}-${uniqueSuffix}${extension}`;
        cb(null, filename);
    }
});
export const uploadUserAvatar = multer({
    storage: userStorage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit per file
        files: 1 // Max 12 files total (1 profile + 1 cover + 10 gallery)
    },
    fileFilter
});
// Export the specific middleware for salon creation
