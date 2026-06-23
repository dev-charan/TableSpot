const router = require('express').Router();
const { createHotelReview, getHotelReviews, generateHotelAISummary } = require('../controllers/hotelReviewController');
const { auth } = require('../middleware/auth');

router.post('/', auth, createHotelReview);
router.get('/hotel/:id', getHotelReviews);
router.post('/hotel/:id/ai-summary', auth, generateHotelAISummary);

module.exports = router;
