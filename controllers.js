// controllers/authController.js
const User = require('../models/User');
const jwt = require('jsonwebtoken');

exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if(!name||!email||!password) return res.status(400).json({ message:'Missing fields' });

    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message:'User already exists' });

    const user = new User({ name, email, password });
    await user.save();

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user._id, name: user.name, email: user.email, profilePic: user.profilePic } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message:'Server error' });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if(!email||!password) return res.status(400).json({ message:'Missing fields' });

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message:'Invalid credentials' });

    const ok = await user.comparePassword(password);
    if (!ok) return res.status(400).json({ message:'Invalid credentials' });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user._id, name: user.name, email: user.email, profilePic: user.profilePic } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message:'Server error' });
  }
};
