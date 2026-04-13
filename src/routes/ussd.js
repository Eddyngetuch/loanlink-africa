const express = require('express');
const { handleUssd } = require('../controllers/ussdController');

const router = express.Router();
router.post('/callback', handleUssd);

module.exports = router;
