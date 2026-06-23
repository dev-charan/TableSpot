const router = require('express').Router();
const {
  autofill, createHotel, getHotels, getHotel,
  getMyHotels, updateHotel, getCities, getHotelStats,
} = require('../controllers/hotelController');
const { auth, requireRole } = require('../middleware/auth');
const { uploadHotel } = require('../middleware/upload');

router.get('/cities', getCities);
router.get('/autofill', autofill);
router.get('/', getHotels);
router.get('/mine', auth, getMyHotels);
router.get('/:id', getHotel);
router.get('/:id/stats', auth, getHotelStats);
router.post(
  '/',
  auth,
  uploadHotel.fields([{ name: 'cover_image', maxCount: 1 }, { name: 'images', maxCount: 8 }]),
  createHotel
);
router.patch(
  '/:id',
  auth,
  uploadHotel.fields([{ name: 'cover_image', maxCount: 1 }, { name: 'images', maxCount: 8 }]),
  updateHotel
);

module.exports = router;
