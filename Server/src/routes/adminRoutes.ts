import express from 'express';
import * as adminController from '../controllers/adminController.js';
import multer from 'multer';
// Ensure you aren't limiting file sizes strictly in a way that kills the stream
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});
const router = express.Router();

router.get('/all', adminController.getAdminAll);
router.post('/login', adminController.adminLogin);
router.post('/upload', 
  upload.single('image'), 
  (req, res, next) => {
    console.log('File received by multer:', req.file ? req.file.originalname : 'NONE');
    next();
  },
  adminController.uploadImageHandler
);router.post('/bulk', adminController.bulkSave);
router.put('/settings', adminController.saveSettings);
router.put('/stats', adminController.saveStats);
router.post('/activity', adminController.logActivity);
router.patch('/:type/:id', adminController.patchItem);
router.delete('/:type/:id', adminController.deleteItem);

export default router;
