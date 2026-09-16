const express = require('express');
const router = express.Router();
const speciesController = require('../controllers/speciesController');

router.get('/', speciesController.getAllSpecies);
router.get('/:id', speciesController.getSpeciesById);

module.exports = router;
