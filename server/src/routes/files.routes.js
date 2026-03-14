const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const auth = require('../middleware/auth');
const { list, upload, remove } = require('../controllers/files.controller');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads/knowledge'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}_${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueSuffix}_${file.originalname}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain', 'text/csv', 'application/octet-stream'];
  cb(null, true); // Allow all, validation done elsewhere
};

const multerUpload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });

router.use(auth);
router.get('/', list);
router.post('/upload', multerUpload.single('file'), upload);
router.delete('/:id', remove);

module.exports = router;
