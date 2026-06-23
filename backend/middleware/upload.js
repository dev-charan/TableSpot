const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const storage = (dest) =>
  multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(__dirname, '..', 'uploads', dest)),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `${uuidv4()}${ext}`);
    },
  });

const fileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|webp/;
  if (allowed.test(path.extname(file.originalname).toLowerCase())) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'));
  }
};

const uploadRestaurant = multer({ storage: storage('restaurants'), fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });
const uploadMenu = multer({ storage: storage('menus'), fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });
const uploadHotel = multer({ storage: storage('hotels'), fileFilter, limits: { fileSize: 8 * 1024 * 1024 } });

module.exports = { uploadRestaurant, uploadMenu, uploadHotel };
