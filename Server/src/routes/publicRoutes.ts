import express from 'express';
import * as publicController from '../controllers/publicController.js';

const router = express.Router();

router.get('/health', publicController.health);
router.post('/contact', publicController.submitContact);
router.post('/quote', publicController.submitQuote);
router.get('/site-data', publicController.getSiteData);
router.post('/site-data/publish', publicController.publishSiteData);
router.post('/upload-image', publicController.uploadImage);

export default router;
