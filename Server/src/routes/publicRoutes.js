const express = require('express');
const publicController = require('../controllers/publicController');

const router = express.Router();

router.get('/health', publicController.health);
router.post('/contact', publicController.submitContact);
router.post('/quote', publicController.submitQuote);
router.get('/site-data', publicController.getSiteData);
router.post('/site-data/publish', publicController.publishSiteData);
router.post('/upload-image', publicController.uploadImage);

module.exports = router;
