const express = require('express');
const adminController = require('../controllers/adminController');

const router = express.Router();

router.get('/all', adminController.getAdminAll);
router.post('/bulk', adminController.bulkSave);
router.put('/settings', adminController.saveSettings);
router.put('/stats', adminController.saveStats);
router.post('/activity', adminController.logActivity);
router.patch('/:type/:id', adminController.patchItem);
router.delete('/:type/:id', adminController.deleteItem);

module.exports = router;
