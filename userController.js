// controllers/userController.js
const User = require('../models/User');

exports.getMe = async (req, res) => {
  const user = await User.findById(req.userId).select('-password');
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json(user);
};

exports.updateProfile = async (req, res) => {
  const { name, status } = req.body;
  const user = await User.findByIdAndUpdate(req.userId, { name, status }, { new: true }).select('-password');
  res.json(user);
};

exports.uploadAvatar = async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
  const fileUrl = `/uploads/${req.file.filename}`; // served statically
  const user = await User.findByIdAndUpdate(req.userId, { profilePic: fileUrl }, { new: true }).select('-password');
  res.json({ message: 'Uploaded', profilePic: fileUrl, user });
};
