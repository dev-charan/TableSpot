const express = require('express');
const router = express.Router();
const {
  getSettings, updateSettings, createOrder, verifyPayment,
  getPayouts, markPayoutPaid, updateEntitySchedule,
} = require('../controllers/paymentController');
const { auth, requireRole } = require('../middleware/auth');

router.get('/settings', getSettings);
router.put('/settings', auth, requireRole('admin'), updateSettings);
router.post('/create-order', auth, createOrder);
router.post('/verify', auth, verifyPayment);
router.get('/payouts', auth, requireRole('admin'), getPayouts);
router.put('/payouts/:id/pay', auth, requireRole('admin'), markPayoutPaid);
router.put('/entity-schedule', auth, requireRole('admin'), updateEntitySchedule);

module.exports = router;
