const router = require('express').Router();
const {
  createBooking, getAvailableSlots, getUserBookings,
  getRestaurantBookings, cancelBooking, updateBookingStatus,
} = require('../controllers/bookingController');
const { auth, requireRole } = require('../middleware/auth');

router.get('/available', getAvailableSlots);
router.post('/', auth, createBooking);
router.get('/mine', auth, getUserBookings);
router.get('/restaurant/:id', auth, requireRole('restaurant_owner', 'admin'), getRestaurantBookings);
router.patch('/:id/cancel', auth, cancelBooking);
router.patch('/:id/status', auth, requireRole('restaurant_owner', 'admin'), updateBookingStatus);

module.exports = router;
