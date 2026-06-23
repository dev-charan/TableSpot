const router = require('express').Router();
const {
  getTables, createTable, updateTable, deleteTable,
  addBlackoutDate, getBlackoutDates, deleteBlackoutDate,
} = require('../controllers/tableController');
const { auth, requireRole } = require('../middleware/auth');

router.get('/:restaurant_id', getTables);
router.post('/:restaurant_id', auth, requireRole('restaurant_owner', 'admin'), createTable);
router.patch('/:id', auth, requireRole('restaurant_owner', 'admin'), updateTable);
router.delete('/:id', auth, requireRole('restaurant_owner', 'admin'), deleteTable);

router.get('/:restaurant_id/blackout', getBlackoutDates);
router.post('/:restaurant_id/blackout', auth, requireRole('restaurant_owner', 'admin'), addBlackoutDate);
router.delete('/blackout/:id', auth, requireRole('restaurant_owner', 'admin'), deleteBlackoutDate);

module.exports = router;
