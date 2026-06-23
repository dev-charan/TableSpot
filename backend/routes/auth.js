const router = require('express').Router();
const { register, login, getMe, updateProfile } = require('../controllers/authController');
const { auth } = require('../middleware/auth');
const { uploadRestaurant } = require('../middleware/upload');

router.post('/register', register);
router.post('/login', login);
router.get('/me', auth, getMe);
router.patch('/me', auth, uploadRestaurant.single('avatar'), updateProfile);

module.exports = router;
