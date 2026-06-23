const router = require('express').Router();
const {
  autofill, createRestaurant, getRestaurants, getRestaurant,
  getMyRestaurants, updateRestaurant, getCities, getTodayStats,
} = require('../controllers/restaurantController');
const { auth, requireRole } = require('../middleware/auth');
const { uploadRestaurant } = require('../middleware/upload');

router.get('/cities', getCities);
router.get('/autofill', autofill);
router.get('/', getRestaurants);
router.get('/mine', auth, requireRole('restaurant_owner', 'admin'), getMyRestaurants);
router.get('/:id', getRestaurant);
router.get('/:id/stats', auth, requireRole('restaurant_owner', 'admin'), getTodayStats);
router.post(
  '/',
  auth,
  requireRole('restaurant_owner', 'admin'),
  uploadRestaurant.fields([{ name: 'cover_image', maxCount: 1 }, { name: 'images', maxCount: 5 }]),
  createRestaurant
);
router.patch(
  '/:id',
  auth,
  requireRole('restaurant_owner', 'admin'),
  uploadRestaurant.fields([{ name: 'cover_image', maxCount: 1 }, { name: 'images', maxCount: 5 }]),
  updateRestaurant
);

module.exports = router;
