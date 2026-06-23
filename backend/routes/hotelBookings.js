const router = require('express').Router();
const {
  createHotelBooking, getUserHotelBookings, getHotelBookings,
  cancelHotelBooking, updateHotelBookingStatus,
} = require('../controllers/hotelBookingController');
const { auth, requireRole } = require('../middleware/auth');

router.post('/', auth, createHotelBooking);
router.get('/mine', auth, getUserHotelBookings);
router.get('/hotel/:id', auth, getHotelBookings);
router.patch('/:id/cancel', auth, cancelHotelBooking);
router.patch('/:id/status', auth, updateHotelBookingStatus);

module.exports = router;
