import express from 'express';
import * as adminController from '../controllers/adminController.js';
import multer from 'multer';
const upload = multer({ storage: multer.memoryStorage() });
const router = express.Router();

router.get('/all', adminController.getAdminAll);
router.post('/login', adminController.adminLogin);
router.post('/upload', upload.single('image'), adminController.uploadImageHandler);
router.post('/bulk', adminController.bulkSave);
router.put('/settings', adminController.saveSettings);
router.put('/stats', adminController.saveStats);
router.post('/activity', adminController.logActivity);
router.patch('/:type/:id', adminController.patchItem);
router.delete('/:type/:id', adminController.deleteItem);

export default router;
