"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadToCloudinary = uploadToCloudinary;
exports.uploadRawToCloudinary = uploadRawToCloudinary;
exports.deleteFromCloudinary = deleteFromCloudinary;
exports.deleteRawFromCloudinary = deleteRawFromCloudinary;
const cloudinary_1 = require("cloudinary");
cloudinary_1.v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});
async function uploadToCloudinary(buffer, folder, publicId) {
    try {
        const result = await uploadBuffer(buffer, {
            folder,
            public_id: publicId,
            overwrite: true,
            resource_type: 'image',
            transformation: [
                { width: 400, height: 400, crop: 'fill', gravity: 'face' },
                { quality: 'auto', fetch_format: 'auto' },
            ],
        });
        return result.secure_url;
    }
    catch (err) {
        const msg = err?.message ||
            err?.error?.message ||
            err?.http_code ||
            (typeof err === 'string' ? err : JSON.stringify(err)) ||
            'Cloudinary upload failed';
        throw new Error(`Cloudinary: ${msg}`);
    }
}
async function uploadRawToCloudinary(buffer, folder, publicId, originalFilename) {
    try {
        const result = await uploadBuffer(buffer, {
            folder,
            public_id: publicId,
            overwrite: true,
            resource_type: 'raw',
            use_filename: true,
            unique_filename: false,
            filename_override: originalFilename,
        });
        return {
            secureUrl: result.secure_url,
            publicId: result.public_id,
            resourceType: result.resource_type,
            bytes: result.bytes,
            format: result.format,
            originalFilename: result.original_filename,
        };
    }
    catch (err) {
        const msg = err?.message ||
            err?.error?.message ||
            err?.http_code ||
            (typeof err === 'string' ? err : JSON.stringify(err)) ||
            'Cloudinary raw upload failed';
        throw new Error(`Cloudinary: ${msg}`);
    }
}
async function deleteFromCloudinary(publicId) {
    await destroyCloudinaryAsset(publicId, 'image');
}
async function deleteRawFromCloudinary(publicId) {
    await destroyCloudinaryAsset(publicId, 'raw');
}
async function uploadBuffer(buffer, options) {
    return new Promise((resolve, reject) => {
        const stream = cloudinary_1.v2.uploader.upload_stream(options, (error, result) => {
            if (error || !result) {
                reject(error || new Error('Cloudinary upload failed'));
                return;
            }
            resolve(result);
        });
        stream.end(buffer);
    });
}
async function destroyCloudinaryAsset(publicId, resourceType) {
    try {
        await cloudinary_1.v2.uploader.destroy(publicId, { resource_type: resourceType });
    }
    catch (err) {
        console.error('Cloudinary delete error:', err?.message || err);
    }
}
