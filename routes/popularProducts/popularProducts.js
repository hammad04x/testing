const express = require('express');
const router = express.Router();
const { getPopularProducts,getActivePopularProducts, addPopularProduct, updatePopularProduct, deletePopularProduct } = require('../../controller/popularProducts/popularProducts');
const authenticateAPIKey = require('../../middleware/authenticateAPIKey');

router.use(authenticateAPIKey)

router.get('/', getPopularProducts);
router.get('/active', getActivePopularProducts);
router.post('/', addPopularProduct);
router.put('/:id', updatePopularProduct);
router.delete('/:id', deletePopularProduct);

module.exports = router;