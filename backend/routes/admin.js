const router = require('express').Router();
const {
  getStats,
  getUsers, updateUser, deleteUser,
  getRestaurants, updateRestaurantStatus, deleteRestaurant,
  getHotels, updateHotelStatus, deleteHotel,
  getAllBookings, getAllHotelBookings,
  getReviews, toggleReviewVisibility, deleteReview,
} = require('../controllers/adminController');
const { auth, requireRole } = require('../middleware/auth');

router.use(auth, requireRole('admin'));

router.get('/stats', getStats);

router.get('/users', getUsers);
router.patch('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);

router.get('/restaurants', getRestaurants);
router.patch('/restaurants/:id/status', updateRestaurantStatus);
router.delete('/restaurants/:id', deleteRestaurant);

router.get('/hotels', getHotels);
router.patch('/hotels/:id/status', updateHotelStatus);
router.delete('/hotels/:id', deleteHotel);

router.get('/bookings', getAllBookings);
router.get('/hotel-bookings', getAllHotelBookings);

router.get('/reviews', getReviews);
router.patch('/reviews/:id/visibility', toggleReviewVisibility);
router.delete('/reviews/:id', deleteReview);

module.exports = router;
