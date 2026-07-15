"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadUserAvatar = exports.uploadReviewImages = exports.handleUploadError = exports.uploadSalonImages = void 0;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const url_1 = require("url");
const __filename = (0, url_1.fileURLToPath)(import.meta.url);
const __dirname = path_1.default.dirname(__filename);
// Ensure upload directories exist
const uploadDir = path_1.default.join(__dirname, '../../uploads/salons');
if (!fs_1.default.existsSync(uploadDir)) {
    fs_1.default.mkdirSync(uploadDir, { recursive: true });
}
// Configure storage
const storage = multer_1.default.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, uploadDir);
    },
    filename: (_req, file, cb) => {
        // Create unique filename: timestamp-random-originalname
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const extension = path_1.default.extname(file.originalname);
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
const upload = (0, multer_1.default)({
    storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit per file
        files: 12 // Max 12 files total (1 profile + 1 cover + 10 gallery)
    },
    fileFilter
});
// Export the specific middleware for salon creation
exports.uploadSalonImages = upload.fields([
    { name: 'profileImage', maxCount: 1 },
    { name: 'coverImage', maxCount: 1 },
    { name: 'gallery', maxCount: 10 }
]);
// Error handling middleware for multer
const handleUploadError = (err, _req, res, next) => {
    if (err instanceof multer_1.default.MulterError) {
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
exports.handleUploadError = handleUploadError;
// Middleware for uploading review images
const reviewUploadDir = path_1.default.join(__dirname, '../../uploads/reviews');
if (!fs_1.default.existsSync(reviewUploadDir)) {
    fs_1.default.mkdirSync(reviewUploadDir, { recursive: true });
}
const reviewStorage = multer_1.default.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, reviewUploadDir);
    },
    filename: (_req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const extension = path_1.default.extname(file.originalname);
        const filename = `${file.fieldname}-${uniqueSuffix}${extension}`;
        cb(null, filename);
    }
});
exports.uploadReviewImages = (0, multer_1.default)({
    storage: reviewStorage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB per file
        files: 5 // Max 5 images per review
    },
    fileFilter
}).array('reviewImages', 5);
const uploadDirUser = path_1.default.join(__dirname, '../../uploads/users');
if (!fs_1.default.existsSync(uploadDirUser)) {
    fs_1.default.mkdirSync(uploadDirUser, { recursive: true });
}
const userStorage = multer_1.default.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, uploadDirUser);
    },
    filename: (_req, file, cb) => {
        // Create unique filename: timestamp-random-originalname
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const extension = path_1.default.extname(file.originalname);
        const filename = `${file.fieldname}-${uniqueSuffix}${extension}`;
        cb(null, filename);
    }
});
exports.uploadUserAvatar = (0, multer_1.default)({
    storage: userStorage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit per file
        files: 1 // Max 12 files total (1 profile + 1 cover + 10 gallery)
    },
    fileFilter
});
// Export the specific middleware for salon creation
