const multer = require('multer');
const multerS3 = require('multer-s3');
const { S3Client } = require('@aws-sdk/client-s3');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const fileFilter = (req, file, cb) => {
  if (/jpeg|jpg|png|webp/.test(path.extname(file.originalname).toLowerCase())) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'));
  }
};

const s3Storage = (folder) =>
  multerS3({
    s3,
    bucket: process.env.AWS_S3_BUCKET,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `${folder}/${uuidv4()}${ext}`);
    },
  });

const uploadRestaurant = multer({ storage: s3Storage('restaurants'), fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });
const uploadMenu = multer({ storage: s3Storage('menus'), fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });
const uploadHotel = multer({ storage: s3Storage('hotels'), fileFilter, limits: { fileSize: 8 * 1024 * 1024 } });

module.exports = { uploadRestaurant, uploadMenu, uploadHotel };
