const express = require('express');
const router = express.Router();
const { dashboardProducts, dashboardVisitors } = require('../controllers/dashboardController');

router.get('/products', dashboardProducts);
router.get('/visitors', dashboardVisitors);

module.exports = router;