const express = require('express');
const { handleStkCallback, b2cResult, b2cTimeout } = require('../controllers/mpesaController');

const router = express.Router();

router.post('/callback', handleStkCallback);
router.post('/b2c/result', b2cResult);
router.post('/b2c/timeout', b2cTimeout);

module.exports = router;