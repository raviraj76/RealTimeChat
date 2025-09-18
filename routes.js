const express = require('express');
const router = express.Router();
const multer = require('multer');
const User = require('../models/User');

// Configure multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // uploads folder
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage });

// Upload profile picture
router.post('/upload-avatar/:userId', upload.single('avatar'), async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ msg: 'User not found' });

    user.profilePic = req.file.filename; // save file name in DB
    await user.save();

    res.json({ msg: 'Avatar uploaded', avatar: req.file.filename });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;
