const router = require('express').Router();
const {
  getMenu, createCategory, createMenuItem, bulkCreateItems, updateMenuItem, deleteMenuItem,
} = require('../controllers/menuController');
const { auth, requireRole } = require('../middleware/auth');
const { uploadMenu } = require('../middleware/upload');

router.get('/:restaurant_id', getMenu);
router.post('/:restaurant_id/categories', auth, requireRole('restaurant_owner', 'admin'), createCategory);
router.post('/:restaurant_id/items', auth, requireRole('restaurant_owner', 'admin'), uploadMenu.single('image'), createMenuItem);
router.post('/:restaurant_id/items/bulk', auth, requireRole('restaurant_owner', 'admin'), bulkCreateItems);
router.patch('/items/:id', auth, requireRole('restaurant_owner', 'admin'), uploadMenu.single('image'), updateMenuItem);
router.delete('/items/:id', auth, requireRole('restaurant_owner', 'admin'), deleteMenuItem);

module.exports = router;
