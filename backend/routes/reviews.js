const router = require('express').Router();
const { createReview, getRestaurantReviews, generateAISummary } = require('../controllers/reviewController');
const { auth, requireRole } = require('../middleware/auth');

router.post('/', auth, createReview);
router.get('/restaurant/:id', getRestaurantReviews);
router.post('/restaurant/:id/ai-summary', auth, requireRole('restaurant_owner', 'admin'), generateAISummary);

module.exports = router;
