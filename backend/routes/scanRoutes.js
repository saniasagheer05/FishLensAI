const express = require('express');
const router = express.Router();
const scanController = require('../controllers/scanController');
const { optionalAuthMiddleware } = require('../middleware/authMiddleware');

router.post('/analyze', optionalAuthMiddleware, scanController.analyzeScan);
router.post('/', optionalAuthMiddleware, scanController.createScan);
router.get('/', optionalAuthMiddleware, scanController.getScanHistory);
router.get('/:id', optionalAuthMiddleware, scanController.getScanById);
router.delete('/:id', optionalAuthMiddleware, scanController.deleteScan);
router.delete('/', optionalAuthMiddleware, scanController.clearHistory);

module.exports = router;
