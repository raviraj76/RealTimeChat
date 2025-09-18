// middleware/upload.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const base = path.basename(file.originalname, ext)
                  .replace(/\s+/g, '_')
                  .replace(/[^a-zA-Z0-9_-]/g, '');
    cb(null, `${req.userId || 'anon'}_${Date.now()}${ext}`);
  }
});

function fileFilter(req, file, cb) {
  const allowed = /jpeg|jpg|png/;
  if (allowed.test(file.mimetype)) cb(null, true);
  else cb(new Error('Only JPG/PNG images are allowed'));
}

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter
});

module.exports = upload;
