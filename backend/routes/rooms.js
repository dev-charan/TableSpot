const router = require('express').Router();
const { getRoomTypes, createRoomType, updateRoomType, deleteRoomType, checkAvailability } = require('../controllers/roomController');
const { auth } = require('../middleware/auth');
const { uploadHotel } = require('../middleware/upload');

router.get('/:hotel_id', getRoomTypes);
router.get('/:hotel_id/availability', checkAvailability);
router.post('/:hotel_id', auth, uploadHotel.array('images', 4), createRoomType);
router.patch('/:id', auth, updateRoomType);
router.delete('/:id', auth, deleteRoomType);

module.exports = router;
