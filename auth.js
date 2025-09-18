// middleware/auth.js
const jwt = require('jsonwebtoken');

module.exports = function(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ message: 'No token provided' });

  const parts = header.split(' ');
  if (parts.length !== 2) return res.status(401).json({ message: 'Token error' });

  const token = parts[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = payload.id;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};
